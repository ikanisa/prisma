"""Telemetry helpers shared across FastAPI services."""
from __future__ import annotations

import time
from typing import Optional

import structlog
from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Status, StatusCode
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from .settings import TelemetrySettings, get_system_settings

_logger = structlog.get_logger("telemetry")
_configured_provider: Optional[TracerProvider] = None


def _build_tracer_provider(
    telemetry: TelemetrySettings, *, service_name: str, version: Optional[str], environment: Optional[str]
) -> TracerProvider:
    exporter = telemetry.first_active_trace_exporter()
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": telemetry.namespace,
            "deployment.environment": telemetry.resolve_environment(fallback=environment),
            "service.version": version or "dev",
        }
    )
    provider = TracerProvider(resource=resource)
    if exporter:
        endpoint = exporter.resolved_endpoint()
        if endpoint:
            headers = exporter.resolved_headers()
            provider.add_span_processor(
                BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, headers=headers or None))
            )
        else:
            _logger.info("telemetry.exporter_missing_endpoint", exporter=exporter.name)
    else:
        _logger.info("telemetry.exporter_not_configured")
    return provider


def configure_fastapi_tracing(
    app: FastAPI,
    *,
    service_name: str,
    environment: Optional[str],
    version: Optional[str],
) -> trace.Tracer:
    """Configure the global tracer provider and instrument the FastAPI app."""

    global _configured_provider
    settings = get_system_settings()
    telemetry = settings.telemetry
    provider = trace.get_tracer_provider()
    if not isinstance(provider, TracerProvider):
        provider = _build_tracer_provider(
            telemetry, service_name=service_name, version=version, environment=environment
        )
        trace.set_tracer_provider(provider)
        _configured_provider = provider
    elif _configured_provider is None:
        # Provider pre-configured elsewhere; attach exporters if required.
        exporter = telemetry.first_active_trace_exporter()
        if exporter and exporter.resolved_endpoint():
            provider.add_span_processor(
                BatchSpanProcessor(
                    OTLPSpanExporter(endpoint=exporter.resolved_endpoint(), headers=exporter.resolved_headers() or None)
                )
            )
        _configured_provider = provider

    if not getattr(app.state, "_otel_instrumented", False):
        FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
        app.state._otel_instrumented = True

    return trace.get_tracer(service_name)


class RequestTelemetryMiddleware(BaseHTTPMiddleware):
    """Middleware that records timing/logging information for each HTTP request."""

    def __init__(self, app: ASGIApp, *, tracer: trace.Tracer):
        super().__init__(app)
        self._tracer = tracer
        self._logger = _logger.bind()

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        start = time.perf_counter()
        span_name = f"{request.method} {request.url.path}"
        with self._tracer.start_as_current_span(span_name) as span:
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.route", request.url.path)
            span.set_attribute("http.scheme", request.url.scheme)
            try:
                response = await call_next(request)
            except Exception as exc:  # pragma: no cover - defensive logging
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                self._logger.exception(
                    "http.request.error",
                    method=request.method,
                    path=request.url.path,
                )
                raise

            duration_ms = (time.perf_counter() - start) * 1000
            span.set_attribute("http.status_code", response.status_code)
            request_id = getattr(request.state, "request_id", None)
            if request_id:
                span.set_attribute("prismaglow.request_id", request_id)
            self._logger.info(
                "http.request",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration_ms=round(duration_ms, 2),
                request_id=request_id,
            )
            return response


__all__ = ["configure_fastapi_tracing", "RequestTelemetryMiddleware"]
