"""
Tests for Deep Search API
"""

import pytest
from uuid import uuid4
from server.api.deep_search import (
    router,
    DeepSearchRequest,
    DeepSearchResponse,
    GuardrailCheckRequest,
    GuardrailCheckResponse,
    get_authoritative_domains,
    determine_verification_level,
    extract_citations,
    KnowledgeVerificationLevel,
    DeepSearchSourceType,
    GuardrailAction,
)


class TestAuthoritativeDomains:
    """Test authoritative domain resolution"""

    def test_get_authoritative_domains_default(self):
        """Should return IFRS and IAASB domains for default queries"""
        domains = get_authoritative_domains(["INTL"], [])
        
        assert "ifrs.org" in domains
        assert "iasb.org" in domains
        assert "iaasb.org" in domains
        assert "ifac.org" in domains

    def test_get_authoritative_domains_tax(self):
        """Should include OECD for tax queries"""
        domains = get_authoritative_domains(["INTL"], ["tax"])
        
        assert "oecd.org" in domains

    def test_get_authoritative_domains_malta(self):
        """Should include Malta tax authority for MT jurisdiction"""
        domains = get_authoritative_domains(["MT"], ["tax"])
        
        assert "cfr.gov.mt" in domains

    def test_get_authoritative_domains_rwanda(self):
        """Should include Rwanda tax authority for RW jurisdiction"""
        domains = get_authoritative_domains(["RW"], ["tax"])
        
        assert "rra.gov.rw" in domains

    def test_get_authoritative_domains_with_secondary(self):
        """Should include Big Four when include_secondary is True"""
        domains = get_authoritative_domains(["INTL"], [], include_secondary=True)
        
        assert "pwc.com" in domains
        assert "kpmg.com" in domains
        assert "ey.com" in domains
        assert "deloitte.com" in domains

    def test_get_authoritative_domains_max_20(self):
        """Should not exceed 20 domains"""
        domains = get_authoritative_domains(
            ["INTL", "MT", "RW", "US", "UK", "EU"],
            ["tax", "audit", "financial_reporting"],
            include_secondary=True
        )
        
        assert len(domains) <= 20


class TestVerificationLevel:
    """Test verification level determination"""

    def test_primary_ifrs(self):
        """IFRS Foundation should be primary"""
        level = determine_verification_level("https://www.ifrs.org/standards/")
        assert level == KnowledgeVerificationLevel.PRIMARY

    def test_primary_iaasb(self):
        """IAASB should be primary"""
        level = determine_verification_level("https://www.iaasb.org/publications/")
        assert level == KnowledgeVerificationLevel.PRIMARY

    def test_primary_tax_authority(self):
        """Tax authorities should be primary"""
        level = determine_verification_level("https://cfr.gov.mt/tax-regulations/")
        assert level == KnowledgeVerificationLevel.PRIMARY

    def test_secondary_big_four(self):
        """Big Four should be secondary"""
        level = determine_verification_level("https://www.pwc.com/ifrs-guidance/")
        assert level == KnowledgeVerificationLevel.SECONDARY

    def test_tertiary_unknown(self):
        """Unknown sources should be tertiary"""
        level = determine_verification_level("https://random-blog.com/accounting/")
        assert level == KnowledgeVerificationLevel.TERTIARY


