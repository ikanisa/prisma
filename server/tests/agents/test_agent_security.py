"""
Agent Security Tests
Tests for agent security controls including PII detection, access control, and data residency.
"""
import pytest
from server.agents.security import (
    AgentSecurityService,
    get_security_service,
    PIIType,
    AccessLevel,
)


class TestPIIDetection:
    """Test suite for PII detection"""
    
    def setup_method(self):
        self.security = get_security_service()
    
    def test_detect_email(self):
        """Test email detection"""
        text = "Contact me at john.doe@example.com for more info."
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.EMAIL in result.detected_types
        assert "@example.com" not in result.masked_text or "j***@" in result.masked_text
    
    def test_detect_phone(self):
        """Test phone number detection"""
        text = "Call me at 555-123-4567 or (555) 123-4567"
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.PHONE in result.detected_types
    
    def test_detect_ssn(self):
        """Test SSN detection"""
        text = "My SSN is 123-45-6789"
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.SSN in result.detected_types
        assert "123-45-6789" not in result.masked_text
    
    def test_detect_credit_card(self):
        """Test credit card detection"""
        text = "Card number: 4111-1111-1111-1111"
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.CREDIT_CARD in result.detected_types
        # Last 4 digits should be preserved
        assert "1111" in result.masked_text
    
    def test_detect_tax_id(self):
        """Test tax ID/EIN detection"""
        text = "EIN: 12-3456789"
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.TAX_ID in result.detected_types
    
    def test_no_pii_detected(self):
        """Test text without PII"""
        text = "This is a normal business query about tax rates in Malta."
        result = self.security.detect_pii(text)
        
        assert not result.contains_pii
        assert len(result.detected_types) == 0
        assert result.masked_text == text
    
    def test_multiple_pii_types(self):
        """Test detection of multiple PII types"""
        text = "Contact john@example.com at 555-123-4567. SSN: 123-45-6789"
        result = self.security.detect_pii(text)
        
        assert result.contains_pii
        assert PIIType.EMAIL in result.detected_types
        assert PIIType.PHONE in result.detected_types
        assert PIIType.SSN in result.detected_types
    
    def test_selective_pii_detection(self):
        """Test detecting only specific PII types"""
        text = "Email: john@example.com, Phone: 555-123-4567"
        result = self.security.detect_pii(text, types_to_detect=[PIIType.EMAIL])
        
        assert result.contains_pii
        assert PIIType.EMAIL in result.detected_types
        assert PIIType.PHONE not in result.detected_types
    
    def test_mask_pii(self):
        """Test PII masking convenience method"""
        text = "Email: john@example.com"
        masked = self.security.mask_pii(text)
        
        assert "john@example.com" not in masked
        assert "@example.com" in masked


class TestAccessControl:
    """Test suite for access control"""
    
    def setup_method(self):
        self.security = get_security_service()
    
    def test_execute_access_granted(self):
        """Test execute action access granted"""
        result = self.security.check_org_access(
            user_id="user-1",
            org_id="org-1",
            agent_id="tax-corp-mt-003",
            action="execute"
        )
        
        assert result.allowed
        assert result.required_level == AccessLevel.ORG
    
    def test_view_access_granted(self):
        """Test view action access granted"""
        result = self.security.check_org_access(
            user_id="user-1",
            org_id="org-1",
            agent_id="tax-corp-mt-003",
            action="view"
        )
        
        assert result.allowed
        assert result.required_level == AccessLevel.PUBLIC
    
    def test_configure_requires_team_level(self):
        """Test configure action requires team level"""
        result = self.security.check_org_access(
            user_id="user-1",
            org_id="org-1",
            agent_id="tax-corp-mt-003",
            action="configure"
        )
        
        assert result.required_level == AccessLevel.TEAM
        assert "manager_approval_required" in result.additional_requirements
    
    def test_tax_agent_professional_certification(self):
        """Test tax agent includes certification recommendation"""
        result = self.security.check_org_access(
            user_id="user-1",
            org_id="org-1",
            agent_id="tax-corp-mt-003",
            action="execute"
        )
        
        assert "professional_certification_recommended" in result.additional_requirements


class TestDataResidency:
    """Test suite for data residency checks"""
    
    def setup_method(self):
        self.security = get_security_service()
    
    def test_personal_data_eu_compliant(self):
        """Test personal data in EU is compliant"""
        result = self.security.check_data_residency(
            org_id="org-1",
            data_type="personal",
            target_region="EU"
        )
        
        assert result["compliant"]
    
    def test_personal_data_outside_eu(self):
        """Test personal data outside EU requires checks"""
        result = self.security.check_data_residency(
            org_id="org-1",
            data_type="personal",
            target_region="US"
        )
        
        # May require standard contractual clauses
        assert any("contractual" in note.lower() for note in result["regulatory_notes"])
    
    def test_tax_data_local_required(self):
        """Test tax data should stay local"""
        result = self.security.check_data_residency(
            org_id="org-1",
            data_type="tax",
            target_region="EU"
        )
        
        # Tax data may require local processing
        assert "LOCAL" in result["allowed_regions"]
    
    def test_audit_data_more_flexible(self):
        """Test audit data has more flexibility"""
        result = self.security.check_data_residency(
            org_id="org-1",
            data_type="audit",
            target_region="US"
        )
        
        # Audit data allows US processing
        assert "US" in result["allowed_regions"]


class TestRequestValidation:
    """Test suite for request validation"""
    
    def setup_method(self):
        self.security = get_security_service()
    
    def test_valid_request(self):
        """Test validation of valid request"""
        request = {
            "agent_id": "tax-corp-mt-003",
            "input_text": "What is the corporate tax rate in Malta?"
        }
        
        result = self.security.validate_agent_request(
            request=request,
            org_id="org-1",
            user_id="user-1"
        )
        
        assert result["is_valid"]
        assert len(result["errors"]) == 0
    
    def test_request_with_pii_warning(self):
        """Test request with PII generates warning"""
        request = {
            "agent_id": "tax-corp-mt-003",
            "input_text": "Tax advice for john@example.com"
        }
        
        result = self.security.validate_agent_request(
            request=request,
            org_id="org-1",
            user_id="user-1"
        )
        
        assert result["pii_check"]["contains_pii"]
        assert len(result["warnings"]) > 0
    
    def test_empty_request_invalid(self):
        """Test empty request is invalid"""
        request = {}
        
        result = self.security.validate_agent_request(
            request=request,
            org_id="org-1",
            user_id="user-1"
        )
        
        assert not result["is_valid"]
        assert len(result["errors"]) > 0
    
    def test_script_injection_blocked(self):
        """Test script injection is blocked"""
        request = {
            "agent_id": "tax-corp-mt-003",
            "input_text": "<script>alert('xss')</script> tax question"
        }
        
        result = self.security.validate_agent_request(
            request=request,
            org_id="org-1",
            user_id="user-1"
        )
        
        assert not result["is_valid"]
        assert any("unsafe" in err.lower() for err in result["errors"])


class TestHashForAudit:
    """Test audit hashing functionality"""
    
    def setup_method(self):
        self.security = get_security_service()
    
    def test_consistent_hashing(self):
        """Test hashing is consistent"""
        data = "sensitive tax information"
        hash1 = self.security.hash_for_audit(data)
        hash2 = self.security.hash_for_audit(data)
        
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 hex length
    
    def test_different_data_different_hash(self):
        """Test different data produces different hash"""
        hash1 = self.security.hash_for_audit("data1")
        hash2 = self.security.hash_for_audit("data2")
        
        assert hash1 != hash2
