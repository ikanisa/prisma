"""
Deep Search Pipeline for AI Agent Knowledge Retrieval

Implements the Deep Search layer that queries authoritative sources:
- IFRS Foundation
- IAASB (International Auditing and Assurance Standards Board)
- ACCA/CPA study texts
- OECD tax guides
- National Revenue Authorities
- Local GAAP documents
- National gazettes and public statutes

The Deep Search is triggered when:
- Standard is updated
- Jurisdiction is missing
- Conflicts exist
- Recent tax changes occur
- Sources are older than 30 days
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum
import asyncio
from dataclasses import dataclass

router = APIRouter(prefix="/api/v1/deep-search", tags=["deep-search"])


class KnowledgeStandardType(str, Enum):
    """Standard/Document types for knowledge classification"""
    IFRS = "IFRS"  # International Financial Reporting Standards
    IAS = "IAS"  # International Accounting Standards
    IFRIC = "IFRIC"  # IFRS Interpretations Committee
    ISA = "ISA"  # International Standards on Auditing
    GAAP = "GAAP"  # Generally Accepted Accounting Principles
    TAX_LAW = "TAX_LAW"  # Tax legislation
    ACCA = "ACCA"  # ACCA study materials
    CPA = "CPA"  # CPA materials
    OECD = "OECD"  # OECD guidelines
    INTERNAL = "INTERNAL"  # Company-specific internal policies
    SECONDARY = "SECONDARY"  # Big Four summaries
    REGULATORY = "REGULATORY"  # National regulatory publications
    CASE_STUDY = "CASE_STUDY"  # Worked examples
    TEMPLATE = "TEMPLATE"  # Standard templates
    CALCULATOR = "CALCULATOR"  # Formula models


class KnowledgeVerificationLevel(str, Enum):
    """Verification levels for source priority"""
    PRIMARY = "primary"  # Authoritative primary sources
    SECONDARY = "secondary"  # Interpretation materials
    TERTIARY = "tertiary"  # Internal policies, templates


class KnowledgeSourcePriority(str, Enum):
    """Source priority for conflict resolution"""
    AUTHORITATIVE = "authoritative"  # Cannot be overridden
    REGULATORY = "regulatory"  # Local law overrides global in tax
    INTERPRETIVE = "interpretive"  # Can be cited but not final authority
    SUPPLEMENTARY = "supplementary"  # Background/context only


class DeepSearchSourceType(str, Enum):
    """Deep Search source types"""
    IFRS_FOUNDATION = "ifrs_foundation"
    IAASB = "iaasb"
    ACCA = "acca"
    CPA = "cpa"
    OECD = "oecd"
    TAX_AUTHORITY = "tax_authority"
    GAAP = "gaap"
    GAZETTE = "gazette"
    REGULATORY_PDF = "regulatory_pdf"
    COMPANY_POLICY = "company_policy"
    BIG_FOUR = "big_four"
    ACADEMIC = "academic"


class GuardrailAction(str, Enum):
    """Actions to take when guardrails are violated"""
    BLOCK = "block"
    WARN = "warn"
    ESCALATE = "escalate"
    DEEP_SEARCH = "deep_search"
    ADD_DISCLAIMER = "add_disclaimer"
    LOG_ONLY = "log_only"


# Pydantic Models
class DeepSearchRequest(BaseModel):
    """Request for Deep Search"""
    query: str = Field(..., description="Search query")
    jurisdictions: List[str] = Field(default=["INTL"], description="Jurisdictions to search")
    domains: List[str] = Field(default=[], description="Domains to search (audit, tax, etc.)")
    source_types: Optional[List[DeepSearchSourceType]] = Field(None, description="Specific source types")
    include_secondary: bool = Field(False, description="Include secondary sources")
    max_results: int = Field(10, ge=1, le=50, description="Maximum results to return")


class DeepSearchResult(BaseModel):
    """Individual Deep Search result"""
    source_id: str
    source_name: str
    source_type: DeepSearchSourceType
    verification_level: KnowledgeVerificationLevel
    content: str
    url: Optional[str] = None
    citations: List[str] = Field(default_factory=list)
    relevance_score: float
    is_from_cache: bool = False
    cached_at: Optional[datetime] = None


class DeepSearchResponse(BaseModel):
    """Deep Search response"""
    results: List[DeepSearchResult]
    total_results: int
    sources_queried: List[str]
    has_authoritative_sources: bool
    requires_update: bool
    meta: Dict[str, Any]


class GuardrailCheckRequest(BaseModel):
    """Request to check guardrails"""
    org_id: UUID
    domain: str
    sources_found: int
    confidence_score: float
    has_jurisdiction_match: bool = True
    max_source_age_days: Optional[int] = None


class GuardrailCheckResponse(BaseModel):
    """Guardrail check response"""
    all_passed: bool
    results: List[Dict[str, Any]]
    actions: List[GuardrailAction]
    should_trigger_deep_search: bool
    requires_escalation: bool
    disclaimers: List[str]


class ReasoningStep(BaseModel):
    """A step in the agent's reasoning process"""
    step: int
    action: str
    result: Optional[str] = None
    chunks: List[str] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateReasoningTraceRequest(BaseModel):
    """Request to log a reasoning trace"""
    agent_id: UUID
    query_text: str
    reasoning_steps: List[ReasoningStep]
    sources_consulted: List[UUID] = Field(default_factory=list)
    final_answer: Optional[str] = None
    citations: List[Dict[str, str]] = Field(default_factory=list)
    confidence_score: Optional[float] = None
    deep_search_triggered: bool = False
    guardrails_triggered: List[UUID] = Field(default_factory=list)
    guardrail_actions: List[GuardrailAction] = Field(default_factory=list)


