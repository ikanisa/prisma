from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, Sequence

__all__ = ["build_manifest", "validate_manifest", "MANIFEST_VERSION"]

MANIFEST_VERSION = 1


def _json_default(value: Any) -> Any:
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if hasattr(value, "dict"):
        return value.dict()
    if hasattr(value, "_asdict"):
        return value._asdict()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serialisable")


def _canonical_payload(kind: str, inputs: Mapping[str, Any], outputs: Mapping[str, Any], evidence: Sequence[str]) -> str:
    payload = {
        "kind": kind,
        "inputs": inputs,
        "outputs": outputs,
        "evidence": list(evidence),
        "version": MANIFEST_VERSION,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=_json_default)


def build_manifest(
    *,
    kind: str,
    inputs: Mapping[str, Any] | None = None,
    outputs: Mapping[str, Any] | None = None,
    evidence: Iterable[str] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> Dict[str, Any]:
    job_kind = (kind or "unknown").strip() or "unknown"
    inputs_map = dict(inputs or {})
    outputs_map = dict(outputs or {})
    evidence_list = [str(item) for item in evidence or []]
    canonical = _canonical_payload(job_kind, inputs_map, outputs_map, evidence_list)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    manifest: Dict[str, Any] = {
        "version": MANIFEST_VERSION,
        "kind": job_kind,
        "hash": digest,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "inputs": inputs_map,
        "outputs": outputs_map,
        "evidence": evidence_list,
    }
    if metadata:
        manifest["metadata"] = dict(metadata)
    return manifest


def validate_manifest(manifest: Mapping[str, Any]) -> bool:
    if not isinstance(manifest, Mapping):
        return False

    required_keys = {"hash", "kind", "inputs", "outputs", "evidence"}
    if not required_keys.issubset(set(manifest.keys())):
        return False

    kind = str(manifest.get("kind") or "unknown")
    inputs = manifest.get("inputs")
    outputs = manifest.get("outputs")
    evidence = manifest.get("evidence")
    if not isinstance(inputs, Mapping) or not isinstance(outputs, Mapping) or not isinstance(evidence, (list, tuple)):
        return False

    canonical = _canonical_payload(kind, inputs, outputs, evidence)
    expected_hash = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    actual_hash = str(manifest.get("hash") or "")
    if expected_hash != actual_hash:
        return False

    return True
