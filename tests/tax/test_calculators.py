from __future__ import annotations

from typing import List, Tuple


def round_currency(value: float, decimals: int = 2) -> float:
    return round(value + 10 ** (-(decimals + 3)), decimals)


def compute_malta_cit(
    *, revenue: float, deductions: float, carry_forward: float = 0.0, adjustments: float = 0.0, rate: float
) -> Tuple[str, float, float]:
    taxable_income = round_currency(revenue - deductions - carry_forward - adjustments)
    tax_due = round_currency(max(0.0, taxable_income) * rate)
    decision = 'approved'

    if taxable_income <= 0:
        decision = 'refused'
    elif tax_due > 500_000:
        decision = 'review'

    return decision, taxable_income, tax_due


def compute_malta_nid(*, equity_base: float, risk_free_rate: float, risk_premium: float, statutory_cap: float) -> Tuple[str, float]:
    deduction = round_currency(equity_base * (risk_free_rate + risk_premium))
    decision = 'approved'
    if deduction > statutory_cap:
        decision = 'review'
    return decision, min(deduction, statutory_cap)


def evaluate_atad_ilr(*, ebitda: float, exceeding_costs: float, safe_harbour: float) -> Tuple[str, float]:
    interest_barrier = round_currency(max(0.0, ebitda * 0.3 + safe_harbour))
    disallowed = round_currency(max(0.0, exceeding_costs - interest_barrier))
    decision = 'approved'
    if disallowed > 0:
        decision = 'refused' if disallowed > ebitda * 0.2 else 'review'
    return decision, disallowed


def assess_fiscal_unity(*, parent_profit: float, subsidiary_profit: float, adjustments: float, elections: float) -> Tuple[str, float]:
    consolidated = round_currency(parent_profit + subsidiary_profit + adjustments)
    pooling = round_currency(max(0.0, elections - max(0.0, consolidated)))
    decision = 'approved'
    if pooling > 0:
        decision = 'review'
    if consolidated < 0:
        decision = 'refused'
    return decision, pooling


def scan_dac6(arrangements: List[dict]) -> Tuple[str, int]:
    flagged = 0
    for arrangement in arrangements:
        score = len(arrangement.get('hallmarkCategories', []))
        if arrangement.get('crossBorder'):
            score += 2
        if arrangement.get('mainBenefit'):
            score += 2
        if score >= 4:
            flagged += 1
    if flagged == 0:
        return 'approved', flagged
    if flagged > 2:
        return 'refused', flagged
    return 'review', flagged


def compute_pillar_two(jurisdictions: List[dict]) -> Tuple[str, float]:
    aggregate = 0.0
    for row in jurisdictions:
        income = row['globeIncome']
        taxes = row['coveredTaxes']
        if income <= 0:
            continue
        effective_rate = taxes / income
        if effective_rate < 0.15:
            aggregate += (0.15 - effective_rate) * income
    aggregate = round_currency(aggregate)
    if aggregate == 0:
        return 'approved', aggregate
    if aggregate >= 500_000:
        return 'refused', aggregate
    return 'review', aggregate


def resolve_treaty(*, issue: str, has_map: bool, apa_requested: bool) -> str:
    decision = 'approved'
    if issue == 'double_taxation' and not has_map:
        decision = 'review'
    if issue == 'permanent_establishment':
        decision = 'review'
    if apa_requested:
        decision = 'review'
    return decision


def compute_us_gilti(*, tested_income: float, qbai: float, interest_expense: float, rate: float) -> Tuple[str, float]:
    net_tested = tested_income - interest_expense
    deemed_intangible = round_currency(net_tested - 0.1 * qbai)
    gilti_base = max(0.0, deemed_intangible)
    gilti_tax = round_currency(gilti_base * rate)
    if gilti_base == 0:
        return 'refused', gilti_tax
    if gilti_tax > 250_000:
        return 'review', gilti_tax
    return 'approved', gilti_tax


def test_malta_cit_decisions():
    decision, taxable_income, tax_due = compute_malta_cit(
        revenue=1_200_000, deductions=420_000, carry_forward=50_000, adjustments=10_000, rate=0.35
    )
    assert decision == 'approved'
    assert taxable_income == 720_000
    assert tax_due == 252_000

    decision, taxable_income, _ = compute_malta_cit(
        revenue=200_000, deductions=250_000, carry_forward=0, adjustments=0, rate=0.35
    )
    assert decision == 'refused'
    assert taxable_income == -50_000


def test_malta_nid_cap():
    decision, capped = compute_malta_nid(equity_base=800_000, risk_free_rate=0.02, risk_premium=0.01, statutory_cap=20_000)
    assert decision == 'review'
    assert capped == 20_000


def test_atad_ilr_refusal_gate():
    decision, disallowed = evaluate_atad_ilr(ebitda=300_000, exceeding_costs=260_000, safe_harbour=0)
    assert decision == 'refused'
    assert disallowed == round_currency(260_000 - (300_000 * 0.3))


def test_fiscal_unity_review():
    decision, pooling = assess_fiscal_unity(parent_profit=500_000, subsidiary_profit=-150_000, adjustments=-25_000, elections=400_000)
    assert decision == 'review'
    assert pooling == 75_000


def test_dac6_flagging():
    decision, flagged = scan_dac6(
        [
            {'hallmarkCategories': ['A1', 'B2'], 'crossBorder': True, 'mainBenefit': True},
            {'hallmarkCategories': ['C1'], 'crossBorder': False, 'mainBenefit': False},
            {'hallmarkCategories': ['D1'], 'crossBorder': True, 'mainBenefit': True},
        ]
    )
    assert decision == 'review'
    assert flagged == 2  # two arrangements breach the threshold (score >= 4)


def test_pillar_two_top_up():
    decision, top_up = compute_pillar_two(
        [
            {'name': 'Malta', 'globeIncome': 320_000, 'coveredTaxes': 36_000},
            {'name': 'Ireland', 'globeIncome': 540_000, 'coveredTaxes': 62_000},
        ]
    )
    assert decision == 'review'
    assert top_up == round_currency((0.15 - (36_000 / 320_000)) * 320_000 + (0.15 - (62_000 / 540_000)) * 540_000)


def test_treaty_workflow():
    decision = resolve_treaty(issue='double_taxation', has_map=False, apa_requested=True)
    assert decision == 'review'


def test_us_gilti_thresholds():
    decision, tax = compute_us_gilti(tested_income=4_000_000, qbai=1_000_000, interest_expense=100_000, rate=0.105)
    assert decision == 'review'
    assert tax == round_currency(max(0, round_currency(4_000_000 - 100_000 - 0.1 * 1_000_000)) * 0.105)
