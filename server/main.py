import asyncio
import os
import time
import contextlib
import copy
import json
from collections import defaultdict
from contextvars import ContextVar
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Set, Iterable, Mapping
from enum import Enum
import mimetypes
import secrets

import jwt
import redis
import sentry_sdk
import structlog
import structlog.contextvars
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import httpx
from pydantic import BaseModel, Field, ConfigDict
from functools import lru_cache
from rq import Queue
from sqlalchemy import text
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid
import hashlib
import os.path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


from services.analytics.jobs import anomaly_scan_job, policy_check_job, reembed_job

from .autopilot_handlers import handle_extract_documents
from .deterministic_contract import build_manifest, validate_manifest
from .analytics_runner import AnalyticsValidationError, run_analytics
from .onboarding_mapper import map_document_fields
from .db import AsyncSessionLocal, Chunk, init_db
from .cache import get_cache, CacheService
from .rag import (
    chunk_text,
    embed_chunks,
    extract_text_from_bytes,
    store_chunks,
    perform_semantic_search,
    get_primary_index_config,
    get_retrieval_config,
)
from . import openai_retrieval
from .health import build_readiness_report
from .security import build_csp_header, normalise_allowed_origins
from .config_loader import (
    get_autonomy_job_allowances,
    get_autonomy_levels,
    get_client_portal_scope,
    get_config_permission_map,
    get_default_autonomy_level,
    get_before_asking_user_sequence,
    get_email_ingest_settings,
    get_google_drive_settings,
    get_tool_policies,
    get_agent_registry,
    get_workflow_definitions,
    get_url_source_settings,
    get_release_control_settings,
    get_role_rank_map,
    get_managerial_roles,
)
from .release_controls import evaluate_release_controls, summarise_release_environment
from .workflows import (
    ensure_workflow_run,
    complete_workflow_step,
    get_workflow_suggestions,
)
from .openai import get_openai_client
from .email import send_member_invite_email
from .api.schemas import ReleaseControlCheckRequest, ReleaseControlCheckResponse
from .telemetry import RequestTelemetryMiddleware, configure_fastapi_tracing
from .settings import get_system_settings
from .api.learning import router as learning_router
from .api.gemini_chat import router as gemini_chat_router
from .metrics import metrics_router, MetricsMiddleware
from .routers.organization import router as organization_router
from .routers.ada import router as ada_router

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown"""
    logger = structlog.get_logger(__name__)
    # Startup: Initialize cache
    cache = get_cache()
    await cache.connect()
    logger.info("Cache service started")
    yield
    # Shutdown: Close cache connection
    await cache.close()
    logger.info("Cache service stopped")

app = FastAPI(lifespan=lifespan)


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _positive_int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


OPENAI_WEB_SEARCH_ENABLED = _bool_env("OPENAI_WEB_SEARCH_ENABLED")
OPENAI_WEB_SEARCH_MODEL = os.getenv("OPENAI_WEB_SEARCH_MODEL", "gpt-4.1-mini")
WEB_FETCH_CACHE_RETENTION_DAYS = _positive_int_env("WEB_FETCH_CACHE_RETENTION_DAYS", 14)

telemetry_settings = get_system_settings().telemetry
SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", telemetry_settings.default_service)
SERVICE_VERSION = os.getenv("SERVICE_VERSION") or os.getenv("SENTRY_RELEASE")
RUNTIME_ENVIRONMENT = (
    os.getenv("SENTRY_ENVIRONMENT")
    or os.getenv("ENVIRONMENT")
    or telemetry_settings.resolve_environment()
)

tracer = configure_fastapi_tracing(
    app,
    service_name=SERVICE_NAME,
    environment=RUNTIME_ENVIRONMENT,
    version=SERVICE_VERSION,
)
app.add_middleware(RequestTelemetryMiddleware, tracer=tracer)

SENTRY_RELEASE = os.getenv("SENTRY_RELEASE")
SENTRY_ENVIRONMENT = RUNTIME_ENVIRONMENT
SENTRY_DSN = os.getenv("SENTRY_DSN")
SENTRY_ENABLED = bool(SENTRY_DSN)

if SENTRY_ENABLED:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        release=SENTRY_RELEASE,
        environment=SENTRY_ENVIRONMENT,
    )

PERMISSION_CONFIG_PATH = Path(__file__).resolve().parents[1] / "POLICY" / "permissions.json"
AUTONOMY_LEVEL_RANK = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
LEGACY_AUTONOMY_NUMERIC_MAP = {0: "L0", 1: "L1", 2: "L2", 3: "L3", 4: "L3", 5: "L3"}
DEFAULT_IMPERSONATION_EXPIRY_HOURS = 8
RESERVED_ORG_SETTINGS_FIELDS = {"default_role", "impersonation_breakglass_emails"}
TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")
INVITE_ACCEPT_BASE_URL = os.getenv("INVITE_ACCEPT_BASE_URL", "https://app.prismaglow.com/auth/accept-invite")


def resolve_agent_for_tool(tool_name: str) -> Optional[str]:
    normalised = tool_name.strip().lower()
    if not normalised:
        return None
    registry = get_agent_registry_config()
    for agent_id, definition in registry.items():
        tools = definition.get("tools") if isinstance(definition, Mapping) else None
        if not isinstance(tools, list):
            continue
        for entry in tools:
            if isinstance(entry, str) and entry.strip().lower() == normalised:
                return agent_id
    return None


def build_invite_link(token: str) -> str:
    try:
        parsed = urlparse(INVITE_ACCEPT_BASE_URL)
    except ValueError:  # pragma: no cover - defensive fallback
        return f"{INVITE_ACCEPT_BASE_URL}?token={token}"

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["token"] = token
    new_query = urlencode(query)
    return urlunparse(parsed._replace(query=new_query))


async def build_assistant_actions(org_id: str, autonomy_level: Optional[str] = None) -> List[Dict[str, Any]]:
    suggestions = await get_workflow_suggestions(
        org_id,
        supabase_table_request=supabase_table_request,
        autonomy_level=autonomy_level,
    )
    actions: List[Dict[str, Any]] = []
    for suggestion in suggestions:
        workflow = suggestion.get("workflow")
        step_index = suggestion.get("step_index")
        if workflow is None or step_index is None:
            continue
        actions.append(
            {
                "label": suggestion.get("label") or str(workflow),
                "tool": "workflows.run_step",
                "description": suggestion.get("description"),
                "args": {"workflow": workflow, "step": step_index},
            }
        )
        if len(actions) >= 2:
            break

    for fallback in FALLBACK_ASSISTANT_ACTIONS:
        if len(actions) >= 2:
            break
        if not any(action["tool"] == fallback["tool"] for action in actions):
            actions.append(dict(fallback))

    if len(actions) < 2:
        return [dict(entry) for entry in FALLBACK_ASSISTANT_ACTIONS[:2]]
    return actions

TRUSTED_HOSTS = os.getenv("ALLOWED_HOSTS", "").strip()
if TRUSTED_HOSTS:
    allowed_hosts = [host.strip() for host in TRUSTED_HOSTS.split(",") if host.strip()]
    if allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

BASE_SECURITY_HEADERS: Dict[str, str] = {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

SECURITY_HEADERS: Dict[str, str] = dict(BASE_SECURITY_HEADERS)

REQUEST_ID_HEADER = "X-Request-ID"
_request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def get_current_request_id() -> Optional[str]:
    return _request_id_ctx.get()


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    incoming = request.headers.get(REQUEST_ID_HEADER) or request.headers.get(REQUEST_ID_HEADER.lower())
    request_id = (incoming or "").strip() or str(uuid.uuid4())

    token = _request_id_ctx.set(request_id)
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    request.state.request_id = request_id
    if SENTRY_ENABLED:
        with sentry_sdk.configure_scope() as scope:
            scope.set_tag("request_id", request_id)

    try:
        response = await call_next(request)
    finally:
        structlog.contextvars.unbind_contextvars("request_id")
        _request_id_ctx.reset(token)

    response.headers.setdefault(REQUEST_ID_HEADER, request_id)
    return response


@app.middleware("http")
async def apply_security_headers(request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        if header not in response.headers:
            response.headers[header] = value
    return response

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


def _load_permission_map() -> Dict[str, str]:
    merged: Dict[str, str] = {}
    try:
        with PERMISSION_CONFIG_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            if isinstance(data, dict):
                for key, value in data.items():
                    if key is None or value is None:
                        continue
                    merged[str(key)] = str(value).upper()
    except FileNotFoundError:
        logger.warning("permissions.config_missing", path=str(PERMISSION_CONFIG_PATH))
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error("permissions.config_error", error=str(exc), path=str(PERMISSION_CONFIG_PATH))

    config_permissions = get_config_permission_map()
    for key, value in config_permissions.items():
        merged[str(key)] = str(value).upper()

    return merged


ALLOWED_ORIGINS = normalise_allowed_origins(os.getenv("API_ALLOWED_ORIGINS"))

# Apply security middleware (CORS is already configured above)
# Import rate limiting middleware
from .security_middleware import setup_rate_limiting

# Setup rate limiting
limiter = setup_rate_limiting(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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

SUPABASE_STORAGE_URL = SUPABASE_URL.rstrip("/") + "/storage/v1"
DOCUMENTS_BUCKET = os.getenv("SUPABASE_DOCUMENTS_BUCKET", "documents")
MAX_UPLOAD_BYTES = int(os.getenv("DOCUMENT_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))

extra_connect = [origin.strip() for origin in os.getenv("CSP_ADDITIONAL_CONNECT_SRC", "").split(",") if origin.strip()]
extra_img = [origin.strip() for origin in os.getenv("CSP_ADDITIONAL_IMG_SRC", "").split(",") if origin.strip()]

SECURITY_HEADERS["Content-Security-Policy"] = build_csp_header(
    SUPABASE_URL,
    SUPABASE_STORAGE_URL,
    extra_connect=extra_connect,
    extra_img=extra_img,
)

TASK_STATUS_VALUES = {"TODO", "IN_PROGRESS", "REVIEW", "COMPLETED"}
TASK_PRIORITY_VALUES = {"LOW", "MEDIUM", "HIGH", "URGENT"}
CONTROL_FREQUENCY_VALUES = {"DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL", "EVENT_DRIVEN"}
CONTROL_TEST_RESULT_VALUES = {"PASS", "EXCEPTIONS"}
CONTROL_WALKTHROUGH_RESULT_VALUES = {
    "DESIGNED",
    "NOT_DESIGNED",
    "IMPLEMENTED",
    "NOT_IMPLEMENTED",
}
DEFICIENCY_SEVERITY_VALUES = {"LOW", "MEDIUM", "HIGH"}
ITGC_GROUP_TYPE_VALUES = {"ACCESS", "CHANGE", "OPERATIONS"}
RECONCILIATION_TYPE_VALUES = {"BANK", "AR", "AP", "GRNI", "PAYROLL", "OTHER"}
RECONCILIATION_ITEM_CATEGORY_VALUES = {
    "OUTSTANDING_CHECKS",
    "DEPOSITS_IN_TRANSIT",
    "UNIDENTIFIED",
    "UNAPPLIED_RECEIPT",
    "UNAPPLIED_PAYMENT",
    "TIMING",
    "ERROR",
    "OTHER",
}


def _validate_control_frequency(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in CONTROL_FREQUENCY_VALUES:
        raise HTTPException(status_code=400, detail="invalid control frequency")
    return candidate


def _validate_control_walkthrough_result(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in CONTROL_WALKTHROUGH_RESULT_VALUES:
        raise HTTPException(status_code=400, detail="invalid walkthrough result")
    return candidate


def _validate_control_test_result(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in CONTROL_TEST_RESULT_VALUES:
        raise HTTPException(status_code=400, detail="invalid test result")
    return candidate


def _validate_deficiency_severity(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    candidate = value.upper()
    if candidate not in DEFICIENCY_SEVERITY_VALUES:
        raise HTTPException(status_code=400, detail="invalid deficiency severity")
    return candidate


def _validate_itgc_group_type(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in ITGC_GROUP_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="invalid itgc group type")
    return candidate


def _validate_reconciliation_type(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in RECONCILIATION_TYPE_VALUES:
        raise HTTPException(status_code=400, detail="invalid reconciliation type")
    return candidate


def _validate_reconciliation_item_category(value: str) -> str:
    candidate = (value or "").upper()
    if candidate not in RECONCILIATION_ITEM_CATEGORY_VALUES:
        raise HTTPException(status_code=400, detail="invalid reconciliation item category")
    return candidate


def _to_decimal(value: Optional[Any]) -> Decimal:
    if isinstance(value, Decimal):
        return value
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value))
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail="invalid numeric value") from exc


def _decimal_to_str(value: Decimal) -> str:
    try:
        quantised = value.quantize(Decimal('0.01'))
    except Exception:
        quantised = value
    return format(quantised, 'f')

NOTIFICATION_KIND_TO_FRONTEND = {
    "TASK": "task",
    "DOC": "document",
    "APPROVAL": "engagement",
    "SYSTEM": "system",
}

KNOWLEDGE_ALLOWED_DOMAINS = {"IAS", "IFRS", "ISA", "TAX", "ORG"}

ASSISTANT_RATE_LIMIT = int(os.getenv("ASSISTANT_RATE_LIMIT", "20"))
ASSISTANT_RATE_WINDOW = int(os.getenv("ASSISTANT_RATE_WINDOW_SECONDS", "60"))
DOCUMENT_UPLOAD_RATE_LIMIT = int(os.getenv("DOCUMENT_UPLOAD_RATE_LIMIT", "12"))
DOCUMENT_UPLOAD_RATE_WINDOW = int(os.getenv("DOCUMENT_UPLOAD_RATE_WINDOW_SECONDS", "300"))
KNOWLEDGE_RUN_RATE_LIMIT = int(os.getenv("KNOWLEDGE_RUN_RATE_LIMIT", "6"))
KNOWLEDGE_RUN_RATE_WINDOW = int(os.getenv("KNOWLEDGE_RUN_RATE_WINDOW_SECONDS", "900"))
KNOWLEDGE_PREVIEW_RATE_LIMIT = int(os.getenv("KNOWLEDGE_PREVIEW_RATE_LIMIT", "30"))
KNOWLEDGE_PREVIEW_RATE_WINDOW = int(os.getenv("KNOWLEDGE_PREVIEW_RATE_WINDOW_SECONDS", "300"))
RAG_INGEST_RATE_LIMIT = int(os.getenv("RAG_INGEST_RATE_LIMIT", "5"))
RAG_INGEST_RATE_WINDOW = int(os.getenv("RAG_INGEST_RATE_WINDOW_SECONDS", "600"))
RAG_REEMBED_RATE_LIMIT = int(os.getenv("RAG_REEMBED_RATE_LIMIT", "5"))
RAG_REEMBED_RATE_WINDOW = int(os.getenv("RAG_REEMBED_RATE_WINDOW_SECONDS", "600"))
RAG_SEARCH_RATE_LIMIT = int(os.getenv("RAG_SEARCH_RATE_LIMIT", "40"))
RAG_SEARCH_RATE_WINDOW = int(os.getenv("RAG_SEARCH_RATE_WINDOW_SECONDS", "60"))
AUTOPILOT_SCHEDULE_RATE_LIMIT = int(os.getenv("AUTOPILOT_SCHEDULE_RATE_LIMIT", "10"))
AUTOPILOT_SCHEDULE_RATE_WINDOW = int(os.getenv("AUTOPILOT_SCHEDULE_RATE_WINDOW_SECONDS", "600"))
AUTOPILOT_JOB_RATE_LIMIT = int(os.getenv("AUTOPILOT_JOB_RATE_LIMIT", "20"))
AUTOPILOT_JOB_RATE_WINDOW = int(os.getenv("AUTOPILOT_JOB_RATE_WINDOW_SECONDS", "600"))
ONBOARDING_START_RATE_LIMIT = int(os.getenv("ONBOARDING_START_RATE_LIMIT", "8"))
ONBOARDING_START_RATE_WINDOW = int(os.getenv("ONBOARDING_START_RATE_WINDOW_SECONDS", "600"))
ONBOARDING_LINK_RATE_LIMIT = int(os.getenv("ONBOARDING_LINK_RATE_LIMIT", "30"))
ONBOARDING_LINK_RATE_WINDOW = int(os.getenv("ONBOARDING_LINK_RATE_WINDOW_SECONDS", "300"))
ONBOARDING_COMMIT_RATE_LIMIT = int(os.getenv("ONBOARDING_COMMIT_RATE_LIMIT", "5"))
ONBOARDING_COMMIT_RATE_WINDOW = int(os.getenv("ONBOARDING_COMMIT_RATE_WINDOW_SECONDS", "900"))
ALLOWED_DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "image/jpeg",
    "image/png",
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


class ScopedRateLimiter:
    def __init__(self, redis_client: Optional[redis.Redis]):
        self.redis = redis_client
        self.local_buckets: Dict[str, List[float]] = defaultdict(list)

    def check(self, scope: str, key: str, limit: int, window: int) -> Tuple[bool, Optional[int]]:
        if limit <= 0:
            return True, None

        if self.redis is not None:
            redis_key = f"rl:{scope}:{key}"
            try:
                with self.redis.pipeline() as pipe:
                    pipe.incr(redis_key, 1)
                    pipe.expire(redis_key, window, nx=True)
                    current, _ = pipe.execute()
                ttl = self.redis.ttl(redis_key)
                if ttl < 0:
                    self.redis.expire(redis_key, window)
                    ttl = window
                if current > limit:
                    retry_after = ttl if ttl > 0 else window
                    return False, int(retry_after)
                return True, None
            except redis.RedisError:
                pass

        now = time.time()
        window_start = now - window
        bucket_key = f"{scope}:{key}"
        timestamps = [ts for ts in self.local_buckets[bucket_key] if ts > window_start]
        if len(timestamps) >= limit:
            retry_after = int(window - (now - min(timestamps)))
            return False, max(retry_after, 1)
        timestamps.append(now)
        self.local_buckets[bucket_key] = timestamps
        return True, None


scoped_rate_limiter = ScopedRateLimiter(redis_conn if redis_conn else None)


async def enforce_rate_limit(scope: str, user_id: str, *, limit: int, window: int) -> None:
    allowed, retry_after = scoped_rate_limiter.check(scope, user_id, limit, window)
    if not allowed:
        headers = {"Retry-After": str(retry_after)} if retry_after else None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"{scope} rate limit exceeded",
            headers=headers,
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


MEMBERSHIP_AUTONOMY_DEFAULTS = {
    "SYSTEM_ADMIN": ("L0", "L3"),
    "PARTNER": ("L1", "L3"),
    "EQR": ("L1", "L2"),
    "MANAGER": ("L1", "L2"),
    "SERVICE_ACCOUNT": ("L0", "L1"),
    "EMPLOYEE": ("L0", "L1"),
    "CLIENT": ("L0", "L0"),
    "READONLY": ("L0", "L0"),
}


def normalise_role(value: Optional[str]) -> str:
    return (value or "").upper()


def normalise_autonomy_level(value: Optional[str]) -> str:
    default_level = get_default_autonomy_level_value()
    if isinstance(value, str):
        candidate = value.strip().upper()
        if candidate in AUTONOMY_LEVEL_RANK:
            return candidate
    return default_level


def membership_settings_for_role(role: str) -> Dict[str, Any]:
    normalized = normalise_role(role)
    floor, ceiling = MEMBERSHIP_AUTONOMY_DEFAULTS.get(normalized, ("L0", "L2"))
    scope = _client_scope_settings()
    allowed = scope.get("allowed_repos", []) if normalized == "CLIENT" else []
    denied = scope.get("denied_actions", []) if normalized == "CLIENT" else []
    return {
        "autonomy_floor": normalise_autonomy_level(floor),
        "autonomy_ceiling": normalise_autonomy_level(ceiling),
        "client_portal_allowed_repos": list(allowed),
        "client_portal_denied_actions": list(denied),
        "is_service_account": normalized == "SERVICE_ACCOUNT",
    }


def is_autopilot_job_allowed(level: str, job_kind: str) -> bool:
    normalized_level = normalise_autonomy_level(level)
    allowances = get_autonomy_job_allowances_config()
    allowed = allowances.get(normalized_level)
    if allowed is None:
        default_level = get_default_autonomy_level_value()
        allowed = allowances.get(default_level, [])
    return job_kind.lower() in {entry.lower() for entry in allowed}


def requires_policy_escalation(level: str) -> bool:
    normalized_level = normalise_autonomy_level(level)
    return AUTONOMY_LEVEL_RANK.get(normalized_level, 0) >= AUTONOMY_LEVEL_RANK.get("L2", 2)


def minimum_autonomy_for_job(job_kind: str) -> str:
    job = (job_kind or "").lower()
    best_level: Optional[str] = None
    best_rank: Optional[int] = None
    allowances = get_autonomy_job_allowances_config()
    for level, jobs in allowances.items():
        job_entries = {entry.lower() for entry in jobs}
        if job in job_entries:
            rank = AUTONOMY_LEVEL_RANK.get(level, 0)
            if best_rank is None or rank < best_rank:
                best_level = level
                best_rank = rank
    return best_level or get_default_autonomy_level_value()


def ensure_min_role(role: Optional[str], minimum: str) -> None:
    ranks = get_role_rank_map_config()
    current_rank = ranks.get(normalise_role(role), 0)
    required_rank = ranks.get(normalise_role(minimum), ranks.get("EMPLOYEE", 0))
    if current_rank < required_rank:
        raise HTTPException(status_code=403, detail="insufficient role")


def has_manager_privileges(role: str) -> bool:
    ranks = get_role_rank_map_config()
    return ranks.get(normalise_role(role), 0) >= ranks.get("MANAGER", 0)


def get_required_role_for_permission(permission: str) -> Optional[str]:
    permission_map = get_permission_map_snapshot()
    required = permission_map.get(permission)
    return normalise_role(required) if isinstance(required, str) else None


def has_permission(role: Optional[str], permission: str) -> bool:
    normalized_role = normalise_role(role)
    required = get_required_role_for_permission(permission)
    if not required:
        return True
    ranks = get_role_rank_map_config()
    return ranks.get(normalized_role, 0) >= ranks.get(required, 0)


def is_action_denied_for_role(role: str, permission: str) -> bool:
    deny_map = get_role_deny_actions()
    denied = deny_map.get(role)
    return permission in denied if denied else False


def ensure_permission_for_role(role: Optional[str], permission: str) -> None:
    normalized_role = normalise_role(role)
    if is_action_denied_for_role(normalized_role, permission):
        raise HTTPException(status_code=403, detail="action_denied_for_role")
    if not has_permission(normalized_role, permission):
        raise HTTPException(status_code=403, detail="insufficient_permission")


def _normalise_email_domains(domains: Optional[Iterable[str]]) -> List[str]:
    if not domains:
        return []
    normalised: List[str] = []
    for entry in domains:
        if not entry:
            continue
        value = entry.strip().lower()
        if not value:
            continue
        if "@" in value:
            value = value.split("@", 1)[1]
        if value and value not in normalised:
            normalised.append(value)
    return normalised


def _normalise_emails(values: Optional[Iterable[str]]) -> List[str]:
    if not values:
        return []
    result: List[str] = []
    for value in values:
        if not value:
            continue
        candidate = value.strip().lower()
        if candidate and candidate not in result:
            result.append(candidate)
    return result


TEAM_ROLE_VALUES = {"LEAD", "MEMBER", "VIEWER"}


async def is_system_admin_user(user_id: str) -> bool:
    response = await supabase_table_request("GET", "users", params={"id": f"eq.{user_id}", "select": "is_system_admin", "limit": "1"})
    if response.status_code != 200:
        logger.error("supabase.users_admin_check_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="user lookup failed")
    rows = response.json()
    return bool(rows and rows[0].get("is_system_admin"))


async def log_activity_event(
    *,
    org_id: str,
    actor_id: str,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    payload = {
        "org_id": org_id,
        "user_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "module": "IAM",
    }
    response = await supabase_table_request("POST", "activity_log", json=payload, headers={"Prefer": "return=minimal"})
    if response.status_code not in (200, 201, 204):
        logger.error("activity.log_failed", status=response.status_code, body=response.text)


async def fetch_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    response = await supabase_table_request("GET", "user_profiles", params={"id": f"eq.{user_id}", "limit": "1"})
    if response.status_code != 200:
        logger.error("supabase.user_profile_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="profile lookup failed")
    rows = response.json()
    return rows[0] if rows else None


async def upsert_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    payload = {"id": user_id}
    payload.update(updates)
    response = await supabase_table_request("POST", "user_profiles", json=payload, headers={"Prefer": "resolution=merge-duplicates,return=representation"})
    if response.status_code not in (200, 201):
        logger.error("supabase.user_profile_upsert_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="profile update failed")
    rows = response.json()
    return rows[0] if rows else payload


async def fetch_membership(org_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    response = await supabase_table_request(
        "GET",
        "memberships",
        params={
            "org_id": f"eq.{org_id}",
            "user_id": f"eq.{user_id}",
            "select": "id,role,autonomy_floor,autonomy_ceiling,is_service_account,client_portal_allowed_repos,client_portal_denied_actions",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("supabase.membership_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="membership lookup failed")
    rows = response.json()
    return rows[0] if rows else None


async def count_managerial_members(org_id: str) -> int:
    response = await supabase_table_request("GET", "memberships", params={"org_id": f"eq.{org_id}", "role": "in.(MANAGER,PARTNER,SYSTEM_ADMIN,EQR)", "select": "id"})
    if response.status_code != 200:
        logger.error("supabase.membership_count_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="membership lookup failed")
    return len(response.json())


def validate_org_role(role: str) -> str:
    value = normalise_role(role)
    if value not in get_org_role_values():
        raise HTTPException(status_code=400, detail="invalid role")
    return value


def validate_team_role(role: Optional[str]) -> str:
    value = (role or "MEMBER").upper()
    if value not in TEAM_ROLE_VALUES:
        raise HTTPException(status_code=400, detail="invalid team role")
    return value


def ensure_role_not_below_manager(role: str) -> None:
    ranks = get_role_rank_map_config()
    if ranks.get(normalise_role(role), 0) < ranks.get("MANAGER", 0):
        raise HTTPException(status_code=403, detail="manager privileges required")


async def guard_actor_manager(org_id: str, actor_id: str) -> str:
    actor_membership = await fetch_membership(org_id, actor_id)
    if actor_membership:
        ensure_min_role(actor_membership.get("role"), "MANAGER")
        return normalise_role(actor_membership.get("role"))
    if await is_system_admin_user(actor_id):
        return "SYSTEM_ADMIN"
    raise HTTPException(status_code=403, detail="manager privileges required")


async def guard_system_admin(actor_id: str) -> None:
    if not await is_system_admin_user(actor_id):
        raise HTTPException(status_code=403, detail="system admin required")


async def fetch_org_settings(org_id: str) -> Dict[str, Any]:
    response = await supabase_table_request(
        "GET",
        "organizations",
        params={
            "id": f"eq.{org_id}",
            "select": "id,allowed_email_domains,default_role,require_mfa_for_sensitive,impersonation_breakglass_emails",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("org.settings_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="organization lookup failed")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="organization not found")
    return rows[0]


async def require_recent_whatsapp_mfa(org_id: str, user_id: str, *, within_seconds: int = 86400) -> None:
    params = {
        "org_id": f"eq.{org_id}",
        "user_id": f"eq.{user_id}",
        "channel": "eq.WHATSAPP",
        "consumed": "eq.true",
        "order": "created_at.desc",
        "limit": "1",
    }
    response = await supabase_table_request("GET", "mfa_challenges", params=params)
    if response.status_code != 200:
        logger.error(
            "mfa.challenge_lookup_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
            user_id=user_id,
        )
        raise HTTPException(status_code=502, detail="mfa_lookup_failed")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=403, detail="mfa_required")

    created_at_value = rows[0].get("created_at")
    if not created_at_value:
        raise HTTPException(status_code=403, detail="mfa_required")

    try:
        created_at = datetime.fromisoformat(created_at_value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=403, detail="mfa_required")

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) - created_at > timedelta(seconds=within_seconds):
        raise HTTPException(status_code=403, detail="mfa_required")


async def resolve_org_context(user_id: str, org_slug: str) -> Dict[str, str]:
    slug = (org_slug or "").strip()
    if not slug:
        raise HTTPException(status_code=400, detail="orgSlug is required")

    async with httpx.AsyncClient(timeout=5.0) as client:
        org_resp = await client.get(
            f"{SUPABASE_REST_URL}/organizations",
            params={"slug": f"eq.{slug}", "select": "id,slug,autonomy_level"},
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
            params={
                "org_id": f"eq.{org['id']}",
                "user_id": f"eq.{user_id}",
                "select": "role,autonomy_floor,autonomy_ceiling,is_service_account,client_portal_allowed_repos,client_portal_denied_actions",
            },
            headers=SUPABASE_HEADERS,
        )
        if membership_resp.status_code != 200:
            logger.error("supabase.memberships_error", status=membership_resp.status_code, body=membership_resp.text)
            raise HTTPException(status_code=502, detail="membership lookup failed")
        membership_rows = membership_resp.json()

        autonomy_level = normalise_autonomy_level(org.get("autonomy_level"))

        if membership_rows:
            record = membership_rows[0]
            role = record.get("role") or "EMPLOYEE"
            autonomy_floor = normalise_autonomy_level(record.get("autonomy_floor"))
            autonomy_ceiling = normalise_autonomy_level(record.get("autonomy_ceiling"))
            scope = {
                "allowed_repos": record.get("client_portal_allowed_repos") or [],
                "denied_actions": record.get("client_portal_denied_actions") or [],
            }
            return {
                "org_id": org["id"],
                "role": role,
                "autonomy_level": autonomy_level,
                "autonomy_floor": autonomy_floor,
                "autonomy_ceiling": autonomy_ceiling,
                "is_service_account": bool(record.get("is_service_account")),
                "client_portal_scope": scope,
            }

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

        defaults = membership_settings_for_role("SYSTEM_ADMIN")
        return {
            "org_id": org["id"],
            "role": "SYSTEM_ADMIN",
            "autonomy_level": autonomy_level,
            "autonomy_floor": defaults["autonomy_floor"],
            "autonomy_ceiling": defaults["autonomy_ceiling"],
            "is_service_account": False,
            "client_portal_scope": {
                "allowed_repos": defaults["client_portal_allowed_repos"],
                "denied_actions": defaults["client_portal_denied_actions"],
            },
        }


async def ensure_org_access_by_id(user_id: str, org_id: str) -> str:
    async with httpx.AsyncClient(timeout=5.0) as client:
        membership_resp = await client.get(
            f"{SUPABASE_REST_URL}/memberships",
            params={"org_id": f"eq.{org_id}", "user_id": f"eq.{user_id}", "select": "role", "limit": "1"},
            headers=SUPABASE_HEADERS,
        )
        if membership_resp.status_code != 200:
            logger.error(
                "supabase.membership_lookup_failed",
                status=membership_resp.status_code,
                body=membership_resp.text,
            )
            raise HTTPException(status_code=502, detail="membership lookup failed")
        membership_rows = membership_resp.json()
        if membership_rows:
            return membership_rows[0].get("role") or "EMPLOYEE"

        user_resp = await client.get(
            f"{SUPABASE_REST_URL}/users",
            params={"id": f"eq.{user_id}", "select": "is_system_admin", "limit": "1"},
            headers=SUPABASE_HEADERS,
        )
        if user_resp.status_code != 200:
            logger.error("supabase.user_lookup_failed", status=user_resp.status_code, body=user_resp.text)
            raise HTTPException(status_code=502, detail="user lookup failed")
        user_rows = user_resp.json()
        if user_rows and user_rows[0].get("is_system_admin"):
            return "SYSTEM_ADMIN"

    raise HTTPException(status_code=403, detail="forbidden")


async def supabase_request(
    method: str,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    data: Optional[Any] = None,
    content: Optional[bytes] = None,
    headers: Optional[Dict[str, str]] = None,
) -> httpx.Response:
    request_headers = dict(SUPABASE_HEADERS)
    if headers:
        request_headers.update(headers)
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.request(
            method,
            url,
            params=params,
            json=json,
            data=data,
            content=content,
            headers=request_headers,
        )
    return response


async def supabase_table_request(
    method: str,
    table: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    headers: Optional[Dict[str, str]] = None,
) -> httpx.Response:
    return await supabase_request(method, f"{SUPABASE_REST_URL}/{table}", params=params, json=json, headers=headers)


def extract_total_count(response: httpx.Response) -> int:
    content_range = response.headers.get("content-range")
    if content_range and "/" in content_range:
        try:
            return int(content_range.split("/")[-1])
        except (ValueError, TypeError):
            pass
    try:
        payload = response.json()
    except ValueError:
        return 0
    if isinstance(payload, list):
        return len(payload)
    return 0


async def fetch_single_record(table: str, record_id: str, select: str = "*") -> Optional[Dict[str, Any]]:
    params = {"id": f"eq.{record_id}", "select": select, "limit": "1"}
    response = await supabase_table_request("GET", table, params=params)
    if response.status_code != 200:
        logger.error("supabase.fetch_single_failed", table=table, status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="upstream fetch failed")
    rows = response.json()
    return rows[0] if rows else None


async def count_table_rows(table: str, params: Dict[str, Any]) -> int:
    response = await supabase_table_request(
        "GET",
        table,
        params={**params, "select": "id"},
        headers={"Prefer": "count=exact"},
    )
    if response.status_code != 200:
        logger.warning("supabase.count_failed", table=table, status=response.status_code, body=response.text)
        return 0
    return extract_total_count(response)


async def gather_before_asking_sequence(org_id: str) -> List[Dict[str, Any]]:
    sequence_results: List[Dict[str, Any]] = []
    for source in get_before_asking_sequence_config():
        if source == "documents":
            count = await count_table_rows("documents", {"org_id": f"eq.{org_id}"})
        elif source == "google_drive":
            count = await count_table_rows("gdrive_documents", {"org_id": f"eq.{org_id}"})
        elif source == "url_sources":
            count = await count_table_rows("web_fetch_cache", {})
        else:
            count = 0
        sequence_results.append({"source": source, "count": count, "available": count > 0})
    return sequence_results


def summarise_before_asking_sequence(sequence_results: List[Dict[str, Any]]) -> List[str]:
    labels = {
        "documents": "Internal workspace documents",
        "google_drive": "Google Drive mirror",
        "url_sources": "Curated web sources",
    }
    lines: List[str] = []
    for entry in sequence_results:
        label = labels.get(entry.get("source"), str(entry.get("source")))
        count = entry.get("count", 0) or 0
        available = bool(entry.get("available"))
        if available:
            plural = "s" if count != 1 else ""
            lines.append(f"• {label}: {count} item{plural} ready")
        else:
            lines.append(f"• {label}: none available yet")
    return lines


async def log_before_asking_sequence(org_id: str, user_id: str, reason: str) -> List[Dict[str, Any]]:
    sequence_results = await gather_before_asking_sequence(org_id)

    logger.info(
        "assistant.before_asking_user_exhausted",
        org_id=org_id,
        user_id=user_id,
        reason=reason,
        sequence=sequence_results,
    )
    return sequence_results


async def fetch_org_autonomy_level(org_id: str) -> str:
    response = await supabase_table_request(
        "GET",
        "organizations",
        params={"id": f"eq.{org_id}", "select": "autonomy_level", "limit": "1"},
    )
    if response.status_code != 200:
        logger.error(
            "supabase.org_autonomy_fetch_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
        )
        return get_default_autonomy_level_value()
    rows = response.json()
    if not rows:
        return get_default_autonomy_level_value()
    return normalise_autonomy_level(rows[0].get("autonomy_level"))


def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename or "document")
    safe = "".join(ch if ch.isalnum() or ch in {".", "_", "-"} else "_" for ch in base)
    return safe or "document"


def iso_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def map_task_response(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "org_id": row.get("org_id"),
        "engagement_id": row.get("engagement_id"),
        "title": row.get("title"),
        "description": row.get("description"),
        "status": row.get("status"),
        "priority": row.get("priority"),
        "due_date": row.get("due_date"),
        "assigned_to": row.get("assigned_to"),
        "created_by": row.get("created_by"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


async def insert_task_record(
    *,
    org_id: str,
    creator_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    status_value = (payload.get("status") or "TODO").upper()
    priority_value = (payload.get("priority") or "MEDIUM").upper()

    if status_value not in TASK_STATUS_VALUES:
        raise HTTPException(status_code=400, detail="invalid task status")
    if priority_value not in TASK_PRIORITY_VALUES:
        raise HTTPException(status_code=400, detail="invalid task priority")

    supabase_payload = {
        "org_id": org_id,
        "title": (payload.get("title") or "Untitled Task").strip(),
        "description": payload.get("description"),
        "status": status_value,
        "priority": priority_value,
        "engagement_id": payload.get("engagement_id") or payload.get("engagementId"),
        "assigned_to": payload.get("assigned_to") or payload.get("assigneeId"),
        "due_date": payload.get("due_date") or payload.get("dueDate"),
        "created_by": creator_id,
        "updated_at": iso_now(),
    }

    response = await supabase_table_request(
        "POST",
        "tasks",
        json=supabase_payload,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 201):
        logger.error("tasks.insert_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create task")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=502, detail="task creation returned no rows")

    return rows[0]


def map_document_response(row: Dict[str, Any]) -> Dict[str, Any]:
    extraction_rows = row.get("document_extractions")
    latest_extraction = extraction_rows[0] if isinstance(extraction_rows, list) and extraction_rows else None
    extraction_payload = None
    if latest_extraction:
        extraction_payload = {
            "status": latest_extraction.get("status"),
            "fields": latest_extraction.get("fields") or {},
            "confidence": latest_extraction.get("confidence"),
            "updated_at": latest_extraction.get("updated_at"),
            "provenance": latest_extraction.get("provenance") or [],
            "extractor_name": latest_extraction.get("extractor_name"),
            "document_type": latest_extraction.get("document_type"),
        }

    quarantine_rows = row.get("document_quarantine")
    quarantine_entry = quarantine_rows[0] if isinstance(quarantine_rows, list) and quarantine_rows else None
    quarantined = bool(quarantine_entry and (quarantine_entry.get("status") or "").upper() == "PENDING")

    return {
        "id": row.get("id"),
        "org_id": row.get("org_id"),
        "engagement_id": row.get("entity_id"),
        "name": row.get("name"),
        "file_path": row.get("storage_path"),
        "file_size": row.get("file_size"),
        "file_type": row.get("mime_type"),
        "uploaded_by": row.get("uploaded_by"),
        "created_at": row.get("created_at"),
        "repo_folder": row.get("repo_folder"),
        "classification": row.get("classification"),
        "deleted": row.get("deleted", False),
        "ocr_status": row.get("ocr_status"),
        "parse_status": row.get("parse_status"),
        "portal_visible": bool(row.get("portal_visible")),
        "extraction": extraction_payload,
        "quarantined": quarantined,
    }


async def create_notification(
    *,
    org_id: str,
    user_id: Optional[str],
    kind: str,
    title: str,
    body: Optional[str] = None,
    link: Optional[str] = None,
    urgent: bool = False,
) -> None:
    if not user_id:
        return

    payload = {
        "org_id": org_id,
        "user_id": user_id,
        "kind": kind,
        "title": title,
        "body": body,
        "link": link,
        "urgent": urgent,
    }

    try:
        await supabase_table_request(
            "POST",
            "notifications",
            json=payload,
            headers={"Prefer": "return=minimal"},
        )
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("notifications.create_failed", error=str(exc))


async def record_agent_trace(
    *,
    org_id: str,
    user_id: Optional[str],
    tool: str,
    inputs: Dict[str, Any],
    outputs: Dict[str, Any],
    document_ids: Optional[List[str]] = None,
) -> None:
    payload = {
        "org_id": org_id,
        "user_id": user_id,
        "tool": tool,
        "input": inputs,
        "output": outputs,
        "document_ids": document_ids or [],
    }

    try:
        await supabase_table_request(
            "POST",
            "agent_trace",
            json=payload,
            headers={"Prefer": "return=minimal"},
        )
    except Exception as exc:  # pragma: no cover - trace logging failures should not interrupt flow
        logger.warning("agent_trace.record_failed", error=str(exc), tool=tool)


def _json_coerce(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_coerce(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_coerce(item) for item in value]
    return str(value)


async def _fetch_pending_autopilot_jobs(limit: int) -> List[Dict[str, Any]]:
    params = {
        "select": "id,org_id,kind,payload,status,scheduled_at,attempts,started_at",
        "status": "eq.PENDING",
        "attempts": f"lt.{AUTOPILOT_MAX_ATTEMPTS}",
        "order": "scheduled_at.asc",
        "limit": str(limit),
    }
    response = await supabase_table_request("GET", "jobs", params=params)
    if response.status_code != 200:
        logger.error(
            "autopilot.fetch_jobs_failed",
            status=response.status_code,
            body=response.text,
        )
        return []
    return response.json()


async def _claim_autopilot_job(job: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    attempts = (job.get("attempts") or 0) + 1
    params = {
        "id": f"eq.{job['id']}",
        "status": "eq.PENDING",
    }
    payload = {
        "status": "RUNNING",
        "attempts": attempts,
        "started_at": iso_now(),
    }
    response = await supabase_table_request(
        "PATCH",
        "jobs",
        params=params,
        json=payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 204):
        logger.error(
            "autopilot.claim_failed",
            status=response.status_code,
            job_id=job.get("id"),
            body=response.text,
        )
        return None
    rows = response.json() if response.content else []
    if not rows:
        return None
    claimed = rows[0]
    claimed.setdefault("attempts", attempts)
    return claimed


async def _record_autopilot_trace(
    job: Dict[str, Any],
    *,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> None:
    org_id = job.get("org_id")
    if not org_id:
        return

    outputs: Dict[str, Any] = {"status": status.lower()}
    if result:
        cleaned = {k: _json_coerce(v) for k, v in result.items() if k != "document_ids"}
        if cleaned:
            outputs["result"] = cleaned
    if error:
        outputs["error"] = error

    document_ids = []
    if result and isinstance(result.get("document_ids"), list):
        document_ids = [str(item) for item in result["document_ids"]]

    inputs = {
        "jobId": job.get("id"),
        "payload": _json_coerce(job.get("payload")),
    }

    await record_agent_trace(
        org_id=org_id,
        user_id=None,
        tool=f"autopilot.{job.get('kind', 'unknown')}",
        inputs=inputs,
        outputs=outputs,
        document_ids=document_ids,
    )


async def _emit_manifest_alert(job: Dict[str, Any], reason: str) -> None:
    org_id = job.get("org_id")
    if not org_id:
        return
    event = None
    try:
        event = build_telemetry_alert_event(
            alert_type="DETERMINISTIC_MANIFEST_MISSING",
            severity="CRITICAL",
            message=f"Deterministic manifest {reason} for {job.get('kind')}",
            org_id=org_id,
            context={
                "jobId": job.get("id"),
                "kind": job.get("kind"),
                "reason": reason,
            },
        )
    except AnalyticsEventValidationError as exc:
        logger.error(
            "autopilot.manifest_alert_validation_failed",
            job_id=job.get("id"),
            org_id=org_id,
            reason=reason,
            errors=exc.errors,
        )
        event = None
    except Exception as exc:  # pragma: no cover - defensive fallback
        logger.error(
            "autopilot.manifest_alert_unexpected_error",
            job_id=job.get("id"),
            org_id=org_id,
            reason=reason,
            error=str(exc),
        )
        event = None

    payload: Dict[str, Any]
    if event is not None:
        span = trace.get_current_span()
        if span is not None:
            span.add_event(
                event.name,
                {
                    "event.alert_type": event.properties["alertType"],
                    "event.severity": event.properties["severity"],
                    "event.reason": event.properties["context"].get("reason"),
                },
            )
        payload = telemetry_alert_row(event)
    else:
        payload = {
            "org_id": org_id,
            "alert_type": "DETERMINISTIC_MANIFEST_MISSING",
            "severity": "CRITICAL",
            "message": f"Deterministic manifest {reason} for {job.get('kind')}",
            "context": {
                "jobId": job.get("id"),
                "kind": job.get("kind"),
                "reason": reason,
            },
        }

    try:
        await supabase_table_request(
            "POST",
            "telemetry_alerts",
            json=payload,
            headers={"Prefer": "return=minimal"},
        )
    except Exception as exc:  # pragma: no cover - defensive logging
        logger.error(
            "autopilot.manifest_alert_failed",
            job_id=job.get("id"),
            org_id=org_id,
            reason=reason,
            error=str(exc),
        )


async def _validate_manifest_for_job(job: Dict[str, Any], result: Optional[Dict[str, Any]]) -> bool:
    if not isinstance(result, Mapping):
        await _emit_manifest_alert(job, "missing")
        return False
    manifest = result.get("manifest")
    if isinstance(manifest, Mapping) and validate_manifest(manifest):
        return True
    await _emit_manifest_alert(job, "invalid" if isinstance(manifest, Mapping) else "missing")
    return False


async def _finalise_autopilot_job(
    job: Dict[str, Any],
    *,
    status: str,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> None:
    await _record_autopilot_trace(job, status=status, result=result, error=error)

    payload_copy = job.get("payload")
    if isinstance(payload_copy, dict):
        payload_copy = copy.deepcopy(payload_copy)
    else:
        payload_copy = {}

    run_entry: Dict[str, Any] = {
        "status": status.lower(),
        "finishedAt": iso_now(),
    }
    if result:
        run_entry["result"] = _json_coerce(result)
    if error:
        run_entry["error"] = _json_coerce(error)
    payload_copy["lastRun"] = run_entry

    if status.upper() == "DONE":
        await _validate_manifest_for_job(job, result)

    response = await supabase_table_request(
        "PATCH",
        "jobs",
        params={"id": f"eq.{job['id']}"},
        json={
            "status": status,
            "finished_at": run_entry["finishedAt"],
            "payload": payload_copy,
        },
        headers={"Prefer": "return=minimal"},
    )
    if response.status_code not in (200, 204):
        logger.error(
            "autopilot.finalise_failed",
            job_id=job.get("id"),
            status=response.status_code,
            body=response.text,
        )


async def _handle_autopilot_extract_documents(job: Dict[str, Any]) -> Dict[str, Any]:
    return await handle_extract_documents(
        job,
        supabase_table_request=supabase_table_request,
        iso_now=iso_now,
        logger=logger,
        batch_limit=AUTOPILOT_BATCH_LIMIT,
    )


async def _handle_autopilot_remind_pbc(job: Dict[str, Any]) -> Dict[str, Any]:
    org_id = job.get("org_id")
    if not org_id:
        return {"pending": 0, "message": "Missing organisation context"}

    params = {
        "select": "id,label,status",
        "org_id": f"eq.{org_id}",
        "status": "neq.COMPLETED",
        "limit": "100",
    }
    response = await supabase_table_request("GET", "pbc_items", params=params)
    if response.status_code != 200:
        logger.error(
            "autopilot.remind_pbc_failed",
            status=response.status_code,
            body=response.text,
        )
        return {"pending": 0, "message": "Failed to read outstanding PBC items"}

    pending_items = response.json()
    return {
        "pending": len(pending_items),
        "message": "Evaluated outstanding PBC items",
    }


async def _handle_autopilot_refresh_analytics(job: Dict[str, Any]) -> Dict[str, Any]:
    await reembed_job()
    await anomaly_scan_job()
    await policy_check_job()
    return {"refreshed": True, "message": "Analytics jobs executed"}


async def _autopilot_collect_approvals(org_id: str) -> Tuple[int, List[Dict[str, Any]], List[str]]:
    params = {
        "org_id": f"eq.{org_id}",
        "status": "eq.PENDING",
        "order": "created_at.asc",
        "limit": "25",
        "select": "id,kind,stage,created_at",
    }
    response = await supabase_table_request(
        "GET",
        "approval_queue",
        params=params,
        headers={"Prefer": "count=exact"},
    )
    if response.status_code != 200:
        logger.warning(
            "autopilot.approvals_fetch_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
        )
        return 0, [], []

    total = extract_total_count(response)
    rows = response.json() or []
    entries: List[Dict[str, Any]] = []
    evidence: List[str] = []
    for row in rows:
        approval_id = row.get("id")
        if approval_id:
            evidence.append(str(approval_id))
        if len(entries) < 5:
            entries.append(
                {
                    "id": approval_id,
                    "kind": row.get("kind"),
                    "stage": row.get("stage"),
                    "createdAt": row.get("created_at"),
                }
            )
    return total, entries, evidence


async def _autopilot_collect_alerts(org_id: str, domain: str) -> Tuple[int, List[Dict[str, Any]]]:
    params = {
        "org_id": f"eq.{org_id}",
        "resolved_at": "is.null",
        "order": "created_at.desc",
        "limit": "10",
        "select": "id,alert_type,severity,message,created_at",
    }
    domain_filter = (domain or "").strip().upper()
    if domain_filter:
        params["alert_type"] = f"ilike.*{domain_filter}*"

    response = await supabase_table_request(
        "GET",
        "telemetry_alerts",
        params=params,
        headers={"Prefer": "count=exact"},
    )
    if response.status_code != 200:
        logger.warning(
            "autopilot.alerts_fetch_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
            domain=domain,
        )
        return 0, []

    total = extract_total_count(response)
    rows = response.json() or []
    alerts: List[Dict[str, Any]] = []
    for row in rows[:5]:
        alerts.append(
            {
                "id": row.get("id"),
                "type": row.get("alert_type"),
                "severity": row.get("severity"),
                "message": row.get("message"),
                "createdAt": row.get("created_at"),
            }
        )
    return total, alerts


async def _autopilot_workflow_job(
    job: Dict[str, Any],
    *,
    workflow_key: str,
    domain: str,
    domain_label: str,
    leave_remaining: int = 0,
) -> Dict[str, Any]:
    org_id = job.get("org_id")
    if not org_id:
        manifest = build_manifest(
            kind=f"autopilot.{domain}",
            inputs={"jobId": job.get("id"), "workflow": workflow_key},
            outputs={"completedSteps": 0, "remainingSteps": 0, "pendingApprovals": 0},
            evidence=[],
            metadata={"domainLabel": domain_label},
        )
        return {
            "domain": domain,
            "domainLabel": domain_label,
            "workflow": workflow_key,
            "summary": "Missing organisation context",
            "run": {"steps": {"total": 0, "completed": 0, "remaining": 0, "staged": 0}},
            "approvals": {"pending": 0, "expected": []},
            "telemetry": {"open": 0, "alerts": []},
            "manifest": manifest,
        }

    definitions = get_workflow_definitions()
    workflow_def = definitions.get(workflow_key)
    if not workflow_def:
        manifest = build_manifest(
            kind=f"autopilot.{domain}",
            inputs={"jobId": job.get("id"), "orgId": org_id, "workflow": workflow_key},
            outputs={"completedSteps": 0, "remainingSteps": 0, "pendingApprovals": 0},
            evidence=[str(org_id)],
            metadata={"domainLabel": domain_label, "error": "workflow_missing"},
        )
        return {
            "domain": domain,
            "domainLabel": domain_label,
            "workflow": workflow_key,
            "summary": "Workflow definition unavailable",
            "run": {"steps": {"total": 0, "completed": 0, "remaining": 0, "staged": 0}},
            "approvals": {"pending": 0, "expected": []},
            "telemetry": {"open": 0, "alerts": []},
            "manifest": manifest,
        }

    run = await ensure_workflow_run(
        org_id,
        workflow_key,
        triggered_by="autopilot",
        supabase_table_request=supabase_table_request,
        iso_now=iso_now,
    )
    if not run:
        manifest = build_manifest(
            kind=f"autopilot.{domain}",
            inputs={"jobId": job.get("id"), "orgId": org_id, "workflow": workflow_key},
            outputs={"completedSteps": 0, "remainingSteps": 0, "pendingApprovals": 0},
            evidence=[str(org_id)],
            metadata={"domainLabel": domain_label, "error": "run_not_created"},
        )
        return {
            "domain": domain,
            "domainLabel": domain_label,
            "workflow": workflow_key,
            "summary": "Could not start workflow run",
            "run": {"steps": {"total": 0, "completed": 0, "remaining": 0, "staged": 0}},
            "approvals": {"pending": 0, "expected": workflow_def.get("approvals", [])},
            "telemetry": {"open": 0, "alerts": []},
            "manifest": manifest,
        }

    steps = workflow_def.get("steps") or []
    total_steps = int(run.get("total_steps") or len(steps))
    start_index = int(run.get("current_step_index") or 0)
    staged_steps: List[Dict[str, Any]] = []
    target_end = max(0, len(steps) - max(leave_remaining, 0))
    run_state = run

    for step_index in range(start_index, target_end):
        if step_index >= len(steps):
            break
        step = steps[step_index]
        staged_steps.append(
            {
                "index": step_index,
                "agent": step.get("agent_id"),
                "tool": step.get("tool"),
            }
        )
        run_state = await complete_workflow_step(
            run_state,
            workflow_key,
            step_index=step_index,
            args={"trigger": "autopilot", "jobId": job.get("id")},
            result={
                "status": "STAGED",
                "agent": step.get("agent_id"),
                "tool": step.get("tool"),
                "domain": domain,
            },
            supabase_table_request=supabase_table_request,
            iso_now=iso_now,
            actor_id=None,
        ) or run_state

    final_run = run_state or run
    completed_total = int(final_run.get("current_step_index") or 0)
    if total_steps and completed_total > total_steps:
        completed_total = total_steps
    remaining_steps = max(total_steps - completed_total, 0)

    pending_approvals, approval_samples, approval_evidence = await _autopilot_collect_approvals(org_id)
    alert_count, alerts = await _autopilot_collect_alerts(org_id, domain)

    evidence: List[str] = []
    if final_run.get("id"):
        evidence.append(str(final_run["id"]))
    evidence.extend(approval_evidence)
    if not evidence:
        evidence = [str(org_id)]

    manifest = build_manifest(
        kind=f"autopilot.{domain}",
        inputs={
            "jobId": job.get("id"),
            "orgId": org_id,
            "workflow": workflow_key,
            "stagedSteps": len(staged_steps),
        },
        outputs={
            "completedSteps": completed_total,
            "remainingSteps": remaining_steps,
            "pendingApprovals": pending_approvals,
            "openAlerts": alert_count,
        },
        evidence=evidence,
        metadata={
            "domainLabel": domain_label,
            "expectedApprovals": workflow_def.get("approvals", []),
        },
    )

    staged_count = len(staged_steps)
    summary = (
        f"{domain_label} autopilot staged {staged_count} step{'s' if staged_count != 1 else ''}; "
        f"{pending_approvals} approval{'s' if pending_approvals != 1 else ''} pending; "
        f"{remaining_steps} step{'s' if remaining_steps != 1 else ''} remaining."
    )

    return {
        "domain": domain,
        "domainLabel": domain_label,
        "workflow": workflow_key,
        "summary": summary,
        "run": {
            "id": final_run.get("id"),
            "status": final_run.get("status"),
            "steps": {
                "total": total_steps,
                "completed": completed_total,
                "remaining": remaining_steps,
                "staged": staged_count,
            },
            "stagedSteps": staged_steps[:5],
        },
        "approvals": {
            "pending": pending_approvals,
            "expected": workflow_def.get("approvals", []),
            "samples": approval_samples,
        },
        "telemetry": {"open": alert_count, "alerts": alerts},
        "manifest": manifest,
    }


async def _handle_autopilot_close_cycle(job: Dict[str, Any]) -> Dict[str, Any]:
    return await _autopilot_workflow_job(
        job,
        workflow_key="monthly_close",
        domain="close",
        domain_label="Accounting Close",
        leave_remaining=1,
    )


async def _handle_autopilot_audit_fieldwork(job: Dict[str, Any]) -> Dict[str, Any]:
    return await _autopilot_workflow_job(
        job,
        workflow_key="external_audit",
        domain="audit",
        domain_label="Audit Fieldwork",
        leave_remaining=1,
    )


async def _handle_autopilot_tax_cycle(job: Dict[str, Any]) -> Dict[str, Any]:
    return await _autopilot_workflow_job(
        job,
        workflow_key="tax_cycle",
        domain="tax",
        domain_label="Tax Cycle",
        leave_remaining=0,
    )


AUTOPILOT_JOB_HANDLERS = {
    "extract_documents": _handle_autopilot_extract_documents,
    "remind_pbc": _handle_autopilot_remind_pbc,
    "refresh_analytics": _handle_autopilot_refresh_analytics,
    "close_cycle": _handle_autopilot_close_cycle,
    "audit_fieldwork": _handle_autopilot_audit_fieldwork,
    "tax_cycle": _handle_autopilot_tax_cycle,
}


async def _run_autopilot_job(job: Dict[str, Any]) -> None:
    raw_kind = job.get("kind")
    kind = (raw_kind or "").lower()
    handler = AUTOPILOT_JOB_HANDLERS.get(kind)
    if handler is None:
        raise ValueError(f"unsupported autopilot job kind: {raw_kind}")

    org_id = job.get("org_id")
    autonomy_level = get_default_autonomy_level_value()
    if org_id:
        autonomy_level = await fetch_org_autonomy_level(org_id)
    if not is_autopilot_job_allowed(autonomy_level, kind):
        message = f"Autonomy level {autonomy_level} does not permit job {kind}"
        logger.info(
            "autonomy.worker_blocked",
            job_id=job.get("id"),
            kind=kind,
            autonomy_level=autonomy_level,
            org_id=org_id,
        )
        await _finalise_autopilot_job(job, status="FAILED", error=message)
        return

    logger.info("autopilot.job_started", job_id=job.get("id"), kind=kind, org_id=org_id)
    try:
        result = await handler(job)
    except Exception as exc:
        error_message = str(exc)
        await _finalise_autopilot_job(job, status="FAILED", error=error_message)
        logger.error(
            "autopilot.job_failed",
            job_id=job.get("id"),
            kind=kind,
            error=error_message,
        )
        return

    await _finalise_autopilot_job(job, status="DONE", result=result)
    logger.info(
        "autopilot.job_completed",
        job_id=job.get("id"),
        kind=kind,
        result=_json_coerce(result),
    )


async def _autopilot_worker_loop() -> None:
    logger.info(
        "autopilot.worker_started",
        poll_interval=AUTOPILOT_POLL_INTERVAL,
        batch_limit=AUTOPILOT_BATCH_LIMIT,
    )
    try:
        while True:
            try:
                jobs = await _fetch_pending_autopilot_jobs(AUTOPILOT_BATCH_LIMIT)
                if not jobs:
                    await asyncio.sleep(AUTOPILOT_POLL_INTERVAL)
                    continue

                for job in jobs:
                    claimed = await _claim_autopilot_job(job)
                    if not claimed:
                        continue
                    await _run_autopilot_job(claimed)

                await asyncio.sleep(AUTOPILOT_ACTIVE_INTERVAL)
            except asyncio.CancelledError:
                raise
            except Exception as exc:  # pragma: no cover - defensive logging
                logger.exception("autopilot.worker_iteration_failed", error=str(exc))
                await asyncio.sleep(AUTOPILOT_POLL_INTERVAL)
    except asyncio.CancelledError:
        logger.info("autopilot.worker_cancelled")
        raise
async def fetch_open_tasks(org_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    response = await supabase_table_request(
        "GET",
        "tasks",
        params={
            "select": "id,title,status,priority,due_date,assigned_to,created_at",
            "org_id": f"eq.{org_id}",
            "status": "neq.COMPLETED",
            "order": "due_date.asc",
            "limit": str(limit),
        },
    )
    if response.status_code != 200:
        logger.warning("assistant.fetch_tasks_failed", status=response.status_code, body=response.text)
        return []
    return response.json()


async def fetch_recent_documents(org_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    response = await supabase_table_request(
        "GET",
        "documents",
        params={
            "select": "id,name,repo_folder,classification,created_at",
            "org_id": f"eq.{org_id}",
            "deleted": "eq.false",
            "order": "created_at.desc",
            "limit": str(limit),
        },
    )
    if response.status_code != 200:
        logger.warning("assistant.fetch_documents_failed", status=response.status_code, body=response.text)
        return []
    return response.json()


async def fetch_agent_profile(org_id: str) -> Optional[Dict[str, Any]]:
    response = await supabase_table_request(
        "GET",
        "agent_profiles",
        params={
            "select": "id,kind,certifications,jurisdictions,style,created_at",
            "org_id": f"eq.{org_id}",
            "order": "created_at.desc",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.warning(
            "assistant.fetch_profile_failed",
            status=response.status_code,
            body=response.text,
        )
        return None

    rows = response.json() or []
    if not rows:
        return None

    profile = rows[0]
    style = profile.get("style") or {}
    if not isinstance(style, dict):
        style = {}

    return {
        "id": profile.get("id"),
        "kind": profile.get("kind") or "AUDIT",
        "certifications": profile.get("certifications") or [],
        "jurisdictions": profile.get("jurisdictions") or [],
        "style": style,
        "created_at": profile.get("created_at"),
    }


def summarise_autopilot_run(job: Dict[str, Any]) -> str:
    payload = job.get("payload") or {}
    last_run: Dict[str, Any] = {}
    if isinstance(payload, dict):
        candidate = payload.get("lastRun")
        if isinstance(candidate, dict):
            last_run = candidate

    if last_run.get("error"):
        return str(last_run["error"])

    result = last_run.get("result")
    if isinstance(result, dict):
        if isinstance(result.get("message"), str) and result["message"]:
            return str(result["message"])
        if isinstance(result.get("summary"), str) and result["summary"]:
            return str(result["summary"])
        for key, value in result.items():
            if isinstance(value, (str, int, float)):
                return f"{key}: {value}"

    if isinstance(last_run.get("status"), str):
        return f"Run {last_run['status']}"

    if isinstance(job.get("status"), str):
        return f"Run {job['status'].lower()}"

    return "Run completed"


async def fetch_autopilot_summary(org_id: str, limit: int = 6) -> Dict[str, Any]:
    response = await supabase_table_request(
        "GET",
        "jobs",
        params={
            "select": "id,kind,status,scheduled_at,started_at,finished_at,payload",
            "org_id": f"eq.{org_id}",
            "order": "scheduled_at.desc",
            "limit": str(limit),
        },
    )
    if response.status_code != 200:
        logger.warning(
            "assistant.fetch_autopilot_failed",
            status=response.status_code,
            body=response.text,
        )
        return {"metrics": {"total": 0, "running": 0, "failed": 0, "pending": 0}, "recent": [], "running": [], "failed": [], "next": None}

    jobs = response.json() or []

    def serialize(job: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": job.get("id"),
            "kind": job.get("kind"),
            "status": job.get("status"),
            "scheduledAt": job.get("scheduled_at"),
            "startedAt": job.get("started_at"),
            "finishedAt": job.get("finished_at"),
            "summary": summarise_autopilot_run(job),
        }

    def parse_timestamp(value: Optional[str]) -> datetime:
        if not value or not isinstance(value, str):
            return datetime.max.replace(tzinfo=timezone.utc)
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.max.replace(tzinfo=timezone.utc)

    running = [serialize(job) for job in jobs if job.get("status") == "RUNNING"]
    failed = [serialize(job) for job in jobs if job.get("status") == "FAILED"]
    pending = [serialize(job) for job in jobs if job.get("status") == "PENDING"]
    recent = [serialize(job) for job in jobs[:limit]]

    domain_snapshots: Dict[str, Dict[str, Any]] = {}
    for job in jobs:
        payload = job.get("payload") or {}
        if not isinstance(payload, Mapping):
            continue
        last_run = payload.get("lastRun")
        if not isinstance(last_run, Mapping):
            continue
        result = last_run.get("result")
        if not isinstance(result, Mapping):
            continue
        domain = result.get("domain")
        if not isinstance(domain, str) or not domain:
            continue
        domain_key = domain.strip().lower()
        finished_at = last_run.get("finishedAt") or job.get("finished_at")
        status = last_run.get("status")
        candidate = {
            "domain": domain_key,
            "label": result.get("domainLabel") or domain.replace("_", " ").title(),
            "summary": result.get("summary"),
            "status": status,
            "finishedAt": finished_at,
            "approvals": result.get("approvals"),
            "telemetry": result.get("telemetry"),
            "run": result.get("run"),
        }
        existing = domain_snapshots.get(domain_key)
        existing_ts = parse_timestamp(existing.get("finishedAt")) if existing else datetime.min.replace(tzinfo=timezone.utc)
        candidate_ts = parse_timestamp(candidate.get("finishedAt"))
        if existing is None or candidate_ts > existing_ts:
            domain_snapshots[domain_key] = candidate

    next_pending = None
    if pending:
        next_pending = min(pending, key=lambda job: parse_timestamp(job.get("scheduledAt")))

    metrics = {
        "total": len(jobs),
        "running": len(running),
        "failed": len(failed),
        "pending": len(pending),
    }

    domains = sorted(domain_snapshots.values(), key=lambda entry: entry.get("label") or entry.get("domain"))

    return {
        "metrics": metrics,
        "recent": recent,
        "running": running,
        "failed": failed,
        "next": next_pending,
        "domains": domains,
    }


FALLBACK_ASSISTANT_ACTIONS = [
    {
        "label": "Create a task",
        "tool": "tasks.create",
        "description": "Draft a task and assign it to a teammate.",
        "args": {},
    },
    {
        "label": "Request documents",
        "tool": "documents.request_upload",
        "description": "Send an upload request with the repository tree.",
        "args": {},
    },
    {
        "label": "List recent documents",
        "tool": "documents.list",
        "description": "Review the latest files that were uploaded.",
        "args": {"limit": 5},
    },
]


ONBOARDING_TEMPLATE = [
    {"category": "Legal", "label": "Certificate of incorporation"},
    {"category": "Legal", "label": "Memorandum & articles"},
    {"category": "Legal", "label": "Share register / cap table"},
    {"category": "Legal", "label": "Director & UBO KYC"},
    {"category": "Tax", "label": "Income tax registration / TIN"},
    {"category": "Tax", "label": "VAT registration certificate"},
    {"category": "Tax", "label": "Latest assessments / rulings"},
    {"category": "Accounting", "label": "Prior-year financial statements"},
    {"category": "Accounting", "label": "Opening trial balance"},
    {"category": "Banking", "label": "Bank mandates"},
    {"category": "Banking", "label": "Last 3 months statements"},
    {"category": "Payroll", "label": "Employer registration"},
    {"category": "Payroll", "label": "Current payroll summary"},
]


REPOSITORY_FOLDERS = [
    "01_Legal",
    "02_Tax",
    "03_Accounting",
    "04_Banking",
    "05_Payroll",
    "06_Contracts",
    "07_Audit",
    "99_Other",
]


AUTOPILOT_JOB_KINDS = {
    "extract_documents": "Ingest new documents and run extraction",
    "remind_pbc": "Send reminders for outstanding PBC items",
    "refresh_analytics": "Refresh analytics dashboards",
    "close_cycle": "Stage the accounting close autopilot run",
    "audit_fieldwork": "Coordinate audit fieldwork automation",
    "tax_cycle": "Execute tax cycle computations",
}

AUTOPILOT_WORKER_DISABLED = os.getenv("AUTOPILOT_WORKER_DISABLED", "").lower() in {"1", "true", "yes", "on"}
AUTOPILOT_POLL_INTERVAL = max(5, int(os.getenv("AUTOPILOT_POLL_INTERVAL_SECONDS", "60")))
AUTOPILOT_ACTIVE_INTERVAL = max(1, int(os.getenv("AUTOPILOT_ACTIVE_INTERVAL_SECONDS", "5")))
AUTOPILOT_MAX_ATTEMPTS = max(1, int(os.getenv("AUTOPILOT_MAX_ATTEMPTS", "3")))
AUTOPILOT_BATCH_LIMIT = max(1, int(os.getenv("AUTOPILOT_BATCH_LIMIT", "5")))

autopilot_worker_task: Optional[asyncio.Task] = None


async def tool_create_task(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    title = (args.get("title") or "").strip()
    if not title:
        return {
            "message": "I need a task title before I can create it.",
            "needs": {"fields": ["title"]},
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    task_row = await insert_task_record(
        org_id=context["org_id"],
        creator_id=user_id,
        payload={
            "title": title,
            "description": args.get("description"),
            "status": args.get("status"),
            "priority": args.get("priority"),
            "engagement_id": args.get("engagementId"),
            "assigned_to": args.get("assigneeId"),
            "due_date": args.get("dueDate"),
        },
    )

    assignee_id = args.get("assigneeId")
    if assignee_id and assignee_id != user_id:
        await create_notification(
            org_id=context["org_id"],
            user_id=assignee_id,
            kind="TASK",
            title=f"New task assigned: {title}",
            body=args.get("description"),
        )

    return {
        "message": f"Created task “{title}”.",
        "data": {"task": map_task_response(task_row)},
        "citations": [],
        "document_ids": [],
    }


async def tool_list_documents(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    documents = await fetch_recent_documents(context["org_id"], limit=int(args.get("limit", 5)))
    if not documents:
        message = "No documents found yet. You can request uploads to get started."
    else:
        message = "Here are the latest documents I can see."

    citations = [
        {
            "documentId": doc.get("id"),
            "name": doc.get("name"),
            "repo": doc.get("repo_folder"),
        }
        for doc in documents
    ]

    return {
        "message": message,
        "data": {"documents": documents},
        "citations": citations,
        "document_ids": [doc.get("id") for doc in documents if doc.get("id")],
    }


async def tool_request_upload(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    repository_tree = [
        "01_Legal",
        "02_Tax",
        "03_Accounting",
        "04_Banking",
        "05_Payroll",
        "06_Contracts",
        "07_Audit",
        "99_Other",
    ]

    return {
        "message": "I prepared the standard repository layout. Share this with your client so they know where each file goes.",
        "data": {"repositories": repository_tree},
        "citations": [],
        "document_ids": [],
    }


async def tool_start_onboarding(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    industry = args.get("industry", "general")
    country = args.get("country", "MT")

    checklist = {
        "industry": industry,
        "country": country,
        "items": [
            {"category": "Legal", "label": "Certificate of incorporation"},
            {"category": "Tax", "label": "VAT registration certificate"},
            {"category": "Accounting", "label": "Opening trial balance"},
            {"category": "Banking", "label": "Mandates & IBAN confirmations"},
            {"category": "Payroll", "label": "Employer registration"},
        ],
    }

    return {
        "message": "Onboarding sequence primed. Drag and drop the requested documents and I’ll extract the key facts automatically.",
        "data": {"checklist": checklist},
        "citations": [],
        "document_ids": [],
    }


async def tool_extract_from_doc(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    document_id = args.get("documentId")
    if not document_id:
        return {
            "message": "Tell me which document to analyse.",
            "needs": {"fields": ["documentId"]},
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    document = await fetch_single_record(
        "documents",
        document_id,
        select="id,name,classification,repo_folder,uploaded_by,org_id,created_at",
    )
    if not document or document.get("org_id") != context["org_id"] or document.get("deleted"):
        return {
            "message": "I couldn’t find that document. Make sure it’s uploaded and you have access.",
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    index_response = await supabase_table_request(
        "GET",
        "document_index",
        params={
            "select": "id,document_id,extracted_meta",
            "document_id": f"eq.{document_id}",
            "limit": "1",
        },
    )
    extracted_meta: Dict[str, Any] = {}
    if index_response.status_code == 200:
        rows = index_response.json()
        if rows:
            extracted_meta = rows[0].get("extracted_meta") or {}
    else:
        logger.warning(
            "assistant.extract_meta_failed",
            status=index_response.status_code,
            body=index_response.text,
            document_id=document_id,
        )

    message = "Here’s what I pulled from the document."
    if not extracted_meta:
        message = "I don’t have structured data for that document yet, but I’ll index it after OCR completes."

    return {
        "message": message,
        "data": {"document": document, "extracted": extracted_meta},
        "citations": [
            {
                "documentId": document_id,
                "name": document.get("name"),
                "repo": document.get("repo_folder"),
            }
        ],
        "document_ids": [document_id],
    }


async def tool_workflow_run_step(context: Dict[str, str], user_id: str, args: Dict[str, Any]) -> Dict[str, Any]:
    workflow_key = str(args.get("workflow") or "").strip()
    if not workflow_key:
        return {
            "message": "Specify which workflow to advance.",
            "needs": {"fields": ["workflow"]},
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    definitions = get_workflow_definitions_config()
    definition = definitions.get(workflow_key)
    if not definition:
        return {
            "message": "I don't recognise that workflow in the configuration.",
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    autonomy_level = normalise_autonomy_level(context.get("autonomy_level"))
    required_autonomy = normalise_autonomy_level(definition.get("minimum_autonomy"))
    if AUTONOMY_LEVEL_RANK.get(autonomy_level, 0) < AUTONOMY_LEVEL_RANK.get(required_autonomy, 0):
        workflow_name = workflow_key.replace("_", " ").title()
        return {
            "message": (
                f"{workflow_name} requires autonomy level {required_autonomy}, but the organisation is set to {autonomy_level}."
                " Ask a manager to raise autonomy or run the steps manually."
            ),
            "data": {
                "requiredAutonomy": required_autonomy,
                "currentAutonomy": autonomy_level,
            },
            "citations": [],
            "document_ids": [],
        }

    def friendly_tool(tool_name: str) -> str:
        if not tool_name:
            return "workflow step"
        base = tool_name.replace(".", " ").replace("_", " ")
        return base.capitalize()

    run = await ensure_workflow_run(
        context["org_id"],
        workflow_key,
        triggered_by=user_id,
        supabase_table_request=supabase_table_request,
        iso_now=iso_now,
    )
    if not run:
        return {
            "message": "Unable to start the workflow right now.",
            "data": {},
            "citations": [],
            "document_ids": [],
        }

    steps = definition.get("steps") if isinstance(definition, dict) else []
    steps = steps if isinstance(steps, list) else []
    if not steps:
        return {
            "message": "This workflow does not have any configured steps yet.",
            "data": {"run": run},
            "citations": [],
            "document_ids": [],
        }

    provided_step = args.get("step")
    step_index: Optional[int]
    try:
        step_index = int(provided_step) if provided_step is not None else None
    except (TypeError, ValueError):
        step_index = None

    if step_index is None:
        try:
            step_index = int(run.get("current_step_index") or 0)
        except (TypeError, ValueError):
            step_index = 0

    if step_index < 0 or step_index >= len(steps):
        return {
            "message": "That step is out of range for this workflow.",
            "data": {"run": run, "totalSteps": len(steps)},
            "citations": [],
            "document_ids": [],
        }

    step_entry = steps[step_index]
    agent_id = step_entry.get("agent_id")
    tool_name = step_entry.get("tool")

    updated_run = await complete_workflow_step(
        run,
        workflow_key,
        step_index=step_index,
        args=args,
        result={"completed": True},
        supabase_table_request=supabase_table_request,
        iso_now=iso_now,
        actor_id=user_id,
    )
    if not updated_run:
        updated_run = run

    next_index = 0
    try:
        next_index = int(updated_run.get("current_step_index") or 0)
    except (TypeError, ValueError):
        next_index = step_index + 1

    workflow_name = workflow_key.replace("_", " ").title()
    current_label = friendly_tool(str(tool_name))
    message = f"Marked {workflow_name} → {current_label} as complete."

    if next_index >= len(steps):
        message += " Workflow finished!"
    else:
        next_step = steps[next_index]
        next_label = friendly_tool(str(next_step.get("tool") or ""))
        next_agent = resolve_agent_for_tool(str(next_step.get("tool") or "")) or next_step.get("agent_id")
        message += f" Next: {next_label} led by {next_agent or 'the assigned agent'}."

    return {
        "message": message,
        "data": {"run": updated_run, "completedStep": {"index": step_index, "agentId": agent_id, "tool": tool_name}},
        "citations": [],
        "document_ids": [],
    }


TOOL_REGISTRY = {
    "tasks.create": tool_create_task,
    "documents.list": tool_list_documents,
    "documents.request_upload": tool_request_upload,
    "doc_ai.extract": tool_extract_from_doc,
    "workflows.run_step": tool_workflow_run_step,
}


async def invoke_tool(context: Dict[str, str], user_id: str, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    handler = TOOL_REGISTRY.get(tool_name)
    if handler is None:
        raise HTTPException(status_code=400, detail="unknown tool")

    tool_policies = get_tool_policies_config()
    policy = tool_policies.get(tool_name, {})
    required_permission = policy.get("required_permission") if isinstance(policy, Mapping) else None
    if isinstance(required_permission, str) and required_permission.strip():
        ensure_permission_for_role(context.get("role"), required_permission.strip())

    limit = None
    window = None
    if isinstance(policy, Mapping):
        limit = policy.get("rate_limit_per_minute")
        window = policy.get("rate_limit_window_seconds")
    if isinstance(limit, int) and limit > 0:
        window_value = window if isinstance(window, int) and window > 0 else ASSISTANT_RATE_WINDOW
        await enforce_rate_limit(f"assistant-tool:{tool_name}", user_id, limit=limit, window=window_value)

    result = await handler(context, user_id, args)
    agent_id = resolve_agent_for_tool(tool_name)
    if agent_id is None and tool_name == "workflows.run_step":
        data_section = result.get("data") if isinstance(result, Mapping) else None
        if isinstance(data_section, Mapping):
            completed_step = data_section.get("completedStep")
            if isinstance(completed_step, Mapping):
                candidate = completed_step.get("agentId")
                if isinstance(candidate, str) and candidate.strip():
                    agent_id = candidate.strip()
    trace_inputs = dict(args)
    if agent_id and "agentId" not in trace_inputs:
        trace_inputs["agentId"] = agent_id

    await record_agent_trace(
        org_id=context["org_id"],
        user_id=user_id,
        tool=tool_name,
        inputs=trace_inputs,
        outputs=result.get("data", {}),
        document_ids=result.get("document_ids"),
    )
    return result


async def generate_assistant_reply(context: Dict[str, str], user_id: str, message: Optional[str]) -> Dict[str, Any]:
    normalized = (message or "").strip().lower()
    actions = await build_assistant_actions(context["org_id"], context.get("autonomy_level"))
    data: Dict[str, Any] = {}
    citations: List[Dict[str, Any]] = []
    profile = await fetch_agent_profile(context["org_id"])

    def persona_tagline() -> str:
        if not profile:
            return "your audit and automation copilot"
        kind = str(profile.get("kind") or "AUDIT").upper()
        certifications = profile.get("certifications") or []
        jurisdictions = profile.get("jurisdictions") or []
        if kind == "TAX" and jurisdictions:
            return f"your tax automation partner covering {', '.join(jurisdictions[:3])}"
        if kind == "FINANCE":
            return "your finance close companion"
        if certifications:
            return f"your audit copilot ({', '.join(certifications[:2])})"
        return "your audit and automation copilot"

    if not normalized:
        tasks_future = asyncio.create_task(fetch_open_tasks(context["org_id"], limit=3))
        autopilot_future = asyncio.create_task(fetch_autopilot_summary(context["org_id"], limit=6))
        documents_future = asyncio.create_task(fetch_recent_documents(context["org_id"], limit=3))

        tasks, autopilot_snapshot, documents = await asyncio.gather(tasks_future, autopilot_future, documents_future)

        data["autopilot"] = autopilot_snapshot
        if tasks:
            data["tasks"] = tasks
        if documents:
            data["documents"] = documents

        intro = f"Hi! I’m your Glow Agent — {persona_tagline()}."
        highlights: List[str] = []
        metrics = autopilot_snapshot.get("metrics", {})
        if metrics.get("running"):
            highlights.append(f"{metrics['running']} run(s) executing right now")
        if metrics.get("failed"):
            highlights.append(f"{metrics['failed']} run(s) need attention")
        if tasks:
            titles = ", ".join(task.get("title") for task in tasks[:3] if task.get("title"))
            if titles:
                highlights.append(f"Top tasks: {titles}")
        if not highlights:
            highlights.append("Everything is calm — ready when you are")

        reply = intro + "\n" + "\n".join(f"• {item}" for item in highlights)
        reply += "\nAsk me for a status summary, to draft tasks, or to activate a workflow."
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    knowledge_triggers = [
        "explain",
        "what is",
        "guidance",
        "standard",
        "ias",
        "ifrs",
        "policy",
        "tax law",
    ]

    if any(trigger in normalized for trigger in knowledge_triggers):
        search_payload = await perform_semantic_search(context["org_id"], message or "", 3)
        knowledge_results = search_payload.get("results", [])
        data["knowledge"] = knowledge_results

        confident = [entry for entry in knowledge_results if entry.get("meetsThreshold")]
        if confident:
            top_entries = confident[:2]
            citations = [
                {
                    "documentId": entry.get("documentId"),
                    "name": entry.get("documentName"),
                    "repo": entry.get("repo"),
                    "chunkIndex": entry.get("chunkIndex"),
                }
                for entry in top_entries
            ]

            snippets: List[str] = []
            for entry in top_entries:
                snippet = str(entry.get("content") or "").strip().replace("\n", " ")
                if len(snippet) > 320:
                    snippet = snippet[:317] + "..."
                label = entry.get("documentName") or "Supporting document"
                snippets.append(f"{label}: {snippet}")

            reply = "Here’s what I found:\n" + "\n\n".join(snippets)
            reply += "\n\nEach reference links back to the source. Let me know if you need more detail."
            return {"message": reply, "actions": actions, "data": data, "citations": citations}

        sequence_results = await log_before_asking_sequence(context["org_id"], user_id, "knowledge_low_confidence")
        detail_lines = summarise_before_asking_sequence(sequence_results)
        reply = (
            "I searched the knowledge base but couldn’t find a confident match with the required citations yet. "
            "Upload the relevant source or point me to the document so I can cite it directly."
        )
        if detail_lines:
            reply += "\n\nI checked our sources in this order:\n" + "\n".join(detail_lines)
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    if "what should i do next" in normalized or "next" in normalized:
        tasks = await fetch_open_tasks(context["org_id"], limit=5)
        if tasks:
            highlights = []
            for task in tasks:
                due = task.get("due_date")
                due_text = "no due date"
                if due:
                    due_text = datetime.fromisoformat(due.replace("Z", "+00:00")).strftime("%d %b")
                highlights.append(f"• {task.get('title')} (due {due_text})")
            reply = "Here are the top items on your radar:\n" + "\n".join(highlights)
            data["tasks"] = tasks
        else:
            reply = "There are no open tasks yet. Try creating an onboarding checklist or requesting documents."
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    if any(keyword in normalized for keyword in ["autopilot", "automation", "bot", "runs", "job history"]):
        autopilot_snapshot = await fetch_autopilot_summary(context["org_id"], limit=8)
        data["autopilot"] = autopilot_snapshot
        metrics = autopilot_snapshot.get("metrics", {})
        running = metrics.get("running", 0)
        failed = metrics.get("failed", 0)
        total = metrics.get("total", 0)
        next_job = autopilot_snapshot.get("next")
        parts = [
            f"Autopilot has {total} tracked run{'s' if total != 1 else ''}.",
            f"{running} active" if running else "No jobs are currently running",
        ]
        if failed:
            parts.append(f"{failed} need attention — tap a run for details.")
        if next_job and next_job.get("scheduledAt"):
            parts.append(
                "Next scheduled run: "
                + next_job.get("kind", "unknown job").replace("_", " ")
                + f" at {next_job['scheduledAt']}"
            )
        reply = " ".join(parts)
        reply += "\nYou can rerun jobs or open the operations console for the full timeline."
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    if any(keyword in normalized for keyword in ["status", "summary", "overview", "update"]):
        tasks_future = asyncio.create_task(fetch_open_tasks(context["org_id"], limit=5))
        autopilot_future = asyncio.create_task(fetch_autopilot_summary(context["org_id"], limit=6))
        documents_future = asyncio.create_task(fetch_recent_documents(context["org_id"], limit=3))
        tasks, autopilot_snapshot, documents = await asyncio.gather(tasks_future, autopilot_future, documents_future)

        data["autopilot"] = autopilot_snapshot
        if tasks:
            data["tasks"] = tasks
        if documents:
            data["documents"] = documents

        lines: List[str] = []
        lines.append(f"Automation: {autopilot_snapshot.get('metrics', {}).get('running', 0)} running, {autopilot_snapshot.get('metrics', {}).get('failed', 0)} flagged.")
        if tasks:
            top_task = tasks[0]
            lines.append(f"Top task: {top_task.get('title')} (due {top_task.get('due_date', 'unscheduled')}).")
        if documents:
            top_doc = documents[0]
            lines.append(f"Latest document: {top_doc.get('name')} in {top_doc.get('repo_folder') or 'root'}.")

        reply = "Here’s your current status:\n" + "\n".join(lines)
        reply += "\nAsk for more detail on tasks, documents, or automation if you need it."
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    if any(keyword in normalized for keyword in ["who are you", "about you", "what are you"]):
        reply = (
            f"I’m your Glow Agent — {persona_tagline()}."
            " I keep tabs on tasks, documents, and autopilot so you can focus on client decisions."
        )
        if profile:
            jurisdictions = profile.get("jurisdictions") or []
            if jurisdictions:
                reply += f" I’m calibrated for {', '.join(jurisdictions[:3])}."
        reply += " Ask for a status summary whenever you need a briefing."
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    if "document" in normalized and "list" in normalized:
        docs = await fetch_recent_documents(context["org_id"], limit=5)
        data["documents"] = docs
        if docs:
            reply = "Here are the latest documents."
            citations = [
                {"documentId": doc.get("id"), "name": doc.get("name"), "repo": doc.get("repo_folder")}
                for doc in docs
            ]
        else:
            sequence_results = await log_before_asking_sequence(context["org_id"], user_id, "documents_unavailable")
            detail_lines = summarise_before_asking_sequence(sequence_results)
            reply = "I couldn’t find any documents yet. You can request uploads to populate the workspace."
            if detail_lines:
                reply += "\n\nI checked our sources in this order:\n" + "\n".join(detail_lines)
        return {"message": reply, "actions": actions, "data": data, "citations": citations}

    reply = "I’m ready to help. You can ask me to create tasks, summarise documents, or kick off onboarding."
    return {"message": reply, "actions": actions, "data": data, "citations": citations}


def generate_temp_entity_id() -> str:
    return f"tmp-{uuid.uuid4().hex[:10]}"


def build_onboarding_items(checklist_id: str) -> List[Dict[str, Any]]:
    now = iso_now()
    return [
        {
            "checklist_id": checklist_id,
            "category": item["category"],
            "label": item["label"],
            "status": "PENDING",
            "created_at": now,
            "updated_at": now,
        }
        for item in ONBOARDING_TEMPLATE
    ]


async def fetch_checklist_with_items(checklist_id: str) -> Dict[str, Any]:
    checklist = await fetch_single_record(
        "onboarding_checklists",
        checklist_id,
        select="id, org_id, temp_entity_id, industry, country, status",
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="checklist not found")

    response = await supabase_table_request(
        "GET",
        "onboarding_checklist_items",
        params={
            "checklist_id": f"eq.{checklist_id}",
            "order": "created_at.asc",
            "select": "id, checklist_id, category, label, status, document_id, notes, updated_at",
        },
    )
    if response.status_code != 200:
        logger.error("onboarding.fetch_items_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch checklist items")

    checklist["items"] = response.json()
    return checklist


def build_drive_preview_documents() -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    return [
        {
            "id": f"placeholder-doc-{index}",
            "name": title,
            "mimeType": mime,
            "modifiedTime": (now.replace(microsecond=0)).isoformat() + "Z",
            "downloadUrl": f"https://drive.example.com/{index}",
        }
        for index, (title, mime) in enumerate(
            [
                ("Client Trial Balance.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                ("Revenue Policy.pdf", "application/pdf"),
                ("Audit Planning Checklist.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ]
        )
    ]


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    slug: str = Field(..., min_length=2, max_length=120)
    autonomyLevel: Optional[str] = Field(default=None, alias="autonomyLevel")
    legacyAutopilotLevel: Optional[int] = Field(default=None, ge=0, le=5, alias="autopilotLevel")

    model_config = ConfigDict(populate_by_name=True)


class InviteMemberRequest(BaseModel):
    orgId: str
    emailOrPhone: str = Field(..., min_length=3)
    role: str
    expiresAt: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., min_length=8)
    userId: str
    displayName: str = Field(..., min_length=2, max_length=120)
    email: Optional[str] = None
    phoneE164: Optional[str] = None
    whatsappE164: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    orgId: str
    userId: str
    role: str


class ProfileUpdateRequest(BaseModel):
    displayName: Optional[str] = None
    phoneE164: Optional[str] = None
    whatsappE164: Optional[str] = None
    avatarUrl: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    orgId: Optional[str] = None
    theme: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None


class TeamCreateRequest(BaseModel):
    orgId: str
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None


class TeamMemberAddRequest(BaseModel):
    orgId: str
    teamId: str
    userId: str
    role: Optional[str] = None


class TeamMemberRemoveRequest(BaseModel):
    orgId: str
    teamId: str
    userId: str


class RevokeInviteRequest(BaseModel):
    orgId: str
    inviteId: str


class AdminOrgSettingsUpdateRequest(BaseModel):
    orgId: str
    allowedEmailDomains: Optional[List[str]] = None
    defaultRole: Optional[str] = None
    requireMfaForSensitive: Optional[bool] = None
    impersonationBreakglassEmails: Optional[List[str]] = None


class CaptchaVerificationRequest(BaseModel):
    token: str
    remote_ip: Optional[str] = Field(default=None, alias="remoteIp")

    model_config = ConfigDict(populate_by_name=True)


class PolicyPackUpdateRequest(BaseModel):
    orgSlug: str
    policyPackId: str
    summary: Optional[str] = None
    diff: Optional[Dict[str, Any]] = None


class ImpersonationRequestBody(BaseModel):
    orgId: str
    targetUserId: str
    reason: Optional[str] = None
    expiresAt: Optional[str] = None


class ImpersonationApproveBody(BaseModel):
    orgId: str
    grantId: str
    expiresAt: Optional[str] = None


class ImpersonationRevokeBody(BaseModel):
    orgId: str
    grantId: str


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    k: int = Field(5, ge=1, le=20)
    org_slug: str = Field(..., min_length=1)


class ReembedRequest(BaseModel):
    chunks: List[int] = Field(..., min_items=1)
    org_slug: str = Field(..., min_length=1)


class VectorStoreCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    file_ids: Optional[List[str]] = Field(default=None)
    expires_after: Optional[Dict[str, Any]] = Field(default=None)
    chunking_strategy: Optional[Dict[str, Any]] = Field(default=None)
    metadata: Optional[Dict[str, Any]] = Field(default=None)


class VectorStoreUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None)
    expires_after: Optional[Dict[str, Any]] = Field(default=None)
    metadata: Optional[Dict[str, Any]] = Field(default=None)


class VectorStoreFileCreateRequest(BaseModel):
    file_id: str = Field(..., min_length=1)
    attributes: Optional[Dict[str, Any]] = Field(default=None)
    chunking_strategy: Optional[Dict[str, Any]] = Field(default=None)


class VectorStoreFileUpdateRequest(BaseModel):
    attributes: Optional[Dict[str, Any]] = Field(default=None)


class FileBatchCreateRequest(BaseModel):
    file_ids: Optional[List[str]] = Field(default=None)
    files: Optional[List[Dict[str, Any]]] = Field(default=None)


class VectorStoreSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    max_num_results: int = Field(10, ge=1, le=50)
    rewrite_query: bool = Field(True)
    attribute_filter: Optional[Dict[str, Any]] = Field(default=None)
    ranking_options: Optional[Dict[str, Any]] = Field(default=None)


class TaskCreateRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default="TODO")
    priority: Optional[str] = Field(default="MEDIUM")
    engagementId: Optional[str] = Field(default=None)
    assigneeId: Optional[str] = Field(default=None)
    dueDate: Optional[str] = Field(default=None)


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    engagementId: Optional[str] = None
    assigneeId: Optional[str] = None
    dueDate: Optional[str] = None


class TaskCommentRequest(BaseModel):
    body: str = Field(..., min_length=1)


class ControlCreateRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    engagementId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    cycle: str = Field(..., min_length=1)
    objective: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    frequency: str = Field(default="MONTHLY")
    owner: Optional[str] = None
    key: bool = Field(default=True)


class ControlWalkthroughRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    controlId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    date: str = Field(..., min_length=4)
    result: str = Field(..., min_length=1)
    notes: Optional[str] = None


class ControlTestAttribute(BaseModel):
    id: str = Field(..., min_length=1)
    description: Optional[str] = None
    passed: bool = Field(default=True)
    note: Optional[str] = None
    sampleItemId: Optional[str] = None
    populationRef: Optional[str] = None
    stratum: Optional[str] = None
    manualReference: Optional[str] = None


class ControlTestRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    engagementId: str = Field(..., min_length=1)
    controlId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    attributes: List[ControlTestAttribute]
    result: str = Field(..., min_length=1)
    deficiencyRecommendation: Optional[str] = None
    deficiencySeverity: Optional[str] = None


class AdaRunKind(str, Enum):
    JE = "JE"
    RATIO = "RATIO"
    VARIANCE = "VARIANCE"
    DUPLICATE = "DUPLICATE"
    BENFORD = "BENFORD"


class AdaExceptionDisposition(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"


class AdaRunRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    engagementId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    datasetRef: str = Field(..., min_length=1)
    kind: AdaRunKind
    params: Dict[str, Any] = Field(default_factory=dict)


class AdaExceptionUpdateRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    exceptionId: str = Field(..., min_length=1)
    disposition: Optional[AdaExceptionDisposition] = None
    note: Optional[str] = None
    misstatementId: Optional[str] = None


class ReconciliationCreateRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    engagementId: str = Field(..., min_length=1)
    entityId: str = Field(..., min_length=1)
    periodId: str = Field(..., min_length=1)
    type: str = Field(..., min_length=2)
    externalBalance: Decimal = Field(...)
    controlAccountId: Optional[str] = None
    preparedByUserId: Optional[str] = None
    glBalance: Optional[Decimal] = None


class ReconciliationItemPayload(BaseModel):
    category: str = Field(..., min_length=2)
    amount: Decimal = Field(...)
    reference: Optional[str] = None
    note: Optional[str] = None
    resolved: bool = Field(default=False)


class ReconciliationAddItemRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    reconciliationId: str = Field(..., min_length=1)
    item: ReconciliationItemPayload


class ReconciliationCloseRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    reconciliationId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    scheduleDocumentId: Optional[str] = None


class TaskAttachmentRequest(BaseModel):
    documentId: str = Field(..., min_length=1)
    note: Optional[str] = None


class DocumentSignRequest(BaseModel):
    documentId: str = Field(..., min_length=1)
    ttlSeconds: Optional[int] = Field(default=900, ge=60, le=86400)


class NotificationsMarkAllRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)


class NotificationUpdateRequest(BaseModel):
    read: Optional[bool] = None


class AssistantMessageRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    message: Optional[str] = None
    tool: Optional[str] = None
    args: Dict[str, Any] = Field(default_factory=dict)


class OnboardingStartRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    industry: str = Field(..., min_length=1)
    country: str = Field(..., min_length=2)


class OnboardingLinkDocRequest(BaseModel):
    checklistId: str = Field(..., min_length=1)
    itemId: str = Field(..., min_length=1)
    documentId: str = Field(..., min_length=1)


class OnboardingCommitRequest(BaseModel):
    checklistId: str = Field(..., min_length=1)
    profile: Dict[str, Any] = Field(default_factory=dict)


class DocumentExtractionUpdateRequest(BaseModel):
    extractionId: Optional[str] = None
    extractorName: Optional[str] = None
    extractorVersion: Optional[str] = None
    status: str = Field(..., min_length=1)
    fields: Optional[Dict[str, Any]] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    provenance: Optional[List[Dict[str, Any]]] = None
    documentType: Optional[str] = None


class JobScheduleRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    cronExpression: str = Field(..., min_length=1)
    active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class JobRunRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    kind: str = Field(..., min_length=1)
    payload: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeCorpusRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    domain: str = Field(..., min_length=1)
    jurisdictions: List[str] = Field(default_factory=list)
    retention: Optional[str] = None
    isDefault: bool = False


class KnowledgeSourceRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    corpusId: str = Field(..., min_length=1)
    provider: str = Field(..., min_length=1)
    sourceUri: str = Field(..., min_length=1)


class LearningRunRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    sourceId: str = Field(..., min_length=1)
    agentKind: str = Field(..., min_length=1)
    mode: str = Field(..., min_length=1)


class WebHarvestRequest(BaseModel):
    orgSlug: str = Field(..., min_length=1)
    webSourceId: str = Field(..., min_length=1)
    agentKind: str = Field(..., min_length=1)


@app.post("/v1/security/verify-captcha", tags=["security"])
@limiter.limit("5/minute")
async def verify_turnstile_token(request: Request, payload: CaptchaVerificationRequest) -> Dict[str, str]:
    if not TURNSTILE_SECRET_KEY:
        logger.info("captcha.verification_skipped", reason="secret_not_configured")
        return {"status": "skipped"}

    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="missing_token")

    verification_payload: Dict[str, str] = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token,
    }
    remote_ip = payload.remote_ip or (request.client.host if request.client else None)
    if remote_ip:
        verification_payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=verification_payload,
            )
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError as exc:
        logger.warning("captcha.verify_http_error", exc_info=exc)
        raise HTTPException(status_code=502, detail="captcha_verification_unavailable") from exc

    if not result.get("success"):
        raise HTTPException(status_code=400, detail="captcha_failed")

    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    await init_db()
    global autopilot_worker_task
    if AUTOPILOT_WORKER_DISABLED:
        logger.info("autopilot.worker_disabled")
        return
    if autopilot_worker_task is None or autopilot_worker_task.done():
        autopilot_worker_task = asyncio.create_task(_autopilot_worker_loop())


@app.on_event("shutdown")
async def shutdown() -> None:
    global autopilot_worker_task
    if autopilot_worker_task is None:
        return
    autopilot_worker_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await autopilot_worker_task
    autopilot_worker_task = None


@app.post("/api/iam/org/create")
@limiter.limit("3/hour")
async def create_organization(
    request: Request,
    payload: CreateOrgRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    await guard_system_admin(actor_id)

    slug = payload.slug.strip().lower()
    level_input: Optional[str] = payload.autonomyLevel
    if level_input is None and payload.legacyAutopilotLevel is not None:
        level_input = LEGACY_AUTONOMY_NUMERIC_MAP.get(payload.legacyAutopilotLevel)
    autonomy_level = normalise_autonomy_level(level_input)

    org_body = {
        "name": payload.name.strip(),
        "slug": slug,
        "autonomy_level": autonomy_level,
    }

    response = await supabase_table_request(
        "POST",
        "organizations",
        json=org_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code == 409:
        raise HTTPException(status_code=409, detail="organization slug already exists")
    if response.status_code not in (200, 201):
        logger.error("iam.create_org_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create organization")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=502, detail="organization creation returned no rows")

    org = rows[0]
    membership_payload = {
        "org_id": org["id"],
        "user_id": actor_id,
        "role": "SYSTEM_ADMIN",
        "invited_by": actor_id,
    }
    membership_payload.update(membership_settings_for_role("SYSTEM_ADMIN"))
    membership_response = await supabase_table_request(
        "POST",
        "memberships",
        json=membership_payload,
        headers={"Prefer": "resolution=merge-duplicates"},
    )
    if membership_response.status_code not in (200, 201, 204):
        logger.warning(
            "iam.seed_system_admin_membership_failed",
            status=membership_response.status_code,
            body=membership_response.text,
        )

    await log_activity_event(
        org_id=org["id"],
        actor_id=actor_id,
        action="ORG_CREATED",
        metadata={
            "slug": org.get("slug"),
            "autonomy_level": autonomy_level,
        },
    )

    return {
        "orgId": org["id"],
        "slug": org.get("slug"),
        "autonomyLevel": autonomy_level,
        "autopilotLevel": AUTONOMY_LEVEL_RANK.get(autonomy_level, 0),
    }


@app.get("/api/iam/members/list")
async def list_members(org: str = Query(..., alias="orgId", min_length=1), auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(org, actor_id)

    member_resp = await supabase_table_request(
        "GET",
        "memberships",
        params={
            "org_id": f"eq.{org}",
            "select": "id,user_id,role,invited_by,created_at,updated_at,autonomy_floor,autonomy_ceiling,is_service_account,client_portal_allowed_repos,client_portal_denied_actions,user_profile:user_profiles(display_name,email,locale,timezone,avatar_url,phone_e164,whatsapp_e164)",
            "order": "created_at.asc",
        },
    )
    if member_resp.status_code != 200:
        logger.error("iam.members_list_failed", status=member_resp.status_code, body=member_resp.text)
        raise HTTPException(status_code=502, detail="failed to load members")

    team_resp = await supabase_table_request(
        "GET",
        "teams",
        params={
            "org_id": f"eq.{org}",
            "select": "id,name,description,created_at,team_members:team_memberships(user_id,role,created_at)",
            "order": "created_at.asc",
        },
    )
    if team_resp.status_code != 200:
        logger.error("iam.teams_list_failed", status=team_resp.status_code, body=team_resp.text)
        raise HTTPException(status_code=502, detail="failed to load teams")

    invite_resp = await supabase_table_request(
        "GET",
        "invites",
        params={
            "org_id": f"eq.{org}",
            "select": "id,email_or_phone,role,status,expires_at,created_at",
            "order": "created_at.desc",
        },
    )
    if invite_resp.status_code != 200:
        logger.error("iam.invites_list_failed", status=invite_resp.status_code, body=invite_resp.text)
        raise HTTPException(status_code=502, detail="failed to load invites")

    return {
        "orgId": org,
        "actorRole": actor_role,
        "members": member_resp.json(),
        "teams": team_resp.json(),
        "invites": invite_resp.json(),
    }


@app.post("/api/iam/members/invite")
@limiter.limit("10/hour")
async def invite_member(
    request: Request,
    payload: InviteMemberRequest,
    auth: Dict[str, Any] = Depends(require_auth)
):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.members.invite")

    target_role = validate_org_role(payload.role)
    if target_role == "SYSTEM_ADMIN" and normalise_role(actor_role) != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="system admin required to grant SYSTEM_ADMIN")

    expires_at_value = payload.expiresAt
    if not expires_at_value:
        expires_at_value = (datetime.utcnow() + timedelta(days=14)).replace(microsecond=0).isoformat() + "Z"

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    invite_body = {
        "org_id": payload.orgId,
        "email_or_phone": payload.emailOrPhone.strip(),
        "role": target_role,
        "invited_by_user_id": actor_id,
        "status": "PENDING",
        "token_hash": token_hash,
        "expires_at": expires_at_value,
    }

    response = await supabase_table_request(
        "POST",
        "invites",
        json=invite_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.invite_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create invite")

    rows = response.json()
    invite = rows[0] if rows else None

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="INVITE_SENT",
        metadata={
            "invite_id": invite.get("id") if invite else None,
            "role": target_role,
            "email_or_phone": payload.emailOrPhone.strip(),
        },
    )

    contact_value = payload.emailOrPhone.strip()
    if "@" in contact_value:
        invite_link = build_invite_link(token)
        org_row = await fetch_single_record("organizations", payload.orgId, "name")
        inviter_profile = await fetch_single_record("user_profiles", actor_id, "display_name")

        async def dispatch_invite_email() -> None:
            success = await send_member_invite_email(
                recipient=contact_value.lower(),
                invite_link=invite_link,
                org_name=org_row.get("name") if org_row else None,
                role=target_role,
                inviter_name=inviter_profile.get("display_name") if inviter_profile else None,
                expires_at=expires_at_value,
            )
            if not success:
                logger.warning("iam.invite_email_failed", email=contact_value.lower())

        asyncio.create_task(dispatch_invite_email())

    return {
        "inviteId": invite.get("id") if invite else None,
        "role": target_role,
        "expiresAt": expires_at_value,
        "token": token,
    }


@app.post("/api/release-controls/check", response_model=ReleaseControlCheckResponse)
async def check_release_controls(
    payload: ReleaseControlCheckRequest, auth: Dict[str, Any] = Depends(require_auth)
) -> ReleaseControlCheckResponse:
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    org_slug = payload.normalized_org_slug()
    if not org_slug:
        raise HTTPException(status_code=400, detail="orgSlug is required")

    context = await resolve_org_context(user_id, org_slug)
    ensure_min_role(context.get("role"), "MANAGER")

    engagement_id = payload.normalized_engagement_id()

    requirements = get_release_control_settings_config()
    archive_settings = requirements.get("archive", {}) if isinstance(requirements, Mapping) else {}

    status = await evaluate_release_controls(
        context["org_id"],
        supabase_table_request=supabase_table_request,
        required_actions=requirements.get("approvals_required") if isinstance(requirements, Mapping) else None,
        engagement_id=engagement_id,
        manifest_hash_algorithm=archive_settings.get("manifest_hash", "sha256")
        if isinstance(archive_settings, Mapping)
        else "sha256",
        include_docs=archive_settings.get("include_docs") if isinstance(archive_settings, Mapping) else None,
    )

    environment_summary = await summarise_release_environment(
        context["org_id"],
        supabase_table_request=supabase_table_request,
        org_autonomy_level=context.get("autonomy_level"),
        settings=requirements.get("environment") if isinstance(requirements, Mapping) else None,
        autopilot_worker_disabled=AUTOPILOT_WORKER_DISABLED,
    )

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    return ReleaseControlCheckResponse(
        requirements=requirements,
        status=status,
        environment=environment_summary,
        generatedAt=generated_at,
    )


@app.post("/api/iam/members/accept")
async def accept_invite(payload: AcceptInviteRequest):
    hashed_token = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()

    response = await supabase_table_request(
        "GET",
        "invites",
        params={
            "token_hash": f"eq.{hashed_token}",
            "select": "id,org_id,role,status,expires_at,email_or_phone,invited_by_user_id",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("iam.invite_lookup_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to verify invite")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="invite not found")

    invite = rows[0]
    if invite.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail="invite already processed")

    expires_at_str = invite.get("expires_at")
    if expires_at_str:
        expires_at = expires_at_str.replace("Z", "+00:00")
        try:
            expires_dt = datetime.fromisoformat(expires_at)
            if expires_dt.tzinfo is None:
                expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            logger.warning("iam.invite_expiry_parse_failed", value=expires_at_str, error=str(exc))
        else:
            if expires_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="invite expired")

    email_value = payload.email
    if not email_value and invite.get("email_or_phone") and "@" in invite["email_or_phone"]:
        email_value = invite["email_or_phone"].strip()
    if not email_value:
        raise HTTPException(status_code=400, detail="email is required to accept invite")

    profile_payload = {
        "display_name": payload.displayName.strip(),
        "email": email_value.lower(),
    }
    if payload.phoneE164:
        profile_payload["phone_e164"] = payload.phoneE164
    if payload.whatsappE164:
        profile_payload["whatsapp_e164"] = payload.whatsappE164
    if payload.locale:
        profile_payload["locale"] = payload.locale
    if payload.timezone:
        profile_payload["timezone"] = payload.timezone

    profile = await upsert_user_profile(payload.userId, profile_payload)

    membership_body = {
        "org_id": invite["org_id"],
        "user_id": payload.userId,
        "role": invite["role"],
        "invited_by": invite.get("invited_by_user_id"),
        "created_at": iso_now(),
        "updated_at": iso_now(),
    }
    membership_resp = await supabase_table_request(
        "POST",
        "memberships",
        json=membership_body,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if membership_resp.status_code not in (200, 201):
        logger.error("iam.membership_create_failed", status=membership_resp.status_code, body=membership_resp.text)
        raise HTTPException(status_code=502, detail="failed to create membership")

    membership_rows = membership_resp.json()
    membership = membership_rows[0] if membership_rows else membership_body

    update_resp = await supabase_table_request(
        "PATCH",
        "invites",
        params={"id": f"eq.{invite['id']}"},
        json={"status": "ACCEPTED"},
        headers={"Prefer": "return=minimal"},
    )
    if update_resp.status_code not in (200, 204):
        logger.warning("iam.invite_status_update_failed", status=update_resp.status_code, body=update_resp.text)

    await log_activity_event(
        org_id=invite["org_id"],
        actor_id=payload.userId,
        action="INVITE_ACCEPTED",
        metadata={
            "invite_id": invite["id"],
            "role": invite["role"],
            "profile_display_name": profile.get("display_name"),
        },
    )

    return {
        "orgId": invite["org_id"],
        "role": invite["role"],
        "membership": membership,
    }


@app.post("/api/iam/members/revoke-invite")
async def revoke_invite(payload: RevokeInviteRequest, auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.invites.revoke")

    invite_lookup = await supabase_table_request(
        "GET",
        "invites",
        params={"id": f"eq.{payload.inviteId}", "org_id": f"eq.{payload.orgId}", "limit": "1"},
    )
    if invite_lookup.status_code != 200:
        logger.error("iam.invite_fetch_failed", status=invite_lookup.status_code, body=invite_lookup.text)
        raise HTTPException(status_code=502, detail="failed to load invite")
    rows = invite_lookup.json()
    if not rows:
        raise HTTPException(status_code=404, detail="invite not found")
    invite = rows[0]
    if invite.get("status") in {"ACCEPTED", "EXPIRED"}:
        raise HTTPException(status_code=409, detail="invite already processed")

    revoke_resp = await supabase_table_request(
        "PATCH",
        "invites",
        params={"id": f"eq.{payload.inviteId}"},
        json={"status": "REVOKED"},
        headers={"Prefer": "return=minimal"},
    )
    if revoke_resp.status_code not in (200, 204):
        logger.error("iam.invite_revoke_failed", status=revoke_resp.status_code, body=revoke_resp.text)
        raise HTTPException(status_code=502, detail="failed to revoke invite")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="INVITE_REVOKED",
        metadata={"invite_id": payload.inviteId},
    )

    return {"inviteId": payload.inviteId, "status": "REVOKED"}


@app.get("/api/admin/org/settings")
async def get_admin_org_settings(
    org_id: str = Query(..., alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth),
):
    role = await ensure_org_access_by_id(auth["sub"], org_id)
    ensure_permission_for_role(role, "admin.org.settings")

    org_row = await fetch_org_settings(org_id)

    settings = {
        "allowedEmailDomains": org_row.get("allowed_email_domains") or [],
        "defaultRole": org_row.get("default_role"),
        "requireMfaForSensitive": bool(org_row.get("require_mfa_for_sensitive")),
        "impersonationBreakglassEmails": org_row.get("impersonation_breakglass_emails") or [],
    }

    impersonation_response = await supabase_table_request(
        "GET",
        "impersonation_grants",
        params={
            "org_id": f"eq.{org_id}",
            "order": "created_at.desc",
            "limit": "50",
        },
    )
    if impersonation_response.status_code != 200:
        logger.error(
            "impersonation.list_failed",
            status=impersonation_response.status_code,
            body=impersonation_response.text,
        )
        raise HTTPException(status_code=502, detail="impersonation_lookup_failed")

    return {
        "settings": settings,
        "impersonationGrants": impersonation_response.json(),
    }


@app.post("/api/admin/org/settings")
async def update_admin_org_settings(payload: AdminOrgSettingsUpdateRequest, auth: Dict[str, Any] = Depends(require_auth)):
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.org.settings")

    updates: Dict[str, Any] = {}

    if payload.allowedEmailDomains is not None:
        updates["allowed_email_domains"] = _normalise_email_domains(payload.allowedEmailDomains)

    if payload.requireMfaForSensitive is not None:
        updates["require_mfa_for_sensitive"] = bool(payload.requireMfaForSensitive)

    if payload.defaultRole is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["default_role"] = validate_org_role(payload.defaultRole)

    if payload.impersonationBreakglassEmails is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["impersonation_breakglass_emails"] = _normalise_emails(payload.impersonationBreakglassEmails)

    if updates:
        response = await supabase_table_request(
            "PATCH",
            "organizations",
            params={"id": f"eq.{payload.orgId}"},
            json=updates,
            headers={"Prefer": "return=representation"},
        )
        if response.status_code not in (200, 204):
            logger.error("org.settings_update_failed", status=response.status_code, body=response.text)
            raise HTTPException(status_code=502, detail="organization_update_failed")

        await log_activity_event(
            org_id=payload.orgId,
            actor_id=auth["sub"],
            action="ORG_SETTINGS_UPDATED",
            entity_type="IAM",
            entity_id=payload.orgId,
            metadata={"fields": sorted(updates.keys())},
        )

    org_row = await fetch_org_settings(payload.orgId)
    return {
        "settings": {
            "allowedEmailDomains": org_row.get("allowed_email_domains") or [],
            "defaultRole": org_row.get("default_role"),
            "requireMfaForSensitive": bool(org_row.get("require_mfa_for_sensitive")),
            "impersonationBreakglassEmails": org_row.get("impersonation_breakglass_emails") or [],
        }
    }


@app.get("/api/admin/auditlog/list")
async def list_admin_audit_log(
    org_id: str = Query(..., alias="orgId"),
    limit: int = Query(50, ge=1, le=200),
    after: Optional[str] = Query(default=None),
    module: Optional[str] = Query(default=None),
    auth: Dict[str, Any] = Depends(require_auth),
):
    role = await ensure_org_access_by_id(auth["sub"], org_id)
    ensure_permission_for_role(role, "admin.auditlog.view")

    params: Dict[str, Any] = {
        "org_id": f"eq.{org_id}",
        "order": "created_at.desc",
        "limit": str(limit),
    }
    if after:
        params["created_at"] = f"lt.{after}"
    if module:
        params["module"] = f"eq.{module}"

    response = await supabase_table_request("GET", "activity_log", params=params)
    if response.status_code != 200:
        logger.error("activity_log.fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="auditlog_fetch_failed")

    return {"entries": response.json()}


@app.get("/api/admin/impersonation/list")
async def list_impersonation_grants(
    org_id: str = Query(..., alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth),
):
    role = await ensure_org_access_by_id(auth["sub"], org_id)
    ensure_permission_for_role(role, "admin.impersonation.request")

    response = await supabase_table_request(
        "GET",
        "impersonation_grants",
        params={
            "org_id": f"eq.{org_id}",
            "order": "created_at.desc",
        },
    )
    if response.status_code != 200:
        logger.error("impersonation.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="impersonation_lookup_failed")

    return {"grants": response.json()}


@app.post("/api/admin/impersonation/request")
async def request_impersonation(payload: ImpersonationRequestBody, auth: Dict[str, Any] = Depends(require_auth)):
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.impersonation.request")

    if payload.targetUserId == auth["sub"]:
        raise HTTPException(status_code=400, detail="cannot_impersonate_self")

    target = await fetch_membership(payload.orgId, payload.targetUserId)
    if not target:
        raise HTTPException(status_code=404, detail="target_not_found")

    expires_at = payload.expiresAt or (datetime.utcnow() + timedelta(hours=DEFAULT_IMPERSONATION_EXPIRY_HOURS)).isoformat() + "Z"

    response = await supabase_table_request(
        "POST",
        "impersonation_grants",
        json={
            "org_id": payload.orgId,
            "granted_by_user_id": auth["sub"],
            "target_user_id": payload.targetUserId,
            "reason": payload.reason,
            "expires_at": expires_at,
            "active": False,
        },
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("impersonation.request_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="impersonation_request_failed")

    grant = response.json()[0]

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="IMPERSONATION_REQUESTED",
        entity_type="IAM",
        entity_id=grant.get("id"),
        metadata={
            "target_user_id": payload.targetUserId,
            "expires_at": expires_at,
        },
    )

    return {"grant": grant}


@app.post("/api/admin/impersonation/approve")
async def approve_impersonation(payload: ImpersonationApproveBody, auth: Dict[str, Any] = Depends(require_auth)):
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.impersonation.approve")

    response = await supabase_table_request(
        "GET",
        "impersonation_grants",
        params={
            "id": f"eq.{payload.grantId}",
            "org_id": f"eq.{payload.orgId}",
            "select": "id,granted_by_user_id,target_user_id,approved_by_user_id,active,expires_at",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("impersonation.grant_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="impersonation_lookup_failed")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="grant_not_found")
    grant = rows[0]

    if grant.get("granted_by_user_id") == auth["sub"]:
        raise HTTPException(status_code=409, detail="second_approver_required")
    if grant.get("active"):
        raise HTTPException(status_code=409, detail="grant_already_active")

    expires_at = payload.expiresAt or grant.get("expires_at") or (datetime.utcnow() + timedelta(hours=DEFAULT_IMPERSONATION_EXPIRY_HOURS)).isoformat() + "Z"

    update_response = await supabase_table_request(
        "PATCH",
        "impersonation_grants",
        params={"id": f"eq.{payload.grantId}"},
        json={
            "approved_by_user_id": auth["sub"],
            "active": True,
            "expires_at": expires_at,
        },
        headers={"Prefer": "return=representation"},
    )
    if update_response.status_code not in (200, 204):
        logger.error("impersonation.approve_failed", status=update_response.status_code, body=update_response.text)
        raise HTTPException(status_code=502, detail="impersonation_approve_failed")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="IMPERSONATION_GRANTED",
        entity_type="IAM",
        entity_id=payload.grantId,
        metadata={
            "target_user_id": grant.get("target_user_id"),
            "expires_at": expires_at,
        },
    )

    return {"grantId": payload.grantId, "status": "ACTIVE", "expiresAt": expires_at}


@app.post("/api/admin/impersonation/revoke")
async def revoke_impersonation(payload: ImpersonationRevokeBody, auth: Dict[str, Any] = Depends(require_auth)):
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.impersonation.revoke")

    response = await supabase_table_request(
        "PATCH",
        "impersonation_grants",
        params={"id": f"eq.{payload.grantId}"},
        json={"active": False},
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 204):
        logger.error("impersonation.revoke_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="impersonation_revoke_failed")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="IMPERSONATION_REVOKED",
        entity_type="IAM",
        entity_id=payload.grantId,
    )

    return {"grantId": payload.grantId, "status": "REVOKED"}


@app.post("/api/iam/members/update-role")
async def update_member_role(payload: UpdateRoleRequest, auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.members.update_role")
    new_role = validate_org_role(payload.role)

    membership = await fetch_membership(payload.orgId, payload.userId)
    if not membership:
        raise HTTPException(status_code=404, detail="membership not found")

    current_role = normalise_role(membership.get("role"))
    if current_role == new_role:
        return {"orgId": payload.orgId, "userId": payload.userId, "role": current_role}

    if new_role == "SYSTEM_ADMIN" and normalise_role(actor_role) != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="system admin required to grant SYSTEM_ADMIN")

    managerial_roles = get_managerial_roles_config()
    ranks = get_role_rank_map_config()
    if current_role in managerial_roles and ranks.get(new_role, 0) < ranks.get("MANAGER", 0):
        remaining = await count_managerial_members(payload.orgId)
        if remaining <= 1:
            raise HTTPException(status_code=409, detail="cannot demote last manager or partner")

    update_resp = await supabase_table_request(
        "PATCH",
        "memberships",
        params={"id": f"eq.{membership['id']}"},
        json={"role": new_role, "updated_at": iso_now()},
        headers={"Prefer": "return=representation"},
    )
    if update_resp.status_code not in (200, 204):
        logger.error("iam.role_update_failed", status=update_resp.status_code, body=update_resp.text)
        raise HTTPException(status_code=502, detail="failed to update role")

    rows = update_resp.json() if update_resp.content else []
    updated = rows[0] if rows else {**membership, "role": new_role}

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="MEMBERSHIP_ROLE_CHANGED",
        metadata={
            "target_user_id": payload.userId,
            "previous_role": current_role,
            "new_role": new_role,
        },
    )

    return {
        "orgId": payload.orgId,
        "userId": payload.userId,
        "role": new_role,
        "membership": updated,
    }


@app.get("/api/iam/profile/get")
async def get_profile(org: Optional[str] = Query(default=None, alias="orgId"), auth: Dict[str, Any] = Depends(require_auth)):
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    profile = await fetch_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="profile not found")

    preferences = None
    if org:
        pref_resp = await supabase_table_request(
            "GET",
            "user_preferences",
            params={
                "user_id": f"eq.{user_id}",
                "org_id": f"eq.{org}",
                "limit": "1",
            },
        )
        if pref_resp.status_code != 200:
            logger.error("iam.preferences_fetch_failed", status=pref_resp.status_code, body=pref_resp.text)
            raise HTTPException(status_code=502, detail="failed to load preferences")
        pref_rows = pref_resp.json()
        preferences = pref_rows[0] if pref_rows else None

    return {"profile": profile, "preferences": preferences}


@app.post("/api/iam/profile/update")
async def update_profile(payload: ProfileUpdateRequest, auth: Dict[str, Any] = Depends(require_auth)):
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    target_org_id = payload.orgId
    if target_org_id:
        membership_check = await fetch_membership(target_org_id, user_id)
        if not membership_check and not await is_system_admin_user(user_id):
            raise HTTPException(status_code=403, detail="forbidden for target organization")
    else:
        membership_resp = await supabase_table_request(
            "GET",
            "memberships",
            params={"user_id": f"eq.{user_id}", "select": "org_id", "limit": "1"},
        )
        if membership_resp.status_code != 200:
            logger.error("iam.profile_membership_lookup_failed", status=membership_resp.status_code, body=membership_resp.text)
            raise HTTPException(status_code=502, detail="failed to resolve organization")
        membership_rows = membership_resp.json()
        if membership_rows:
            target_org_id = membership_rows[0].get("org_id")
    if not target_org_id:
        raise HTTPException(status_code=400, detail="orgId required for profile update")

    profile_updates: Dict[str, Any] = {}
    if payload.displayName:
        profile_updates["display_name"] = payload.displayName.strip()
    if payload.phoneE164 is not None:
        profile_updates["phone_e164"] = payload.phoneE164
    if payload.whatsappE164 is not None:
        profile_updates["whatsapp_e164"] = payload.whatsappE164
    if payload.avatarUrl is not None:
        profile_updates["avatar_url"] = payload.avatarUrl
    if payload.locale is not None:
        profile_updates["locale"] = payload.locale
    if payload.timezone is not None:
        profile_updates["timezone"] = payload.timezone

    updated_profile = None
    if profile_updates:
        updated_profile = await upsert_user_profile(user_id, profile_updates)

    updated_preferences = None
    if payload.theme is not None or payload.notifications is not None:
        pref_body: Dict[str, Any] = {"user_id": user_id, "org_id": target_org_id}
        if payload.theme is not None:
            theme_value = payload.theme.upper()
            if theme_value not in {"SYSTEM", "LIGHT", "DARK"}:
                raise HTTPException(status_code=400, detail="invalid theme preference")
            pref_body["theme"] = theme_value
        if payload.notifications is not None:
            pref_body["notifications"] = payload.notifications
        pref_resp = await supabase_table_request(
            "POST",
            "user_preferences",
            json=pref_body,
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        if pref_resp.status_code not in (200, 201):
            logger.error("iam.preferences_upsert_failed", status=pref_resp.status_code, body=pref_resp.text)
            raise HTTPException(status_code=502, detail="failed to update preferences")
        pref_rows = pref_resp.json()
        updated_preferences = pref_rows[0] if pref_rows else pref_body

    await log_activity_event(
        org_id=target_org_id,
        actor_id=user_id,
        action="PROFILE_UPDATED",
        metadata={
            "profile_changes": list(profile_updates.keys()),
            "preferences_updated": bool(updated_preferences),
        },
    )

    return {
        "profile": updated_profile,
        "preferences": updated_preferences,
    }



@app.post("/api/iam/teams/create")
async def create_team(payload: TeamCreateRequest, auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.teams.manage")

    team_body = {
        "org_id": payload.orgId,
        "name": payload.name.strip(),
        "description": payload.description,
    }
    response = await supabase_table_request(
        "POST",
        "teams",
        json=team_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.team_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create team")
    rows = response.json()
    team = rows[0] if rows else team_body

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_CREATED",
        metadata={"team_id": team.get("id"), "name": team_body["name"]},
    )

    return {"team": team}


@app.post("/api/iam/teams/add-member")
async def add_team_member(payload: TeamMemberAddRequest, auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.teams.manage")

    team = await fetch_single_record("teams", payload.teamId, select="id,org_id,name")
    if not team or team.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="team not found")

    role_value = validate_team_role(payload.role)

    membership_body = {
        "team_id": payload.teamId,
        "user_id": payload.userId,
        "role": role_value,
    }
    response = await supabase_table_request(
        "POST",
        "team_memberships",
        json=membership_body,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.team_member_add_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to add team member")
    rows = response.json()
    membership = rows[0] if rows else membership_body

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_MEMBER_ADDED",
        metadata={
            "team_id": payload.teamId,
            "user_id": payload.userId,
            "role": role_value,
        },
    )

    return {"team": team, "membership": membership}


@app.post("/api/iam/teams/remove-member")
async def remove_team_member(payload: TeamMemberRemoveRequest, auth: Dict[str, Any] = Depends(require_auth)):
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.teams.manage")

    team = await fetch_single_record("teams", payload.teamId, select="id,org_id,name")
    if not team or team.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="team not found")

    response = await supabase_table_request(
        "DELETE",
        "team_memberships",
        params={"team_id": f"eq.{payload.teamId}", "user_id": f"eq.{payload.userId}"},
        headers={"Prefer": "return=minimal"},
    )
    if response.status_code not in (200, 204):
        logger.error("iam.team_member_remove_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to remove team member")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_MEMBER_REMOVED",
        metadata={
            "team_id": payload.teamId,
            "user_id": payload.userId,
        },
    )

    return {"teamId": payload.teamId, "userId": payload.userId}


@app.post("/v1/rag/ingest")
async def ingest(
    file: UploadFile = File(...),
    org_slug_form: str = Form(..., alias="orgSlug"),
    document_id: str = Form(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    if file.content_type not in ("application/pdf",):
        raise HTTPException(status_code=400, detail="Only PDF supported")

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    await enforce_rate_limit(
        "rag:ingest",
        user_id,
        limit=RAG_INGEST_RATE_LIMIT,
        window=RAG_INGEST_RATE_WINDOW,
    )

    org_slug = org_slug_form.strip()
    if not org_slug:
        raise HTTPException(status_code=400, detail="org slug required")

    org_context = await resolve_org_context(user_id, org_slug)

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="empty file upload")

    text = extract_text_from_bytes(payload, file.content_type)
    index_config = get_primary_index_config()
    chunk_size = int(index_config.get("chunk_size") or 1200)
    chunk_overlap = int(index_config.get("chunk_overlap") or 150)
    chunks = chunk_text(text, max_tokens=chunk_size, overlap=chunk_overlap)
    embedding_model = index_config.get("embedding_model") or None
    embeds = await embed_chunks(chunks, model=embedding_model)
    document_ref = document_id or file.filename
    await store_chunks(
        document_ref,
        org_context["org_id"],
        index_config.get("name"),
        embedding_model,
        chunks,
        embeds,
    )
    vector_store_info = await openai_retrieval.ingest_document(
        org_id=org_context["org_id"],
        data=payload,
        filename=file.filename,
        mime_type=file.content_type,
        document_id=document_ref,
    )
    logger.info(
        "ingest",
        filename=file.filename,
        chunks=len(chunks),
        user_id=user_id,
        org_id=org_context["org_id"],
        index=index_config.get("name"),
    )
    response: Dict[str, Any] = {"chunks": len(chunks)}
    if vector_store_info:
        response["openaiVectorStore"] = vector_store_info
    return response


@app.post("/v1/rag/search")
async def search(request: SearchRequest, auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    await enforce_rate_limit(
        "rag:search",
        user_id,
        limit=RAG_SEARCH_RATE_LIMIT,
        window=RAG_SEARCH_RATE_WINDOW,
    )

    org_context = await resolve_org_context(user_id, request.org_slug)
    limit = max(1, min(20, request.k))

    result = await perform_semantic_search(org_context["org_id"], query, limit)

    logger.info(
        "search",
        query=query,
        results=len(result.get("results", [])),
        user_id=user_id,
        org_id=org_context["org_id"],
        fallback=result.get("meta", {}).get("fallbackUsed"),
        confident=result.get("meta", {}).get("hasConfidentResult"),
    )
    return result


@app.post("/v1/rag/reembed")
async def reembed(request: ReembedRequest, auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, int]:
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    await enforce_rate_limit(
        "rag:reembed",
        user_id,
        limit=RAG_REEMBED_RATE_LIMIT,
        window=RAG_REEMBED_RATE_WINDOW,
    )

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


# Vector Store Management Endpoints
@app.post("/v1/vector-stores", tags=["retrieval"])
async def create_vector_store_endpoint(
    request: VectorStoreCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Create a new vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.create_vector_store(
            name=request.name,
            file_ids=request.file_ids,
            expires_after=request.expires_after,
            chunking_strategy=request.chunking_strategy,
            metadata=request.metadata,
        )
        logger.info("vector_store.created", user_id=user_id, vector_store_id=result.get("id"))
        return result
    except Exception as exc:
        logger.error("vector_store.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create vector store")


@app.get("/v1/vector-stores/{vector_store_id}", tags=["retrieval"])
async def get_vector_store_endpoint(
    vector_store_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a vector store by ID."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.retrieve_vector_store(vector_store_id)
        return result
    except Exception as exc:
        logger.error("vector_store.retrieve_failed", user_id=user_id, vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=404, detail="Vector store not found")


@app.post("/v1/vector-stores/{vector_store_id}", tags=["retrieval"])
async def update_vector_store_endpoint(
    vector_store_id: str,
    request: VectorStoreUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Update a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.update_vector_store(
            vector_store_id,
            name=request.name,
            expires_after=request.expires_after,
            metadata=request.metadata,
        )
        logger.info("vector_store.updated", user_id=user_id, vector_store_id=vector_store_id)
        return result
    except Exception as exc:
        logger.error("vector_store.update_failed", user_id=user_id, vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to update vector store")


@app.delete("/v1/vector-stores/{vector_store_id}", tags=["retrieval"])
async def delete_vector_store_endpoint(
    vector_store_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Delete a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.delete_vector_store(vector_store_id)
        logger.info("vector_store.deleted", user_id=user_id, vector_store_id=vector_store_id)
        return result
    except Exception as exc:
        logger.error("vector_store.delete_failed", user_id=user_id, vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to delete vector store")


@app.get("/v1/vector-stores", tags=["retrieval"])
async def list_vector_stores_endpoint(
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List vector stores."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.list_vector_stores(
            limit=limit,
            order=order,
            after=after,
            before=before,
        )
        return result
    except Exception as exc:
        logger.error("vector_stores.list_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list vector stores")


# Vector Store File Endpoints
@app.post("/v1/vector-stores/{vector_store_id}/files", tags=["retrieval"])
async def create_vector_store_file_endpoint(
    vector_store_id: str,
    request: VectorStoreFileCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Attach a file to a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.create_and_poll_vector_store_file(
            vector_store_id,
            request.file_id,
            attributes=request.attributes,
            chunking_strategy=request.chunking_strategy,
        )
        logger.info("vector_store_file.created", user_id=user_id, vector_store_id=vector_store_id, file_id=request.file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create vector store file")


@app.get("/v1/vector-stores/{vector_store_id}/files/{file_id}", tags=["retrieval"])
async def get_vector_store_file_endpoint(
    vector_store_id: str,
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a vector store file."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.retrieve_vector_store_file(vector_store_id, file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.retrieve_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=404, detail="Vector store file not found")


@app.post("/v1/vector-stores/{vector_store_id}/files/{file_id}", tags=["retrieval"])
async def update_vector_store_file_endpoint(
    vector_store_id: str,
    file_id: str,
    request: VectorStoreFileUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Update a vector store file's attributes."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.update_vector_store_file(
            vector_store_id,
            file_id,
            attributes=request.attributes,
        )
        logger.info("vector_store_file.updated", user_id=user_id, vector_store_id=vector_store_id, file_id=file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.update_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to update vector store file")


@app.delete("/v1/vector-stores/{vector_store_id}/files/{file_id}", tags=["retrieval"])
async def delete_vector_store_file_endpoint(
    vector_store_id: str,
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Delete a vector store file."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.delete_vector_store_file(vector_store_id, file_id)
        logger.info("vector_store_file.deleted", user_id=user_id, vector_store_id=vector_store_id, file_id=file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.delete_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to delete vector store file")


@app.get("/v1/vector-stores/{vector_store_id}/files", tags=["retrieval"])
async def list_vector_store_files_endpoint(
    vector_store_id: str,
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    filter_status: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List files in a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.list_vector_store_files(
            vector_store_id,
            limit=limit,
            order=order,
            after=after,
            before=before,
            filter_status=filter_status,
        )
        return result
    except Exception as exc:
        logger.error("vector_store_files.list_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list vector store files")


# Batch Operations Endpoints
@app.post("/v1/vector-stores/{vector_store_id}/file-batches", tags=["retrieval"])
async def create_file_batch_endpoint(
    vector_store_id: str,
    request: FileBatchCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Create a batch of files in a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.create_and_poll_file_batch(
            vector_store_id,
            file_ids=request.file_ids,
            files=request.files,
        )
        logger.info("file_batch.created", user_id=user_id, vector_store_id=vector_store_id, batch_id=result.get("id"))
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("file_batch.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create file batch")


@app.get("/v1/vector-stores/{vector_store_id}/file-batches/{batch_id}", tags=["retrieval"])
async def get_file_batch_endpoint(
    vector_store_id: str,
    batch_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a file batch."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.retrieve_file_batch(vector_store_id, batch_id)
        return result
    except Exception as exc:
        logger.error("file_batch.retrieve_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=404, detail="File batch not found")


@app.post("/v1/vector-stores/{vector_store_id}/file-batches/{batch_id}/cancel", tags=["retrieval"])
async def cancel_file_batch_endpoint(
    vector_store_id: str,
    batch_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Cancel a file batch."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.cancel_file_batch(vector_store_id, batch_id)
        logger.info("file_batch.cancelled", user_id=user_id, vector_store_id=vector_store_id, batch_id=batch_id)
        return result
    except Exception as exc:
        logger.error("file_batch.cancel_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to cancel file batch")


@app.get("/v1/vector-stores/{vector_store_id}/file-batches/{batch_id}/files", tags=["retrieval"])
async def list_batch_files_endpoint(
    vector_store_id: str,
    batch_id: str,
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    filter_status: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List files in a batch."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        result = await openai_retrieval.list_files_in_batch(
            vector_store_id,
            batch_id,
            limit=limit,
            order=order,
            after=after,
            before=before,
            filter_status=filter_status,
        )
        return result
    except Exception as exc:
        logger.error("batch_files.list_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list batch files")


# Enhanced Search Endpoint
@app.post("/v1/vector-stores/{vector_store_id}/search", tags=["retrieval"])
async def search_vector_store_endpoint(
    vector_store_id: str,
    request: VectorStoreSearchRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Perform semantic search in a vector store."""
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")
    
    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")
    
    try:
        client = openai_retrieval.get_openai_client()
        
        kwargs: Dict[str, Any] = {
            "vector_store_id": vector_store_id,
            "query": request.query,
            "max_num_results": request.max_num_results,
            "rewrite_query": request.rewrite_query,
        }
        
        if request.attribute_filter:
            kwargs["attribute_filter"] = request.attribute_filter
        if request.ranking_options:
            kwargs["ranking_options"] = request.ranking_options
        
        response = await client.vector_stores.search(**kwargs)
        
        logger.info(
            "vector_store.search",
            user_id=user_id,
            vector_store_id=vector_store_id,
            query=request.query,
        )
        
        # Convert response to dict
        response_dict = openai_retrieval._as_dict(response)
        return response_dict
    except Exception as exc:
        logger.error("vector_store.search_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Search failed")


