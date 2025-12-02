"""
Audit Risk Assessment Tools
Tools for ISA 315 and ISA 240 risk assessment
"""
from typing import Dict, Any, List, Optional

def assess_inherent_risk(
    account_balance: str,
    complexity: str,
    subjectivity: str,
    change_factor: str
) -> Dict[str, Any]:
    """
    Assess inherent risk for an account balance or assertion.

    Args:
        account_balance: Name of account (e.g., 'Revenue')
        complexity: 'low', 'medium', 'high'
        subjectivity: 'low', 'medium', 'high' (estimation uncertainty)
        change_factor: 'none', 'system_change', 'reg_change'

    Returns:
        Risk assessment
    """
    score = 0
    factors = []

    # Complexity scoring
    if complexity == "high":
        score += 3
        factors.append("Complex processing or calculations")
    elif complexity == "medium":
        score += 2
    else:
        score += 1

    # Subjectivity scoring
    if subjectivity == "high":
        score += 3
        factors.append("High estimation uncertainty/judgment")
    elif subjectivity == "medium":
        score += 2
    else:
        score += 1

    # Change factor
    if change_factor != "none":
        score += 2
        factors.append(f"Significant change: {change_factor}")

    # Determine level
    if score >= 7:
        level = "Significant Risk"
    elif score >= 5:
        level = "High"
    elif score >= 3:
        level = "Medium"
    else:
        level = "Low"

    return {
        "account": account_balance,
        "risk_score": score,
        "inherent_risk_level": level,
        "is_significant_risk": level == "Significant Risk",
        "risk_factors": factors,
        "audit_implication": "Requires special audit consideration" if level == "Significant Risk" else "Standard audit procedures"
    }

def evaluate_control_risk(
    control_design: str,
    control_implementation: str,
    previous_failures: bool = False
) -> Dict[str, Any]:
    """
    Evaluate control risk based on design and implementation.

    Args:
        control_design: 'effective', 'deficient', 'material_weakness'
        control_implementation: 'implemented', 'not_implemented'
        previous_failures: Whether control failed in past

    Returns:
        Control risk assessment
    """
    if control_design != "effective":
        return {
            "control_risk": "High",
            "reliance_strategy": "Substantive approach only",
            "deficiency_note": f"Control design issue: {control_design}"
        }

    if control_implementation == "not_implemented":
        return {
            "control_risk": "High",
            "reliance_strategy": "Substantive approach only",
            "deficiency_note": "Control designed but not implemented"
        }

    if previous_failures:
        return {
            "control_risk": "Medium",
            "reliance_strategy": "Limited reliance / Test of controls required",
            "deficiency_note": "History of control failures"
        }

    return {
        "control_risk": "Low",
        "reliance_strategy": "Combined approach (Test of controls + Substantive)",
        "deficiency_note": "None"
    }

def analyze_fraud_indicators(
    journal_entries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Analyze journal entries for fraud risk indicators (ISA 240).

    Args:
        journal_entries: List of JE details

    Returns:
        Fraud risk analysis
    """
    flags = []

    for entry in journal_entries:
        desc = entry.get("description", "").lower()
        user = entry.get("user", "").lower()
        time = entry.get("time", "")
        amount = entry.get("amount", 0)

        # Indicator 1: Round numbers
        if amount % 1000 == 0 and amount > 10000:
            flags.append({
                "entry_id": entry.get("id"),
                "indicator": "Large round number",
                "risk": "Potential estimation or fabrication"
            })

        # Indicator 2: Unusual time (weekends/nights)
        # Simplified check
        if "sunday" in time.lower() or "saturday" in time.lower():
            flags.append({
                "entry_id": entry.get("id"),
                "indicator": "Weekend posting",
                "risk": "Unusual posting time"
            })

        # Indicator 3: Manual adjustments to revenue
        if "revenue" in desc and "adjust" in desc:
            flags.append({
                "entry_id": entry.get("id"),
                "indicator": "Revenue adjustment",
                "risk": "Potential revenue recognition fraud"
            })

    risk_level = "Low"
    if len(flags) > 5:
        risk_level = "High"
    elif len(flags) > 0:
        risk_level = "Medium"

    return {
        "total_entries_analyzed": len(journal_entries),
        "flagged_entries_count": len(flags),
        "overall_fraud_risk": risk_level,
        "indicators_found": flags
    }
