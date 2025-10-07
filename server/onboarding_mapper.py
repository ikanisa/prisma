from __future__ import annotations

from collections.abc import Iterable as IterableCollection
from typing import Any, Dict, Iterable, List, Tuple

Classification = str
Profile = Dict[str, Any]
ProvenanceEntry = Dict[str, Any]
TaskSeed = Dict[str, Any]

_FIELD_MAP: Dict[Classification, Dict[str, str]] = {
    "INCORP_CERT": {
        "company_name": "legalName",
        "reg_no": "registrationNumber",
        "inc_date": "incorporationDate",
        "registered_address": "registeredAddress",
    },
    "VAT_CERT": {
        "vat_number": "vatNumber",
        "effective_date": "vatEffectiveDate",
    },
    "TB": {
        "period_start": "trialBalancePeriodStart",
        "period_end": "trialBalancePeriodEnd",
        "currency": "baseCurrency",
        "total_debits": "trialBalanceTotalDebits",
        "total_credits": "trialBalanceTotalCredits",
    },
    "BANK_STMT": {
        "iban": "bankAccountIban",
        "bank_name": "bankName",
        "period_start": "bankStatementStart",
        "period_end": "bankStatementEnd",
        "opening_balance": "bankOpeningBalance",
        "closing_balance": "bankClosingBalance",
    },
    "PAYROLL_SUMMARY": {
        "employer_reg_no": "payrollEmployerNumber",
        "period": "payrollPeriod",
        "gross_pay": "payrollGrossPay",
        "tax_withheld": "payrollTaxWithheld",
        "ssc": "payrollSocialSecurity",
    },
    "FS": {
        "fy_start": "financialYearStart",
        "fy_end": "financialYearEnd",
        "auditor": "priorAuditor",
        "opinion": "priorAuditOpinion",
    },
}

_TASK_MAP: Dict[Classification, List[TaskSeed]] = {
    "BANK_STMT": [
        {
            "title": "Run bank reconciliation",
            "category": "Accounting Close",
            "source": "BANK_STMT",
        }
    ],
    "TB": [
        {
            "title": "Load opening trial balance",
            "category": "Accounting Close",
            "source": "TB",
        }
    ],
    "FS": [
        {
            "title": "Review prior financial statements",
            "category": "Accounting Close",
            "source": "FS",
        }
    ],
    "PAYROLL_SUMMARY": [
        {
            "title": "Verify payroll registrations",
            "category": "Payroll",
            "source": "PAYROLL_SUMMARY",
        }
    ],
    "VAT_CERT": [
        {
            "title": "Confirm VAT registration",
            "category": "Tax",
            "source": "VAT_CERT",
        }
    ],
}


def map_document_fields(
    classification: str,
    fields: Dict[str, Any],
    *,
    document_id: str,
    extraction_id: str | None = None,
) -> Tuple[Profile, Dict[str, List[ProvenanceEntry]], List[TaskSeed]]:
    profile_updates: Profile = {}
    provenance: Dict[str, List[ProvenanceEntry]] = {}
    normalised_classification = (classification or "OTHER").strip().upper()
    field_map = _FIELD_MAP.get(normalised_classification, {})

    for source_field, target_field in field_map.items():
        value = fields.get(source_field)
        if value in (None, ""):
            continue
        profile_updates[target_field] = value
        provenance.setdefault(target_field, []).append(
            {
                "documentId": document_id,
                "extractionId": extraction_id,
                "sourceField": source_field,
                "classification": normalised_classification,
            }
        )

    # Capture list-valued directors/shareholders from incorporation docs
    if normalised_classification == "INCORP_CERT":
        for key, target in (("directors", "directors"), ("shareholders", "shareholders")):
            value = fields.get(key)
            if isinstance(value, IterableCollection) and not isinstance(value, (str, bytes)):
                profile_updates[target] = list(value)
                provenance.setdefault(target, []).append(
                    {
                        "documentId": document_id,
                        "extractionId": extraction_id,
                        "sourceField": key,
                        "classification": normalised_classification,
                    }
                )

    task_seeds = list(_TASK_MAP.get(normalised_classification, []))
    return profile_updates, provenance, task_seeds
