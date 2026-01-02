"""
Security and Compliance Layer for AI Agents
Handles access control, PII detection, and data classification
"""
from typing import Dict, Any, Optional, List
import re
import structlog

logger = structlog.get_logger().bind(component="agent_security")


# PII Detection Patterns
PII_PATTERNS = {
    "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
    "phone": r'\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b',
    "ssn": r'\b\d{3}-\d{2}-\d{4}\b',
    "credit_card": r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
    "passport": r'\b[A-Z]{1,2}\d{6,9}\b',
    "ip_address": r'\b(?:\d{1,3}\.){3}\d{1,3}\b',
}


class AgentSecurity:
    """Security controls for agent execution"""

    def __init__(self, org_id: str, user_id: str):
        self.org_id = org_id
        self.user_id = user_id

    def check_access(
        self,
        agent_id: str,
        required_capability: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if user has access to execute agent
        
        P0 FIX: Implements actual RBAC checks against database.
        Queries organization_members to verify user role and permissions.

        Returns:
            {"allowed": bool, "reason": str, "role": str}
        """
        # Role hierarchy (higher index = more permissions)
        ROLE_HIERARCHY = {
            "READONLY": 0,
            "CLIENT": 1,
            "VIEWER": 1,
            "EMPLOYEE": 2,
            "MEMBER": 2,
            "MANAGER": 3,
            "ADMIN": 4,
            "EQR": 4,
            "PARTNER": 5,
            "OWNER": 5,
            "SYSTEM_ADMIN": 6,
            "SERVICE_ACCOUNT": 6,
        }
        
        # Permission requirements for agent capabilities
        CAPABILITY_MIN_ROLE = {
            "agents.execute": "EMPLOYEE",
            "agents.execute.tax": "EMPLOYEE",
            "agents.execute.audit": "EMPLOYEE",
            "agents.execute.accounting": "EMPLOYEE",
            "journals.post": "MANAGER",
            "tax.return.submit": "MANAGER",
            "close.lock": "PARTNER",
            "audit.plan.freeze": "PARTNER",
            "audit.report.release": "PARTNER",
            "eqr.signoff": "EQR",
            "policy.pack.edit": "SYSTEM_ADMIN",
        }
        
        try:
            # Import here to avoid circular imports
            from .supabase_client import get_supabase_client
            
            supabase = get_supabase_client()
            
            # Query organization membership
            result = supabase.table("organization_members").select(
                "role, deleted_at"
            ).eq(
                "user_id", self.user_id
            ).eq(
                "organization_id", self.org_id
            ).is_(
                "deleted_at", "null"
            ).single().execute()
            
            if not result.data:
                logger.warning(
                    "access_denied_not_member",
                    org_id=self.org_id,
                    user_id=self.user_id,
                    agent_id=agent_id
                )
                return {
                    "allowed": False, 
                    "reason": "not_a_member",
                    "role": None
                }
            
            user_role = result.data.get("role", "READONLY")
            user_role_level = ROLE_HIERARCHY.get(user_role, 0)
            
            # Check capability requirement if specified
            if required_capability:
                min_role = CAPABILITY_MIN_ROLE.get(required_capability, "EMPLOYEE")
                min_role_level = ROLE_HIERARCHY.get(min_role, 2)
                
                if user_role_level < min_role_level:
                    logger.warning(
                        "access_denied_insufficient_role",
                        org_id=self.org_id,
                        user_id=self.user_id,
                        agent_id=agent_id,
                        user_role=user_role,
                        required_role=min_role,
                        capability=required_capability
                    )
                    return {
                        "allowed": False,
                        "reason": f"insufficient_role: requires {min_role}, user has {user_role}",
                        "role": user_role
                    }
            
            # Default: require at least EMPLOYEE level for agent execution
            if user_role_level < ROLE_HIERARCHY.get("EMPLOYEE", 2):
                logger.warning(
                    "access_denied_below_employee",
                    org_id=self.org_id,
                    user_id=self.user_id,
                    agent_id=agent_id,
                    user_role=user_role
                )
                return {
                    "allowed": False,
                    "reason": f"insufficient_role: requires EMPLOYEE, user has {user_role}",
                    "role": user_role
                }
            
            logger.info(
                "access_granted",
                org_id=self.org_id,
                user_id=self.user_id,
                agent_id=agent_id,
                role=user_role
            )
            
            return {
                "allowed": True, 
                "reason": "authorized",
                "role": user_role
            }
            
        except Exception as e:
            # Log error but fail closed (deny access on error)
            logger.error(
                "access_check_error",
                org_id=self.org_id,
                user_id=self.user_id,
                agent_id=agent_id,
                error=str(e)
            )
            return {
                "allowed": False,
                "reason": f"access_check_error: {str(e)}",
                "role": None
            }

    def detect_pii(self, text: str) -> Dict[str, Any]:
        """
        Detect PII in text

        Returns:
            {
                "contains_pii": bool,
                "pii_types": List[str],
                "masked_text": str
            }
        """
        pii_found = []
        masked_text = text

        for pii_type, pattern in PII_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                pii_found.append(pii_type)
                # Mask the PII
                masked_text = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", masked_text)

        contains_pii = len(pii_found) > 0

        if contains_pii:
            logger.warning(
                "pii_detected",
                org_id=self.org_id,
                pii_types=pii_found
            )

        return {
            "contains_pii": contains_pii,
            "pii_types": pii_found,
            "masked_text": masked_text
        }

    def classify_data(
        self,
        text: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Classify data sensitivity level

        Returns:
            'public' | 'internal' | 'confidential' | 'restricted'
        """
        # Check for PII
        pii_check = self.detect_pii(text)
        if pii_check["contains_pii"]:
            return "confidential"

        # Check for financial keywords
        financial_keywords = [
            "tax", "revenue", "profit", "loss", "balance sheet",
            "income statement", "financial", "salary", "compensation"
        ]
        if any(keyword in text.lower() for keyword in financial_keywords):
            return "confidential"

        # Check for legal/compliance keywords
        legal_keywords = [
            "contract", "agreement", "litigation", "dispute",
            "confidential", "proprietary", "trade secret"
        ]
        if any(keyword in text.lower() for keyword in legal_keywords):
            return "restricted"

        # Default to internal
        return "internal"

    def sanitize_input(self, text: str) -> str:
        """
        Sanitize user input to prevent injection attacks
        """
        # Remove potentially dangerous characters
        # This is a basic implementation - enhance based on specific needs
        sanitized = text.strip()

        # Limit length
        max_length = 10000
        if len(sanitized) > max_length:
            logger.warning(
                "input_truncated",
                original_length=len(sanitized),
                max_length=max_length
            )
            sanitized = sanitized[:max_length]

        return sanitized

    def validate_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and sanitize context data
        """
        # Ensure org_id matches
        if "org_id" in context and context["org_id"] != self.org_id:
            logger.error(
                "org_id_mismatch",
                expected=self.org_id,
                provided=context["org_id"]
            )
            raise ValueError("Organization ID mismatch")

        # Add security metadata
        validated_context = {
            **context,
            "org_id": self.org_id,
            "user_id": self.user_id,
            "validated_at": "utc_now"
        }

        return validated_context


class DataResidency:
    """Handles data residency requirements"""

    # Data residency rules by jurisdiction
    RESIDENCY_RULES = {
        "MT": {  # Malta
            "allowed_regions": ["eu-west-1", "eu-central-1"],
            "requires_eu_storage": True,
            "gdpr_applicable": True
        },
        "RW": {  # Rwanda
            "allowed_regions": ["af-south-1", "eu-west-1"],
            "requires_local_storage": False,
            "data_protection_act": True
        },
        "EU": {
            "allowed_regions": ["eu-west-1", "eu-central-1", "eu-north-1"],
            "requires_eu_storage": True,
            "gdpr_applicable": True
        }
    }

    @classmethod
    def check_compliance(
        cls,
        jurisdiction: str,
        storage_region: str
    ) -> Dict[str, Any]:
        """
        Check if storage region complies with jurisdiction requirements

        Returns:
            {"compliant": bool, "reason": str, "requirements": dict}
        """
        if jurisdiction not in cls.RESIDENCY_RULES:
            # Unknown jurisdiction - allow but log
            logger.warning(
                "unknown_jurisdiction",
                jurisdiction=jurisdiction
            )
            return {
                "compliant": True,
                "reason": "unknown_jurisdiction_allowed",
                "requirements": {}
            }

        rules = cls.RESIDENCY_RULES[jurisdiction]

        if storage_region not in rules["allowed_regions"]:
            return {
                "compliant": False,
                "reason": f"Storage region {storage_region} not allowed for {jurisdiction}",
                "requirements": rules
            }

        return {
            "compliant": True,
            "reason": "region_allowed",
            "requirements": rules
        }

    @classmethod
    def get_requirements(cls, jurisdiction: str) -> Dict[str, Any]:
        """Get data residency requirements for jurisdiction"""
        return cls.RESIDENCY_RULES.get(jurisdiction, {})


class ComplianceValidator:
    """Validates compliance with regulations"""

    @staticmethod
    def validate_gdpr_compliance(
        data: Dict[str, Any],
        purpose: str
    ) -> Dict[str, bool]:
        """
        Validate GDPR compliance requirements

        Returns:
            {
                "lawful_basis": bool,
                "purpose_limitation": bool,
                "data_minimization": bool,
                "accuracy": bool,
                "storage_limitation": bool,
                "integrity_confidentiality": bool
            }
        """
        # This is a simplified check - real implementation would be more comprehensive
        return {
            "lawful_basis": True,  # Assuming consent/contract
            "purpose_limitation": purpose in ["tax_advice", "audit", "accounting", "corporate_services"],
            "data_minimization": True,  # Assuming only necessary data collected
            "accuracy": True,
            "storage_limitation": True,  # Assuming retention policies in place
            "integrity_confidentiality": True  # Assuming encryption and access controls
        }

    @staticmethod
    def validate_data_protection_act_rw(
        data: Dict[str, Any]
    ) -> Dict[str, bool]:
        """
        Validate Rwanda Data Protection Act compliance

        Returns:
            {
                "consent_obtained": bool,
                "purpose_specified": bool,
                "data_secured": bool,
                "breach_notification_ready": bool
            }
        """
        return {
            "consent_obtained": True,  # Assuming consent mechanism in place
            "purpose_specified": True,
            "data_secured": True,  # Assuming encryption
            "breach_notification_ready": True  # Assuming incident response plan
        }


def create_security_context(
    org_id: str,
    user_id: str,
    agent_id: str,
    input_text: str,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create comprehensive security context for agent execution

    Returns enriched context with security metadata
    """
    security = AgentSecurity(org_id, user_id)

    # Check access
    access_check = security.check_access(agent_id)
    if not access_check["allowed"]:
        raise PermissionError(f"Access denied: {access_check['reason']}")

    # Detect PII
    pii_check = security.detect_pii(input_text)

    # Classify data
    classification = security.classify_data(input_text, context)

    # Sanitize input
    sanitized_input = security.sanitize_input(input_text)

    # Validate context
    validated_context = security.validate_context(context or {})

    # Build security context
    security_context = {
        **validated_context,
        "security": {
            "access_granted": True,
            "contains_pii": pii_check["contains_pii"],
            "pii_types": pii_check["pii_types"],
            "data_classification": classification,
            "input_sanitized": sanitized_input != input_text
        }
    }

    logger.info(
        "security_context_created",
        org_id=org_id,
        agent_id=agent_id,
        classification=classification,
        contains_pii=pii_check["contains_pii"]
    )

    return security_context
