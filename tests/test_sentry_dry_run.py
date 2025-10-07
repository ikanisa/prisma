import os
import pytest

pytest.importorskip('fastapi')
from fastapi.testclient import TestClient

import server.main as main


def test_sentry_dry_run_returns_500(monkeypatch):
    monkeypatch.setenv('ALLOW_SENTRY_DRY_RUN', 'true')

    def fake_require_auth(_auth: str):
        return {'sub': 'user-123'}

    monkeypatch.setattr(main, 'require_auth', fake_require_auth)

    client = TestClient(main.app)
    response = client.post('/v1/observability/dry-run', headers={'Authorization': 'Bearer token', 'X-Request-ID': 'dry-run-req'})

    assert response.status_code == 500
    assert response.headers.get('X-Request-ID') == 'dry-run-req'

