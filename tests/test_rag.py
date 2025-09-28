"""Tests for RAG ingest and search functionality."""

from typing import List


def ingest(snippets: List[dict]) -> List[str]:
    """Simple in-memory ingest of ledger snippets."""
    return [s["text"] for s in snippets]


def search(store: List[str], query: str) -> List[str]:
    """Return snippets containing the query (case insensitive)."""
    return [s for s in store if query.lower() in s.lower()]


def test_rag_ingest_and_search(ledger_snippets):
    store = ingest(ledger_snippets)
    results = search(store, "VAT")
    assert results, "Expected at least one search result containing VAT"
    assert all("VAT" in r for r in results)
