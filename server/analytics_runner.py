"""Deterministic analytics helpers for ADA runs."""

from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Mapping, Sequence, Tuple


class AnalyticsValidationError(ValueError):
    """Raised when analytics inputs fail validation."""


def _json_default(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime,)):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serialisable")


def _stable_dumps(payload: Mapping[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=_json_default)


def hash_dataset(params: Mapping[str, Any]) -> str:
    """Generate a deterministic hash for the provided analytics parameters."""

    canonical = _stable_dumps(dict(params))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise AnalyticsValidationError(message)


def _to_decimal(value: Any, *, field: str) -> Decimal:
    try:
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))
    except (InvalidOperation, TypeError):  # pragma: no cover - defensive
        raise AnalyticsValidationError(f"Invalid numeric value for {field}")


def _parse_iso8601(timestamp: str, *, field: str) -> datetime:
    if not timestamp:
        raise AnalyticsValidationError(f"{field} is required")
    normalised = timestamp.strip()
    if normalised.endswith("Z"):
        normalised = normalised[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalised)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError as exc:  # pragma: no cover - defensive
        raise AnalyticsValidationError(f"Invalid ISO timestamp for {field}") from exc


def _normalise_journal_params(raw: Mapping[str, Any]) -> Dict[str, Any]:
    period_end_raw = str(raw.get("periodEnd") or "").strip()
    _require(period_end_raw, "periodEnd is required for JE analytics")

    late_posting_days = int(raw.get("latePostingDays") or 0)
    round_threshold = float(_to_decimal(raw.get("roundAmountThreshold", 1000), field="roundAmountThreshold"))
    weekend_flag = bool(raw.get("weekendFlag", True))

    entries_raw = raw.get("entries")
    _require(isinstance(entries_raw, Sequence) and len(entries_raw) > 0, "entries array is required for JE analytics")

    entries: List[Dict[str, Any]] = []
    for entry in entries_raw:  # type: ignore[assignment]
        _require(isinstance(entry, Mapping), "entries must contain objects")
        entry_id = str(entry.get("id") or "").strip()
        _require(entry_id, "entry id is required for JE analytics")
        posted_at = str(entry.get("postedAt") or "").strip()
        _require(posted_at, "postedAt is required for JE analytics")
        account = str(entry.get("account") or "").strip()
        _require(account, "account is required for JE analytics")

        amount = _to_decimal(entry.get("amount"), field="amount")
        sanitised: Dict[str, Any] = {
            "id": entry_id,
            "postedAt": posted_at,
            "amount": float(amount),
            "account": account,
        }

        if entry.get("description") is not None:
            sanitised["description"] = str(entry.get("description"))
        if entry.get("createdAt") is not None:
            sanitised["createdAt"] = str(entry.get("createdAt"))
        if entry.get("createdBy") is not None:
            sanitised["createdBy"] = str(entry.get("createdBy"))
        if entry.get("approvedBy") is not None:
            sanitised["approvedBy"] = str(entry.get("approvedBy"))

        entries.append(sanitised)

    return {
        "periodEnd": period_end_raw,
        "latePostingDays": late_posting_days,
        "roundAmountThreshold": round_threshold,
        "weekendFlag": weekend_flag,
        "entries": entries,
    }


def _normalise_ratio_params(raw: Mapping[str, Any]) -> Dict[str, Any]:
    metrics_raw = raw.get("metrics")
    _require(isinstance(metrics_raw, Sequence) and len(metrics_raw) > 0, "metrics array is required for ratio analytics")

    metrics: List[Dict[str, Any]] = []
    for metric in metrics_raw:  # type: ignore[assignment]
        _require(isinstance(metric, Mapping), "metrics must contain objects")
        name = str(metric.get("name") or "").strip()
        _require(name, "metric name is required")
        numerator = _to_decimal(metric.get("numerator"), field="metric numerator")
        denominator = _to_decimal(metric.get("denominator"), field="metric denominator")
        metric_obj: Dict[str, Any] = {
            "name": name,
            "numerator": float(numerator),
            "denominator": float(denominator),
        }
        if metric.get("prior") is not None:
            metric_obj["prior"] = float(_to_decimal(metric.get("prior"), field="metric prior"))
        if metric.get("thresholdPct") is not None:
            threshold = float(_to_decimal(metric.get("thresholdPct"), field="metric thresholdPct"))
            _require(threshold >= 0, "metric thresholdPct must be non-negative")
            metric_obj["thresholdPct"] = threshold
        metrics.append(metric_obj)

    return {"metrics": metrics}


