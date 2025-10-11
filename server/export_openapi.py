"""Export FastAPI OpenAPI schema to openapi/fastapi.json.

This script imports the FastAPI application and writes the generated OpenAPI
schema to a JSON file so that TypeScript clients can be generated in CI.
"""
from __future__ import annotations

import json
import os
from pathlib import Path


def _prepare_env_for_import() -> None:
    # Provide minimal environment defaults so importing server.main does not crash
    os.environ.setdefault("SUPABASE_URL", "http://localhost:9999")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "local-service-role-key")
    os.environ.setdefault("SUPABASE_JWT_SECRET", "local-jwt-secret")
    os.environ.setdefault("OTEL_SERVICE_NAME", "backend-api")
    os.environ.setdefault("ENVIRONMENT", "codegen")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/postgres")


_prepare_env_for_import()

try:
    from server.main import app  # type: ignore
except Exception as exc:  # pragma: no cover - exporter should not crash CI if import fails
    raise SystemExit(f"failed_to_import_fastapi_app: {exc}")


def main() -> None:
    schema = app.openapi()
    out_dir = Path(__file__).resolve().parents[1] / "openapi"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "fastapi.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(schema, f, indent=2)
    print(f"OpenAPI schema exported to {out_path}")


if __name__ == "__main__":
    main()
