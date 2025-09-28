"""Tests for agent routing based on query content."""


def route_agent(query: str) -> str:
    query = query.lower()
    if "vat" in query:
        return "vat_agent"
    if "isa" in query:
        return "isa_agent"
    return "default_agent"


def test_agent_routing(vat_qa, isa_qa):
    assert route_agent(vat_qa[0]["question"]) == "vat_agent"
    assert route_agent(isa_qa[0]["question"]) == "isa_agent"
    assert route_agent("What is the weather?") == "default_agent"
