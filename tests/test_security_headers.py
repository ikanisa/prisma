import pytest

from server.security import build_csp_header, normalise_allowed_origins


def test_build_csp_header_includes_supabase_origins():
    header = build_csp_header(
        "https://example.supabase.co",
        "https://example.supabase.co/storage/v1",
    )

    assert "default-src 'self'" in header
    assert "connect-src" in header
    assert "https://example.supabase.co" in header
    assert "unsafe" not in header


def test_build_csp_header_respects_extra_sources():
    header = build_csp_header(
        "https://example.supabase.co",
        None,
        extra_connect=["https://api.third-party.com"],
        extra_img=["https://cdn.example.com"],
    )

    assert "https://api.third-party.com" in header
    assert "https://cdn.example.com" in header


def test_normalise_allowed_origins_uses_env_values(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    origins = normalise_allowed_origins("https://app.prismaglow.example.com, https://admin.prismaglow.example.com")
    assert origins == ["https://app.prismaglow.example.com", "https://admin.prismaglow.example.com"]


def test_normalise_allowed_origins_dev_fallback(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    origins = normalise_allowed_origins(None)
    assert "http://localhost:5173" in origins


def test_normalise_allowed_origins_raises_without_values_in_production(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    with pytest.raises(RuntimeError):
        normalise_allowed_origins(None)
