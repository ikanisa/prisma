import os
import time
from typing import Any, Dict, List

import jwt
import redis
import sentry_sdk
import structlog
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, OTLPSpanExporter
from rq import Queue
from sqlalchemy import text

from .db import AsyncSessionLocal, Chunk, init_db
from .rag import chunk_text, embed_chunks, extract_text, store_chunks

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

structlog.configure(processors=[structlog.processors.TimeStamper(fmt="iso"), structlog.processors.JSONRenderer()])
logger = structlog.get_logger()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("API_ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_conn = redis.from_url(redis_url)
queue = Queue("reembed", connection=redis_conn)

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

if not JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET is required for authenticating API requests.")


class UserRateLimiter:
    def __init__(self, limit: int, window: float = 60.0) -> None:
        self.limit = limit
        self.window = window
        self.calls: Dict[str, List[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window
        timestamps = [ts for ts in self.calls.get(key, []) if ts > window_start]
        if len(timestamps) >= self.limit:
            self.calls[key] = timestamps
            return False
        timestamps.append(now)
        self.calls[key] = timestamps
        return True


api_rate_limiter = UserRateLimiter(
    limit=int(os.getenv("API_RATE_LIMIT", "60")),
    window=float(os.getenv("API_RATE_WINDOW_SECONDS", "60")),
)


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience=JWT_AUDIENCE)
    except jwt.PyJWTError as exc:
        logger.warning("auth.invalid_token", error=str(exc))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc


async def require_auth(authorization: str = Header(...)) -> Dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header missing Bearer token")

    token = authorization.split(" ", 1)[1]
    payload = verify_supabase_jwt(token)
    user_id = payload.get("sub") or "anonymous"

    if not api_rate_limiter.allow(user_id):
        logger.warning("rate.limit_exceeded", user_id=user_id)
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="API rate limit exceeded")

    logger.info("auth.accepted", user_id=user_id)
    return payload


@app.on_event("startup")
async def startup() -> None:
    await init_db()


@app.post("/v1/rag/ingest")
async def ingest(
    file: UploadFile = File(...),
    document_id: str = Form(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, int]:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF supported")
    text = await extract_text(file)
    chunks = chunk_text(text, max_tokens=1200, overlap=200)
    embeds = await embed_chunks(chunks)
    await store_chunks(document_id or file.filename, chunks, embeds)
    logger.info("ingest", filename=file.filename, chunks=len(chunks), user_id=auth.get("sub"))
    return {"chunks": len(chunks)}


@app.post("/v1/rag/search")
async def search(query: str, k: int = 5, auth: Dict[str, Any] = Depends(require_auth)) -> List[Dict[str, Any]]:
    qembed = (await embed_chunks([query]))[0]
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            text(
                """
            SELECT id, content, 1 - (embedding <=> :vec) AS score
            FROM chunks
            ORDER BY embedding <=> :vec
            LIMIT :k
            """
            ).bindparams(vec=qembed, k=k)
        )
        rows = res.fetchall()
        if not rows:
            res = await session.execute(
                text("SELECT id, content FROM chunks WHERE content ILIKE :q LIMIT :k").bindparams(
                    q=f"%{query}%", k=k
                )
            )
            rows = [(r.id, r.content, None) for r in res.fetchall()]
    logger.info("search", query=query, results=len(rows), user_id=auth.get("sub"))
    return [{"id": r[0], "content": r[1], "score": r[2]} for r in rows]


@app.post("/v1/rag/reembed")
async def reembed(chunks: List[int], auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, int]:
    for cid in chunks:
        queue.enqueue("worker.reembed_chunk", cid)
    logger.info("reembed", count=len(chunks), user_id=auth.get("sub"))
    return {"enqueued": len(chunks)}
