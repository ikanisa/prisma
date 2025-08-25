import os
from typing import List

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from rq import Queue
import redis
import sentry_sdk
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, OTLPSpanExporter

from .db import AsyncSessionLocal, Chunk, init_db
from .rag import extract_text, chunk_text, embed_chunks, store_chunks

app = FastAPI()

# OTEL setup
provider = TracerProvider()
trace.set_tracer_provider(provider)
otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
if otlp_endpoint:
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint)))
FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)

# Sentry stub
sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=1.0)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(redis_url)
queue = Queue("reembed", connection=redis_conn)

@app.on_event("startup")
async def startup():
    await init_db()

@app.post("/v1/rag/ingest")
async def ingest(file: UploadFile = File(...), document_id: str = Form(None)):
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF supported")
    text = await extract_text(file)
    chunks = chunk_text(text, max_tokens=1200, overlap=200)
    embeds = await embed_chunks(chunks)
    await store_chunks(document_id or file.filename, chunks, embeds)
    return {"chunks": len(chunks)}

@app.post("/v1/rag/search")
async def search(query: str, k: int = 5):
    qembed = (await embed_chunks([query]))[0]
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            text("""
            SELECT id, content, 1 - (embedding <=> :vec) AS score
            FROM chunks
            ORDER BY embedding <=> :vec
            LIMIT :k
            """).bindparams(vec=qembed, k=k)
        )
        rows = res.fetchall()
        if not rows:
            res = await session.execute(
                text("SELECT id, content FROM chunks WHERE content ILIKE :q LIMIT :k").bindparams(q=f"%{query}%", k=k)
            )
            rows = [(r.id, r.content, None) for r in res.fetchall()]
    return [{"id": r[0], "content": r[1], "score": r[2]} for r in rows]

@app.post("/v1/rag/reembed")
async def reembed(chunks: List[int]):
    for cid in chunks:
        queue.enqueue("worker.reembed_chunk", cid)
    return {"enqueued": len(chunks)}
