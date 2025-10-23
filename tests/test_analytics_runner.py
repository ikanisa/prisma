import math
from datetime import datetime, timezone

import pytest

import math
from datetime import datetime, timezone

import pytest

from server.analytics_runner import (
    AnalyticsValidationError,
    hash_dataset,
    normalise_ada_params,
    run_analytics,
)


def test_hash_dataset_is_deterministic():
    payload_a = {"b": 2, "a": 1}
    payload_b = {"a": 1, "b": 2}

    assert hash_dataset(payload_a) == hash_dataset(payload_b)
    assert len(hash_dataset(payload_a)) == 64


def test_normalise_journal_params_validates_required_fields():
    payload = {
        "periodEnd": "2024-12-31T00:00:00Z",
        "latePostingDays": 3,
        "roundAmountThreshold": 1000,
        "weekendFlag": True,
        "entries": [
            {
                "id": "je-1",
                "postedAt": "2024-12-15T10:00:00Z",
                "createdAt": "2024-12-15T09:00:00Z",
                "amount": 1500.0,
                "account": "4000",
                "description": "Manual adjustment",
            },
        ],
    }

    normalised = normalise_ada_params("je", payload)

    assert normalised["periodEnd"] == "2024-12-31T00:00:00Z"
    assert normalised["latePostingDays"] == 3
    assert normalised["roundAmountThreshold"] == pytest.approx(1000.0)
    assert normalised["weekendFlag"] is True
    assert normalised["entries"][0]["id"] == "je-1"
    assert isinstance(normalised["entries"][0]["amount"], float)


def _ts(value: str) -> str:
    return datetime.fromisoformat(value).replace(tzinfo=timezone.utc).isoformat()


def test_run_analytics_duplicate_groups_transactions():
    params = {
        "transactions": [
            {"id": "t-1", "amount": 125.49, "date": _ts("2024-03-01T00:00:00"), "reference": "INV-100"},
            {"id": "t-2", "amount": 125.52, "date": _ts("2024-03-01T00:00:00"), "reference": "INV-100"},
            {"id": "t-3", "amount": 200.0, "date": _ts("2024-03-05T00:00:00"), "reference": "INV-200"},
        ],
        "matchOn": ["amount", "reference"],
        "tolerance": 0.1,
    }

    sanitised, dataset_hash, result = run_analytics("duplicate", params)

    assert sanitised["matchOn"] == ["amount", "reference"]
    assert math.isclose(sanitised["tolerance"], 0.1)
    assert dataset_hash
    assert result["summary"]["kind"] == "DUPLICATE"
    assert result["summary"]["totals"]["duplicateGroups"] == 1
    assert any(exc["recordRef"] == "t-1" for exc in result["exceptions"])


def test_run_analytics_benford_highlights_outliers():
    params = {"figures": [1, 12, 123, 1999, 2999, 3999, 4999, 5999, 6999, 7999, 8999]}

    sanitised, dataset_hash, result = run_analytics("benford", params)

    assert sanitised["figures"]
    assert dataset_hash
    assert result["summary"]["kind"] == "BENFORD"
    assert result["summary"]["totals"]["figures"] == len(params["figures"])
    assert any(exc["reason"].startswith("First-digit variance") for exc in result["exceptions"])


def test_normalise_rejects_unknown_kind():
    with pytest.raises(AnalyticsValidationError):
        normalise_ada_params('unsupported', {})
