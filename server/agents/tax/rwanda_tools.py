"""
Rwanda Tax Tools
Specialized tax calculators and tools for Rwanda corporate tax.
"""
from typing import Dict, Any, List, Optional
from decimal import Decimal
from dataclasses import dataclass
from datetime import date
import logging

logger = logging.getLogger(__name__)

# Rwanda tax rates and thresholds
RWANDA_CORPORATE_TAX_RATE = Decimal("0.30")  # 30%
RWANDA_SME_TAX_RATE = Decimal("0.20")  # 20% for registered SMEs
RWANDA_MICRO_TAX_RATE = Decimal("0.03")  # 3% turnover tax for micro enterprises
RWANDA_WHT_DIVIDENDS = Decimal("0.15")  # 15% WHT on dividends
RWANDA_WHT_INTEREST = Decimal("0.15")  # 15% WHT on interest
RWANDA_WHT_ROYALTIES = Decimal("0.15")  # 15% WHT on royalties
RWANDA_WHT_SERVICES = Decimal("0.15")  # 15% WHT on services to non-residents
RWANDA_VAT_RATE = Decimal("0.18")  # 18% VAT
RWANDA_MICRO_THRESHOLD = Decimal("12000000")  # RWF 12M micro enterprise threshold
RWANDA_SME_THRESHOLD = Decimal("50000000")  # RWF 50M SME threshold
RWANDA_THIN_CAP_RATIO = Decimal("4")  # 4:1 debt-to-equity ratio
INFINITE_RATIO = Decimal("Infinity")  # Used when equity is zero


@dataclass
class RwandaTaxResult:
    """Result from Rwanda tax calculation"""
    taxable_income: Decimal
    corporate_tax: Decimal
    effective_rate: Decimal
    tax_category: str
    incentives_applied: List[str]
    notes: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "taxable_income": str(self.taxable_income),
            "corporate_tax": str(self.corporate_tax),
            "effective_rate": f"{self.effective_rate:.2%}",
            "tax_category": self.tax_category,
            "incentives_applied": self.incentives_applied,
            "notes": self.notes,
        }


def calculate_rwanda_corporate_tax(
    income: Decimal,
    turnover: Optional[Decimal] = None,
    is_registered_sme: bool = False,
    is_priority_sector: bool = False,
    sector: Optional[str] = None,
    years_in_operation: int = 0,
    export_percentage: Decimal = Decimal("0"),
) -> RwandaTaxResult:
    """
    Calculate Rwanda corporate tax with applicable incentives.
    
    Args:
        income: Taxable income in RWF
        turnover: Annual turnover in RWF (for enterprise classification)
        is_registered_sme: Whether registered as SME with RDB
        is_priority_sector: Whether in priority sector (ICT, manufacturing, etc.)
        sector: Specific sector (agriculture, energy, export, ict, manufacturing)
        years_in_operation: Years since incorporation
        export_percentage: Percentage of revenue from exports (0-1)
        
    Returns:
        RwandaTaxResult with tax calculation details
    """
    income = Decimal(str(income))
    turnover = Decimal(str(turnover)) if turnover else income
    notes = []
    incentives_applied = []
    
    # Determine tax category
    if turnover <= RWANDA_MICRO_THRESHOLD:
        tax_category = "micro_enterprise"
        tax_rate = RWANDA_MICRO_TAX_RATE
        corporate_tax = turnover * tax_rate
        notes.append(f"Micro enterprise turnover tax: 3% on turnover")
    elif is_registered_sme or turnover <= RWANDA_SME_THRESHOLD:
        tax_category = "sme"
        tax_rate = RWANDA_SME_TAX_RATE
        corporate_tax = income * tax_rate
        notes.append(f"SME rate: 20% on taxable income")
    else:
        tax_category = "standard"
        tax_rate = RWANDA_CORPORATE_TAX_RATE
        corporate_tax = income * tax_rate
        notes.append(f"Standard corporate tax rate: 30%")
    
    # Apply sector-specific incentives
    if sector == "export" and export_percentage >= Decimal("0.50"):
        # Export incentive: 15% rate for exporters
        tax_rate = Decimal("0.15")
        corporate_tax = income * tax_rate
        incentives_applied.append("Export incentive: 15% rate")
        notes.append("Preferential 15% rate for exports >50% of turnover")
    
    if sector == "agriculture" and years_in_operation <= 5:
        # Agriculture new investment incentive
        tax_rate = Decimal("0")
        corporate_tax = Decimal("0")
        incentives_applied.append("Agriculture tax holiday")
        notes.append("5-year tax holiday for agricultural investments")
    
    if sector == "ict" and is_priority_sector:
        # ICT priority sector incentive
        tax_rate = Decimal("0.15")
        corporate_tax = income * tax_rate
        incentives_applied.append("ICT priority sector: 15% rate")
        notes.append("Preferential 15% rate for registered ICT companies")
    
    if sector == "manufacturing" and is_priority_sector:
        # Manufacturing incentive
        if years_in_operation <= 7:
            tax_rate = Decimal("0.15")
            corporate_tax = income * tax_rate
            incentives_applied.append("Manufacturing incentive: 15% rate")
            notes.append("Preferential 15% rate for manufacturing (first 7 years)")
    
    if sector == "energy" and is_priority_sector:
        # Energy sector incentive
        tax_rate = Decimal("0")
        corporate_tax = Decimal("0")
        incentives_applied.append("Energy sector tax holiday")
        notes.append("Tax holiday for licensed energy producers")
    
    effective_rate = tax_rate
    
    return RwandaTaxResult(
        taxable_income=income,
        corporate_tax=corporate_tax,
        effective_rate=effective_rate,
        tax_category=tax_category,
        incentives_applied=incentives_applied,
        notes=notes,
    )


