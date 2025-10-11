"""Shared OpenAI Async client helpers.

Mirrors the TypeScript helper in `lib/openai/client.ts` so Python services
re-use a single configured client with consistent headers, base URL, and timeouts.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict, Optional

from openai import AsyncOpenAI

DEFAULT_TIMEOUT = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "60"))
DEFAULT_USER_AGENT_TAG = os.getenv("OPENAI_USER_AGENT_TAG", "prisma-glow-15")


def _build_options(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    overrides = overrides or {}
    api_key = overrides.get("api_key") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY must be configured")

    base_url = overrides.get("base_url") or os.getenv("OPENAI_BASE_URL") or "https://api.openai.com/v1"
    timeout = overrides.get("timeout") or DEFAULT_TIMEOUT
    organization = overrides.get("organization") or os.getenv("OPENAI_ORG_ID")
    default_headers = {
        "x-openai-user-agent": overrides.get("user_agent") or DEFAULT_USER_AGENT_TAG,
    }
    extra_headers = overrides.get("default_headers") or {}
    default_headers.update(extra_headers)

    options: Dict[str, Any] = {
        "api_key": api_key,
        "base_url": base_url,
        "timeout": timeout,
        "default_headers": default_headers,
    }
    if organization:
        options["organization"] = organization
    if "max_retries" in overrides:
        options["max_retries"] = overrides["max_retries"]

    return options


_shared_client: Optional[AsyncOpenAI] = None


def get_openai_client(overrides: Optional[Dict[str, Any]] = None) -> AsyncOpenAI:
    global _shared_client
    if _shared_client is None:
        _shared_client = AsyncOpenAI(**_build_options(overrides))
    return _shared_client


def refresh_openai_client(overrides: Optional[Dict[str, Any]] = None) -> AsyncOpenAI:
    global _shared_client
    _shared_client = AsyncOpenAI(**_build_options(overrides))
    return _shared_client


def with_openai_client(callback):
    client = get_openai_client()
    return callback(client)


@lru_cache(maxsize=1)
def get_default_headers() -> Dict[str, str]:
    client = get_openai_client()
    headers = dict(client.default_headers or {})
    return headers
