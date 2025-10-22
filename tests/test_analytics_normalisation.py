from __future__ import annotations

import pytest

from server.analytics_runner import AnalyticsValidationError, hash_dataset, normalise_ada_params


def test_duplicate_params_defaults_and_hash_determinism():
    payload = {
        "transactions": [
            {"id": "txn-1", "amount": "100.50", "date": "2025-01-10", "reference": "INV-1"},
            {"id": "txn-2", "amount": "100.50", "date": "2025-01-10", "reference": "INV-2"},
        ]
    }

    sanitised = normalise_ada_params("duplicate", payload)
    assert sanitised["matchOn"] == ["amount", "date"]
    assert sanitised["tolerance"] is None
    assert sanitised["transactions"][0]["reference"] == "INV-1"

    permuted = {
        "transactions": sanitised["transactions"],
        "matchOn": sanitised["matchOn"],
        "tolerance": sanitised["tolerance"],
    }

    assert hash_dataset(sanitised) == hash_dataset(permuted)

    reordered = normalise_ada_params(
        "duplicate",
        {
            "transactions": list(reversed(payload["transactions"])),
        },
    )

    assert hash_dataset(sanitised) != hash_dataset(reordered)


def test_duplicate_params_rejects_empty_match_on():
    with pytest.raises(AnalyticsValidationError):
        normalise_ada_params(
            "duplicate",
            {
                "matchOn": [],
                "transactions": [
                    {"id": "txn-1", "amount": "10", "date": "2025-01-01"},
                ],
            },
        )
