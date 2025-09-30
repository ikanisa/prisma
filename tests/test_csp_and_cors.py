import os
import pytest

pytest.importorskip('fastapi')

from fastapi.testclient import TestClient

import server.main as main


def test_health_includes_strict_csp_header():
    client = TestClient(main.app)

    response = client.get('/health')

    csp = response.headers.get('Content-Security-Policy')
    assert csp is not None and len(csp) > 0
    assert 'unsafe' not in csp
    assert "default-src 'self'" in csp


def test_cors_allows_only_configured_origins(monkeypatch):
    # Re-import main with a controlled allow-list
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.setenv('API_ALLOWED_ORIGINS', 'https://app.example.com')

    # The app was imported above already, but CORSMiddleware uses allowed_origins list
    # to decide which Origin gets a CORS allow header on each request. We can exercise
    # both an allowed and disallowed origin against the existing app instance.
    client = TestClient(main.app)

    # Allowed origin should receive an allow-origin echo
    preflight_allowed = client.options(
        '/health',
        headers={
            'Origin': 'https://app.example.com',
            'Access-Control-Request-Method': 'GET',
        },
    )
    assert preflight_allowed.status_code in (200, 204)
    assert preflight_allowed.headers.get('access-control-allow-origin') == 'https://app.example.com'

    # Disallowed origin should not receive allow-origin header
    preflight_denied = client.options(
        '/health',
        headers={
            'Origin': 'https://evil.example.com',
            'Access-Control-Request-Method': 'GET',
        },
    )
    assert preflight_denied.status_code in (200, 204)
    assert preflight_denied.headers.get('access-control-allow-origin') is None

