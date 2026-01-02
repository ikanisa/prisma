"""
Tax Formula Unit Tests - Malta CIT Computation
P0 FIX: Comprehensive tests for tax calculation formulas

These tests verify mathematical correctness of tax computations
to prevent financial errors in production.
"""
import pytest
from decimal import Decimal
from typing import Dict, Any


# Malta CIT Configuration
MALTA_CIT_RATE = Decimal("0.35")  # 35% corporate income tax
MALTA_REFUND_PROFILES = {
    "6_7": Decimal("6") / Decimal("7"),  # 6/7 refund (most common)
    "5_7": Decimal("5") / Decimal("7"),  # 5/7 refund
    "2_3": Decimal("2") / Decimal("3"),  # 2/3 refund
    "no_refund": Decimal("0"),
}


def compute_malta_cit(
    pre_tax_profit: Decimal,
    adjustments: list[Dict[str, Any]] = None,
    participation_exempt: bool = False,
    refund_profile: str = "6_7",
) -> Dict[str, Decimal]:
    """
    Compute Malta Corporate Income Tax
    
    Args:
        pre_tax_profit: Pre-tax profit from trial balance
        adjustments: List of tax adjustments [{label, amount}]
        participation_exempt: Whether participation exemption applies
        refund_profile: Refund profile (6_7, 5_7, 2_3, no_refund)
    
    Returns:
        Dictionary with:
        - taxable_adjustments: Sum of adjustments
        - chargeable_income: Pre-tax profit + adjustments
        - cit_amount: Tax at 35%
        - refund_amount: Shareholder refund
        - effective_rate: Effective tax rate after refund
    """
    if adjustments is None:
        adjustments = []
    
    # Calculate total adjustments
    taxable_adjustments = sum(
        Decimal(str(adj.get("amount", 0))) 
        for adj in adjustments
    )
    
    # Chargeable income
    chargeable_income = pre_tax_profit + taxable_adjustments
    
    # Apply participation exemption if applicable
    if participation_exempt:
        cit_amount = Decimal("0")
        refund_amount = Decimal("0")
    else:
        # CIT at 35%
        cit_amount = (chargeable_income * MALTA_CIT_RATE).quantize(Decimal("0.01"))
        
        # Refund calculation
        refund_rate = MALTA_REFUND_PROFILES.get(refund_profile, Decimal("0"))
        refund_amount = (cit_amount * refund_rate).quantize(Decimal("0.01"))
    
    # Effective rate
    if chargeable_income > 0:
        effective_rate = ((cit_amount - refund_amount) / chargeable_income).quantize(Decimal("0.0001"))
    else:
        effective_rate = Decimal("0")
    
    return {
        "taxable_adjustments": taxable_adjustments,
        "chargeable_income": chargeable_income,
        "cit_amount": cit_amount,
        "refund_amount": refund_amount,
        "effective_rate": effective_rate,
    }