def check_eac_compliance(
    transaction_type: str,
    counterparty_country: str,
    transaction_value: Decimal,
) -> Dict[str, Any]:
    """
    Check East African Community (EAC) tax compliance.
    
    EAC member states: Burundi, DR Congo, Kenya, Rwanda, South Sudan, Tanzania, Uganda
    
    Args:
        transaction_type: Type of transaction (goods, services, investment)
        counterparty_country: Country code of counterparty
        transaction_value: Transaction value in RWF
        
    Returns:
        EAC compliance check results
    """
    eac_members = {"BI", "CD", "KE", "RW", "SS", "TZ", "UG"}
    is_eac_transaction = counterparty_country.upper() in eac_members
    
    result = {
        "is_eac_transaction": is_eac_transaction,
        "counterparty_country": counterparty_country,
        "eac_benefits": [],
        "compliance_requirements": [],
        "notes": [],
    }
    
    if is_eac_transaction:
        result["eac_benefits"].append("Zero-rated customs duties on qualifying goods")
        result["eac_benefits"].append("Mutual recognition of tax residency certificates")
        result["eac_benefits"].append("Harmonized VAT treatment")
        
        if transaction_type == "goods":
            result["compliance_requirements"].append("Certificate of Origin required")
            result["compliance_requirements"].append("EAC simplified customs procedures")
            result["notes"].append("Goods traded within EAC benefit from common external tariff")
        
        if transaction_type == "services":
            result["compliance_requirements"].append("Service provider registration may be required")
            result["notes"].append("EAC service liberalization protocols apply")
        
        if transaction_type == "investment":
            result["eac_benefits"].append("EAC investment facilitation framework")
            result["notes"].append("Consider EAC investment promotion and protection protocols")
    else:
        result["notes"].append("Standard Rwanda tax treatment applies for non-EAC transactions")
        result["compliance_requirements"].append("Standard transfer pricing documentation")
        if transaction_type == "services":
            result["notes"].append("15% WHT on services to non-residents applies")
    
    return result


