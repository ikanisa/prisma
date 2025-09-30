import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from server.health import build_readiness_report


class _HealthySession:
    async def execute(self, _query):
        return None


class _HealthySessionContext:
    async def __aenter__(self):
        return _HealthySession()

    async def __aexit__(self, exc_type, exc, tb):
        return False


def healthy_session_factory():
    return _HealthySessionContext()


class _HealthyRedis:
    def ping(self):
        return True


class _FailingRedis:
    def ping(self):
        raise ConnectionError('redis unreachable')


def test_readiness_happy_path():
    report = asyncio.run(build_readiness_report(healthy_session_factory, _HealthyRedis()))
    assert report['status'] == 'ok'
    assert report['checks']['database']['status'] == 'ok'
    assert report['checks']['redis']['status'] == 'ok'


def test_readiness_marks_degraded_on_failures():
    def failing_session_factory():
        raise RuntimeError('database offline')

    report = asyncio.run(build_readiness_report(failing_session_factory, _FailingRedis()))
    assert report['status'] == 'degraded'
    assert report['checks']['database']['status'] == 'error'
    assert 'offline' in report['checks']['database']['detail']
    assert report['checks']['redis']['status'] == 'error'
    assert 'unreachable' in report['checks']['redis']['detail']


def test_readiness_supports_async_extra_checks():
    async def async_ok_check():
        return {'status': 'ok', 'detail': 'synthetic'}

    report = asyncio.run(
        build_readiness_report(
            healthy_session_factory,
            _HealthyRedis(),
            {'synthetic': async_ok_check},
        )
    )

    assert report['checks']['synthetic']['status'] == 'ok'
    assert report['status'] == 'ok'