def _normalise_variance_params(raw: Mapping[str, Any]) -> Dict[str, Any]:
    series_raw = raw.get("series")
    _require(isinstance(series_raw, Sequence) and len(series_raw) > 0, "series array is required for variance analytics")

    series: List[Dict[str, Any]] = []
    for item in series_raw:  # type: ignore[assignment]
        _require(isinstance(item, Mapping), "series must contain objects")
        name = str(item.get("name") or "").strip()
        _require(name, "series name is required")
        actual = float(_to_decimal(item.get("actual"), field="series actual"))
        benchmark = float(_to_decimal(item.get("benchmark"), field="series benchmark"))
        obj: Dict[str, Any] = {"name": name, "actual": actual, "benchmark": benchmark}
        if item.get("thresholdAbs") is not None:
            threshold_abs = float(_to_decimal(item.get("thresholdAbs"), field="series thresholdAbs"))
            _require(threshold_abs >= 0, "series thresholdAbs must be non-negative")
            obj["thresholdAbs"] = threshold_abs
        if item.get("thresholdPct") is not None:
            threshold_pct = float(_to_decimal(item.get("thresholdPct"), field="series thresholdPct"))
            _require(threshold_pct >= 0, "series thresholdPct must be non-negative")
            obj["thresholdPct"] = threshold_pct
        series.append(obj)

    return {"series": series}


def _normalise_duplicate_params(raw: Mapping[str, Any]) -> Dict[str, Any]:
    transactions_raw = raw.get("transactions")
    _require(
        isinstance(transactions_raw, Sequence) and len(transactions_raw) > 0,
        "transactions array is required for duplicate analytics",
    )

    match_on_raw = raw.get("matchOn")
    if match_on_raw is None:
        match_on = ["amount", "date"]
    else:
        _require(isinstance(match_on_raw, Sequence) and len(match_on_raw) > 0, "matchOn must be a non-empty array")
        match_on = [str(field) for field in match_on_raw]  # type: ignore[assignment]

    tolerance = raw.get("tolerance")
    tolerance_value = None
    if tolerance is not None:
        tolerance_decimal = _to_decimal(tolerance, field="tolerance")
        _require(tolerance_decimal >= 0, "tolerance must be non-negative")
        tolerance_value = float(tolerance_decimal)

    transactions: List[Dict[str, Any]] = []
    for txn in transactions_raw:  # type: ignore[assignment]
        _require(isinstance(txn, Mapping), "transactions must contain objects")
        txn_id = str(txn.get("id") or "").strip()
        _require(txn_id, "transaction id is required")
        amount = float(_to_decimal(txn.get("amount"), field="transaction amount"))
        date = str(txn.get("date") or "").strip()
        _require(date, "transaction date is required")
        obj: Dict[str, Any] = {"id": txn_id, "amount": amount, "date": date}
        if txn.get("reference") is not None:
            obj["reference"] = str(txn.get("reference"))
        if txn.get("counterparty") is not None:
            obj["counterparty"] = str(txn.get("counterparty"))
        transactions.append(obj)

    return {"transactions": transactions, "matchOn": match_on, "tolerance": tolerance_value}


def _normalise_benford_params(raw: Mapping[str, Any]) -> Dict[str, Any]:
    figures_raw = raw.get("figures")
    _require(isinstance(figures_raw, Sequence) and len(figures_raw) > 0, "figures array is required for Benford analytics")

    figures: List[float] = []
    for value in figures_raw:  # type: ignore[assignment]
        amount = _to_decimal(value, field="figure")
        _require(amount > 0, "Benford figures must be positive numbers")
        figures.append(float(amount))

    return {"figures": figures}


def normalise_ada_params(kind: str, params: Mapping[str, Any]) -> Dict[str, Any]:
    """Validate and normalise ADA parameters based on the run kind."""

    kind_upper = kind.upper()
    if kind_upper == "JE":
        return _normalise_journal_params(params)
    if kind_upper == "RATIO":
        return _normalise_ratio_params(params)
    if kind_upper == "VARIANCE":
        return _normalise_variance_params(params)
    if kind_upper == "DUPLICATE":
        return _normalise_duplicate_params(params)
    if kind_upper == "BENFORD":
        return _normalise_benford_params(params)
    raise AnalyticsValidationError(f"Unsupported ADA run kind: {kind}")


def _normalise_amount(amount: float, tolerance: float | None) -> float:
    if tolerance is None or tolerance <= 0:
        return round(amount, 2)
    if tolerance == 0:
        return round(amount, 2)
    buckets = round(amount / tolerance)
    return round(buckets * tolerance, 2)