def calculate_thin_capitalization(
    debt: Decimal,
    equity: Decimal,
    interest_expense: Decimal,
) -> Dict[str, Any]:
    """
    Calculate Rwanda thin capitalization limits.
    
    Rwanda applies a 4:1 debt-to-equity ratio for interest deduction.
    
    Args:
        debt: Total debt from related parties in RWF
        equity: Total equity in RWF
        interest_expense: Interest expense on related party debt in RWF
        
    Returns:
        Thin capitalization calculation results
    """
    debt = Decimal(str(debt))
    equity = Decimal(str(equity))
    interest_expense = Decimal(str(interest_expense))
    
    # Calculate actual debt-to-equity ratio
    if equity > 0:
        actual_ratio = debt / equity
    else:
        actual_ratio = INFINITE_RATIO
    
    # Maximum allowed debt under 4:1 ratio
    max_allowed_debt = equity * RWANDA_THIN_CAP_RATIO
    
    # Calculate excess debt
    excess_debt = max(Decimal("0"), debt - max_allowed_debt)
    
    # Calculate disallowed interest
    if debt > 0:
        disallowed_percentage = excess_debt / debt
        disallowed_interest = interest_expense * disallowed_percentage
    else:
        disallowed_percentage = Decimal("0")
        disallowed_interest = Decimal("0")
    
    allowed_interest = interest_expense - disallowed_interest
    
    return {
        "debt": str(debt),
        "equity": str(equity),
        "actual_ratio": f"{actual_ratio:.2f}:1",
        "allowed_ratio": "4:1",
        "max_allowed_debt": str(max_allowed_debt),
        "excess_debt": str(excess_debt),
        "interest_expense": str(interest_expense),
        "allowed_interest": str(allowed_interest),
        "disallowed_interest": str(disallowed_interest),
        "is_compliant": actual_ratio <= RWANDA_THIN_CAP_RATIO,
        "notes": [
            "Rwanda applies 4:1 debt-to-equity ratio for related party debt",
            "Excess interest is not deductible for tax purposes",
            "Consider restructuring if ratio exceeded",
        ],
    }


