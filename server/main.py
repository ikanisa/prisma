import os
import time
from typing import Any, Dict, List

import jwt
import redis
import sentry_sdk
import structlog
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
import httpx
from pydantic import BaseModel, Field
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
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
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is required to validate organization access.")

if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required for organization validation.")

SUPABASE_REST_URL = SUPABASE_URL.rstrip("/") + "/rest/v1"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Accept": "application/json",
}

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


def has_manager_privileges(role: str) -> bool:
    return role in {"MANAGER", "SYSTEM_ADMIN"}


async def resolve_org_context(user_id: str, org_slug: str) -> Dict[str, str]:
    slug = (org_slug or "").strip()
    if not slug:
        raise HTTPException(status_code=400, detail="orgSlug is required")

    async with httpx.AsyncClient(timeout=5.0) as client:
        org_resp = await client.get(
            f"{SUPABASE_REST_URL}/organizations",
            params={"slug": f"eq.{slug}", "select": "id,slug"},
            headers=SUPABASE_HEADERS,
        )
        if org_resp.status_code != 200:
            logger.error("supabase.organizations_error", status=org_resp.status_code, body=org_resp.text)
            raise HTTPException(status_code=502, detail="organization lookup failed")
        org_rows = org_resp.json()
        if not org_rows:
            raise HTTPException(status_code=404, detail="organization not found")
        org = org_rows[0]

        membership_resp = await client.get(
            f"{SUPABASE_REST_URL}/memberships",
            params={"org_id": f"eq.{org['id']}", "user_id": f"eq.{user_id}", "select": "role"},
            headers=SUPABASE_HEADERS,
        )
        if membership_resp.status_code != 200:
            logger.error("supabase.memberships_error", status=membership_resp.status_code, body=membership_resp.text)
            raise HTTPException(status_code=502, detail="membership lookup failed")
        membership_rows = membership_resp.json()

        if membership_rows:
            role = membership_rows[0].get("role") or "EMPLOYEE"
            return {"org_id": org["id"], "role": role}

        user_resp = await client.get(
            f"{SUPABASE_REST_URL}/users",
            params={"id": f"eq.{user_id}", "select": "is_system_admin"},
            headers=SUPABASE_HEADERS,
        )
        if user_resp.status_code != 200:
            logger.error("supabase.users_error", status=user_resp.status_code, body=user_resp.text)
            raise HTTPException(status_code=502, detail="user lookup failed")
        user_rows = user_resp.json()
        is_system_admin = bool(user_rows and user_rows[0].get("is_system_admin"))

        if not is_system_admin:
            raise HTTPException(status_code=403, detail="forbidden")

        return {"org_id": org["id"], "role": "SYSTEM_ADMIN"}


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    k: int = Field(5, ge=1, le=20)
    org_slug: str = Field(..., min_length=1)


class ReembedRequest(BaseModel):
    chunks: List[int] = Field(..., min_items=1)
    org_slug: str = Field(..., min_length=1)


@app.on_event("startup")
async def startup() -> None:
    await init_db()


@app.post("/v1/rag/ingest")
async def ingest(
    file: UploadFile = File(...),
    org_slug: str = Form(...),
    document_id: str = Form(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, int]:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    org_context = await resolve_org_context(user_id, org_slug)

    text = await extract_text(file)
    chunks = chunk_text(text, max_tokens=1200, overlap=200)
    embeds = await embed_chunks(chunks)
    await store_chunks(document_id or file.filename, org_context["org_id"], chunks, embeds)
    logger.info(
        "ingest",
        filename=file.filename,
        chunks=len(chunks),
        user_id=user_id,
        org_id=org_context["org_id"],
    )
    return {"chunks": len(chunks)}


@app.post("/v1/rag/search")
async def search(request: SearchRequest, auth: Dict[str, Any] = Depends(require_auth)) -> List[Dict[str, Any]]:
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    org_context = await resolve_org_context(user_id, request.org_slug)
    limit = max(1, min(20, request.k))

    qembed = (await embed_chunks([query]))[0]
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            text(
                """
            SELECT id, content, 1 - (embedding <=> :vec) AS score
            FROM chunks
            WHERE org_id = :org
            ORDER BY embedding <=> :vec
            LIMIT :k
            """
            ).bindparams(vec=qembed, org=org_context["org_id"], k=limit)
        )
        rows = res.fetchall()
        if not rows:
            res = await session.execute(
                text(
                    "SELECT id, content FROM chunks WHERE org_id = :org AND content ILIKE :q LIMIT :k"
                ).bindparams(org=org_context["org_id"], q=f"%{query}%", k=limit)
            )
            rows = [(r.id, r.content, None) for r in res.fetchall()]

    logger.info(
        "search",
        query=query,
        results=len(rows),
        user_id=user_id,
        org_id=org_context["org_id"],
    )
    return [{"id": r[0], "content": r[1], "score": r[2]} for r in rows]


@app.post("/v1/rag/reembed")
async def reembed(request: ReembedRequest, auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, int]:
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    org_context = await resolve_org_context(user_id, request.org_slug)
    if not has_manager_privileges(org_context["role"]):
        raise HTTPException(status_code=403, detail="manager role required")

    async with AsyncSessionLocal() as session:
        for cid in request.chunks:
            chunk = await session.get(Chunk, cid)
            if not chunk or chunk.org_id != org_context["org_id"]:
                raise HTTPException(status_code=404, detail="chunk not found")

    for cid in request.chunks:
        queue.enqueue("worker.reembed_chunk", cid)
    logger.info(
        "reembed",
        count=len(request.chunks),
        user_id=user_id,
        org_id=org_context["org_id"],
    )
    return {"enqueued": len(request.chunks)}