def _run_journal(params: Mapping[str, Any], dataset_hash: str) -> Dict[str, Any]:
    period_end = _parse_iso8601(params["periodEnd"], field="periodEnd")
    tolerance = timedelta(days=int(params.get("latePostingDays", 0)))
    round_threshold = Decimal(str(params.get("roundAmountThreshold", 1000)))
    weekend_flag = bool(params.get("weekendFlag", True))

    results: List[Dict[str, Any]] = []
    for entry in params["entries"]:  # type: ignore[index]
        posted_at = _parse_iso8601(entry["postedAt"], field="postedAt")
        created_at_str = entry.get("createdAt") or entry["postedAt"]
        created_at = _parse_iso8601(created_at_str, field="createdAt")
        flags: List[str] = []
        score = 0

        if posted_at > period_end + tolerance:
            flags.append("LATE_POSTING")
            score += 40

        if weekend_flag and created_at.weekday() >= 5:
            flags.append("WEEKEND_ENTRY")
            score += 25

        amount = Decimal(str(entry["amount"]))
        if round_threshold > 0 and amount.copy_abs() >= round_threshold:
            remainder = amount % round_threshold
            if remainder == 0:
                flags.append("ROUND_AMOUNT")
                score += 20

        description = entry.get("description")
        if description and "manual" in description.lower():
            flags.append("MANUAL_REFERENCE")
            score += 15

        ordered_entry = {
            "id": entry["id"],
            "account": entry["account"],
            "amount": float(amount),
            "postedAt": entry["postedAt"],
            "createdAt": created_at_str,
            "createdBy": entry.get("createdBy"),
            "approvedBy": entry.get("approvedBy"),
            "flags": flags,
            "score": score,
        }
        results.append(ordered_entry)

    flagged = [item for item in results if item["flags"]]
    ordered = sorted(results, key=lambda item: item["score"], reverse=True)
    sample = [item for item in ordered if item["flags"]][: min(25, len(ordered))]
    exceptions = [
        {
            "recordRef": item["id"],
            "score": float(item["score"]),
            "reason": ", ".join(item["flags"]) or "High risk scoring",
        }
        for item in ordered
        if item["score"] >= 50
    ]

    summary = {
        "kind": "JE",
        "datasetHash": dataset_hash,
        "parameters": {
            "periodEnd": params["periodEnd"],
            "latePostingDays": params.get("latePostingDays", 0),
            "roundAmountThreshold": params.get("roundAmountThreshold", 1000),
            "weekendFlag": params.get("weekendFlag", True),
        },
        "totals": {
            "entries": len(params["entries"]),
            "flagged": len(flagged),
            "exceptions": len(exceptions),
        },
        "details": {"riskScores": ordered, "sample": sample},
    }

    return {"summary": summary, "exceptions": exceptions}


def _run_ratio(params: Mapping[str, Any], dataset_hash: str) -> Dict[str, Any]:
    metrics: List[Dict[str, Any]] = []
    exceptions: List[Dict[str, Any]] = []
    for metric in params["metrics"]:  # type: ignore[index]
        denominator = metric["denominator"]
        ratio = None if denominator == 0 else metric["numerator"] / denominator
        prior = metric.get("prior")
        delta_pct = None
        if prior not in (None, 0) and ratio is not None:
            delta_pct = ((ratio - prior) / prior) * 100
        threshold = metric.get("thresholdPct")
        flagged = False
        if threshold is not None and delta_pct is not None:
            flagged = abs(delta_pct) > threshold
        metrics.append(
            {
                "name": metric["name"],
                "ratio": ratio,
                "prior": prior,
                "deltaPct": delta_pct,
                "threshold": threshold,
                "flagged": flagged,
            }
        )
        if flagged:
            exceptions.append(
                {
                    "recordRef": metric["name"],
                    "score": abs(delta_pct or 0),
                    "reason": f"Variance {delta_pct:.2f}% exceeds threshold {threshold}%",
                }
            )

    summary = {
        "kind": "RATIO",
        "datasetHash": dataset_hash,
        "parameters": {},
        "totals": {"metrics": len(metrics), "exceptions": len(exceptions)},
        "details": {"metrics": metrics},
    }
    return {"summary": summary, "exceptions": exceptions}


def _run_variance(params: Mapping[str, Any], dataset_hash: str) -> Dict[str, Any]:
    series_rows: List[Dict[str, Any]] = []
    exceptions: List[Dict[str, Any]] = []
    for item in params["series"]:  # type: ignore[index]
        delta = item["actual"] - item["benchmark"]
        pct_delta = None if item["benchmark"] == 0 else (delta / item["benchmark"]) * 100
        threshold_abs = item.get("thresholdAbs")
        threshold_pct = item.get("thresholdPct")
        exceeds_abs = threshold_abs is not None and abs(delta) > threshold_abs
        exceeds_pct = threshold_pct is not None and pct_delta is not None and abs(pct_delta) > threshold_pct
        flagged = exceeds_abs or exceeds_pct
        series_rows.append(
            {
                "name": item["name"],
                "actual": item["actual"],
                "benchmark": item["benchmark"],
                "delta": delta,
                "pctDelta": pct_delta,
                "thresholdAbs": threshold_abs,
                "thresholdPct": threshold_pct,
                "flagged": flagged,
            }
        )
        if flagged:
            exceptions.append(
                {
                    "recordRef": item["name"],
                    "score": max(abs(delta), abs(pct_delta or 0)),
                    "reason": "Variance exceeds defined threshold",
                }
            )

    summary = {
        "kind": "VARIANCE",
        "datasetHash": dataset_hash,
        "parameters": {},
        "totals": {"series": len(series_rows), "exceptions": len(exceptions)},
        "details": {"series": series_rows},
    }
    return {"summary": summary, "exceptions": exceptions}


