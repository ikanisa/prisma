"""Async OpenAI client factory with dependency injection support."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any, Dict, Mapping, Optional

from ..settings import OpenAIClientSettings, get_system_settings

if TYPE_CHECKING:  # pragma: no cover - import for type checking only
    from openai import AsyncOpenAI
else:  # pragma: no cover - runtime attribute for type hints
    AsyncOpenAI = Any  # type: ignore


class OpenAIClientFactory:
    """Factory responsible for constructing configured OpenAI clients."""

    def __init__(self, settings: OpenAIClientSettings):
        self._settings = settings
        self._shared_client: Optional[AsyncOpenAI] = None
        self._headers_cache: Optional[Dict[str, str]] = None

    @property
    def settings(self) -> OpenAIClientSettings:
        return self._settings

    def _build_client(self, overrides: Optional[Mapping[str, Any]] = None) -> AsyncOpenAI:
        from openai import AsyncOpenAI as _AsyncOpenAI

        options = self._settings.client_options(overrides)
        return _AsyncOpenAI(**options)

    def get_client(self, overrides: Optional[Mapping[str, Any]] = None) -> AsyncOpenAI:
        """Return a shared client unless overrides are provided."""

        if overrides:
            return self._build_client(overrides)
        if self._shared_client is None:
            self._shared_client = self._build_client()
            self._headers_cache = None
        return self._shared_client

    def refresh_client(self, overrides: Optional[Mapping[str, Any]] = None) -> AsyncOpenAI:
        """Replace the shared client instance, useful after credential rotation."""

        self._shared_client = self._build_client(overrides)
        self._headers_cache = None
        return self._shared_client

    def get_default_headers(self) -> Dict[str, str]:
        if self._headers_cache is None:
            client = self.get_client()
            self._headers_cache = dict(client.default_headers or {})
        return dict(self._headers_cache)

    def reset(self) -> None:
        self._shared_client = None
        self._headers_cache = None


_default_factory: Optional[OpenAIClientFactory] = None


def get_default_factory() -> OpenAIClientFactory:
    global _default_factory
    if _default_factory is None:
        settings = get_system_settings().openai
        _default_factory = OpenAIClientFactory(settings)
    return _default_factory


def set_default_factory(factory: Optional[OpenAIClientFactory]) -> None:
    global _default_factory
    _default_factory = factory


def get_openai_client(
    overrides: Optional[Mapping[str, Any]] = None,
    *,
    factory: Optional[OpenAIClientFactory] = None,
) -> AsyncOpenAI:
    provider = factory or get_default_factory()
    return provider.get_client(overrides)


def refresh_openai_client(
    overrides: Optional[Mapping[str, Any]] = None,
    *,
    factory: Optional[OpenAIClientFactory] = None,
) -> AsyncOpenAI:
    provider = factory or get_default_factory()
    return provider.refresh_client(overrides)


def with_openai_client(callback, *, factory: Optional[OpenAIClientFactory] = None):
    client = get_openai_client(factory=factory)
    return callback(client)


def get_default_headers(*, factory: Optional[OpenAIClientFactory] = None) -> Dict[str, str]:
    provider = factory or get_default_factory()
    return provider.get_default_headers()
