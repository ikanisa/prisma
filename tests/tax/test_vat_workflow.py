from __future__ import annotations

from dataclasses import dataclass


def round_currency(value: float, decimals: int = 2) -> float:
    return round(value + 10 ** (-(decimals + 3)), decimals)


@dataclass
class VatScenario:
    sales: float
    sales_rate: float
    purchases: float
    purchase_rate: float
    scheme: str


def evaluate_vat(scenario: VatScenario) -> tuple[str, float]:
    output_vat = scenario.sales * scenario.sales_rate
    input_vat = scenario.purchases * scenario.purchase_rate
    net_vat = round_currency(output_vat - input_vat)
    decision = 'approved'
    if net_vat < 0 or scenario.scheme != 'domestic':
        decision = 'review'
    return decision, net_vat


def test_vat_review_flags():
    scenario = VatScenario(sales=480_000, sales_rate=0.18, purchases=175_000, purchase_rate=0.07, scheme='oss')
    decision, net_vat = evaluate_vat(scenario)
    assert decision == 'review'
    assert net_vat == round_currency(480_000 * 0.18 - 175_000 * 0.07)