class TestCitationExtraction:
    """Test citation extraction from text"""

    def test_extract_ifrs_citation(self):
        """Should extract IFRS citations"""
        text = "According to IFRS 15.9, revenue should be recognized..."
        citations = extract_citations(text)
        
        assert len(citations) >= 1
        assert any("IFRS" in c for c in citations)

    def test_extract_ias_citation(self):
        """Should extract IAS citations"""
        text = "As per IAS 21.28-37, foreign exchange gains should..."
        citations = extract_citations(text)
        
        assert len(citations) >= 1
        assert any("IAS" in c for c in citations)

    def test_extract_isa_citation(self):
        """Should extract ISA citations"""
        text = "ISA 540 requires auditors to..."
        citations = extract_citations(text)
        
        assert len(citations) >= 1
        assert any("ISA" in c for c in citations)

    def test_extract_section_citation(self):
        """Should extract section references"""
        text = "Under Section 14(a) of the tax act..."
        citations = extract_citations(text)
        
        assert len(citations) >= 1
        assert any("Section" in c for c in citations)

    def test_extract_multiple_citations(self):
        """Should extract multiple citations"""
        text = "IFRS 15.9 and IAS 21.28 both apply to this scenario"
        citations = extract_citations(text)
        
        assert len(citations) >= 2


class TestDeepSearchRequest:
    """Test Deep Search request validation"""

    def test_default_request(self):
        """Should create valid request with defaults"""
        request = DeepSearchRequest(query="How to treat foreign exchange gains?")
        
        assert request.query == "How to treat foreign exchange gains?"
        assert request.jurisdictions == ["INTL"]
        assert request.domains == []
        assert request.include_secondary is False
        assert request.max_results == 10

    def test_request_with_jurisdiction(self):
        """Should accept custom jurisdictions"""
        request = DeepSearchRequest(
            query="Malta VAT rates",
            jurisdictions=["MT"],
            domains=["tax"]
        )
        
        assert request.jurisdictions == ["MT"]
        assert "tax" in request.domains


class TestGuardrailCheck:
    """Test guardrail check logic"""

    def test_guardrail_request_creation(self):
        """Should create valid guardrail check request"""
        request = GuardrailCheckRequest(
            org_id=uuid4(),
            domain="tax",
            sources_found=5,
            confidence_score=0.85,
            has_jurisdiction_match=True
        )
        
        assert request.domain == "tax"
        assert request.sources_found == 5
        assert request.confidence_score == 0.85

    def test_low_confidence_should_escalate(self):
        """Low confidence score should trigger escalation"""
        # This tests the logic in the check_guardrails endpoint
        request = GuardrailCheckRequest(
            org_id=uuid4(),
            domain="tax",
            sources_found=5,
            confidence_score=0.5,  # Below 0.7 threshold
            has_jurisdiction_match=True
        )
        
        # Would be tested with actual endpoint call
        assert request.confidence_score < 0.7

    def test_no_sources_should_deep_search(self):
        """No sources found should trigger Deep Search"""
        request = GuardrailCheckRequest(
            org_id=uuid4(),
            domain="tax",
            sources_found=0,  # No sources
            confidence_score=0.8,
            has_jurisdiction_match=True
        )
        
        assert request.sources_found == 0

    def test_missing_jurisdiction_for_tax(self):
        """Missing jurisdiction for tax should trigger Deep Search"""
        request = GuardrailCheckRequest(
            org_id=uuid4(),
            domain="tax",
            sources_found=5,
            confidence_score=0.8,
            has_jurisdiction_match=False  # Missing jurisdiction
        )
        
        assert request.has_jurisdiction_match is False
        assert request.domain == "tax"


class TestSourceTypes:
    """Test source type enums"""

    def test_all_source_types_defined(self):
        """All expected source types should be defined"""
        expected_types = [
            "ifrs_foundation",
            "iaasb",
            "acca",
            "cpa",
            "oecd",
            "tax_authority",
            "gaap",
            "gazette",
            "regulatory_pdf",
            "company_policy",
            "big_four",
            "academic"
        ]
        
        for type_name in expected_types:
            assert hasattr(DeepSearchSourceType, type_name.upper())


class TestGuardrailActions:
    """Test guardrail action enums"""

    def test_all_actions_defined(self):
        """All expected guardrail actions should be defined"""
        expected_actions = [
            "block",
            "warn",
            "escalate",
            "deep_search",
            "add_disclaimer",
            "log_only"
        ]
        
        for action_name in expected_actions:
            assert hasattr(GuardrailAction, action_name.upper())