def calculate_rwanda_withholding_tax(
    payment_type: str,
    amount: Decimal,
    recipient_resident: bool = False,
    treaty_country: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calculate Rwanda withholding tax on payments.
    
    Args:
        payment_type: Type of payment (dividends, interest, royalties, services, rent)
        amount: Payment amount in RWF
        recipient_resident: Whether recipient is Rwanda resident
        treaty_country: Country code if tax treaty applies
        
    Returns:
        Withholding tax calculation
    """
    amount = Decimal(str(amount))
    
    # Standard WHT rates for non-residents
    wht_rates = {
        "dividends": Decimal("0.15"),
        "interest": Decimal("0.15"),
        "royalties": Decimal("0.15"),
        "services": Decimal("0.15"),
        "rent": Decimal("0.15"),
        "management_fees": Decimal("0.15"),
    }
    
    # Resident rates (reduced or exempt)
    resident_rates = {
        "dividends": Decimal("0.15"),  # 15% for residents too
        "interest": Decimal("0.15"),
        "royalties": Decimal("0.15"),
        "services": Decimal("0"),  # Generally no WHT for residents
        "rent": Decimal("0.15"),
        "management_fees": Decimal("0"),
    }
    
    # Treaty rates (examples for key treaties)
    treaty_rates = {
        "MU": {  # Mauritius
            "dividends": Decimal("0.10"),
            "interest": Decimal("0.10"),
            "royalties": Decimal("0.10"),
        },
        "ZA": {  # South Africa
            "dividends": Decimal("0.10"),
            "interest": Decimal("0.10"),
            "royalties": Decimal("0.10"),
        },
        "BE": {  # Belgium
            "dividends": Decimal("0.15"),
            "interest": Decimal("0.10"),
            "royalties": Decimal("0.10"),
        },
    }
    
    # Determine applicable rate
    if recipient_resident:
        rate = resident_rates.get(payment_type, Decimal("0.15"))
        rate_source = "Resident rate"
    elif treaty_country and treaty_country.upper() in treaty_rates:
        treaty = treaty_rates[treaty_country.upper()]
        rate = treaty.get(payment_type, wht_rates.get(payment_type, Decimal("0.15")))
        rate_source = f"Treaty rate ({treaty_country})"
    else:
        rate = wht_rates.get(payment_type, Decimal("0.15"))
        rate_source = "Standard non-resident rate"
    
    wht_amount = amount * rate
    net_amount = amount - wht_amount
    
    return {
        "gross_amount": str(amount),
        "payment_type": payment_type,
        "wht_rate": f"{rate:.0%}",
        "wht_amount": str(wht_amount),
        "net_amount": str(net_amount),
        "rate_source": rate_source,
        "recipient_resident": recipient_resident,
        "notes": [
            f"WHT rate: {rate:.0%}",
            "WHT must be remitted to RRA by 15th of following month",
            "Obtain tax clearance certificate for treaty benefits",
        ],
    }


def get_rwanda_investment_incentives() -> Dict[str, Any]:
    """
    Get overview of Rwanda investment incentives.
    """
    return {
        "corporate_tax_incentives": {
            "standard_rate": "30%",
            "sme_rate": "20%",
            "export_rate": "15% (for 50%+ exports)",
            "priority_sectors": "15% for ICT, manufacturing, tourism",
            "special_economic_zones": "0% for 10 years",
            "tax_holidays": "Up to 7 years for strategic investments",
        },
        "investment_certificate_benefits": {
            "import_duty_exemption": "Exemption on capital goods, raw materials",
            "vat_exemption": "Zero-rating on project inputs",
            "accelerated_depreciation": "50% in first year",
            "loss_carry_forward": "5 years",
        },
        "priority_sectors": [
            "ICT and Innovation",
            "Manufacturing",
            "Energy",
            "Agriculture and Agro-processing",
            "Tourism",
            "Mining",
            "Real Estate and Construction",
            "Financial Services",
        ],
        "special_economic_zones": {
            "kigali_sez": "Full tax exemption for 10 years",
            "benefits": [
                "Corporate tax exemption",
                "Import duty exemption",
                "VAT exemption on inputs",
                "One-stop-shop services",
            ],
        },
        "registration": {
            "authority": "Rwanda Development Board (RDB)",
            "process": "Online application via RDB portal",
            "timeline": "48 hours for company registration",
        },
    }


# Tool definitions for agent integration
RWANDA_TOOLS = [
    {
        "name": "calculate_rwanda_corporate_tax",
        "description": "Calculate Rwanda corporate tax with sector incentives. Standard rate 30%, SME rate 20%, priority sectors 15%.",
        "parameters": {
            "type": "object",
            "properties": {
                "income": {"type": "number", "description": "Taxable income in RWF"},
                "turnover": {"type": "number", "description": "Annual turnover in RWF"},
                "is_registered_sme": {"type": "boolean", "description": "Registered SME status"},
                "is_priority_sector": {"type": "boolean", "description": "Priority sector status"},
                "sector": {
                    "type": "string",
                    "enum": ["agriculture", "energy", "export", "ict", "manufacturing"],
                    "description": "Business sector",
                },
                "years_in_operation": {"type": "integer", "description": "Years since incorporation"},
                "export_percentage": {"type": "number", "description": "Export revenue percentage (0-1)"},
            },
            "required": ["income"],
        },
    },
    {
        "name": "check_eac_compliance",
        "description": "Check East African Community tax compliance for cross-border transactions.",
        "parameters": {
            "type": "object",
            "properties": {
                "transaction_type": {
                    "type": "string",
                    "enum": ["goods", "services", "investment"],
                    "description": "Type of transaction",
                },
                "counterparty_country": {"type": "string", "description": "Country code"},
                "transaction_value": {"type": "number", "description": "Transaction value in RWF"},
            },
            "required": ["transaction_type", "counterparty_country", "transaction_value"],
        },
    },
    {
        "name": "calculate_thin_capitalization",
        "description": "Calculate Rwanda thin capitalization limits. 4:1 debt-to-equity ratio applies.",
        "parameters": {
            "type": "object",
            "properties": {
                "debt": {"type": "number", "description": "Related party debt in RWF"},
                "equity": {"type": "number", "description": "Total equity in RWF"},
                "interest_expense": {"type": "number", "description": "Interest expense in RWF"},
            },
            "required": ["debt", "equity", "interest_expense"],
        },
    },
    {
        "name": "calculate_rwanda_withholding_tax",
        "description": "Calculate Rwanda WHT on dividends, interest, royalties, and services.",
        "parameters": {
            "type": "object",
            "properties": {
                "payment_type": {
                    "type": "string",
                    "enum": ["dividends", "interest", "royalties", "services", "rent", "management_fees"],
                    "description": "Payment type",
                },
                "amount": {"type": "number", "description": "Payment amount in RWF"},
                "recipient_resident": {"type": "boolean", "description": "Is recipient Rwanda resident"},
                "treaty_country": {"type": "string", "description": "Treaty country code if applicable"},
            },
            "required": ["payment_type", "amount"],
        },
    },
]
