import sys
import textwrap
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from server import config_loader


def _clear_config_caches() -> None:
    cached_functions = [
        "load_system_config",
        "get_config_permission_map",
        "get_client_portal_scope",
        "get_autonomy_levels",
        "get_default_autonomy_level",
        "get_autonomy_job_allowances",
        "get_google_drive_settings",
        "get_url_source_settings",
        "get_email_ingest_settings",
        "get_before_asking_user_sequence",
        "get_document_ai_settings",
        "get_vector_index_configs",
        "get_semantic_search_settings",
        "get_retrieval_settings",
        "get_release_control_settings",
    ]
    for name in cached_functions:
        func = getattr(config_loader, name, None)
        cache_clear = getattr(func, "cache_clear", None)
        if callable(cache_clear):
            cache_clear()


@pytest.fixture(autouse=True)
def reset_config_caches():
    _clear_config_caches()
    yield
    _clear_config_caches()


def _write_config(tmp_path: Path, contents: str) -> Path:
    config_file = tmp_path / "system.yaml"
    config_file.write_text(textwrap.dedent(contents), encoding="utf-8")
    return config_file


def _set_config(tmp_path: Path, monkeypatch, contents: str) -> Path:
    config_path = _write_config(tmp_path, contents)
    monkeypatch.setenv("SYSTEM_CONFIG_PATH", str(config_path))
    return config_path


def test_release_control_settings_override(tmp_path, monkeypatch):
    _set_config(
        tmp_path,
        monkeypatch,
        """
        release_controls:
          approvals_required:
            - report_release
          archive:
            manifest_hash: sha1
            include_docs:
              - report_pdf
              - evidence_zip
          environment:
            autonomy:
              minimum_level: L3
              require_worker: false
              critical_roles: [PARTNER, MANAGER]
            mfa:
              channel: sms
              within_seconds: 600
            telemetry:
              max_open_alerts: 2
              severity_threshold: error
        """,
    )
    settings = config_loader.get_release_control_settings()

    assert settings["approvals_required"] == ["report_release"]
    assert settings["archive"]["manifest_hash"] == "sha1"
    assert settings["archive"]["include_docs"] == ["report_pdf", "evidence_zip"]

    environment = settings["environment"]
    autonomy = environment["autonomy"]
    assert autonomy["minimum_level"] == "L3"
    assert autonomy["require_worker"] is False
    assert autonomy["critical_roles"] == ["PARTNER", "MANAGER"]

    mfa = environment["mfa"]
    assert mfa["channel"] == "SMS"
    assert mfa["within_seconds"] == 600

    telemetry = environment["telemetry"]
    assert telemetry["max_open_alerts"] == 2
    assert telemetry["severity_threshold"] == "ERROR"


def test_data_source_defaults_when_missing(tmp_path, monkeypatch):
    _set_config(tmp_path, monkeypatch, "{}")

    drive = config_loader.get_google_drive_settings()
    assert drive["enabled"] is False
    assert drive["oauth_scopes"] == [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]
    assert drive["folder_mapping_pattern"] == "org-{orgId}/entity-{entityId}/{repoFolder}"
    assert drive["mirror_to_storage"] is True

    url_sources = config_loader.get_url_source_settings()
    assert url_sources["allowed_domains"] == ["*"]
    assert url_sources["fetch_policy"]["obey_robots"] is True
    assert url_sources["fetch_policy"]["max_depth"] == 1
    assert url_sources["fetch_policy"]["cache_ttl_minutes"] == 1440

    sequence = config_loader.get_before_asking_user_sequence()
    assert sequence == ["documents", "google_drive", "url_sources"]

    email = config_loader.get_email_ingest_settings()
    assert email["enabled"] is False


def test_autonomy_overrides(tmp_path, monkeypatch):
    _set_config(
        tmp_path,
        monkeypatch,
        """
        autonomy:
          levels:
            L0: Manual only
            L1: Assist users
          default_level: L1
          autopilot:
            allowed_jobs:
              L1:
                - refresh_analytics
                - remind_pbc
              l2:
                - extract_documents
                - close_cycle
        """,
    )
    levels = config_loader.get_autonomy_levels()
    assert levels["L0"] == "Manual only"
    assert levels["L1"] == "Assist users"

    default_level = config_loader.get_default_autonomy_level()
    assert default_level == "L1"

    allowances = config_loader.get_autonomy_job_allowances()
    assert allowances["L1"] == ["refresh_analytics", "remind_pbc"]
    assert allowances["L2"] == ["extract_documents", "close_cycle"]


def test_document_ai_and_knowledge_overrides(tmp_path, monkeypatch):
    _set_config(
        tmp_path,
        monkeypatch,
        """
        document_ai:
          pipeline:
            steps: [ocr, classify, index]
            classifiers:
              types: [incorp_cert, bank_statement]
            extractors:
              bank_statement:
                - opening_balance
                - closing_balance
            provenance: false
            error_handling: manual_review
        knowledge:
          vector_indexes:
            - name: custom_index
              backend: weaviate
              embedding_model: text-embedding-3-medium
              chunking:
                size: 2048
                overlap: 256
              scope_filters: [orgId, repoFolder]
              seed_sets: [ifrs]
          retrieval:
            reranker: cross-encoder
            top_k: 9
            min_citation_confidence: 0.8
            policy:
              require_citation: false
              before_asking_user: [email_ingest, documents]
        """,
    )
    doc_ai = config_loader.get_document_ai_settings()
    assert doc_ai["steps"] == ["ocr", "classify", "index"]
    assert doc_ai["classifier_types"] == ["INCORP_CERT", "BANK_STATEMENT"]
    assert doc_ai["extractors"]["BANK_STATEMENT"] == ["opening_balance", "closing_balance"]
    assert doc_ai["provenance_required"] is False
    assert doc_ai["error_handling"] == "manual_review"

    indexes = config_loader.get_vector_index_configs()
    assert indexes == [
        {
            "name": "custom_index",
            "backend": "weaviate",
            "embedding_model": "text-embedding-3-medium",
            "chunk_size": 2048,
            "chunk_overlap": 256,
            "scope_filters": ["orgId", "repoFolder"],
            "seed_sets": ["ifrs"],
        }
    ]

    retrieval = config_loader.get_retrieval_settings()
    assert retrieval["reranker"] == "cross-encoder"
    assert retrieval["top_k"] == 9
    assert retrieval["min_citation_confidence"] == 0.8
    assert retrieval["require_citation"] is False

    sequence = config_loader.get_before_asking_user_sequence()
    assert sequence == ["email_ingest", "documents"]