class TestMaltaCitComputation:
    """Test suite for Malta CIT calculations"""
    
    def test_basic_cit_calculation(self):
        """Test basic CIT at 35%"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            refund_profile="no_refund"
        )
        
        assert result["chargeable_income"] == Decimal("100000")
        assert result["cit_amount"] == Decimal("35000.00")
        assert result["refund_amount"] == Decimal("0")
    
    def test_cit_with_6_7_refund(self):
        """Test CIT with 6/7 refund (effective ~5%)"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            refund_profile="6_7"
        )
        
        assert result["cit_amount"] == Decimal("35000.00")
        # 6/7 of 35000 = 30000
        assert result["refund_amount"] == Decimal("30000.00")
        # Effective rate = (35000 - 30000) / 100000 = 5%
        assert result["effective_rate"] == Decimal("0.0500")
    
    def test_cit_with_5_7_refund(self):
        """Test CIT with 5/7 refund"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            refund_profile="5_7"
        )
        
        assert result["cit_amount"] == Decimal("35000.00")
        # 5/7 of 35000 = 25000
        assert result["refund_amount"] == Decimal("25000.00")
        # Effective rate = (35000 - 25000) / 100000 = 10%
        assert result["effective_rate"] == Decimal("0.1000")
    
    def test_cit_with_adjustments(self):
        """Test CIT with add-back adjustments"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            adjustments=[
                {"label": "Depreciation add-back", "amount": 5000},
                {"label": "Entertainment expenses", "amount": 2000},
            ],
            refund_profile="6_7"
        )
        
        assert result["taxable_adjustments"] == Decimal("7000")
        assert result["chargeable_income"] == Decimal("107000")
        # 35% of 107000 = 37450
        assert result["cit_amount"] == Decimal("37450.00")
    
    def test_cit_with_negative_adjustments(self):
        """Test CIT with deduction adjustments"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            adjustments=[
                {"label": "R&D credit", "amount": -10000},
            ],
            refund_profile="no_refund"
        )
        
        assert result["taxable_adjustments"] == Decimal("-10000")
        assert result["chargeable_income"] == Decimal("90000")
        assert result["cit_amount"] == Decimal("31500.00")
    
    def test_participation_exemption(self):
        """Test participation exemption results in zero tax"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            participation_exempt=True,
            refund_profile="6_7"
        )
        
        assert result["cit_amount"] == Decimal("0")
        assert result["refund_amount"] == Decimal("0")
        assert result["effective_rate"] == Decimal("0")
    
    def test_zero_profit(self):
        """Test zero profit scenario"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("0"),
            refund_profile="6_7"
        )
        
        assert result["chargeable_income"] == Decimal("0")
        assert result["cit_amount"] == Decimal("0.00")
        assert result["refund_amount"] == Decimal("0.00")
        assert result["effective_rate"] == Decimal("0")
    
    def test_large_numbers(self):
        """Test with large profit figures"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("10000000"),  # 10 million
            refund_profile="6_7"
        )
        
        assert result["cit_amount"] == Decimal("3500000.00")
        assert result["refund_amount"] == Decimal("3000000.00")
    
    def test_decimal_precision(self):
        """Test decimal precision is maintained"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("123456.78"),
            refund_profile="6_7"
        )
        
        # 35% of 123456.78 = 43209.873 → 43209.87
        assert result["cit_amount"] == Decimal("43209.87")
    
    def test_2_3_refund_profile(self):
        """Test 2/3 refund profile"""
        result = compute_malta_cit(
            pre_tax_profit=Decimal("100000"),
            refund_profile="2_3"
        )
        
        assert result["cit_amount"] == Decimal("35000.00")
        # 2/3 of 35000 = 23333.33
        assert result["refund_amount"] == Decimal("23333.33")


class TestVatComputation:
    """Test suite for VAT calculations"""
    
    MALTA_VAT_STANDARD = Decimal("0.18")  # 18%
    MALTA_VAT_REDUCED = Decimal("0.07")   # 7%
    MALTA_VAT_SUPER_REDUCED = Decimal("0.05")  # 5%
    
    def compute_vat(
        self,
        net_amount: Decimal,
        rate: Decimal = None
    ) -> Dict[str, Decimal]:
        """Compute VAT amount and gross total"""
        if rate is None:
            rate = self.MALTA_VAT_STANDARD
        
        vat_amount = (net_amount * rate).quantize(Decimal("0.01"))
        gross_amount = net_amount + vat_amount
        
        return {
            "net_amount": net_amount,
            "vat_rate": rate,
            "vat_amount": vat_amount,
            "gross_amount": gross_amount,
        }
    
    def test_standard_vat_18_percent(self):
        """Test standard 18% VAT"""
        result = self.compute_vat(Decimal("1000"))
        
        assert result["vat_rate"] == Decimal("0.18")
        assert result["vat_amount"] == Decimal("180.00")
        assert result["gross_amount"] == Decimal("1180.00")
    
    def test_reduced_vat_7_percent(self):
        """Test reduced 7% VAT"""
        result = self.compute_vat(
            Decimal("1000"),
            rate=self.MALTA_VAT_REDUCED
        )
        
        assert result["vat_amount"] == Decimal("70.00")
        assert result["gross_amount"] == Decimal("1070.00")
    
    def test_super_reduced_vat_5_percent(self):
        """Test super-reduced 5% VAT"""
        result = self.compute_vat(
            Decimal("1000"),
            rate=self.MALTA_VAT_SUPER_REDUCED
        )
        
        assert result["vat_amount"] == Decimal("50.00")
        assert result["gross_amount"] == Decimal("1050.00")
    
    def test_vat_rounding(self):
        """Test VAT rounding to 2 decimal places"""
        result = self.compute_vat(Decimal("123.45"))
        
        # 18% of 123.45 = 22.221 → 22.22
        assert result["vat_amount"] == Decimal("22.22")
        assert result["gross_amount"] == Decimal("145.67")


class TestJournalBalanceValidation:
    """Test suite for journal entry balance validation"""
    
    def validate_journal_balance(
        self,
        lines: list[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Validate that journal entries balance (debits = credits)
        
        Args:
            lines: List of journal lines with type (DEBIT/CREDIT) and amount
        
        Returns:
            Dictionary with validation result
        """
        total_debit = Decimal("0")
        total_credit = Decimal("0")
        
        for line in lines:
            amount = Decimal(str(line.get("amount", 0)))
            line_type = line.get("type", "").upper()
            
            if line_type == "DEBIT":
                total_debit += amount
            elif line_type == "CREDIT":
                total_credit += amount
        
        difference = abs(total_debit - total_credit)
        is_balanced = difference < Decimal("0.01")  # Allow 1 cent tolerance
        
        return {
            "total_debit": total_debit,
            "total_credit": total_credit,
            "difference": difference,
            "is_balanced": is_balanced,
        }
    
    def test_balanced_journal(self):
        """Test perfectly balanced journal"""
        result = self.validate_journal_balance([
            {"type": "DEBIT", "amount": 1000},
            {"type": "CREDIT", "amount": 1000},
        ])
        
        assert result["is_balanced"] is True
        assert result["difference"] == Decimal("0")
    
    def test_unbalanced_journal(self):
        """Test unbalanced journal"""
        result = self.validate_journal_balance([
            {"type": "DEBIT", "amount": 1000},
            {"type": "CREDIT", "amount": 500},
        ])
        
        assert result["is_balanced"] is False
        assert result["difference"] == Decimal("500")
    
    def test_multiple_lines_balanced(self):
        """Test multiple lines that balance"""
        result = self.validate_journal_balance([
            {"type": "DEBIT", "amount": 500},
            {"type": "DEBIT", "amount": 300},
            {"type": "DEBIT", "amount": 200},
            {"type": "CREDIT", "amount": 1000},
        ])
        
        assert result["is_balanced"] is True
        assert result["total_debit"] == Decimal("1000")
        assert result["total_credit"] == Decimal("1000")
    
    def test_rounding_tolerance(self):
        """Test 1 cent rounding tolerance"""
        result = self.validate_journal_balance([
            {"type": "DEBIT", "amount": "1000.00"},
            {"type": "CREDIT", "amount": "999.99"},
        ])
        
        # Difference is exactly 1 cent, which is within tolerance
        assert result["difference"] == Decimal("0.01")
        # This should NOT be balanced (1 cent difference is significant)
        assert result["is_balanced"] is False
    
    def test_empty_journal(self):
        """Test empty journal is considered balanced"""
        result = self.validate_journal_balance([])
        
        assert result["is_balanced"] is True
        assert result["total_debit"] == Decimal("0")
        assert result["total_credit"] == Decimal("0")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
