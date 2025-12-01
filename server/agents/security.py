"""
Agent Security Module
Security controls for AI agent operations including access control,
PII detection, and data residency checks.
"""
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import re
import logging
import hashlib

logger = logging.getLogger(__name__)


class AccessLevel(Enum):
    """Agent access levels"""
    PUBLIC = "public"
    ORG = "org"
    TEAM = "team"
    PRIVATE = "private"


class PIIType(Enum):
    """Types of personally identifiable information"""
    EMAIL = "email"
    PHONE = "phone"
    SSN = "ssn"
    NATIONAL_ID = "national_id"
    CREDIT_CARD = "credit_card"
    PASSPORT = "passport"
    DATE_OF_BIRTH = "date_of_birth"
    ADDRESS = "address"
    NAME = "name"
    TAX_ID = "tax_id"


@dataclass
class PIIDetectionResult:
    """Result of PII detection scan"""
    contains_pii: bool
    detected_types: List[PIIType]
    masked_text: str
    original_positions: Dict[str, List[tuple]]
    confidence: float


@dataclass
class AccessCheckResult:
    """Result of access control check"""
    allowed: bool
    reason: str
    required_level: AccessLevel
    user_level: AccessLevel
    additional_requirements: List[str] = field(default_factory=list)


# PII Detection Patterns
PII_PATTERNS = {
    PIIType.EMAIL: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    PIIType.PHONE: r'\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}\b',
    PIIType.SSN: r'\b\d{3}[-]?\d{2}[-]?\d{4}\b',
    PIIType.CREDIT_CARD: r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
    PIIType.PASSPORT: r'\b[A-Z]{1,2}[0-9]{6,9}\b',
    PIIType.TAX_ID: r'\b\d{2}[-]?\d{7}\b',  # EIN format
    PIIType.DATE_OF_BIRTH: r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',
}


