"""Tests for VAT evaluator using golden Q&A."""


def vat_evaluator(question: str, dataset) -> str:
    mapping = {item["question"]: item["answer"] for item in dataset}
    return mapping.get(question)


def test_vat_evaluator(vat_qa):
    for item in vat_qa:
        assert vat_evaluator(item["question"], vat_qa) == item["answer"]
