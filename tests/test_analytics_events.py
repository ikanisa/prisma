from analytics.events import (
    AnalyticsEventValidationError,
    autonomy_telemetry_row,
    build_autonomy_telemetry_event,
    build_telemetry_alert_event,
    telemetry_alert_row,
)


def test_build_telemetry_alert_event_round_trip():
    event = build_telemetry_alert_event(
        alert_type="RATE_LIMIT_BREACH",
        severity="warning",
        message="Rate limit exceeded",
        org_id="d9c4b9fb-2b5d-4a05-8c0e-1cb64ea05b9c",
        context={"path": "/v1/test"},
    )
    row = telemetry_alert_row(event)
    assert row["alert_type"] == "RATE_LIMIT_BREACH"
    assert row["severity"] == "WARNING"
    assert row["context"]["path"] == "/v1/test"


def test_build_telemetry_alert_event_invalid_severity():
    try:
        build_telemetry_alert_event(
            alert_type="BAD",
            severity="bogus",
            message="bad",
        )
    except AnalyticsEventValidationError as exc:
        assert exc.errors and 'BOGUS' in exc.errors[0]
    else:  # pragma: no cover - defensive
        raise AssertionError("Expected validation error for severity")


def test_autonomy_telemetry_event_row_contains_metrics():
    event = build_autonomy_telemetry_event(
        org_id="3b0f8de2-9a46-4f4f-a13f-8ccf19a94e45",
        module="knowledge_embeddings",
        scenario="ingest",
        decision="approved",
        metrics={"documents": 5},
        actor="914a756a-fb0a-4a92-a121-9a43fffa493d",
    )
    row = autonomy_telemetry_row(event)
    assert row["module"] == "knowledge_embeddings"
    assert row["decision"] == "APPROVED"
    assert row["metrics"]["documents"] == 5
