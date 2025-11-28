from types import SimpleNamespace
from typing import Any, Dict, List

import os
import pytest

pytest.importorskip('fastapi')

os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
os.environ.setdefault('SUPABASE_JWT_SECRET', 'secret')
os.environ.setdefault('OPENAI_API_KEY', 'test-key')
import server.rag as rag
import server.main as main


class DummyResult:
    def __init__(self, rows: List[Any]):
        self._rows = rows

    def fetchall(self):
        return self._rows


class FakeSession:
    def __init__(self, vector_rows: List[Any], fallback_rows: List[Any]):
        self.vector_rows = vector_rows
        self.fallback_rows = fallback_rows
        self.calls: List[str] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, statement):  # pragma: no cover - simple shim
        sql = str(statement)
        self.calls.append(sql)
        bindparams = getattr(statement, '_bindparams', {})
        index_param = bindparams.get('index_name') if isinstance(bindparams, dict) else None
        index_name = index_param.value if index_param is not None else 'finance_docs_v1'
        if index_name != 'finance_docs_v1':
            return DummyResult([])
        if '<=>' in sql:
            return DummyResult(self.vector_rows)
        return DummyResult(self.fallback_rows)


@pytest.fixture(autouse=True)
def _clear_caches():
    rag._vector_index_map.cache_clear()
    rag.get_primary_index_config.cache_clear()
    rag.get_retrieval_config.cache_clear()
    yield
    rag._vector_index_map.cache_clear()
    rag.get_primary_index_config.cache_clear()
    rag.get_retrieval_config.cache_clear()


def test_vector_index_configs():
    indexes = rag.get_vector_index_configs()
    finance = next((item for item in indexes if item['name'] == 'finance_docs_v1'), None)
    assert finance is not None
    assert finance['chunk_size'] == 1200
    assert finance['chunk_overlap'] == 150


def test_retrieval_settings_config():
    settings = rag.get_retrieval_config()
    assert settings['reranker'] == 'mini-lm-re-ranker-v2'
    assert settings['top_k'] == 8
    assert settings['min_citation_confidence'] == pytest.approx(0.6, rel=1e-3)
    assert settings['require_citation'] is True


@pytest.mark.asyncio
async def test_perform_semantic_search_filters_by_confidence(monkeypatch):
    vector_rows = [
        SimpleNamespace(
            id='chunk-1',
            document_id='doc-1',
            chunk_index=0,
            content='IFRS 15 requires five-step revenue recognition.',
            score=0.92,
            document_name='IFRS 15 summary',
            repo_folder='03_Accounting',
            index_name='finance_docs_v1',
        ),
        SimpleNamespace(
            id='chunk-2',
            document_id='doc-2',
            chunk_index=1,
            content='This note references revenue but with low confidence.',
            score=0.4,
            document_name='Notes',
            repo_folder='03_Accounting',
            index_name='finance_docs_v1',
        ),
    ]

    async def fake_embed(chunks, model=None):
        return [[0.1] * 5 for _ in chunks]

    monkeypatch.setattr(rag, 'embed_chunks', fake_embed)
    monkeypatch.setattr(rag, 'AsyncSessionLocal', lambda: FakeSession(vector_rows, []))

    result = await rag.perform_semantic_search('org-1', 'Explain IFRS 15', 5)
    assert len(result['results']) == 2
    assert result['results'][0]['meetsThreshold'] is True
    assert result['results'][1]['meetsThreshold'] is False
    assert result['meta']['hasConfidentResult'] is True
    assert isinstance(result['meta']['fallbackUsed'], bool)
    assert result['results'][0]['indexName'] == 'finance_docs_v1'
    assert result['meta']['indexes'][0]['name'] == 'finance_docs_v1'
    assert result['meta']['totalCandidates'] == 2
    assert result['meta']['queried'] == 5


@pytest.mark.asyncio
async def test_perform_semantic_search_falls_back_to_keyword(monkeypatch):
    fallback_rows = [
        SimpleNamespace(
            id='chunk-3',
            document_id='doc-3',
            chunk_index=0,
            content='Keyword match without embedding score.',
            score=None,
            document_name='Policy memo',
            repo_folder='01_Legal',
            index_name='finance_docs_v1',
        )
    ]

    async def fake_embed(chunks, model=None):
        return [[0.2] * 5 for _ in chunks]

    monkeypatch.setattr(rag, 'embed_chunks', fake_embed)
    monkeypatch.setattr(rag, 'AsyncSessionLocal', lambda: FakeSession([], fallback_rows))

    result = await rag.perform_semantic_search('org-1', 'What is the policy?', 4)
    assert len(result['results']) == 1
    assert result['results'][0]['score'] is None
    assert result['meta']['fallbackUsed'] is True
    assert result['results'][0]['indexName'] == 'finance_docs_v1'
    assert result['meta']['totalCandidates'] == 1


