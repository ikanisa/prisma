"""
Corporate Formation Tools
Tools for company formation and structuring
"""
from typing import Dict, Any, List, Optional

def recommend_entity_type(
    jurisdiction: str,
    shareholders: int,
    capital: float,
    liability_protection: bool = True
) -> Dict[str, Any]:
    """
    Recommend optimal legal entity type.

    Args:
        jurisdiction: 'MT', 'RW', 'UK', 'US'
        shareholders: Number of shareholders
        capital: Initial capital amount
        liability_protection: Whether limited liability is required

    Returns:
        Recommendation
    """
    recommendation = "Unknown"
    reasoning = []

    if jurisdiction == "MT":
        if liability_protection:
            recommendation = "Private Limited Liability Company (Ltd)"
            reasoning.append("Standard vehicle for trading in Malta")
            reasoning.append("Offers limited liability protection")
            if capital < 1165:
                reasoning.append("Note: Minimum share capital is €1,165")
        else:
            recommendation = "General Partnership (En Nom Collectif)"

    elif jurisdiction == "RW":
        if liability_protection:
            recommendation = "Private Limited Company (Ltd)"
            reasoning.append("Most common for business in Rwanda")
            reasoning.append("No minimum capital requirement (though nominal amount usually issued)")
        else:
            recommendation = "Sole Proprietorship"

    else:
        recommendation = "Private Limited Company (Generic)"
        reasoning.append("Standard limited liability entity")

    return {
        "jurisdiction": jurisdiction,
        "recommended_entity": recommendation,
        "reasoning": reasoning,
        "requirements": {
            "min_shareholders": 1,
            "min_directors": 1,
            "local_office_required": True
        }
    }

def prepare_formation_docs(
    entity_type: str,
    company_name: str,
    directors: List[str],
    shareholders: List[str]
) -> Dict[str, Any]:
    """
    Generate list of required formation documents.

    Args:
        entity_type: Type of entity
        company_name: Proposed name
        directors: List of director names
        shareholders: List of shareholder names

    Returns:
        Document package
    """
    docs = []

    # Standard documents
    docs.append({
        "name": "Memorandum of Association",
        "status": "Draft",
        "signatories": shareholders
    })

    docs.append({
        "name": "Articles of Association",
        "status": "Draft",
        "signatories": shareholders
    })

    docs.append({
        "name": "Form K (Director Consent)",
        "status": "Pending Signature",
        "signatories": directors
    })

    docs.append({
        "name": "BO Form (Beneficial Owner Declaration)",
        "status": "Pending Information",
        "signatories": ["Company Secretary/Director"]
    })

    return {
        "company_name": company_name,
        "entity_type": entity_type,
        "document_package": docs,
        "next_steps": [
            "Sign all documents",
            "Deposit share capital",
            "Submit to Business Registry"
        ]
    }
