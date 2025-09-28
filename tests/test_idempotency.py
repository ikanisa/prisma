"""Tests for idempotent request handling."""


class Processor:
    def __init__(self):
        self._store = {}

    def process(self, request_id: str, payload: str) -> str:
        if request_id in self._store:
            return self._store[request_id]
        result = payload.upper()
        self._store[request_id] = result
        return result


def test_idempotent_processing():
    proc = Processor()
    first = proc.process("1", "abc")
    second = proc.process("1", "xyz")
    assert first == second
    assert len(proc._store) == 1