@pytest.mark.asyncio
async def test_perform_semantic_search_prefers_openai(monkeypatch):
    async def fake_openai_search(org_id: str, query: str, limit: int, config: Dict[str, Any]):
        return {
            'results': [
                {
                    'documentId': 'doc-openai',
                    'documentName': 'OpenAI source',
                    'repo': None,
                    'chunkIndex': 0,
                    'content': 'Managed retrieval result.',
                    'score': 0.9,
                    'indexName': 'vs_test',
                    'meetsThreshold': True,
                },
            ],
            'meta': {
                'indexes': [{'name': 'vs_test'}],
                'reranker': config['reranker'],
                'minCitationConfidence': config['min_citation_confidence'],
                'requireCitation': config['require_citation'],
                'hasConfidentResult': True,
                'fallbackUsed': False,
                'queried': limit,
                'totalCandidates': 1,
            },
        }

    fake_module = SimpleNamespace(is_enabled=lambda: True, search=fake_openai_search)
    monkeypatch.setattr(rag, 'openai_retrieval', fake_module)

    result = await rag.perform_semantic_search('org-1', 'Explain IFRS 15', 5)

    assert result['results'][0]['documentId'] == 'doc-openai'
    assert result['meta']['hasConfidentResult'] is True
    assert result['meta']['fallbackUsed'] is False


@pytest.mark.asyncio
async def test_assistant_reply_requires_citations(monkeypatch):
    async def fake_search(org_id: str, query: str, requested_k: int):
        return {
            'results': [
                {
                    'documentId': 'doc-1',
                    'documentName': 'IFRS 15 summary',
                    'repo': '03_Accounting',
                    'chunkIndex': 0,
                    'content': 'IFRS 15 sets out a five-step model for revenue recognition.',
                    'score': 0.91,
                    'meetsThreshold': True,
                    'indexName': 'finance_docs_v1',
                }
            ],
            'meta': {
                'hasConfidentResult': True,
                'fallbackUsed': False,
                'indexes': [{'name': 'finance_docs_v1', 'embeddingModel': 'text-embedding-3-large'}],
                'minCitationConfidence': 0.6,
                'requireCitation': True,
                'totalCandidates': 1,
                'queried': requested_k,
            },
        }

    async def fake_profile(_org_id: str):
        return {}

    monkeypatch.setattr(main, 'perform_semantic_search', fake_search)
    monkeypatch.setattr(main, 'fetch_agent_profile', fake_profile)
    async def fake_open_tasks(*_args, **_kwargs):
        return []

    async def fake_autopilot(*_args, **_kwargs):
        return {'metrics': {}}

    async def fake_recent_documents(*_args, **_kwargs):
        return []

    monkeypatch.setattr(main, 'fetch_open_tasks', fake_open_tasks)
    monkeypatch.setattr(main, 'fetch_autopilot_summary', fake_autopilot)
    monkeypatch.setattr(main, 'fetch_recent_documents', fake_recent_documents)

    async def noop_log(*_args, **_kwargs):
        return None

    monkeypatch.setattr(main, 'log_before_asking_sequence', noop_log)
    async def fake_actions(*_args, **_kwargs):
        return []
    monkeypatch.setattr(main, 'build_assistant_actions', fake_actions)

    result = await main.generate_assistant_reply({'org_id': 'org-1'}, 'user-1', 'Explain IFRS 15 requirements')
    assert 'Here’s what I found' in result['message']
    assert result['citations']
    assert result['citations'][0]['documentId'] == 'doc-1'


@pytest.mark.asyncio
async def test_assistant_reply_blocks_low_confidence(monkeypatch):
    async def fake_search(org_id: str, query: str, requested_k: int):
        return {
            'results': [
                {
                    'documentId': 'doc-2',
                    'documentName': 'Placeholder',
                    'repo': '02_Tax',
                    'chunkIndex': 0,
                    'content': 'Low confidence match.',
                    'score': 0.2,
                    'meetsThreshold': False,
                    'indexName': 'finance_docs_v1',
                }
            ],
            'meta': {
                'hasConfidentResult': False,
                'fallbackUsed': False,
                'indexes': [{'name': 'finance_docs_v1', 'embeddingModel': 'text-embedding-3-large'}],
                'minCitationConfidence': 0.6,
                'requireCitation': True,
                'totalCandidates': 1,
                'queried': requested_k,
            },
        }

    async def fake_profile(_org_id: str):
        return {}

    async def fake_open_tasks(*_args, **_kwargs):
        return []

    async def fake_autopilot(*_args, **_kwargs):
        return {'metrics': {}}

    async def fake_recent_documents(*_args, **_kwargs):
        return []

    logged: Dict[str, Any] = {}

    async def fake_log(org_id: str, user_id: str, reason: str):
        logged['org_id'] = org_id
        logged['user_id'] = user_id
        logged['reason'] = reason
        return [
            {'source': 'documents', 'count': 0, 'available': False},
            {'source': 'google_drive', 'count': 0, 'available': False},
            {'source': 'url_sources', 'count': 0, 'available': False},
        ]

    monkeypatch.setattr(main, 'perform_semantic_search', fake_search)
    monkeypatch.setattr(main, 'fetch_agent_profile', fake_profile)
    monkeypatch.setattr(main, 'fetch_open_tasks', fake_open_tasks)
    monkeypatch.setattr(main, 'fetch_autopilot_summary', fake_autopilot)
    monkeypatch.setattr(main, 'fetch_recent_documents', fake_recent_documents)
    monkeypatch.setattr(main, 'log_before_asking_sequence', fake_log)
    async def fake_actions(*_args, **_kwargs):
        return []
    monkeypatch.setattr(main, 'build_assistant_actions', fake_actions)

    result = await main.generate_assistant_reply({'org_id': 'org-2'}, 'user-5', 'Explain VAT guidance')
    assert 'couldn’t find a confident match' in result['message']
    assert 'I checked our sources in this order' in result['message']
    assert result['citations'] == []
    assert logged['reason'] == 'knowledge_low_confidence'