# Authoritative domains configuration
AUTHORITATIVE_DOMAINS = {
    "primary": {
        "ifrs": ["ifrs.org", "iasb.org"],
        "iaasb": ["iaasb.org", "ifac.org"],
        "oecd": ["oecd.org"],
        "tax_authorities": {
            "RW": ["rra.gov.rw"],
            "MT": ["cfr.gov.mt", "mfsa.mt"],
            "US": ["irs.gov"],
            "UK": ["gov.uk/hmrc"],
            "EU": ["ec.europa.eu/taxation_customs"],
        },
    },
    "secondary": {
        "acca": ["accaglobal.com"],
        "cpa": ["cpacanada.ca", "aicpa.org"],
        "big_four": ["pwc.com", "kpmg.com", "ey.com", "deloitte.com"],
    },
}


def get_authoritative_domains(
    jurisdictions: List[str],
    domains: List[str],
    include_secondary: bool = False
) -> List[str]:
    """Get authoritative domains for given jurisdictions and domains"""
    auth_domains = []

    # Always include IFRS/IAASB for accounting/audit
    if not domains or "financial_reporting" in domains or "audit" in domains:
        auth_domains.extend(AUTHORITATIVE_DOMAINS["primary"]["ifrs"])
        auth_domains.extend(AUTHORITATIVE_DOMAINS["primary"]["iaasb"])

    # Include OECD for tax
    if not domains or "tax" in domains:
        auth_domains.extend(AUTHORITATIVE_DOMAINS["primary"]["oecd"])

    # Add jurisdiction-specific tax authorities
    for jurisdiction in jurisdictions:
        tax_auth = AUTHORITATIVE_DOMAINS["primary"]["tax_authorities"].get(jurisdiction)
        if tax_auth:
            auth_domains.extend(tax_auth)

    # Include secondary sources if requested
    if include_secondary:
        auth_domains.extend(AUTHORITATIVE_DOMAINS["secondary"]["acca"])
        auth_domains.extend(AUTHORITATIVE_DOMAINS["secondary"]["cpa"])
        auth_domains.extend(AUTHORITATIVE_DOMAINS["secondary"]["big_four"])

    # Ensure max 20 domains (OpenAI limit) and unique
    return list(set(auth_domains))[:20]


