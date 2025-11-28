"""Analytics service FastAPI application with telemetry instrumentation."""

from __future__ import annotations

import os
import uuid
from typing import Optional

import sentry_sdk
from fastapi import FastAPI, Request, HTTPException, status, Depends
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.trace import Status, StatusCode
from sentry_sdk.integrations.fastapi import FastApiIntegration

from analytics import AnalyticsEventModel, AnalyticsIngestor
from .api import router

_REQUEST_ID_HEADER = "X-Request-ID"
_TRACING_CONFIGURED = False
_SENTRY_CONFIGURED = False
_INGEST_TOKEN = os.getenv("ANALYTICS_INGEST_TOKEN")

_ingestor = AnalyticsIngestor()


def _configure_tracing(app: FastAPI, service_name: str) -> trace.Tracer:
    """Configure OpenTelemetry tracing for the provided FastAPI app."""
    global _TRACING_CONFIGURED

    if not _TRACING_CONFIGURED:
        environment = os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENVIRONMENT", "development"))
        service_version = os.getenv("SERVICE_VERSION") or os.getenv("SENTRY_RELEASE") or "dev"
        resource = Resource.create({
            "service.name": service_name,
            "service.namespace": "prisma-glow",
            "deployment.environment": environment,
            "service.version": service_version,
        })
        provider = TracerProvider(resource=resource)
        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        if otlp_endpoint:
            provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint)))
        trace.set_tracer_provider(provider)
        _TRACING_CONFIGURED = True

    provider = trace.get_tracer_provider()
    if not getattr(app.state, "_otel_instrumented", False):
        if isinstance(provider, TracerProvider):
            FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
        else:  # pragma: no cover - defensive fallback
            FastAPIInstrumentor.instrument_app(app)
        app.state._otel_instrumented = True

    return trace.get_tracer(service_name)


def _configure_sentry() -> None:
    """Initialise the Sentry SDK if a DSN is provided."""
    global _SENTRY_CONFIGURED

    if _SENTRY_CONFIGURED:
        return

    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return

    environment = os.getenv("SENTRY_ENVIRONMENT", os.getenv("ENVIRONMENT", "development"))
    release = os.getenv("SENTRY_RELEASE")
    traces_sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0"))

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        traces_sample_rate=traces_sample_rate,
        integrations=[FastApiIntegration()],
    )
    _SENTRY_CONFIGURED = True


def _verify_ingest_token(request: Request) -> None:
    if not _INGEST_TOKEN:
        return
    header = request.headers.get("authorization") or ""
    expected = f"Bearer {_INGEST_TOKEN}"
    if header.strip() != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid analytics ingest token")


async def _authorise_ingest(request: Request) -> None:
    _verify_ingest_token(request)


def create_app() -> FastAPI:
    """Create the analytics FastAPI application."""
    service_name = os.getenv("OTEL_SERVICE_NAME", "analytics-service")
    app = FastAPI()

    tracer = _configure_tracing(app, service_name)
    _configure_sentry()

    @app.on_event("startup")
    async def _startup() -> None:
        try:
            await _ingestor.start()
        except Exception as exc:  # pragma: no cover - environment failures
            print({"level": "error", "msg": "analytics.ingestor_start_failed", "error": str(exc)})

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        await _ingestor.stop()

    @app.middleware("http")
    async def tracing_middleware(request: Request, call_next):  # type: ignore[override]
        span_name = f"{request.method} {request.url.path}"
        with tracer.start_as_current_span(span_name) as span:
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.route", request.url.path)
            span.set_attribute("http.scheme", request.url.scheme)
            try:
                response = await call_next(request)
            except Exception as exc:  # pragma: no cover - defensive logging
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                raise

            span.set_attribute("http.status_code", response.status_code)
            request_id: Optional[str] = getattr(request.state, "request_id", None)
            if request_id:
                span.set_attribute("prismaglow.request_id", request_id)
            return response

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):  # type: ignore[override]
        incoming = request.headers.get(_REQUEST_ID_HEADER) or request.headers.get(_REQUEST_ID_HEADER.lower())
        request_id = (incoming or "").strip() or str(uuid.uuid4())
        request.state.request_id = request_id

        if _SENTRY_CONFIGURED:
            with sentry_sdk.configure_scope() as scope:
                scope.set_tag("request_id", request_id)

        response = await call_next(request)
        response.headers.setdefault(_REQUEST_ID_HEADER, request_id)
        return response

    app.include_router(router)

    @app.post("/v1/analytics/events", status_code=status.HTTP_202_ACCEPTED)
    async def ingest_event(event: AnalyticsEventModel, request: Request, _: None = Depends(_authorise_ingest)) -> dict:
        with tracer.start_as_current_span("analytics.ingest_event") as span:
            try:
                await _ingestor.insert(event)
            except Exception as exc:  # pragma: no cover - database failure
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="failed to persist analytics event") from exc
        return {"status": "accepted"}

    return app


__all__ = ["create_app"]