async def _update_reconciliation_difference(reconciliation_id: str) -> None:
    reconciliation = await fetch_single_record("reconciliations", reconciliation_id)
    if not reconciliation:
        return
    items_resp = await supabase_table_request(
        "GET",
        "reconciliation_items",
        params={
            "reconciliation_id": f"eq.{reconciliation_id}",
            "select": "amount,resolved",
        },
    )
    if items_resp.status_code != 200:
        logger.warning(
            "reconciliations.items_fetch_failed",
            status=items_resp.status_code,
            body=items_resp.text,
            reconciliation_id=reconciliation_id,
        )
        return
    rows = items_resp.json() or []
    outstanding = sum(
        _to_decimal(row.get("amount"))
        for row in rows
        if not row.get("resolved")
    )
    gl_balance = _to_decimal(reconciliation.get("gl_balance"))
    external_balance = _to_decimal(reconciliation.get("external_balance"))
    difference = gl_balance - external_balance - outstanding
    await supabase_table_request(
        "PATCH",
        "reconciliations",
        params={"id": f"eq.{reconciliation_id}"},
        json={"difference": _decimal_to_str(difference), "updated_at": iso_now()},
        headers={"Prefer": "return=minimal"},
    )


@app.get("/api/ada/run")
async def list_ada_runs(
    org_id: str = Query(..., alias="orgId"),
    engagement_id: str = Query(..., alias="engagementId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], org_id))
    ensure_permission_for_role(role, "audit.analytics.view")

    response = await supabase_table_request(
        "GET",
        "ada_runs",
        params={
            "select": "*, ada_exceptions(*)",
            "org_id": f"eq.{org_id}",
            "engagement_id": f"eq.{engagement_id}",
            "order": "started_at.desc",
        },
    )
    if response.status_code != 200:
        logger.error(
            "analytics.fetch_runs_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
            engagement_id=engagement_id,
        )
        raise HTTPException(status_code=502, detail="failed to load analytics runs")

    runs = response.json() or []
    return {"runs": runs}


@app.post("/api/ada/run")
async def create_ada_run(
    payload: AdaRunRequest,
    auth: Dict[str, Any] = Depends(require_auth),
    request: Request = Depends(lambda request: request),
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.analytics.run")

    try:
        sanitised_params, dataset_hash, analytics_result = run_analytics(payload.kind.value, payload.params)
    except AnalyticsValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    run_body = {
        "org_id": payload.orgId,
        "engagement_id": payload.engagementId,
        "kind": payload.kind.value,
        "dataset_ref": payload.datasetRef,
        "dataset_hash": dataset_hash,
        "params": sanitised_params,
        "created_by": payload.userId,
    }

    insert_response = await supabase_table_request(
        "POST",
        "ada_runs",
        json=run_body,
        headers={"Prefer": "return=representation"},
    )
    if insert_response.status_code not in (200, 201):
        logger.error(
            "analytics.run_insert_failed",
            status=insert_response.status_code,
            body=insert_response.text,
            org_id=payload.orgId,
        )
        raise HTTPException(status_code=502, detail="failed to record analytics run")

    rows = insert_response.json() or []
    if not rows:
        raise HTTPException(status_code=502, detail="analytics run insert returned no rows")
    run_row = rows[0]

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=payload.userId,
        action="ADA_RUN_STARTED",
        metadata={
            "runId": run_row.get("id"),
            "kind": payload.kind.value,
            "datasetRef": payload.datasetRef,
            "datasetHash": dataset_hash,
        },
    )

    summary = analytics_result.get("summary") or {}
    if summary.get("datasetHash") != dataset_hash:
        logger.error(
            "analytics.dataset_hash_mismatch",
            expected=dataset_hash,
            summary_hash=summary.get("datasetHash"),
            run_id=run_row.get("id"),
        )
        raise HTTPException(status_code=500, detail="dataset hash mismatch detected")

    exception_rows: List[Dict[str, Any]] = []
    exceptions = analytics_result.get("exceptions") or []
    if exceptions:
        exception_payload = [
            {
                "run_id": run_row.get("id"),
                "record_ref": exc.get("recordRef"),
                "reason": exc.get("reason"),
                "score": exc.get("score"),
                "created_by": payload.userId,
            }
            for exc in exceptions
        ]
        exception_response = await supabase_table_request(
            "POST",
            "ada_exceptions",
            json=exception_payload,
            headers={"Prefer": "return=representation"},
        )
        if exception_response.status_code not in (200, 201):
            logger.error(
                "analytics.exceptions_insert_failed",
                status=exception_response.status_code,
                body=exception_response.text,
                run_id=run_row.get("id"),
            )
            raise HTTPException(status_code=502, detail="failed to record analytics exceptions")
        exception_rows = exception_response.json() or []

    finished_at = iso_now()
    update_response = await supabase_table_request(
        "PATCH",
        "ada_runs",
        params={
            "id": f"eq.{run_row.get('id')}",
            "select": "*, ada_exceptions(*)",
        },
        json={"summary": summary, "finished_at": finished_at},
        headers={"Prefer": "return=representation"},
    )
    if update_response.status_code not in (200, 201):
        logger.error(
            "analytics.run_update_failed",
            status=update_response.status_code,
            body=update_response.text,
            run_id=run_row.get("id"),
        )
        raise HTTPException(status_code=502, detail="failed to finalise analytics run")

    updated_rows = update_response.json() or []
    if not updated_rows:
        raise HTTPException(status_code=502, detail="analytics run update returned no rows")
    updated_run = updated_rows[0]

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=payload.userId,
        action="ADA_RUN_COMPLETED",
        metadata={
            "runId": run_row.get("id"),
            "kind": payload.kind.value,
            "datasetHash": dataset_hash,
            "exceptions": len(exception_rows),
            "totals": summary.get("totals"),
        },
    )
    started_at_raw = run_row.get("started_at")
    duration_seconds: Optional[float] = None
    if isinstance(started_at_raw, str):
        try:
            start_dt = datetime.fromisoformat(started_at_raw)
            finish_dt = datetime.fromisoformat(finished_at)
            duration_seconds = max((finish_dt - start_dt).total_seconds(), 0.0)
        except ValueError:
            duration_seconds = None

    manifest = build_manifest(
        kind=f"analytics.{payload.kind.value.lower()}",
        inputs={
            "orgId": payload.orgId,
            "engagementId": payload.engagementId,
            "datasetRef": payload.datasetRef,
            "params": sanitised_params,
        },
        outputs={"summary": summary},
        metadata={"runId": run_row.get("id")},
    )
    updated_run["manifest"] = manifest

    return {"run": updated_run}


@app.post("/api/ada/exception/update")
async def update_ada_exception(
    payload: AdaExceptionUpdateRequest, auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.analytics.exceptions")

    exception_response = await supabase_table_request(
        "GET",
        "ada_exceptions",
        params={
            "id": f"eq.{payload.exceptionId}",
            "select": "id, run_id, disposition, note, misstatement_id",
        },
    )
    if exception_response.status_code != 200:
        logger.error(
            "analytics.exception_lookup_failed",
            status=exception_response.status_code,
            body=exception_response.text,
            exception_id=payload.exceptionId,
        )
        raise HTTPException(status_code=502, detail="failed to load analytics exception")

    exception_rows = exception_response.json() or []
    if not exception_rows:
        raise HTTPException(status_code=404, detail="analytics exception not found")
    exception_row = exception_rows[0]

    run_response = await supabase_table_request(
        "GET",
        "ada_runs",
        params={"id": f"eq.{exception_row.get('run_id')}", "select": "id, org_id, engagement_id"},
    )
    if run_response.status_code != 200:
        logger.error(
            "analytics.exception_run_lookup_failed",
            status=run_response.status_code,
            body=run_response.text,
            run_id=exception_row.get("run_id"),
        )
        raise HTTPException(status_code=502, detail="failed to verify analytics run")

    run_rows = run_response.json() or []
    if not run_rows:
        raise HTTPException(status_code=404, detail="analytics run not found for exception")
    run_row = run_rows[0]
    if str(run_row.get("org_id")) != payload.orgId:
        raise HTTPException(status_code=403, detail="forbidden for analytics exception update")

    updates: Dict[str, Any] = {"updated_by": payload.userId, "updated_at": iso_now()}
    fields_set = getattr(payload, "model_fields_set", getattr(payload, "__fields_set__", set()))
    if "disposition" in fields_set:
        if payload.disposition is None:
            raise HTTPException(status_code=400, detail="disposition must be provided when included")
        updates["disposition"] = payload.disposition.value
    if "note" in fields_set:
        updates["note"] = payload.note
    if "misstatementId" in fields_set:
        updates["misstatement_id"] = payload.misstatementId

    update_response = await supabase_table_request(
        "PATCH",
        "ada_exceptions",
        params={
            "id": f"eq.{payload.exceptionId}",
            "select": "*, ada_runs!inner(org_id, engagement_id)",
        },
        json=updates,
        headers={"Prefer": "return=representation"},
    )
    if update_response.status_code not in (200, 201):
        logger.error(
            "analytics.exception_update_failed",
            status=update_response.status_code,
            body=update_response.text,
            exception_id=payload.exceptionId,
        )
        raise HTTPException(status_code=502, detail="failed to update analytics exception")

    update_rows = update_response.json() or []
    if not update_rows:
        raise HTTPException(status_code=502, detail="analytics exception update returned no rows")
    updated_exception = update_rows[0]

    if updated_exception.get("disposition") == AdaExceptionDisposition.RESOLVED.value:
        await log_activity_event(
            org_id=payload.orgId,
            actor_id=payload.userId,
            action="ADA_EXCEPTION_RESOLVED",
            metadata={
                "runId": run_row.get("id"),
                "exceptionId": payload.exceptionId,
                "misstatementId": updated_exception.get("misstatement_id"),
            },
        )

    return {"exception": updated_exception}


@app.get("/api/controls")
async def get_controls(
    org_id: str = Query(..., alias="orgId"),
    engagement_id: str = Query(..., alias="engagementId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], org_id))
    ensure_permission_for_role(role, "audit.controls.view")
    controls_resp = await supabase_table_request(
        "GET",
        "controls",
        params={
            "select": "id,org_id,engagement_id,cycle,objective,description,owner,frequency,key,created_at,updated_at,control_walkthroughs(*),control_tests(*)",
            "org_id": f"eq.{org_id}",
            "engagement_id": f"eq.{engagement_id}",
            "order": "cycle.asc",
        },
    )
    if controls_resp.status_code != 200:
        logger.error(
            "controls.fetch_failed",
            status=controls_resp.status_code,
            body=controls_resp.text,
            org_id=org_id,
        )
        raise HTTPException(status_code=502, detail="failed to load controls")
    controls_rows = controls_resp.json() or []
    itgc_resp = await supabase_table_request(
        "GET",
        "itgc_groups",
        params={
            "org_id": f"eq.{org_id}",
            "engagement_id": f"eq.{engagement_id}",
            "order": "type.asc",
        },
    )
    deficiencies_resp = await supabase_table_request(
        "GET",
        "deficiencies",
        params={
            "org_id": f"eq.{org_id}",
            "engagement_id": f"eq.{engagement_id}",
            "order": "created_at.desc",
        },
    )
    if itgc_resp.status_code != 200 or deficiencies_resp.status_code != 200:
        logger.error(
            "controls.related_fetch_failed",
            itgc_status=itgc_resp.status_code,
            deficiencies_status=deficiencies_resp.status_code,
        )
        raise HTTPException(status_code=502, detail="failed to load controls metadata")
    return {
        "controls": controls_rows,
        "itgcGroups": itgc_resp.json() or [],
        "deficiencies": deficiencies_resp.json() or [],
    }


@app.post("/api/controls")
async def create_control(payload: ControlCreateRequest, auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    frequency = _validate_control_frequency(payload.frequency)
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.controls.manage")
    body = {
        "org_id": payload.orgId,
        "engagement_id": payload.engagementId,
        "cycle": payload.cycle,
        "objective": payload.objective,
        "description": payload.description,
        "frequency": frequency,
        "owner": payload.owner,
        "key": bool(payload.key),
    }
    response = await supabase_table_request(
        "POST",
        "controls",
        json=body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("controls.create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create control")
    rows = response.json() or []
    control_row = rows[0] if rows else {**body, "id": str(uuid.uuid4())}
    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="CTRL_ADDED",
        entity_type="CONTROL",
        entity_id=control_row.get("id"),
        metadata={
            "cycle": control_row.get("cycle"),
            "objective": control_row.get("objective"),
            "frequency": control_row.get("frequency"),
            "key": control_row.get("key"),
        },
    )
    return {"control": control_row}


@app.post("/api/controls/walkthrough")
async def create_control_walkthrough(
    payload: ControlWalkthroughRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    control = await fetch_single_record("controls", payload.controlId)
    if not control or control.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="control not found")
    result_value = _validate_control_walkthrough_result(payload.result)
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.controls.walkthrough")
    body = {
        "org_id": payload.orgId,
        "control_id": payload.controlId,
        "walkthrough_date": payload.date,
        "notes": payload.notes,
        "result": result_value,
        "created_by": payload.userId,
    }
    response = await supabase_table_request(
        "POST",
        "control_walkthroughs",
        json=body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("controls.walkthrough_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to record walkthrough")
    rows = response.json() or []
    walkthrough_row = rows[0] if rows else body
    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="CTRL_WALKTHROUGH_RECORDED",
        entity_type="CONTROL",
        entity_id=payload.controlId,
        metadata={"result": result_value, "date": payload.date},
    )
    return {"walkthrough": walkthrough_row}


@app.post("/api/controls/test/run")
async def run_control_test(
    payload: ControlTestRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    if len(payload.attributes) < 25:
        raise HTTPException(status_code=400, detail="sample size must be at least 25")
    result_value = _validate_control_test_result(payload.result)
    control = await fetch_single_record("controls", payload.controlId)
    if not control or control.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="control not found")
    if control.get("engagement_id") and control.get("engagement_id") != payload.engagementId:
        raise HTTPException(status_code=400, detail="control engagement mismatch")
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.controls.test")
    attributes_payload = [
        attribute.model_dump(exclude_none=True, by_alias=True)
        for attribute in payload.attributes
    ]
    performed_at = iso_now()
    test_body = {
        "org_id": payload.orgId,
        "control_id": payload.controlId,
        "attributes": attributes_payload,
        "result": result_value,
        "performed_at": performed_at,
        "performed_by": payload.userId,
    }
    test_response = await supabase_table_request(
        "POST",
        "control_tests",
        json=test_body,
        headers={"Prefer": "return=representation"},
    )
    if test_response.status_code not in (200, 201):
        logger.error("controls.test_failed", status=test_response.status_code, body=test_response.text)
        raise HTTPException(status_code=502, detail="failed to record control test")
    test_rows = test_response.json() or []
    test_row = test_rows[0] if test_rows else test_body
    deficiency_row = None
    if result_value == "EXCEPTIONS":
        severity = _validate_deficiency_severity(payload.deficiencySeverity) or "MEDIUM"
        recommendation = (payload.deficiencyRecommendation or "").strip()
        if not recommendation:
            raise HTTPException(status_code=400, detail="deficiency recommendation required when exceptions occur")
        deficiency_body = {
            "org_id": payload.orgId,
            "engagement_id": payload.engagementId,
            "control_id": payload.controlId,
            "severity": severity,
            "recommendation": recommendation,
            "status": "OPEN",
        }
        deficiency_response = await supabase_table_request(
            "POST",
            "deficiencies",
            json=deficiency_body,
            headers={"Prefer": "return=representation"},
        )
        if deficiency_response.status_code not in (200, 201):
            logger.error(
                "controls.deficiency_create_failed",
                status=deficiency_response.status_code,
                body=deficiency_response.text,
            )
        else:
            deficiency_rows = deficiency_response.json() or []
            deficiency_row = deficiency_rows[0] if deficiency_rows else deficiency_body
    sampling_plan = {
        "id": f"fixture-{payload.controlId}-{uuid.uuid4().hex}",
        "size": len(attributes_payload),
        "generatedAt": performed_at,
        "source": "deterministic-fixture",
        "items": attributes_payload,
    }
    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="CTRL_TEST_RUN",
        entity_type="CONTROL",
        entity_id=payload.controlId,
        metadata={
            "result": result_value,
            "sampleSize": len(attributes_payload),
            "exceptions": sum(1 for attr in attributes_payload if attr.get("passed") is False),
        },
    )
    return {"test": test_row, "deficiency": deficiency_row, "samplingPlan": sampling_plan}


@app.get("/api/recon")
async def list_reconciliations(
    org_id: str = Query(..., alias="orgId"),
    entity_id: str = Query(..., alias="entityId"),
    period_id: str = Query(..., alias="periodId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], org_id))
    ensure_permission_for_role(role, "audit.reconciliations.view")
    response = await supabase_table_request(
        "GET",
        "reconciliations",
        params={
            "select": "id,org_id,entity_id,period_id,type,gl_balance,external_balance,difference,status,prepared_by_user_id,reviewed_by_user_id,closed_at,schedule_document_id,created_at,updated_at,reconciliation_items(*)",
            "org_id": f"eq.{org_id}",
            "entity_id": f"eq.{entity_id}",
            "period_id": f"eq.{period_id}",
            "order": "created_at.asc",
        },
    )
    if response.status_code != 200:
        logger.error("reconciliations.fetch_failed", status=response.status_code, body=response.text, org_id=org_id)
        raise HTTPException(status_code=502, detail="failed to load reconciliations")
    return {"reconciliations": response.json() or []}


@app.post("/api/recon/create")
async def create_reconciliation(
    payload: ReconciliationCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.reconciliations.manage")
    recon_type = _validate_reconciliation_type(payload.type)
    external_balance = _to_decimal(payload.externalBalance)
    gl_balance_input = payload.glBalance if payload.glBalance is not None else payload.externalBalance
    gl_balance = _to_decimal(gl_balance_input)
    difference = gl_balance - external_balance
    body = {
        "org_id": payload.orgId,
        "entity_id": payload.entityId,
        "period_id": payload.periodId,
        "type": recon_type,
        "control_account_id": payload.controlAccountId,
        "gl_balance": _decimal_to_str(gl_balance),
        "external_balance": _decimal_to_str(external_balance),
        "difference": _decimal_to_str(difference),
        "status": "IN_PROGRESS",
        "prepared_by_user_id": payload.preparedByUserId,
    }
    response = await supabase_table_request(
        "POST",
        "reconciliations",
        json=body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("reconciliations.create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create reconciliation")
    rows = response.json() or []
    reconciliation_row = rows[0] if rows else body
    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="RECON_CREATED",
        entity_type="RECONCILIATION",
        entity_id=reconciliation_row.get("id"),
        metadata={"type": recon_type, "period": payload.periodId},
    )
    return {"reconciliation": reconciliation_row}


@app.post("/api/recon/add-item")
async def add_reconciliation_item(
    payload: ReconciliationAddItemRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    reconciliation = await fetch_single_record("reconciliations", payload.reconciliationId)
    if not reconciliation or reconciliation.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="reconciliation not found")
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.reconciliations.manage")
    category = _validate_reconciliation_item_category(payload.item.category)
    amount = _to_decimal(payload.item.amount)
    body = {
        "org_id": payload.orgId,
        "reconciliation_id": payload.reconciliationId,
        "category": category,
        "amount": _decimal_to_str(amount),
        "reference": payload.item.reference,
        "note": payload.item.note,
        "resolved": payload.item.resolved,
    }
    response = await supabase_table_request(
        "POST",
        "reconciliation_items",
        json=body,
        headers={"Prefer": "return=minimal"},
    )
    if response.status_code not in (200, 201, 204):
        logger.error("reconciliations.item_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to add reconciliation item")
    await _update_reconciliation_difference(payload.reconciliationId)
    return {"status": "ok"}


@app.post("/api/recon/close")
async def close_reconciliation(
    payload: ReconciliationCloseRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    reconciliation = await fetch_single_record("reconciliations", payload.reconciliationId)
    if not reconciliation or reconciliation.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="reconciliation not found")
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.reconciliations.close")
    update = {
        "status": "CLOSED",
        "closed_at": iso_now(),
        "reviewed_by_user_id": payload.userId,
    }
    if payload.scheduleDocumentId is not None:
        update["schedule_document_id"] = payload.scheduleDocumentId
    response = await supabase_table_request(
        "PATCH",
        "reconciliations",
        params={"id": f"eq.{payload.reconciliationId}"},
        json=update,
        headers={"Prefer": "return=minimal"},
    )
    if response.status_code not in (200, 204):
        logger.error("reconciliations.close_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to close reconciliation")
    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="RECON_CLOSED",
        entity_type="RECONCILIATION",
        entity_id=payload.reconciliationId,
        metadata={"scheduleDocumentId": payload.scheduleDocumentId},
    )
    return {"status": "ok"}

@app.get("/v1/tasks")
async def list_tasks(
    org_slug: str = Query(..., alias="orgSlug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(default=None),
    assignee: Optional[str] = Query(default=None),
    engagement: Optional[str] = Query(default=None, alias="engagementId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)

    if status and status not in TASK_STATUS_VALUES and status != "all":
        raise HTTPException(status_code=400, detail="invalid status filter")

    params: Dict[str, Any] = {
        "select": "id,org_id,engagement_id,title,description,status,priority,due_date,assigned_to,created_by,created_at,updated_at",
        "org_id": f"eq.{context['org_id']}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }

    if status and status != "all":
        params["status"] = f"eq.{status}"
    if assignee:
        params["assigned_to"] = f"eq.{assignee}"
    if engagement:
        params["engagement_id"] = f"eq.{engagement}"

    response = await supabase_table_request("GET", "tasks", params=params)
    if response.status_code != 200:
        logger.error("tasks.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch tasks")

    rows = response.json()
    return {"tasks": [map_task_response(row) for row in rows]}


@app.post("/v1/tasks")
async def create_task(payload: TaskCreateRequest, auth: Dict[str, Any] = Depends(require_auth)) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    role = normalise_role(context.get("role"))
    ensure_permission_for_role(role, "tasks.create")
    task_row = await insert_task_record(
        org_id=context["org_id"],
        creator_id=auth["sub"],
        payload={
            "title": payload.title,
            "description": payload.description,
            "status": payload.status,
            "priority": payload.priority,
            "engagement_id": payload.engagementId,
            "assigned_to": payload.assigneeId,
            "due_date": payload.dueDate,
        },
    )

    if payload.assigneeId and payload.assigneeId != auth["sub"]:
        await create_notification(
            org_id=context["org_id"],
            user_id=payload.assigneeId,
            kind="TASK",
            title=f"New task assigned: {payload.title}",
            body=payload.description,
        )

    return {"task": map_task_response(task_row)}


@app.patch("/v1/tasks/{task_id}")
async def update_task(
    task_id: str,
    payload: TaskUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    task_row = await fetch_single_record("tasks", task_id)
    if not task_row:
        raise HTTPException(status_code=404, detail="task not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], task_row["org_id"]))
    ensure_permission_for_role(role, "tasks.update")
    if not has_manager_privileges(role) and task_row.get("created_by") != auth["sub"]:
        # allow basic edits if user created the task or has elevated role
        pass

    updates: Dict[str, Any] = {}

    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.description is not None:
        updates["description"] = payload.description
    if payload.status is not None:
        status_value = payload.status.upper()
        if status_value not in TASK_STATUS_VALUES:
            raise HTTPException(status_code=400, detail="invalid task status")
        updates["status"] = status_value
    if payload.priority is not None:
        priority_value = payload.priority.upper()
        if priority_value not in TASK_PRIORITY_VALUES:
            raise HTTPException(status_code=400, detail="invalid task priority")
        updates["priority"] = priority_value
    if payload.engagementId is not None:
        updates["engagement_id"] = payload.engagementId
    if payload.assigneeId is not None:
        if payload.assigneeId != task_row.get("assigned_to"):
            ensure_permission_for_role(role, "tasks.assign")
        updates["assigned_to"] = payload.assigneeId
    if payload.dueDate is not None:
        updates["due_date"] = payload.dueDate

    if not updates:
        return {"task": map_task_response(task_row)}

    updates["updated_at"] = iso_now()

    response = await supabase_table_request(
        "PATCH",
        "tasks",
        params={"id": f"eq.{task_id}"},
        json=updates,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 204):
        logger.error("tasks.update_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to update task")

    rows = response.json() if response.status_code != 204 else []
    updated_row = rows[0] if rows else await fetch_single_record("tasks", task_id)
    if not updated_row:
        raise HTTPException(status_code=404, detail="task not found")

    if payload.assigneeId and payload.assigneeId != task_row.get("assigned_to") and payload.assigneeId != auth.get("sub"):
        await create_notification(
            org_id=task_row["org_id"],
            user_id=payload.assigneeId,
            kind="TASK",
            title=f"Task updated: {updated_row.get('title')}",
            body=updated_row.get("description"),
        )

    return {"task": map_task_response(updated_row)}


@app.get("/v1/tasks/{task_id}/comments")
async def list_task_comments(
    task_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    task_row = await fetch_single_record("tasks", task_id, select="id, org_id")
    if not task_row:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(auth["sub"], task_row["org_id"])

    response = await supabase_table_request(
        "GET",
        "task_comments",
        params={
            "task_id": f"eq.{task_id}",
            "order": "created_at.desc",
            "select": "id, task_id, org_id, user_id, body, created_at",
        },
    )

    if response.status_code != 200:
        logger.error("tasks.comments_list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch comments")

    return {"comments": response.json()}


@app.post("/v1/tasks/{task_id}/comments")
async def create_task_comment(
    task_id: str,
    payload: TaskCommentRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    task_row = await fetch_single_record("tasks", task_id)
    if not task_row:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(auth["sub"], task_row["org_id"])

    supabase_payload = {
        "task_id": task_id,
        "org_id": task_row["org_id"],
        "user_id": auth["sub"],
        "body": payload.body.strip(),
    }

    response = await supabase_table_request(
        "POST",
        "task_comments",
        json=supabase_payload,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 201):
        logger.error("tasks.comment_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to add comment")

    rows = response.json()
    return {"comment": rows[0] if rows else supabase_payload}


@app.post("/v1/tasks/{task_id}/attachments")
async def attach_document_to_task(
    task_id: str,
    payload: TaskAttachmentRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    task_row = await fetch_single_record("tasks", task_id)
    if not task_row:
        raise HTTPException(status_code=404, detail="task not found")

    await ensure_org_access_by_id(auth["sub"], task_row["org_id"])

    document = await fetch_single_record("documents", payload.documentId)
    if not document or document.get("org_id") != task_row["org_id"] or document.get("deleted"):
        raise HTTPException(status_code=404, detail="document not found")

    supabase_payload = {
        "task_id": task_id,
        "org_id": task_row["org_id"],
        "document_id": payload.documentId,
        "note": payload.note,
    }

    response = await supabase_table_request(
        "POST",
        "task_attachments",
        json=supabase_payload,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 201):
        logger.error("tasks.attachment_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to attach document")

    rows = response.json()
    await create_notification(
        org_id=task_row["org_id"],
        user_id=task_row.get("assigned_to"),
        kind="TASK",
        title=f"New attachment on task: {task_row.get('title')}",
        body=payload.note,
    )

    return {"attachment": rows[0] if rows else supabase_payload}


@app.get("/v1/storage/documents")
async def list_documents_endpoint(
    org_slug: str = Query(..., alias="orgSlug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: Optional[str] = Query(default=None),
    state: str = Query("active", alias="state"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    role = normalise_role(context.get("role"))

    state_normalized = (state or "active").lower()
    if state_normalized not in {"active", "archived", "all"}:
        raise HTTPException(status_code=400, detail="invalid state filter")

    params: Dict[str, Any] = {
        "select": (
            "id,org_id,entity_id,repo_folder,name,filename,mime_type,file_size,storage_path,"
            "uploaded_by,classification,deleted,created_at,ocr_status,parse_status,portal_visible,"
            "document_extractions(status,fields,confidence,provenance,updated_at,extractor_name,document_type),"
            "document_quarantine(status,reason,created_at)"
        ),
        "org_id": f"eq.{context['org_id']}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }

    params["document_extractions.order"] = "created_at.desc"
    params["document_extractions.limit"] = "1"
    params["document_quarantine.order"] = "created_at.desc"
    params["document_quarantine.limit"] = "1"

    if state_normalized == "archived":
        params["deleted"] = "eq.true"
    elif state_normalized == "active":
        params["deleted"] = "eq.false"

    repo_value = (repo or "").strip() or None
    if role == "CLIENT":
        ensure_permission_for_role(role, "documents.view_client")
        allowed_repos = get_client_allowed_document_repos() or ["03_Accounting/PBC"]
        if repo_value and repo_value not in allowed_repos:
            raise HTTPException(status_code=403, detail="forbidden")
        scoped_repos = allowed_repos if repo_value is None else [repo_value]
        if len(scoped_repos) == 1:
            params["repo_folder"] = f"eq.{scoped_repos[0]}"
        else:
            params["repo_folder"] = f"in.({','.join(scoped_repos)})"
        params["portal_visible"] = "eq.true"
    else:
        ensure_permission_for_role(role, "documents.view_internal")
        if repo_value:
            params["repo_folder"] = f"eq.{repo_value}"

    response = await supabase_table_request("GET", "documents", params=params)
    if response.status_code != 200:
        logger.error("documents.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch documents")

    rows = response.json()
    return {"documents": [map_document_response(row) for row in rows]}


@app.post("/v1/storage/documents")
async def upload_document_endpoint(
    file: UploadFile = File(...),
    org_slug_form: str = Form(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
    entity_id: Optional[str] = Form(None, alias="entityId"),
    repo_folder: Optional[str] = Form(None, alias="repoFolder"),
    name_override: Optional[str] = Form(None, alias="name"),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug_form)
    role = normalise_role(context.get("role"))

    await enforce_rate_limit(
        "storage:upload",
        auth["sub"],
        limit=DOCUMENT_UPLOAD_RATE_LIMIT,
        window=DOCUMENT_UPLOAD_RATE_WINDOW,
    )

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="empty file upload")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large")

    mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    if mime_type not in ALLOWED_DOCUMENT_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="unsupported document type")

    ensure_permission_for_role(role, "documents.upload")

    if role == "CLIENT":
        allowed_repos = get_client_allowed_document_repos()
        default_repo = allowed_repos[0] if allowed_repos else "03_Accounting/PBC"
        target_repo = (repo_folder or default_repo).strip() or default_repo
        if target_repo not in allowed_repos:
            raise HTTPException(status_code=403, detail="forbidden")
        repo_value = target_repo
    else:
        repo_value = (repo_folder or "99_Other").strip() or "99_Other"
    repo_value = repo_value.replace(" ", "_")
    entity_segment = (entity_id or "general").strip() or "general"
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    display_name = (name_override or file.filename or "document").strip()
    sanitized_name = sanitize_filename(display_name)
    storage_path = f"org-{context['org_id']}/docs/{entity_segment}/{repo_value}/{timestamp}_{sanitized_name}"

    upload_headers = {
        "Content-Type": mime_type,
        "x-upsert": "false",
    }

    upload_response = await supabase_request(
        "POST",
        f"{SUPABASE_STORAGE_URL}/object/{DOCUMENTS_BUCKET}/{storage_path}",
        content=payload,
        headers=upload_headers,
    )

    if upload_response.status_code not in (200, 201):
        logger.error("documents.upload_failed", status=upload_response.status_code, body=upload_response.text)
        raise HTTPException(status_code=502, detail="failed to store document")

    checksum = hashlib.sha256(payload).hexdigest()

    portal_visible = repo_value in get_client_allowed_document_repos()

    document_payload = {
        "org_id": context["org_id"],
        "entity_id": entity_id,
        "repo_folder": repo_value,
        "name": display_name,
        "filename": sanitized_name,
        "mime_type": mime_type,
        "file_size": len(payload),
        "storage_path": storage_path,
        "uploaded_by": auth["sub"],
        "checksum": checksum,
        "portal_visible": portal_visible,
    }

    response = await supabase_table_request(
        "POST",
        "documents",
        json=document_payload,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 201):
        logger.error("documents.record_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to record document")

    rows = response.json()
    document_row = rows[0] if rows else document_payload

    await create_notification(
        org_id=context["org_id"],
        user_id=auth["sub"],
        kind="DOC",
        title=f"Uploaded document: {display_name}",
        body=f"Stored in {repo_value}",
    )

    try:
        await supabase_table_request(
            "POST",
            "document_extractions",
            json={
                "document_id": document_row.get("id"),
                "extractor_name": "baseline_pipeline",
                "extractor_version": "v1",
                "status": "PENDING",
            },
            headers={"Prefer": "return=minimal"},
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("documents.extraction_seed_failed", error=str(exc))

    return {"document": map_document_response(document_row)}


@app.delete("/v1/storage/documents/{document_id}")
async def delete_document_endpoint(
    document_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, str]:
    document = await fetch_single_record("documents", document_id)
    if not document or document.get("deleted"):
        raise HTTPException(status_code=404, detail="document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))
    ensure_permission_for_role(role, "documents.upload")

    response = await supabase_table_request(
        "PATCH",
        "documents",
        params={"id": f"eq.{document_id}"},
        json={"deleted": True, "updated_at": iso_now()},
        headers={"Prefer": "return=minimal"},
    )

    if response.status_code not in (200, 204):
        logger.error("documents.delete_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to delete document")

    await create_notification(
        org_id=document["org_id"],
        user_id=document.get("uploaded_by"),
        kind="DOC",
        title=f"Document archived: {document.get('name')}",
        body="Marked as deleted",
    )

    return {"status": "ok"}


@app.post("/v1/storage/documents/{document_id}/restore")
async def restore_document_endpoint(
    document_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, str]:
    document = await fetch_single_record("documents", document_id)
    if not document or not document.get("deleted"):
        raise HTTPException(status_code=404, detail="archived document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))
    ensure_permission_for_role(role, "documents.upload")

    response = await supabase_table_request(
        "PATCH",
        "documents",
        params={"id": f"eq.{document_id}"},
        json={"deleted": False, "updated_at": iso_now()},
        headers={"Prefer": "return=minimal"},
    )

    if response.status_code not in (200, 204):
        logger.error("documents.restore_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to restore document")

    await create_notification(
        org_id=document["org_id"],
        user_id=document.get("uploaded_by"),
        kind="DOC",
        title=f"Document restored: {document.get('name')}",
        body="Marked as active",
    )

    return {"status": "ok"}


@app.post("/v1/storage/sign")
async def sign_document_endpoint(
    payload: DocumentSignRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, str]:
    document = await fetch_single_record("documents", payload.documentId)
    if not document or document.get("deleted"):
        raise HTTPException(status_code=404, detail="document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))
    repo_folder = document.get("repo_folder")
    if role == "CLIENT":
        ensure_permission_for_role(role, "documents.view_client")
        if repo_folder not in get_client_allowed_document_repos():
            raise HTTPException(status_code=403, detail="forbidden")
    else:
        ensure_permission_for_role(role, "documents.view_internal")

    sign_response = await supabase_request(
        "POST",
        f"{SUPABASE_STORAGE_URL}/object/sign/{DOCUMENTS_BUCKET}/{document['storage_path']}",
        json={"expiresIn": payload.ttlSeconds or 900},
    )

    if sign_response.status_code != 200:
        logger.error("documents.sign_failed", status=sign_response.status_code, body=sign_response.text)
        raise HTTPException(status_code=502, detail="failed to create signed URL")

    body = sign_response.json()
    signed = body.get("signedURL") or body.get("signedUrl")
    if not signed:
        raise HTTPException(status_code=502, detail="invalid storage response")

    if signed.startswith("http"):
        url = signed
    else:
        url = SUPABASE_URL.rstrip("/") + signed

    return {"url": url}


@app.post("/v1/documents/{document_id}/extraction")
async def document_extraction_update(
    document_id: str,
    payload: DocumentExtractionUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    document = await fetch_single_record(
        "documents",
        document_id,
        select="id, org_id, ocr_status, parse_status, deleted",
    )
    if not document or document.get("deleted"):
        raise HTTPException(status_code=404, detail="document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))
    ensure_permission_for_role(role, "documents.upload")

    extractor_name = payload.extractorName or "baseline_pipeline"
    extractor_version = payload.extractorVersion or "v1"

    record_payload = {
        "document_id": document_id,
        "extractor_name": extractor_name,
        "extractor_version": extractor_version,
        "status": payload.status,
        "fields": payload.fields,
        "confidence": payload.confidence,
        "provenance": payload.provenance,
        "updated_at": iso_now(),
    }
    if payload.documentType:
        record_payload["document_type"] = payload.documentType

    if payload.extractionId:
        response = await supabase_table_request(
            "PATCH",
            "document_extractions",
            params={"id": f"eq.{payload.extractionId}"},
            json=record_payload,
            headers={"Prefer": "return=representation"},
        )
    else:
        response = await supabase_table_request(
            "POST",
            "document_extractions",
            json=record_payload,
            headers={"Prefer": "return=representation"},
        )

    if response.status_code not in (200, 201):
        logger.error("documents.extraction_update_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to update extraction")

    extraction_rows = response.json()
    extraction = extraction_rows[0] if extraction_rows else None

    doc_update: Dict[str, Any] = {"updated_at": iso_now()}
    if payload.status.upper() == "DONE":
        doc_update["parse_status"] = "DONE"
        doc_update["ocr_status"] = document.get("ocr_status") or "DONE"
        if payload.documentType:
            doc_update["classification"] = payload.documentType
    elif payload.status.upper() == "FAILED":
        doc_update["parse_status"] = "FAILED"

    if len(doc_update) > 1:
        await supabase_table_request(
            "PATCH",
            "documents",
            params={"id": f"eq.{document_id}"},
            json=doc_update,
            headers={"Prefer": "return=minimal"},
        )

    return {"extraction": extraction}


@app.get("/v1/notifications")
async def list_notifications(
    org_slug: str = Query(..., alias="orgSlug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: Optional[bool] = Query(default=False, alias="unreadOnly"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)

    params: Dict[str, Any] = {
        "select": "id,org_id,user_id,kind,title,body,link,urgent,read,created_at",
        "org_id": f"eq.{context['org_id']}",
        "user_id": f"eq.{auth['sub']}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }

    if unread_only:
        params["read"] = "eq.false"

    response = await supabase_table_request("GET", "notifications", params=params)
    if response.status_code != 200:
        logger.error("notifications.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch notifications")

    rows = response.json()
    notifications = [
        {
            "id": row.get("id"),
            "type": NOTIFICATION_KIND_TO_FRONTEND.get(row.get("kind", "SYSTEM"), "system"),
            "title": row.get("title"),
            "body": row.get("body"),
            "link": row.get("link"),
            "urgent": row.get("urgent", False),
            "read": row.get("read", False),
            "created_at": row.get("created_at"),
        }
        for row in rows
    ]
    return {"notifications": notifications}


@app.patch("/v1/notifications/{notification_id}")
async def update_notification(
    notification_id: str,
    payload: NotificationUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    notification = await fetch_single_record("notifications", notification_id)
    if not notification or notification.get("user_id") != auth["sub"]:
        raise HTTPException(status_code=404, detail="notification not found")

    updates: Dict[str, Any] = {}
    if payload.read is not None:
        updates["read"] = payload.read

    if not updates:
        return {"notification": {
            "id": notification_id,
            "read": notification.get("read", False),
        }}

    response = await supabase_table_request(
        "PATCH",
        "notifications",
        params={"id": f"eq.{notification_id}"},
        json=updates,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 204):
        logger.error("notifications.update_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to update notification")

    rows = response.json() if response.status_code != 204 else []
    updated = rows[0] if rows else await fetch_single_record("notifications", notification_id)
    if not updated:
        raise HTTPException(status_code=404, detail="notification not found")

    return {"notification": {
        "id": updated.get("id"),
        "read": updated.get("read", False),
    }}


@app.post("/v1/notifications/mark-all")
async def mark_all_notifications(
    payload: NotificationsMarkAllRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, str]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)

    response = await supabase_table_request(
        "PATCH",
        "notifications",
        params={
            "org_id": f"eq.{context['org_id']}",
            "user_id": f"eq.{auth['sub']}",
            "read": "eq.false",
        },
        json={"read": True},
        headers={"Prefer": "return=minimal"},
    )

    if response.status_code not in (200, 204):
        logger.error("notifications.mark_all_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to mark notifications")

    return {"status": "ok"}


@app.post("/v1/onboarding/start")
async def onboarding_start(
    payload: OnboardingStartRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    role = normalise_role(context.get("role"))
    ensure_permission_for_role(role, "onboarding.start")
    await enforce_rate_limit(
        "onboarding:start",
        auth["sub"],
        limit=ONBOARDING_START_RATE_LIMIT,
        window=ONBOARDING_START_RATE_WINDOW,
    )

    temp_entity_id = generate_temp_entity_id()
    checklist_payload = {
        "org_id": context["org_id"],
        "temp_entity_id": temp_entity_id,
        "industry": payload.industry,
        "country": payload.country,
        "status": "ACTIVE",
        "updated_at": iso_now(),
    }

    checklist_response = await supabase_table_request(
        "POST",
        "onboarding_checklists",
        json=checklist_payload,
        headers={"Prefer": "return=representation"},
    )

    if checklist_response.status_code not in (200, 201):
        logger.error("onboarding.start_failed", status=checklist_response.status_code, body=checklist_response.text)
        raise HTTPException(status_code=502, detail="failed to start onboarding")

    checklist_row = checklist_response.json()[0]

    items_payload = build_onboarding_items(checklist_row["id"])
    items_response = await supabase_table_request(
        "POST",
        "onboarding_checklist_items",
        json=items_payload,
        headers={"Prefer": "return=minimal"},
    )
    if items_response.status_code not in (200, 201, 204):
        logger.error("onboarding.items_insert_failed", status=items_response.status_code, body=items_response.text)
        raise HTTPException(status_code=502, detail="failed to create checklist items")

    draft_response = await supabase_table_request(
        "POST",
        "company_profile_drafts",
        json={
            "org_id": context["org_id"],
            "checklist_id": checklist_row["id"],
            "extracted": {
                "industry": payload.industry,
                "country": payload.country,
            },
        },
        headers={"Prefer": "return=representation"},
    )
    draft_row = draft_response.json()[0] if draft_response.status_code in (200, 201) else None

    checklist = await fetch_checklist_with_items(checklist_row["id"])

    return {"checklist": checklist, "draft": draft_row}


@app.post("/v1/policy-packs/update")
async def update_policy_pack_endpoint(
    payload: PolicyPackUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    role = normalise_role(context.get("role"))
    ensure_permission_for_role(role, "policy.pack.edit")
    autonomy_level = normalise_autonomy_level(context.get("autonomy_level"))
    escalate = requires_policy_escalation(autonomy_level)

    updates: Dict[str, Any] = {}
    if payload.summary is not None:
        updates["summary"] = payload.summary
    if payload.diff is not None:
        updates["diff"] = payload.diff
    if not updates:
        raise HTTPException(status_code=400, detail="no updates supplied")

    updates["updated_at"] = iso_now()
    if escalate:
        updates["status"] = "pending"

    response = await supabase_table_request(
        "PATCH",
        "agent_policy_versions",
        params={
            "id": f"eq.{payload.policyPackId}",
            "org_id": f"eq.{context['org_id']}",
        },
        json=updates,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 204):
        logger.error("policy_pack.update_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to update policy pack")

    rows = response.json() if response.status_code != 204 else []
    updated = rows[0] if rows else {**updates, "id": payload.policyPackId}

    if escalate:
        await log_activity_event(
            org_id=context["org_id"],
            actor_id=auth["sub"],
            action="POLICY_PACK_ESCALATED",
            entity_type="AGENT_POLICY_VERSION",
            entity_id=payload.policyPackId,
            metadata={
                "autonomy_level": autonomy_level,
                "status": updated.get("status", "pending"),
            },
        )

    return {"policyPack": updated}


@app.post("/v1/onboarding/link-doc")
async def onboarding_link_document(
    payload: OnboardingLinkDocRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    item = await fetch_single_record(
        "onboarding_checklist_items",
        payload.itemId,
        select="id, checklist_id, document_id, status",
    )
    if not item:
        raise HTTPException(status_code=404, detail="checklist item not found")

    checklist = await fetch_single_record(
        "onboarding_checklists",
        item["checklist_id"],
        select="id, org_id, status",
    )
    if not checklist:
        raise HTTPException(status_code=404, detail="checklist not found")

    await ensure_org_access_by_id(auth["sub"], checklist["org_id"])

    document = await fetch_single_record(
        "documents",
        payload.documentId,
        select="id, org_id, deleted",
    )
    if not document or document.get("deleted") or document.get("org_id") != checklist["org_id"]:
        raise HTTPException(status_code=404, detail="document not found")

    await enforce_rate_limit(
        "onboarding:link-doc",
        auth["sub"],
        limit=ONBOARDING_LINK_RATE_LIMIT,
        window=ONBOARDING_LINK_RATE_WINDOW,
    )

    update_response = await supabase_table_request(
        "PATCH",
        "onboarding_checklist_items",
        params={"id": f"eq.{payload.itemId}"},
        json={
            "document_id": payload.documentId,
            "status": "REVIEW",
            "updated_at": iso_now(),
        },
        headers={"Prefer": "return=minimal"},
    )
    if update_response.status_code not in (200, 204):
        logger.error("onboarding.link_doc_failed", status=update_response.status_code, body=update_response.text)
        raise HTTPException(status_code=502, detail="failed to link document")

    checklist_with_items = await fetch_checklist_with_items(item["checklist_id"])
    return {"checklist": checklist_with_items}


@app.post("/v1/onboarding/commit")
async def onboarding_commit(
    payload: OnboardingCommitRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    checklist = await fetch_checklist_with_items(payload.checklistId)
    role = normalise_role(await ensure_org_access_by_id(auth["sub"], checklist["org_id"]))
    ensure_permission_for_role(role, "onboarding.commit")
    await enforce_rate_limit(
        "onboarding:commit",
        auth["sub"],
        limit=ONBOARDING_COMMIT_RATE_LIMIT,
        window=ONBOARDING_COMMIT_RATE_WINDOW,
    )

    items: List[Dict[str, Any]] = checklist.get("items", [])
    missing = [item for item in items if not item.get("document_id")]
    if missing:
        raise HTTPException(status_code=400, detail="attach documents for all checklist items before committing")

    aggregated_profile: Dict[str, Any] = {}
    aggregated_provenance: Dict[str, List[Dict[str, Any]]] = {}
    task_seeds: List[Dict[str, Any]] = []
    for item in items:
        document_id = item.get("document_id")
        if not document_id:
            continue
        extraction_resp = await supabase_table_request(
            "GET",
            "document_extractions",
            params={
                "document_id": f"eq.{document_id}",
                "status": "eq.DONE",
                "order": "updated_at.desc",
                "limit": "1",
                "select": "id,fields,document_type",
            },
        )
        if extraction_resp.status_code != 200:
            logger.warning(
                "onboarding.commit_extraction_lookup_failed",
                status=extraction_resp.status_code,
                body=extraction_resp.text,
                document_id=document_id,
            )
            continue
        extraction_rows = extraction_resp.json() or []
        if not extraction_rows:
            continue
        extraction_row = extraction_rows[0]
        fields = extraction_row.get("fields") if isinstance(extraction_row.get("fields"), dict) else {}
        profile_updates, provenance_updates, doc_tasks = map_document_fields(
            extraction_row.get("document_type"),
            fields,
            document_id=document_id,
            extraction_id=extraction_row.get("id"),
        )
        for key, value in profile_updates.items():
            if value in (None, ""):
                continue
            aggregated_profile[key] = value
        for field, entries in provenance_updates.items():
            aggregated_provenance.setdefault(field, []).extend(entries)
        for task in doc_tasks:
            task_seeds.append({**task, "documentId": document_id})

    combined_profile = {**aggregated_profile, **(payload.profile or {})}

    draft_payload = {
        "extracted": combined_profile,
        "provenance": aggregated_provenance,
        "updated_at": iso_now(),
    }

    draft_update = await supabase_table_request(
        "PATCH",
        "company_profile_drafts",
        params={"checklist_id": f"eq.{payload.checklistId}"},
        json=draft_payload,
        headers={"Prefer": "return=representation"},
    )

    if draft_update.status_code not in (200, 204):
        logger.error("onboarding.draft_update_failed", status=draft_update.status_code, body=draft_update.text)
        raise HTTPException(status_code=502, detail="failed to update profile draft")

    await supabase_table_request(
        "PATCH",
        "onboarding_checklists",
        params={"id": f"eq.{payload.checklistId}"},
        json={"status": "COMPLETED", "updated_at": iso_now()},
        headers={"Prefer": "return=minimal"},
    )

    checklist["status"] = "COMPLETED"
    draft_row = None
    if draft_update.status_code == 200:
        draft_rows = draft_update.json()
        draft_row = draft_rows[0] if draft_rows else None
    else:
        draft_fetch = await supabase_table_request(
            "GET",
            "company_profile_drafts",
            params={
                "checklist_id": f"eq.{payload.checklistId}",
                "limit": "1",
            },
        )
        if draft_fetch.status_code == 200:
            rows = draft_fetch.json()
            draft_row = rows[0] if rows else None
    created_tasks: List[Dict[str, Any]] = []
    if task_seeds:
        seen: Set[Tuple[str, str, str]] = set()
        default_due = (datetime.utcnow() + timedelta(days=3)).replace(microsecond=0).isoformat() + "Z"
        for task_seed in task_seeds:
            title = (task_seed.get("title") or "Follow up").strip() or "Follow up"
            document_id = task_seed.get("documentId") or ""
            source = task_seed.get("source") or "ONBOARDING"
            category = task_seed.get("category") or "General"
            dedupe_key = (title, source, document_id)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)

            description_parts = [
                f"Seeded from onboarding acceptance ({category}).",
                f"Source: {source}.",
            ]
            if document_id:
                description_parts.append(f"Linked document: {document_id}.")
            description = " \n".join(description_parts)

            priority = "HIGH" if category.lower().startswith("accounting") else "MEDIUM"

            task_row = await insert_task_record(
                org_id=checklist["org_id"],
                creator_id=auth.get("sub", "system"),
                payload={
                    "title": title,
                    "description": description,
                    "priority": priority,
                    "status": "TODO",
                    "due_date": default_due,
                },
            )
            created_tasks.append(map_task_response(task_row))

            await create_notification(
                org_id=checklist["org_id"],
                user_id=auth.get("sub"),
                kind="TASK",
                title=f"Onboarding follow-up: {title}",
                body="A follow-up task was created from the onboarding acceptance flow.",
            )

    return {
        "checklist": checklist,
        "draft": draft_row,
        "profile": combined_profile,
        "provenance": aggregated_provenance,
        "taskSeeds": task_seeds,
        "tasks": created_tasks,
    }


@app.get("/v1/autonomy/status")
async def autonomy_status(
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    org_id = context["org_id"]
    autonomy_level = normalise_autonomy_level(context.get("autonomy_level"))
    autonomy_floor = normalise_autonomy_level(context.get("autonomy_floor"))
    autonomy_ceiling = normalise_autonomy_level(context.get("autonomy_ceiling"))

    autonomy_levels_map = get_autonomy_levels_config()
    default_level = get_default_autonomy_level_value()
    level_description = autonomy_levels_map.get(autonomy_level) or autonomy_levels_map.get(
        default_level,
        autonomy_level,
    )
    allowances = get_autonomy_job_allowances_config()
    allowed_jobs = [
        {"kind": job, "label": job.replace("_", " ").title()}
        for job in allowances.get(autonomy_level, [])
    ]

    alerts: List[Dict[str, Any]] = []
    open_alerts = 0
    alerts_resp = await supabase_table_request(
        "GET",
        "telemetry_alerts",
        params={
            "org_id": f"eq.{org_id}",
            "resolved_at": "is.null",
            "order": "created_at.desc",
            "limit": "5",
            "select": "id,alert_type,severity,message,created_at",
        },
        headers={"Prefer": "count=exact"},
    )
    if alerts_resp.status_code == 200:
        try:
            open_alerts = extract_total_count(alerts_resp)
        except Exception:  # pragma: no cover - defensive fallback
            open_alerts = 0
        for row in alerts_resp.json() or []:
            alerts.append(
                {
                    "id": row.get("id"),
                    "type": row.get("alert_type"),
                    "severity": row.get("severity"),
                    "message": row.get("message"),
                    "createdAt": row.get("created_at"),
                }
            )
    else:  # pragma: no cover - logging only
        logger.warning(
            "autonomy.alerts_fetch_failed",
            status=alerts_resp.status_code,
            body=alerts_resp.text,
            org_id=org_id,
        )

    approvals: List[Dict[str, Any]] = []
    pending_approvals = 0
    approvals_resp = await supabase_table_request(
        "GET",
        "approval_queue",
        params={
            "org_id": f"eq.{org_id}",
            "status": "eq.PENDING",
            "order": "created_at.asc",
            "limit": "5",
            "select": "id,action,entity_type,created_at,requested_by",
        },
        headers={"Prefer": "count=exact"},
    )
    if approvals_resp.status_code == 200:
        try:
            pending_approvals = extract_total_count(approvals_resp)
        except Exception:  # pragma: no cover - defensive fallback
            pending_approvals = 0
        for row in approvals_resp.json() or []:
            approvals.append(
                {
                    "id": row.get("id"),
                    "action": row.get("action"),
                    "entityType": row.get("entity_type"),
                    "requestedBy": row.get("requested_by"),
                    "createdAt": row.get("created_at"),
                }
            )
    else:  # pragma: no cover - logging only
        logger.warning(
            "autonomy.approvals_fetch_failed",
            status=approvals_resp.status_code,
            body=approvals_resp.text,
            org_id=org_id,
        )

    autopilot_summary = await fetch_autopilot_summary(org_id, limit=5)

    suggestions = await get_workflow_suggestions(
        org_id,
        supabase_table_request=supabase_table_request,
        autonomy_level=autonomy_level,
    )
    suggestion_entries = []
    for entry in suggestions[:2]:
        suggestion_entries.append(
            {
                "workflow": entry.get("workflow"),
                "label": entry.get("label"),
                "description": entry.get("description"),
                "step": entry.get("step_index"),
                "minimumAutonomy": entry.get("minimum_autonomy"),
                "newRun": bool(entry.get("new_run")),
            }
        )

    return {
        "autonomy": {
            "level": autonomy_level,
            "description": level_description,
            "floor": autonomy_floor,
            "ceiling": autonomy_ceiling,
            "allowedJobs": allowed_jobs,
        },
        "evidence": {"open": open_alerts, "alerts": alerts},
        "approvals": {"pending": pending_approvals, "items": approvals},
        "suggestions": suggestion_entries,
        "autopilot": autopilot_summary,
    }


@app.get("/v1/knowledge/drive/metadata")
async def knowledge_drive_metadata(
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:metadata",
        auth["sub"],
        limit=KNOWLEDGE_PREVIEW_RATE_LIMIT,
        window=KNOWLEDGE_PREVIEW_RATE_WINDOW,
    )
    response = await supabase_table_request(
        "GET",
        "gdrive_connectors",
        params={
            "org_id": f"eq.{context['org_id']}",
            "order": "created_at.asc",
            "limit": "1",
            "select": "id, folder_id, shared_drive_id, service_account_email",
        },
    )
    if response.status_code != 200:
        logger.error(
            "knowledge.drive_metadata_failed",
            status=response.status_code,
            body=response.text,
            org_id=context["org_id"],
        )
        raise HTTPException(status_code=502, detail="failed to load connector metadata")

    rows = response.json()
    connector_row = rows[0] if rows else None
    connector_payload = None
    if connector_row:
        connector_payload = {
            "id": connector_row.get("id"),
            "folderId": connector_row.get("folder_id"),
            "sharedDriveId": connector_row.get("shared_drive_id"),
            "serviceAccountEmail": connector_row.get("service_account_email"),
        }

    drive_settings = get_google_drive_config()
    settings = {
        "enabled": drive_settings.get("enabled", False),
        "oauthScopes": drive_settings.get("oauth_scopes", []),
        "folderMappingPattern": drive_settings.get("folder_mapping_pattern"),
        "mirrorToStorage": drive_settings.get("mirror_to_storage", True),
    }

    return {"connector": connector_payload, "settings": settings}


@app.get("/v1/knowledge/drive/status")
async def knowledge_drive_status(
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:status",
        auth["sub"],
        limit=KNOWLEDGE_PREVIEW_RATE_LIMIT,
        window=KNOWLEDGE_PREVIEW_RATE_WINDOW,
    )

    connector_resp = await supabase_table_request(
        "GET",
        "gdrive_connectors",
        params={
            "org_id": f"eq.{context['org_id']}",
            "order": "created_at.asc",
            "limit": "1",
            "select": "id, folder_id, service_account_email, shared_drive_id, start_page_token, cursor_page_token, last_sync_at, last_backfill_at, last_error, watch_channel_id, watch_expires_at, updated_at, created_at",
        },
    )
    if connector_resp.status_code != 200:
        logger.error(
            "knowledge.drive_status_failed",
            status=connector_resp.status_code,
            body=connector_resp.text,
            org_id=context["org_id"],
        )
        raise HTTPException(status_code=502, detail="failed to load connector status")

    connector_rows = connector_resp.json()
    connector_row = connector_rows[0] if connector_rows else None
    connector_payload = None
    if connector_row:
        connector_payload = {
            "id": connector_row.get("id"),
            "folderId": connector_row.get("folder_id"),
            "serviceAccountEmail": connector_row.get("service_account_email"),
            "sharedDriveId": connector_row.get("shared_drive_id"),
            "startPageToken": connector_row.get("start_page_token"),
            "cursorPageToken": connector_row.get("cursor_page_token"),
            "lastSyncAt": connector_row.get("last_sync_at"),
            "lastBackfillAt": connector_row.get("last_backfill_at"),
            "lastError": connector_row.get("last_error"),
            "watchChannelId": connector_row.get("watch_channel_id"),
            "watchExpiresAt": connector_row.get("watch_expires_at"),
            "updatedAt": connector_row.get("updated_at"),
            "createdAt": connector_row.get("created_at"),
        }

    pending_resp = await supabase_table_request(
        "GET",
        "gdrive_change_queue",
        params={
            "org_id": f"eq.{context['org_id']}",
            "processed_at": "is.null",
            "select": "id",
        },
        headers={"Prefer": "count=exact"},
    )
    if pending_resp.status_code != 200:
        logger.error("knowledge.drive_queue_pending_failed", status=pending_resp.status_code, body=pending_resp.text)
        raise HTTPException(status_code=502, detail="failed to load drive queue")
    pending_count = extract_total_count(pending_resp)

    failure_window = (datetime.utcnow() - timedelta(hours=24)).isoformat()
    failed_resp = await supabase_table_request(
        "GET",
        "gdrive_change_queue",
        params={
            "org_id": f"eq.{context['org_id']}",
            "error": "not.is.null",
            "processed_at": f"gte.{failure_window}",
            "select": "id",
        },
        headers={"Prefer": "count=exact"},
    )
    if failed_resp.status_code != 200:
        logger.error("knowledge.drive_queue_failed_count", status=failed_resp.status_code, body=failed_resp.text)
        raise HTTPException(status_code=502, detail="failed to load drive failures")
    failed_count = extract_total_count(failed_resp)

    metadata_resp = await supabase_table_request(
        "GET",
        "gdrive_file_metadata",
        params={
            "org_id": f"eq.{context['org_id']}",
            "select": "file_id",
        },
        headers={"Prefer": "count=exact"},
    )
    if metadata_resp.status_code != 200:
        logger.error("knowledge.drive_metadata_counts_failed", status=metadata_resp.status_code, body=metadata_resp.text)
        raise HTTPException(status_code=502, detail="failed to load drive metadata counts")
    metadata_total = extract_total_count(metadata_resp)

    blocked_resp = await supabase_table_request(
        "GET",
        "gdrive_file_metadata",
        params={
            "org_id": f"eq.{context['org_id']}",
            "allowlisted_domain": "eq.false",
            "select": "file_id",
        },
        headers={"Prefer": "count=exact"},
    )
    if blocked_resp.status_code != 200:
        logger.error("knowledge.drive_blocked_metadata_failed", status=blocked_resp.status_code, body=blocked_resp.text)
        raise HTTPException(status_code=502, detail="failed to load drive metadata blocks")
    blocked_total = extract_total_count(blocked_resp)

    recent_errors_resp = await supabase_table_request(
        "GET",
        "gdrive_change_queue",
        params={
            "org_id": f"eq.{context['org_id']}",
            "not": "error.is.null",
            "order": "processed_at.desc",
            "limit": "5",
            "select": "file_id,error,processed_at",
        },
    )
    recent_errors: List[Dict[str, Any]] = []
    if recent_errors_resp.status_code == 200:
        recent_errors = [
            {
                "fileId": row.get("file_id"),
                "error": row.get("error"),
                "processedAt": row.get("processed_at"),
            }
            for row in recent_errors_resp.json()
        ]
    else:
        logger.warning(
            "knowledge.drive_recent_errors_failed",
            status=recent_errors_resp.status_code,
            body=recent_errors_resp.text,
        )

    drive_settings = get_google_drive_config()
    return {
        "config": {
            "enabled": drive_settings.get("enabled", False),
            "oauthScopes": drive_settings.get("oauth_scopes", []),
            "folderMappingPattern": drive_settings.get("folder_mapping_pattern"),
            "mirrorToStorage": drive_settings.get("mirror_to_storage", True),
        },
        "connector": connector_payload,
        "queue": {
            "pending": pending_count,
            "failed24h": failed_count,
            "recentErrors": recent_errors,
        },
        "metadata": {
            "total": metadata_total,
            "blocked": blocked_total,
        },
    }


@app.get("/v1/knowledge/web-sources")
async def knowledge_web_sources(
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:web_sources",
        auth["sub"],
        limit=KNOWLEDGE_PREVIEW_RATE_LIMIT,
        window=KNOWLEDGE_PREVIEW_RATE_WINDOW,
    )
    response = await supabase_table_request(
        "GET",
        "web_knowledge_sources",
        params={"order": "priority.asc"},
    )
    if response.status_code != 200:
        logger.error("knowledge.web_sources_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to load web sources")
    sources = response.json()
    url_settings = get_url_source_config()
    policy = url_settings.get("fetch_policy", {}) if isinstance(url_settings, Mapping) else {}

    metrics_response = await supabase_table_request(
        "GET",
        "web_fetch_cache_metrics",
        params={"limit": 1},
    )
    metrics_payload: Dict[str, Any] = {
        "totalRows": 0,
        "totalBytes": 0,
        "totalChars": 0,
        "fetchedLast24h": 0,
        "usedLast24h": 0,
        "newestFetch": None,
        "oldestFetch": None,
        "newestUse": None,
        "oldestUse": None,
    }
    if metrics_response.status_code == 200:
        rows = metrics_response.json()
        if rows:
            row = rows[0]
            metrics_payload.update(
                {
                    "totalRows": row.get("total_rows", 0),
                    "totalBytes": row.get("total_bytes", 0),
                    "totalChars": row.get("total_chars", 0),
                    "fetchedLast24h": row.get("fetched_last_24h", 0),
                    "usedLast24h": row.get("used_last_24h", 0),
                    "newestFetch": row.get("newest_fetched_at"),
                    "oldestFetch": row.get("oldest_fetched_at"),
                    "newestUse": row.get("newest_last_used_at"),
                    "oldestUse": row.get("oldest_last_used_at"),
                }
            )
    else:
        logger.warning(
            "knowledge.web_cache_metrics_failed",
            status=metrics_response.status_code,
            body=metrics_response.text,
        )

    return {
        "sources": sources,
        "settings": {
            "allowedDomains": url_settings.get("allowed_domains", []),
            "fetchPolicy": {
                "obeyRobots": policy.get("obey_robots", True),
                "maxDepth": policy.get("max_depth", 1),
                "cacheTtlMinutes": policy.get("cache_ttl_minutes", 1440),
            },
        },
        "webSearch": {
            "enabled": OPENAI_WEB_SEARCH_ENABLED,
            "model": OPENAI_WEB_SEARCH_MODEL,
        },
        "cache": {
            "retentionDays": WEB_FETCH_CACHE_RETENTION_DAYS,
            "metrics": metrics_payload,
        },
    }


@app.post("/v1/knowledge/corpora")
async def knowledge_create_corpus(
    payload: KnowledgeCorpusRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:corpus",
        auth["sub"],
        limit=KNOWLEDGE_RUN_RATE_LIMIT,
        window=KNOWLEDGE_RUN_RATE_WINDOW,
    )

    domain_value = payload.domain.upper()
    if domain_value not in KNOWLEDGE_ALLOWED_DOMAINS:
        raise HTTPException(status_code=400, detail="invalid domain")

    corpus_payload = {
        "org_id": context["org_id"],
        "name": payload.name.strip(),
        "domain": domain_value,
        "jurisdiction": payload.jurisdictions,
        "retention": payload.retention,
        "is_default": payload.isDefault,
    }

    response = await supabase_table_request(
        "POST",
        "knowledge_corpora",
        json=corpus_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("knowledge.create_corpus_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create corpus")

    return {"corpus": response.json()[0]}


@app.post("/v1/knowledge/sources")
async def knowledge_create_source(
    payload: KnowledgeSourceRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:source",
        auth["sub"],
        limit=KNOWLEDGE_RUN_RATE_LIMIT,
        window=KNOWLEDGE_RUN_RATE_WINDOW,
    )

    corpus = await fetch_single_record("knowledge_corpora", payload.corpusId, select="id, org_id")
    if not corpus or corpus.get("org_id") != context["org_id"]:
        raise HTTPException(status_code=404, detail="corpus not found")

    provider = payload.provider.lower()
    if provider not in {"google_drive", "upload", "url", "web_catalog"}:
        raise HTTPException(status_code=400, detail="invalid provider")

    source_uri = payload.sourceUri
    state: Dict[str, Any] = {}

    if provider == "web_catalog":
        web_source = await fetch_single_record(
            "web_knowledge_sources",
            payload.sourceUri,
            select="id, url, title, tags",
        )
        if not web_source:
            raise HTTPException(status_code=404, detail="web source not found")
        source_uri = web_source.get("url")
        state = {
            "catalog_id": web_source.get("id"),
            "title": web_source.get("title"),
            "tags": web_source.get("tags"),
        }

    source_payload = {
        "corpus_id": payload.corpusId,
        "provider": provider,
        "source_uri": source_uri,
        "state": state,
    }

    response = await supabase_table_request(
        "POST",
        "knowledge_sources",
        json=source_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("knowledge.create_source_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create knowledge source")

    return {"source": response.json()[0]}


@app.get("/v1/knowledge/sources/{source_id}/preview")
async def knowledge_preview_source(
    source_id: str,
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:preview",
        auth["sub"],
        limit=KNOWLEDGE_PREVIEW_RATE_LIMIT,
        window=KNOWLEDGE_PREVIEW_RATE_WINDOW,
    )
    source = await fetch_single_record(
        "knowledge_sources",
        source_id,
        select="id, corpus_id, provider, source_uri",
    )
    if not source:
        raise HTTPException(status_code=404, detail="knowledge source not found")

    corpus = await fetch_single_record("knowledge_corpora", source.get("corpus_id"), select="id, org_id")
    if not corpus or corpus.get("org_id") != context["org_id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    provider = (source.get("provider") or "").lower()
    if provider == "web_catalog":
        source_uri = source.get("source_uri")
        if not source_uri:
            raise HTTPException(status_code=400, detail="web source id missing")
        web_record = await fetch_single_record(
            "web_knowledge_sources",
            source_uri,
            select="id, title, url, tags",
        )
        if not web_record:
            raise HTTPException(status_code=404, detail="web source not found")
        return {
            "placeholder": False,
            "documents": [
                {
                    "id": web_record.get("id"),
                    "name": web_record.get("title"),
                    "mimeType": "text/html",
                    "modifiedTime": datetime.utcnow().isoformat() + "Z",
                    "downloadUrl": web_record.get("url"),
                }
            ],
            "webSource": web_record,
        }

    drive_docs_resp = await supabase_table_request(
        "GET",
        "gdrive_documents",
        params={
            "org_id": f"eq.{context['org_id']}",
            "select": "file_id, document_id, mime_type, last_synced_at, updated_at",
            "order": "updated_at.desc",
            "limit": "20",
        },
    )
    if drive_docs_resp.status_code != 200:
        logger.error(
            "knowledge.drive_preview_fetch_failed",
            status=drive_docs_resp.status_code,
            body=drive_docs_resp.text,
        )
        raise HTTPException(status_code=502, detail="failed to load drive documents")

    drive_rows = drive_docs_resp.json()
    document_ids = [row.get("document_id") for row in drive_rows if row.get("document_id")]
    documents_map: Dict[str, Dict[str, Any]] = {}
    if document_ids:
        unique_ids = sorted({doc_id for doc_id in document_ids if isinstance(doc_id, str)})
        if unique_ids:
            id_filter = ",".join(unique_ids)
            docs_resp = await supabase_table_request(
                "GET",
                "documents",
                params={
                    "id": f"in.({id_filter})",
                    "select": "id,name,file_type,updated_at",
                },
            )
            if docs_resp.status_code == 200:
                for row in docs_resp.json():
                    documents_map[row.get("id")] = row
            else:
                logger.warning(
                    "knowledge.drive_preview_documents_lookup_failed",
                    status=docs_resp.status_code,
                    body=docs_resp.text,
                )

    previews: List[Dict[str, Any]] = []
    for row in drive_rows:
        file_id = row.get("file_id")
        if not file_id:
            continue
        document_id = row.get("document_id")
        document_info = documents_map.get(document_id)
        name = document_info.get("name") if document_info else None
        mime_type = row.get("mime_type") or (document_info.get("file_type") if document_info else None)
        modified = row.get("last_synced_at") or row.get("updated_at")
        if document_info and not modified:
            modified = document_info.get("updated_at")
        previews.append(
            {
                "id": file_id,
                "name": name or file_id,
                "mimeType": mime_type or "application/octet-stream",
                "modifiedTime": modified,
                "downloadUrl": document_id and f"/v1/documents/{document_id}/download" or "",
            }
        )

    return {"documents": previews, "placeholder": False}


@app.post("/v1/knowledge/runs")
async def knowledge_schedule_run(
    payload: LearningRunRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:run",
        auth["sub"],
        limit=KNOWLEDGE_RUN_RATE_LIMIT,
        window=KNOWLEDGE_RUN_RATE_WINDOW,
    )

    source = await fetch_single_record(
        "knowledge_sources",
        payload.sourceId,
        select="id, corpus_id, created_at",
    )
    if not source:
        raise HTTPException(status_code=404, detail="knowledge source not found")

    corpus = await fetch_single_record(
        "knowledge_corpora",
        source["corpus_id"],
        select="id, org_id",
    )
    if not corpus or corpus.get("org_id") != context["org_id"]:
        raise HTTPException(status_code=403, detail="forbidden")

    run_payload = {
        "org_id": context["org_id"],
        "agent_kind": payload.agentKind.upper(),
        "mode": payload.mode.upper(),
        "status": "pending",
        "stats": {"source_id": payload.sourceId},
        "started_at": iso_now(),
    }

    response = await supabase_table_request(
        "POST",
        "learning_runs",
        json=run_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("knowledge.schedule_run_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to queue learning run")

    run = response.json()[0]
    return {"run": run}


@app.post("/v1/knowledge/web-harvest")
async def knowledge_schedule_web_harvest(
    payload: WebHarvestRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "knowledge:web_harvest",
        auth["sub"],
        limit=KNOWLEDGE_RUN_RATE_LIMIT,
        window=KNOWLEDGE_RUN_RATE_WINDOW,
    )

    web_source = await fetch_single_record(
        "web_knowledge_sources",
        payload.webSourceId,
        select="id, title, url",
    )
    if not web_source:
        raise HTTPException(status_code=404, detail="web source not found")

    run_payload = {
        "org_id": context["org_id"],
        "agent_kind": payload.agentKind.upper(),
        "mode": "INITIAL",
        "status": "pending",
        "stats": {
            "web_source_id": payload.webSourceId,
            "title": web_source.get("title"),
            "url": web_source.get("url"),
        },
        "started_at": iso_now(),
    }

    response = await supabase_table_request(
        "POST",
        "learning_runs",
        json=run_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("knowledge.web_harvest_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to queue web harvest")

    return {"run": response.json()[0]}



@app.post("/v1/assistant/message")
async def assistant_message(
    payload: AssistantMessageRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    user_id = auth["sub"]

    await enforce_rate_limit(
        "assistant:message",
        user_id,
        limit=ASSISTANT_RATE_LIMIT,
        window=ASSISTANT_RATE_WINDOW,
    )

    if payload.tool:
        result = await invoke_tool(context, user_id, payload.tool, payload.args or {})
        response_message = result.get("message", "Done.")
        actions = await build_assistant_actions(context["org_id"], context.get("autonomy_level"))
        return {
            "messages": [{"role": "assistant", "content": response_message}],
            "actions": actions,
            "data": result.get("data", {}),
            "citations": result.get("citations", []),
            "tool": payload.tool,
            "needs": result.get("needs"),
        }

    result = await generate_assistant_reply(context, user_id, payload.message)
    await record_agent_trace(
        org_id=context["org_id"],
        user_id=user_id,
        tool="assistant_chat",
        inputs={"message": payload.message},
        outputs=result.get("data", {}),
        document_ids=[citation.get("documentId") for citation in result.get("citations", []) if citation.get("documentId")],
    )

    return {
        "messages": [{"role": "assistant", "content": result.get("message", "") }],
        "actions": result.get("actions")
        or await build_assistant_actions(context["org_id"], context.get("autonomy_level")),
        "data": result.get("data", {}),
        "citations": result.get("citations", []),
    }


@app.get("/v1/autopilot/schedules")
async def list_job_schedules(
    org_slug: str = Query(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    if not has_manager_privileges(context["role"]):
        raise HTTPException(status_code=403, detail="manager role required")

    response = await supabase_table_request(
        "GET",
        "job_schedules",
        params={
            "org_id": f"eq.{context['org_id']}",
            "order": "created_at.desc",
        },
    )
    if response.status_code != 200:
        logger.error("autopilot.list_schedules_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch schedules")

    return {"schedules": response.json()}


@app.post("/v1/autopilot/schedules")
async def create_job_schedule(
    payload: JobScheduleRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "autopilot:schedule",
        auth["sub"],
        limit=AUTOPILOT_SCHEDULE_RATE_LIMIT,
        window=AUTOPILOT_SCHEDULE_RATE_WINDOW,
    )

    job_kind = payload.kind.lower()
    if job_kind not in AUTOPILOT_JOB_KINDS:
        raise HTTPException(status_code=400, detail="unknown job kind")

    if not is_autopilot_job_allowed(context.get("autonomy_level"), job_kind):
        logger.info(
            "autonomy.job_schedule_blocked",
            org_id=context["org_id"],
            kind=job_kind,
            autonomy_level=context.get("autonomy_level"),
        )
        raise HTTPException(status_code=403, detail="Autonomy level does not permit scheduling this job")

    required_autonomy = minimum_autonomy_for_job(job_kind)
    actor_ceiling = context.get("autonomy_ceiling") or get_default_autonomy_level_value()
    if AUTONOMY_LEVEL_RANK.get(actor_ceiling, 0) < AUTONOMY_LEVEL_RANK.get(required_autonomy, 0):
        logger.info(
            "autonomy.member_ceiling_blocked",
            org_id=context["org_id"],
            kind=job_kind,
            member_ceiling=actor_ceiling,
            required=required_autonomy,
        )
        raise HTTPException(status_code=403, detail="Membership autonomy ceiling does not permit scheduling this job")

    schedule_payload = {
        "org_id": context["org_id"],
        "kind": job_kind,
        "cron_expression": payload.cronExpression,
        "active": payload.active,
        "metadata": {**payload.metadata, "autonomyGate": required_autonomy},
        "updated_at": iso_now(),
    }

    response = await supabase_table_request(
        "POST",
        "job_schedules",
        json=schedule_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("autopilot.schedule_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create schedule")

    return {"schedule": response.json()[0]}


@app.get("/v1/autopilot/jobs")
async def list_jobs(
    org_slug: str = Query(..., alias="orgSlug"),
    status: Optional[str] = Query(default=None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], org_slug)
    if not has_manager_privileges(context["role"]):
        raise HTTPException(status_code=403, detail="manager role required")

    params: Dict[str, Any] = {
        "org_id": f"eq.{context['org_id']}",
        "order": "scheduled_at.desc",
        "limit": "50",
    }
    if status:
        params["status"] = f"eq.{status.upper()}"

    response = await supabase_table_request(
        "GET",
        "jobs",
        params=params,
    )
    if response.status_code != 200:
        logger.error("autopilot.list_jobs_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch jobs")

    return {"jobs": response.json()}


@app.post("/v1/autopilot/jobs/run")
async def enqueue_job(
    payload: JobRunRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    context = await resolve_org_context(auth["sub"], payload.orgSlug)
    ensure_min_role(context["role"], "MANAGER")
    await enforce_rate_limit(
        "autopilot:job",
        auth["sub"],
        limit=AUTOPILOT_JOB_RATE_LIMIT,
        window=AUTOPILOT_JOB_RATE_WINDOW,
    )

    job_kind = payload.kind.lower()
    if job_kind not in AUTOPILOT_JOB_KINDS:
        raise HTTPException(status_code=400, detail="unknown job kind")

    if not is_autopilot_job_allowed(context.get("autonomy_level"), job_kind):
        logger.info(
            "autonomy.job_run_blocked",
            org_id=context["org_id"],
            kind=job_kind,
            autonomy_level=context.get("autonomy_level"),
        )
        raise HTTPException(status_code=403, detail="Autonomy level does not permit running this job")

    required_autonomy = minimum_autonomy_for_job(job_kind)
    actor_ceiling = context.get("autonomy_ceiling") or get_default_autonomy_level_value()
    if AUTONOMY_LEVEL_RANK.get(actor_ceiling, 0) < AUTONOMY_LEVEL_RANK.get(required_autonomy, 0):
        logger.info(
            "autonomy.member_ceiling_blocked_run",
            org_id=context["org_id"],
            kind=job_kind,
            member_ceiling=actor_ceiling,
            required=required_autonomy,
        )
        raise HTTPException(status_code=403, detail="Membership autonomy ceiling does not permit running this job")

    job_payload = {
        "org_id": context["org_id"],
        "kind": job_kind,
        "payload": payload.payload,
        "status": "PENDING",
        "scheduled_at": iso_now(),
    }

    response = await supabase_table_request(
        "POST",
        "jobs",
        json=job_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("autopilot.enqueue_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create job")

    return {"job": response.json()[0]}


@app.post("/v1/observability/dry-run", tags=["observability"])
async def sentry_dry_run(
    authorization: str = Header(...),
    request: Request = None,
):
    """Intentionally raises a server error to validate Sentry/alerts.

    Guarded by `ALLOW_SENTRY_DRY_RUN` env var. Requires a valid Bearer token.
    Call with a unique `X-Request-ID` for traceability.
    """
    allow = os.getenv("ALLOW_SENTRY_DRY_RUN", "false").lower() == "true"
    if not allow:
        raise HTTPException(status_code=404, detail="not found")

    # Authenticate request (rate limit is handled in require_auth)
    _ = await require_auth(authorization)  # noqa: F841

    rid = request.headers.get(REQUEST_ID_HEADER) if request else None
    # Raise uncaught exception to exercise Sentry/alerting pipeline
    raise RuntimeError(f"sentry_dry_run_triggered request_id={rid}")


@app.get("/health", tags=["observability"])
async def health():
    return {"status": "ok"}


@app.get("/healthz", tags=["observability"])
async def healthz():
    return {"status": "ok"}


@app.get("/readiness", tags=["observability"])
async def readiness_probe():
    report = await build_readiness_report(AsyncSessionLocal, redis_conn)
    status_code = status.HTTP_200_OK if report["status"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(report, status_code=status_code)
def _client_scope_settings() -> Mapping[str, Any]:
    scope = get_client_portal_scope()
    return scope if isinstance(scope, Mapping) else {}


def get_client_allowed_document_repos() -> List[str]:
    scope = _client_scope_settings()
    allowed = scope.get("allowed_repos")
    if isinstance(allowed, Iterable) and not isinstance(allowed, (str, bytes)):
        return [str(entry) for entry in allowed if entry]
    return []


def get_role_deny_actions() -> Dict[str, Set[str]]:
    scope = _client_scope_settings()
    denied = scope.get("denied_actions")
    result: Dict[str, Set[str]] = {}
    if isinstance(denied, Mapping):
        for role, entries in denied.items():
            if not role:
                continue
            role_key = str(role).upper()
            if isinstance(entries, Iterable) and not isinstance(entries, (str, bytes)):
                result[role_key] = {str(item) for item in entries if item}
            else:
                result[role_key] = set()
    elif isinstance(denied, Iterable) and not isinstance(denied, (str, bytes)):
        result["CLIENT"] = {str(item) for item in denied if item}
    if "CLIENT" not in result:
        result["CLIENT"] = set()
    return result


def get_google_drive_config() -> Dict[str, Any]:
    return get_google_drive_settings()


def get_url_source_config() -> Dict[str, Any]:
    return get_url_source_settings()


def get_email_ingest_config() -> Dict[str, Any]:
    return get_email_ingest_settings()


def get_before_asking_sequence_config() -> List[str]:
    sequence = get_before_asking_user_sequence()
    return sequence if isinstance(sequence, list) else list(sequence)


def get_autonomy_levels_config() -> Dict[str, str]:
    return get_autonomy_levels()


def get_default_autonomy_level_value() -> str:
    return get_default_autonomy_level()


def get_autonomy_job_allowances_config() -> Dict[str, List[str]]:
    return get_autonomy_job_allowances()


def get_tool_policies_config() -> Dict[str, Dict[str, Any]]:
    return get_tool_policies()


def get_agent_registry_config() -> Dict[str, Dict[str, Any]]:
    return get_agent_registry()


def get_workflow_definitions_config() -> Dict[str, Dict[str, Any]]:
    return get_workflow_definitions()


def get_release_control_settings_config() -> Dict[str, Any]:
    return get_release_control_settings()


def get_role_rank_map_config() -> Dict[str, int]:
    return get_role_rank_map()


def get_managerial_roles_config() -> Set[str]:
    return get_managerial_roles()


@lru_cache(maxsize=1)
def _permission_map_snapshot() -> Dict[str, str]:
    return _load_permission_map()


def get_permission_map_snapshot() -> Dict[str, str]:
    return dict(_permission_map_snapshot())


def clear_permission_map_cache() -> None:
    _permission_map_snapshot.cache_clear()


def get_org_role_values() -> Set[str]:
    return set(get_role_rank_map_config().keys())


# Include Learning System Router
app.include_router(learning_router)

# Include Gemini Chat Router
app.include_router(gemini_chat_router)

# Include Metrics Router
app.include_router(metrics_router)

# Include Organization and ADA Routers (Phase 1 Refactoring)
app.include_router(organization_router, prefix="/api/iam/org", tags=["organization"])
app.include_router(ada_router, prefix="/api/ada", tags=["analytics"])

# Include Agent System Routers
from .api.agents import router as agents_router
from .api.executions import router as executions_router

app.include_router(agents_router)
app.include_router(executions_router)

# Week 3: New API routers
from server.api.personas import router as personas_router
from server.api.tools import router as tools_router
from server.api.knowledge import router as knowledge_router

app.include_router(personas_router)
app.include_router(tools_router)
app.include_router(knowledge_router)

# Week 6-7: Advanced Features
from server.api.learning_api import router as learning_api_router
from server.api.workflows_api import router as workflows_api_router
from server.api.websocket_api import router as websocket_api_router
from server.api.collaboration_api import router as collaboration_api_router

app.include_router(learning_api_router)
app.include_router(workflows_api_router)
app.include_router(websocket_api_router)
app.include_router(collaboration_api_router)
