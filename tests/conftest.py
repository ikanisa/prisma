import json
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