def determine_verification_level(url: str) -> KnowledgeVerificationLevel:
    """Determine verification level based on URL"""
    lower_url = url.lower()

    # Check primary sources
    for source_type, domains in AUTHORITATIVE_DOMAINS["primary"].items():
        if isinstance(domains, list):
            if any(d in lower_url for d in domains):
                return KnowledgeVerificationLevel.PRIMARY
        elif isinstance(domains, dict):
            for jurisdiction_domains in domains.values():
                if any(d in lower_url for d in jurisdiction_domains):
                    return KnowledgeVerificationLevel.PRIMARY

    # Check secondary sources
    for domains in AUTHORITATIVE_DOMAINS["secondary"].values():
        if any(d in lower_url for d in domains):
            return KnowledgeVerificationLevel.SECONDARY

    return KnowledgeVerificationLevel.TERTIARY


def extract_citations(text: str) -> List[str]:
    """Extract citations from text (e.g., 'IAS 21.28-37', 'IFRS 15.9')"""
    import re

    citations = []
    patterns = [
        r"\b(IAS|IFRS|ISA|IFRIC)\s+\d+(?:\.\d+(?:-\d+)?)?",
        r"\bSection\s+\d+(?:\([a-z]\))?",
        r"\bArticle\s+\d+(?:\.\d+)?",
        r"\bParagraph\s+\d+(?:\.\d+)?",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        citations.extend(matches)

    return list(set(citations))


@router.post("/search", response_model=DeepSearchResponse)
async def perform_deep_search(request: DeepSearchRequest):
    """
    Perform Deep Search across authoritative sources.
    
    The Deep Search layer is triggered when:
    - Standard is updated
    - Jurisdiction is missing
    - Conflicts exist
    - Recent tax changes occur
    - Sources are older than 30 days
    """
    import time
    start_time = time.time()
    
    results: List[DeepSearchResult] = []
    sources_queried = []
    primary_source_count = 0
    secondary_source_count = 0

    # Get authoritative domains for search
    allowed_domains = get_authoritative_domains(
        request.jurisdictions,
        request.domains,
        request.include_secondary
    )

    # Mock results for now - in production this would:
    # 1. Query web search with domain restrictions
    # 2. Query internal CKB
    # 3. Merge and rank results

    # Mock primary source result
    if "INTL" in request.jurisdictions or not request.jurisdictions:
        results.append(DeepSearchResult(
            source_id="ifrs-foundation-1",
            source_name="IFRS Foundation",
            source_type=DeepSearchSourceType.IFRS_FOUNDATION,
            verification_level=KnowledgeVerificationLevel.PRIMARY,
            content=f"Mock IFRS content for query: {request.query}",
            url="https://www.ifrs.org/issued-standards/",
            citations=["IFRS 15.9", "IAS 21.28-37"],
            relevance_score=0.95,
            is_from_cache=False,
        ))
        sources_queried.append("ifrs.org")
        primary_source_count += 1

    # Add jurisdiction-specific results
    for jurisdiction in request.jurisdictions:
        if jurisdiction == "MT":
            results.append(DeepSearchResult(
                source_id="cfr-malta-1",
                source_name="Commissioner for Revenue Malta",
                source_type=DeepSearchSourceType.TAX_AUTHORITY,
                verification_level=KnowledgeVerificationLevel.PRIMARY,
                content=f"Malta tax law content for: {request.query}",
                url="https://cfr.gov.mt",
                citations=["Section 14(a)"],
                relevance_score=0.88,
                is_from_cache=False,
            ))
            sources_queried.append("cfr.gov.mt")
            primary_source_count += 1

        elif jurisdiction == "RW":
            results.append(DeepSearchResult(
                source_id="rra-rwanda-1",
                source_name="Rwanda Revenue Authority",
                source_type=DeepSearchSourceType.TAX_AUTHORITY,
                verification_level=KnowledgeVerificationLevel.PRIMARY,
                content=f"Rwanda tax content for: {request.query}",
                url="https://www.rra.gov.rw",
                citations=["Article 14"],
                relevance_score=0.85,
                is_from_cache=False,
            ))
            sources_queried.append("rra.gov.rw")
            primary_source_count += 1

    # Add secondary sources if requested
    if request.include_secondary:
        results.append(DeepSearchResult(
            source_id="pwc-insight-1",
            source_name="PwC Insights",
            source_type=DeepSearchSourceType.BIG_FOUR,
            verification_level=KnowledgeVerificationLevel.SECONDARY,
            content=f"PwC interpretation for: {request.query}",
            url="https://www.pwc.com",
            citations=[],
            relevance_score=0.82,
            is_from_cache=False,
        ))
        sources_queried.append("pwc.com")
        secondary_source_count += 1

    # Sort by verification level then relevance
    results.sort(key=lambda r: (
        0 if r.verification_level == KnowledgeVerificationLevel.PRIMARY else (
            1 if r.verification_level == KnowledgeVerificationLevel.SECONDARY else 2
        ),
        -r.relevance_score
    ))

    # Limit results
    results = results[:request.max_results]

    query_time = int((time.time() - start_time) * 1000)

    return DeepSearchResponse(
        results=results,
        total_results=len(results),
        sources_queried=list(set(sources_queried)),
        has_authoritative_sources=primary_source_count > 0,
        requires_update=primary_source_count == 0 and secondary_source_count > 0,
        meta={
            "query_time_ms": query_time,
            "cache_hit_rate": 0.0,
            "primary_source_count": primary_source_count,
            "secondary_source_count": secondary_source_count,
            "allowed_domains": allowed_domains,
        }
    )


@router.post("/check-guardrails", response_model=GuardrailCheckResponse)
async def check_guardrails(request: GuardrailCheckRequest):
    """
    Check retrieval guardrails before agent response.
    
    Guardrails ensure:
    - Sources match the question
    - Source conflicts are handled
    - Jurisdiction requirements are verified
    - Outdated info is flagged
    - Citations are included
    """
    results = []
    actions = []
    disclaimers = []
    should_trigger_deep_search = False
    requires_escalation = False

    # Check: No sources found
    if request.sources_found == 0:
        results.append({
            "guardrail": "no_sources",
            "passed": False,
            "action": "deep_search",
            "reason": "No sources found in knowledge base",
        })
        actions.append(GuardrailAction.DEEP_SEARCH)
        should_trigger_deep_search = True

    # Check: Missing jurisdiction
    if not request.has_jurisdiction_match and request.domain == "tax":
        results.append({
            "guardrail": "jurisdiction_check",
            "passed": False,
            "action": "deep_search",
            "reason": "Missing jurisdiction-specific tax information",
        })
        actions.append(GuardrailAction.DEEP_SEARCH)
        should_trigger_deep_search = True

    # Check: Low confidence
    if request.confidence_score < 0.7:
        results.append({
            "guardrail": "confidence_threshold",
            "passed": False,
            "action": "escalate",
            "reason": f"Confidence score {request.confidence_score:.2f} below threshold 0.7",
        })
        actions.append(GuardrailAction.ESCALATE)
        requires_escalation = True

    # Check: Outdated sources
    if request.max_source_age_days and request.max_source_age_days > 30:
        results.append({
            "guardrail": "outdated_check",
            "passed": False,
            "action": "deep_search",
            "reason": f"Sources may be outdated ({request.max_source_age_days} days old)",
        })
        actions.append(GuardrailAction.DEEP_SEARCH)
        should_trigger_deep_search = True

    # Add default passed checks
    if not results:
        results.append({
            "guardrail": "all_checks",
            "passed": True,
            "action": None,
            "reason": "All guardrails passed",
        })

    return GuardrailCheckResponse(
        all_passed=all(r.get("passed", False) for r in results),
        results=results,
        actions=list(set(actions)),
        should_trigger_deep_search=should_trigger_deep_search,
        requires_escalation=requires_escalation,
        disclaimers=disclaimers,
    )


@router.post("/log-reasoning-trace")
async def log_reasoning_trace(
    org_id: UUID = Query(..., description="Organization ID"),
    request: CreateReasoningTraceRequest = ...,
):
    """
    Log a reasoning trace for audit purposes.
    
    Reasoning traces are hidden from users but visible for auditing.
    They capture:
    - Query information
    - Sources consulted
    - Reasoning steps
    - Citations generated
    - Guardrails evaluated
    """
    # In production, this would insert into agent_reasoning_traces table
    trace_id = str(UUID(int=0))  # Mock UUID

    return {
        "trace_id": trace_id,
        "status": "logged",
        "requires_review": request.confidence_score is not None and request.confidence_score < 0.7,
        "deep_search_triggered": request.deep_search_triggered,
        "guardrails_triggered_count": len(request.guardrails_triggered),
    }


@router.get("/sources", response_model=List[Dict[str, Any]])
async def list_deep_search_sources(
    source_type: Optional[DeepSearchSourceType] = Query(None),
    verification_level: Optional[KnowledgeVerificationLevel] = Query(None),
    jurisdiction: Optional[str] = Query(None),
):
    """
    List configured Deep Search sources.
    """
    # Mock sources - in production these would come from deep_search_sources table
    sources = [
        {
            "id": "1",
            "name": "IFRS Foundation",
            "source_type": DeepSearchSourceType.IFRS_FOUNDATION,
            "base_url": "https://www.ifrs.org",
            "verification_level": KnowledgeVerificationLevel.PRIMARY,
            "source_priority": KnowledgeSourcePriority.AUTHORITATIVE,
            "jurisdictions": ["INTL"],
            "domains": ["financial_reporting"],
            "trust_score": 1.0,
            "is_active": True,
        },
        {
            "id": "2",
            "name": "IAASB",
            "source_type": DeepSearchSourceType.IAASB,
            "base_url": "https://www.iaasb.org",
            "verification_level": KnowledgeVerificationLevel.PRIMARY,
            "source_priority": KnowledgeSourcePriority.AUTHORITATIVE,
            "jurisdictions": ["INTL"],
            "domains": ["audit"],
            "trust_score": 1.0,
            "is_active": True,
        },
        {
            "id": "3",
            "name": "Commissioner for Revenue Malta",
            "source_type": DeepSearchSourceType.TAX_AUTHORITY,
            "base_url": "https://cfr.gov.mt",
            "verification_level": KnowledgeVerificationLevel.PRIMARY,
            "source_priority": KnowledgeSourcePriority.REGULATORY,
            "jurisdictions": ["MT"],
            "domains": ["tax"],
            "trust_score": 1.0,
            "is_active": True,
        },
        {
            "id": "4",
            "name": "Rwanda Revenue Authority",
            "source_type": DeepSearchSourceType.TAX_AUTHORITY,
            "base_url": "https://www.rra.gov.rw",
            "verification_level": KnowledgeVerificationLevel.PRIMARY,
            "source_priority": KnowledgeSourcePriority.REGULATORY,
            "jurisdictions": ["RW"],
            "domains": ["tax"],
            "trust_score": 1.0,
            "is_active": True,
        },
        {
            "id": "5",
            "name": "ACCA Resources",
            "source_type": DeepSearchSourceType.ACCA,
            "base_url": "https://www.accaglobal.com",
            "verification_level": KnowledgeVerificationLevel.SECONDARY,
            "source_priority": KnowledgeSourcePriority.INTERPRETIVE,
            "jurisdictions": ["INTL"],
            "domains": ["audit", "financial_reporting", "tax"],
            "trust_score": 0.9,
            "is_active": True,
        },
    ]

    # Apply filters
    if source_type:
        sources = [s for s in sources if s["source_type"] == source_type]
    if verification_level:
        sources = [s for s in sources if s["verification_level"] == verification_level]
    if jurisdiction:
        sources = [s for s in sources if jurisdiction in s["jurisdictions"]]

    return sources


@router.get("/stats")
async def get_knowledge_stats(org_id: UUID = Query(...)):
    """
    Get knowledge base statistics.
    """
    # Mock stats - in production these would come from database
    return {
        "total_entries": 150,
        "by_standard_type": {
            "IFRS": 45,
            "IAS": 38,
            "ISA": 35,
            "TAX_LAW": 20,
            "INTERNAL": 12,
        },
        "by_verification_level": {
            "primary": 100,
            "secondary": 40,
            "tertiary": 10,
        },
        "by_domain": {
            "financial_reporting": 80,
            "audit": 35,
            "tax": 30,
            "compliance": 5,
        },
        "outdated_count": 5,
        "pending_review_count": 3,
    }
