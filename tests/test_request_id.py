import pytest

pytest.importorskip('fastapi')

from fastapi.testclient import TestClient

import server.main as main


def test_request_id_header_is_generated():
    client = TestClient(main.app)

    response = client.get('/health')

    request_id = response.headers.get('X-Request-ID')
    assert request_id is not None
    assert len(request_id) > 0


def test_request_id_header_is_reused_when_provided():
    client = TestClient(main.app)
    custom_request_id = 'test-request-id-123'

    response = client.get('/health', headers={'X-Request-ID': custom_request_id})
    assert response.headers.get('X-Request-ID') == custom_request_id