class AgentSecurityService:
    """
    Security service for AI agent operations.
    
    Provides:
    - Org-level access controls
    - PII detection and masking
    - Data residency checks
    - Request validation
    """
    
    def __init__(self):
        self._data_residency_rules: Dict[str, Set[str]] = {}
        self._org_access_cache: Dict[str, Dict[str, Any]] = {}
    
    def check_org_access(
        self,
        user_id: str,
        org_id: str,
        agent_id: str,
        action: str = "execute",
    ) -> AccessCheckResult:
        """
        Check if user has access to execute an agent in an organization.
        
        Args:
            user_id: User ID
            org_id: Organization ID
            agent_id: Agent ID
            action: Action being performed (execute, configure, delete)
            
        Returns:
            AccessCheckResult with access decision
        """
        # In production, this would query the database
        # For now, implement basic role-based checks
        
        action_requirements = {
            "execute": AccessLevel.ORG,
            "configure": AccessLevel.TEAM,
            "delete": AccessLevel.PRIVATE,
            "view": AccessLevel.PUBLIC,
        }
        
        required_level = action_requirements.get(action, AccessLevel.ORG)
        
        # Check if user is member of org (would query memberships table)
        # Simplified for now
        user_level = AccessLevel.ORG  # Default for authenticated users
        
        allowed = self._compare_access_levels(user_level, required_level)
        
        additional = []
        if action in ("configure", "delete"):
            additional.append("manager_approval_required")
        if agent_id.startswith("tax-"):
            additional.append("professional_certification_recommended")
        
        return AccessCheckResult(
            allowed=allowed,
            reason="Access granted" if allowed else "Insufficient privileges",
            required_level=required_level,
            user_level=user_level,
            additional_requirements=additional,
        )
    
    def _compare_access_levels(self, user_level: AccessLevel, required_level: AccessLevel) -> bool:
        """Compare access levels"""
        level_order = {
            AccessLevel.PUBLIC: 0,
            AccessLevel.ORG: 1,
            AccessLevel.TEAM: 2,
            AccessLevel.PRIVATE: 3,
        }
        return level_order.get(user_level, 0) >= level_order.get(required_level, 0)
    
    def detect_pii(
        self,
        text: str,
        types_to_detect: Optional[List[PIIType]] = None,
    ) -> PIIDetectionResult:
        """
        Detect PII in text.
        
        Args:
            text: Text to scan for PII
            types_to_detect: Specific PII types to detect (all if None)
            
        Returns:
            PIIDetectionResult with detection details
        """
        if types_to_detect is None:
            types_to_detect = list(PII_PATTERNS.keys())
        
        detected_types = []
        positions: Dict[str, List[tuple]] = {}
        masked_text = text
        
        for pii_type in types_to_detect:
            pattern = PII_PATTERNS.get(pii_type)
            if not pattern:
                continue
            
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            if matches:
                detected_types.append(pii_type)
                positions[pii_type.value] = [(m.start(), m.end()) for m in matches]
                
                # Mask the PII
                for match in reversed(matches):  # Reverse to preserve positions
                    masked_value = self._mask_value(match.group(), pii_type)
                    masked_text = masked_text[:match.start()] + masked_value + masked_text[match.end():]
        
        contains_pii = len(detected_types) > 0
        confidence = 0.9 if contains_pii else 0.95  # High confidence either way
        
        return PIIDetectionResult(
            contains_pii=contains_pii,
            detected_types=detected_types,
            masked_text=masked_text,
            original_positions=positions,
            confidence=confidence,
        )
    
    def _mask_value(self, value: str, pii_type: PIIType) -> str:
        """Mask a PII value"""
        if pii_type == PIIType.EMAIL:
            parts = value.split('@')
            if len(parts) == 2:
                username = parts[0]
                # Handle short usernames (1-2 chars)
                if len(username) <= 2:
                    return f"***@{parts[1]}"
                return f"{username[0]}***@{parts[1]}"
        elif pii_type == PIIType.PHONE:
            return re.sub(r'\d', '*', value[:-4]) + value[-4:]
        elif pii_type in (PIIType.SSN, PIIType.TAX_ID):
            return "***-**-" + value[-4:]
        elif pii_type == PIIType.CREDIT_CARD:
            return "**** **** **** " + value[-4:]
        
        # Default: mask middle portion
        if len(value) > 4:
            return value[0:2] + '*' * (len(value) - 4) + value[-2:]
        return '*' * len(value)
    
    def mask_pii(self, text: str) -> str:
        """
        Mask all PII in text.
        
        Args:
            text: Text containing potential PII
            
        Returns:
            Text with PII masked
        """
        result = self.detect_pii(text)
        return result.masked_text
    
    def check_data_residency(
        self,
        org_id: str,
        data_type: str,
        target_region: str,
    ) -> Dict[str, Any]:
        """
        Check data residency compliance.
        
        Args:
            org_id: Organization ID
            data_type: Type of data (personal, financial, tax, audit)
            target_region: Region where data would be processed
            
        Returns:
            Compliance check result
        """
        # Define residency rules by data type
        data_residency_requirements = {
            "personal": ["EU", "LOCAL"],  # GDPR requires EU or local processing
            "financial": ["LOCAL", "TREATY"],  # Financial data often requires local
            "tax": ["LOCAL"],  # Tax data typically must stay local
            "audit": ["LOCAL", "EU", "US"],  # Audit data more flexible
        }
        
        allowed_regions = data_residency_requirements.get(data_type, ["LOCAL"])
        
        is_compliant = (
            target_region in allowed_regions or
            target_region == "LOCAL" or
            (target_region == "EU" and "EU" in allowed_regions)
        )
        
        return {
            "compliant": is_compliant,
            "data_type": data_type,
            "target_region": target_region,
            "allowed_regions": allowed_regions,
            "recommendation": (
                "Processing allowed" if is_compliant
                else f"Consider processing in: {', '.join(allowed_regions)}"
            ),
            "regulatory_notes": self._get_regulatory_notes(data_type, target_region),
        }
    
    def _get_regulatory_notes(self, data_type: str, region: str) -> List[str]:
        """Get regulatory notes for data type and region"""
        notes = []
        
        if data_type == "personal":
            notes.append("GDPR applies for EU personal data")
            if region not in ("EU", "LOCAL"):
                notes.append("Standard contractual clauses may be required")
        
        if data_type == "tax":
            notes.append("Tax data subject to local tax authority jurisdiction")
            notes.append("Consider professional secrecy obligations")
        
        if data_type == "financial":
            notes.append("Financial data subject to banking secrecy laws")
        
        return notes
    
    def validate_agent_request(
        self,
        request: Dict[str, Any],
        org_id: str,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        Validate an agent execution request.
        
        Performs comprehensive validation including:
        - Access control check
        - PII detection
        - Input sanitization
        - Rate limit check (placeholder)
        
        Args:
            request: Agent execution request
            org_id: Organization ID
            user_id: User ID
            
        Returns:
            Validation result
        """
        validations = {
            "access_check": None,
            "pii_check": None,
            "input_validation": None,
            "is_valid": True,
            "errors": [],
            "warnings": [],
        }
        
        # Access control check
        agent_id = request.get("agent_id", "")
        access_result = self.check_org_access(user_id, org_id, agent_id)
        validations["access_check"] = {
            "allowed": access_result.allowed,
            "reason": access_result.reason,
        }
        if not access_result.allowed:
            validations["is_valid"] = False
            validations["errors"].append(access_result.reason)
        
        # PII check on input
        input_text = request.get("input_text", "") or request.get("query", "")
        if input_text:
            pii_result = self.detect_pii(input_text)
            validations["pii_check"] = {
                "contains_pii": pii_result.contains_pii,
                "detected_types": [t.value for t in pii_result.detected_types],
            }
            if pii_result.contains_pii:
                validations["warnings"].append(
                    f"Input contains PII: {', '.join(t.value for t in pii_result.detected_types)}"
                )
        
        # Input validation
        validations["input_validation"] = self._validate_input(request)
        if not validations["input_validation"]["valid"]:
            validations["is_valid"] = False
            validations["errors"].extend(validations["input_validation"]["errors"])
        
        return validations
    
    def _validate_input(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Validate input parameters"""
        errors = []
        
        # Check required fields
        if not request.get("agent_id") and not request.get("query"):
            errors.append("Either agent_id or query is required")
        
        # Check input length
        input_text = request.get("input_text", "") or request.get("query", "")
        if len(input_text) > 100000:  # 100KB limit
            errors.append("Input text exceeds maximum length")
        
        # Check for potential injection
        suspicious_patterns = [
            r'<script[^>]*>',
            r'javascript:',
            r'on\w+\s*=',
        ]
        for pattern in suspicious_patterns:
            if re.search(pattern, input_text, re.IGNORECASE):
                errors.append("Input contains potentially unsafe content")
                break
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
        }
    
    def hash_for_audit(self, data: str) -> str:
        """Create a hash of data for audit trail"""
        return hashlib.sha256(data.encode()).hexdigest()


# Singleton instance
_security_service: Optional[AgentSecurityService] = None


def get_security_service() -> AgentSecurityService:
    """Get the global security service instance"""
    global _security_service
    if _security_service is None:
        _security_service = AgentSecurityService()
    return _security_service
