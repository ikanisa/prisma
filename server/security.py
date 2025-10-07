from __future__ import annotations

import os
from typing import Iterable, List, Optional
from urllib.parse import urlparse

DEV_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


def normalise_allowed_origins(raw_value: Optional[str], *, environment: Optional[str] = None) -> List[str]:
    origins = [origin.strip() for origin in (raw_value or "").split(",") if origin.strip()]
    if origins:
        return origins

    env_value = (environment or os.getenv("ENVIRONMENT", "development")).lower()
    if env_value in {"development", "dev", "test", "local"}:
        return list(DEV_ALLOWED_ORIGINS)

    raise RuntimeError("API_ALLOWED_ORIGINS must be set when ENVIRONMENT is not development/test.")


def _origin_from_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme}://{parsed.netloc}"


def _normalise_extra(origins: Optional[Iterable[str]]) -> List[str]:
    if not origins:
        return []
    return [origin.strip() for origin in origins if origin and origin.strip()]


def build_csp_header(
    supabase_url: Optional[str],
    storage_url: Optional[str],
    *,
    extra_connect: Optional[Iterable[str]] = None,
    extra_img: Optional[Iterable[str]] = None,
) -> str:
    supabase_origin = _origin_from_url(supabase_url)
    storage_origin = _origin_from_url(storage_url)

    connect_src = {"'self'"}
    img_src = {"'self'", "data:", "blob:"}
    script_src = {"'self'"}
    style_src = {"'self'"}
    font_src = {"'self'", "data:"}
    media_src = {"'self'", "blob:"}
    worker_src = {"'self'", "blob:"}

    if supabase_origin:
        connect_src.update({supabase_origin, f"{supabase_origin}/rest/v1", f"{supabase_origin}/auth/v1"})
        img_src.add(supabase_origin)
    if storage_origin:
        connect_src.add(storage_origin)
        img_src.add(storage_origin)

    connect_src.update(_normalise_extra(extra_connect))
    img_src.update(_normalise_extra(extra_img))

    directives = [
        "default-src 'self'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        f"connect-src {' '.join(sorted(connect_src))}",
        f"img-src {' '.join(sorted(img_src))}",
        f"script-src {' '.join(sorted(script_src))}",
        f"style-src {' '.join(sorted(style_src))}",
        f"font-src {' '.join(sorted(font_src))}",
        "object-src 'none'",
        f"media-src {' '.join(sorted(media_src))}",
        f"worker-src {' '.join(sorted(worker_src))}",
    ]

    return "; ".join(directives)
