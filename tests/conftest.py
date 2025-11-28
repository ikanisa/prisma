import json
import os
from pathlib import Path
import pytest

BASE_DIR = Path(__file__).resolve().parent
GOLDEN_DIR = BASE_DIR / "golden"


def _load_json(name: str):
    with open(GOLDEN_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="session")
def vat_qa():
    return _load_json("vat_qa.json")


@pytest.fixture(scope="session")
def isa_qa():
    return _load_json("isa_qa.json")


@pytest.fixture(scope="session")
def ledger_snippets():
    return _load_json("ledger_snippets.json")


# Set default environment values for tests to avoid import-time crashes
def _set_default_env() -> None:
    os.environ.setdefault("SUPABASE_URL", "http://localhost:9999")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "local-service-role-key")
    os.environ.setdefault("SUPABASE_JWT_SECRET", "local-jwt-secret")
    os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/postgres")
    os.environ.setdefault("OTEL_SERVICE_NAME", "backend-api-test")


_set_default_env()