def _run_duplicate(params: Mapping[str, Any], dataset_hash: str) -> Dict[str, Any]:
    match_on: Sequence[str] = params.get("matchOn", [])  # type: ignore[assignment]
    tolerance = params.get("tolerance")

    groups: Dict[str, List[Dict[str, Any]]] = {}
    for txn in params["transactions"]:  # type: ignore[index]
        bucketed_amount = _normalise_amount(txn["amount"], tolerance)
        key_parts: List[Any] = []
        for field in match_on:
            if field == "amount":
                key_parts.append(bucketed_amount)
            else:
                key_parts.append(txn.get(field))
        key = json.dumps(key_parts, sort_keys=True, default=_json_default)
        groups.setdefault(key, []).append(txn)

    duplicate_groups = [
        {"key": key, "transactions": value}
        for key, value in groups.items()
        if len(value) > 1
    ]

    exceptions: List[Dict[str, Any]] = []
    for group in duplicate_groups:
        base_reason = f"Duplicate pattern across {len(group['transactions'])} entries"
        for txn in group["transactions"]:
            exceptions.append({"recordRef": txn["id"], "score": len(group["transactions"]), "reason": base_reason})

    summary = {
        "kind": "DUPLICATE",
        "datasetHash": dataset_hash,
        "parameters": {"matchOn": list(match_on), "tolerance": tolerance},
        "totals": {
            "transactions": len(params["transactions"]),
            "duplicateGroups": len(duplicate_groups),
            "exceptions": len(exceptions),
        },
        "details": {"groups": duplicate_groups},
    }
    return {"summary": summary, "exceptions": exceptions}


def _run_benford(params: Mapping[str, Any], dataset_hash: str) -> Dict[str, Any]:
    digits = list(range(1, 10))
    counts = {digit: 0 for digit in digits}
    for value in params["figures"]:  # type: ignore[index]
        value_str = str(abs(value))
        stripped = value_str.lstrip("0")
        if not stripped:
            continue
        first = stripped[0]
        if first.isdigit():
            counts[int(first)] += 1

    total = sum(counts.values())
    rows: List[Dict[str, Any]] = []
    for digit in digits:
        observed = counts[digit]
        observed_pct = 0 if total == 0 else observed / total
        expected_pct = math.log10(1 + 1 / digit)
        variance = observed_pct - expected_pct
        rows.append(
            {
                "digit": digit,
                "observed": observed,
                "observedPct": observed_pct,
                "expectedPct": expected_pct,
                "variance": variance,
            }
        )

    threshold = 0.05
    exceptions = [
        {
            "recordRef": str(row["digit"]),
            "score": abs(row["variance"]),
            "reason": f"First-digit variance {row['variance']:.4f} exceeds 5% tolerance",
        }
        for row in rows
        if abs(row["variance"]) > threshold
    ]

    summary = {
        "kind": "BENFORD",
        "datasetHash": dataset_hash,
        "parameters": {},
        "totals": {"figures": len(params["figures"]), "exceptions": len(exceptions)},
        "details": {"rows": rows},
    }
    return {"summary": summary, "exceptions": exceptions}


def run_analytics(kind: str, params: Mapping[str, Any]) -> Tuple[Dict[str, Any], str, Dict[str, Any]]:
    """Execute analytics for the provided kind returning sanitised inputs and results."""

    sanitised = normalise_ada_params(kind, params)
    dataset_hash = hash_dataset(sanitised)
    kind_upper = kind.upper()

    if kind_upper == "JE":
        result = _run_journal(sanitised, dataset_hash)
    elif kind_upper == "RATIO":
        result = _run_ratio(sanitised, dataset_hash)
    elif kind_upper == "VARIANCE":
        result = _run_variance(sanitised, dataset_hash)
    elif kind_upper == "DUPLICATE":
        result = _run_duplicate(sanitised, dataset_hash)
    elif kind_upper == "BENFORD":
        result = _run_benford(sanitised, dataset_hash)
    else:  # pragma: no cover - guarded by normalise_ada_params
        raise AnalyticsValidationError(f"Unsupported ADA run kind: {kind}")

    return sanitised, dataset_hash, result


__all__ = ["AnalyticsValidationError", "hash_dataset", "normalise_ada_params", "run_analytics"]
