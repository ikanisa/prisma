"""
Environment Variable Validation Module

Validates required environment variables on application startup.
Fails fast if critical configuration is missing in production.
"""

import os
import sys
from typing import List, Dict, Optional, Any
import structlog

logger = structlog.get_logger(__name__)


class ConfigValidationError(Exception):
    """Raised when required configuration is missing or invalid."""
    pass


class EnvValidator:
    """Validates environment variables on startup."""
    
    # Required environment variables for all environments
    REQUIRED_ALWAYS = [
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
    ]
    
    # Required only in production
    REQUIRED_PRODUCTION = [
        "SUPABASE_JWT_SECRET",
        "SENTRY_DSN",
        "GATEWAY_ALLOWED_ORIGINS",
        "API_ALLOWED_ORIGINS",
    ]
    
    # Optional but recommended
    RECOMMENDED = [
        "SUPABASE_SERVICE_ROLE_KEY",
        "OPENAI_API_KEY",
        "REDIS_HOST",
        "POSTGRES_PASSWORD",
    ]
    
    def __init__(self, environment: Optional[str] = None):
        """
        Initialize validator.
        
        Args:
            environment: Current environment (production, development, test, etc.)
                        Defaults to value of ENVIRONMENT or NODE_ENV env var
        """
        self.environment = environment or os.getenv("ENVIRONMENT") or os.getenv("NODE_ENV") or "development"
        self.is_production = self.environment.lower() in ["production", "prod"]
        self.errors: List[str] = []
        self.warnings: List[str] = []
    
    def _check_var(self, var_name: str, required: bool = True) -> Optional[str]:
        """
        Check if an environment variable is set.
        
        Args:
            var_name: Name of the environment variable
            required: Whether the variable is required (adds to errors if missing)
        
        Returns:
            The variable value if set, None otherwise
        """
        value = os.getenv(var_name)
        
        if not value or not value.strip():
            if required:
                self.errors.append(f"Missing required environment variable: {var_name}")
            else:
                self.warnings.append(f"Recommended environment variable not set: {var_name}")
            return None
        
        return value.strip()
    
    def _validate_url(self, var_name: str) -> bool:
        """Validate that a variable contains a valid URL."""
        value = os.getenv(var_name)
        if not value:
            return False
        
        if not (value.startswith("http://") or value.startswith("https://")):
            self.errors.append(f"{var_name} must be a valid URL (got: {value[:50]}...)")
            return False
        
        return True
    
    def _validate_list(self, var_name: str) -> bool:
        """Validate that a variable contains a comma-separated list."""
        value = os.getenv(var_name)
        if not value:
            return False
        
        # Check if it contains at least one value
        items = [item.strip() for item in value.split(",") if item.strip()]
        if not items:
            self.errors.append(f"{var_name} must contain at least one value")
            return False
        
        return True
    
    def validate(self, strict: bool = None) -> Dict[str, Any]:
        """
        Validate all required environment variables.
        
        Args:
            strict: If True, raises exception on any errors.
                   If None, defaults to True in production, False otherwise.
        
        Returns:
            Dictionary with validation results
        
        Raises:
            ConfigValidationError: If strict=True and validation fails
        """
        if strict is None:
            strict = self.is_production
        
        self.errors = []
        self.warnings = []
        
        logger.info("config.validate_start", environment=self.environment, strict=strict)
        
        # Check always-required variables
        for var in self.REQUIRED_ALWAYS:
            self._check_var(var, required=True)
        
        # Validate URLs
        if os.getenv("SUPABASE_URL"):
            self._validate_url("SUPABASE_URL")
        
        # Check production-only requirements
        if self.is_production:
            for var in self.REQUIRED_PRODUCTION:
                self._check_var(var, required=True)
            
            # Validate CORS origins in production
            if os.getenv("GATEWAY_ALLOWED_ORIGINS"):
                self._validate_list("GATEWAY_ALLOWED_ORIGINS")
            if os.getenv("API_ALLOWED_ORIGINS"):
                self._validate_list("API_ALLOWED_ORIGINS")
        
        # Check recommended variables (warnings only)
        for var in self.RECOMMENDED:
            self._check_var(var, required=False)
        
        # Prepare results
        results = {
            "valid": len(self.errors) == 0,
            "environment": self.environment,
            "is_production": self.is_production,
            "errors": self.errors,
            "warnings": self.warnings,
        }
        
        # Log results
        if self.errors:
            logger.error(
                "config.validate_failed",
                environment=self.environment,
                errors=self.errors,
                warnings=self.warnings,
            )
        elif self.warnings:
            logger.warning(
                "config.validate_warnings",
                environment=self.environment,
                warnings=self.warnings,
            )
        else:
            logger.info(
                "config.validate_success",
                environment=self.environment,
            )
        
        # Fail fast in strict mode
        if strict and self.errors:
            error_msg = "\n".join([
                "Configuration validation failed:",
                *[f"  - {error}" for error in self.errors],
            ])
            raise ConfigValidationError(error_msg)
        
        return results
    
    def print_summary(self):
        """Print a human-readable summary of validation results."""
        print("\n" + "=" * 70)
        print(f"Environment Configuration Validation - {self.environment.upper()}")
        print("=" * 70)
        
        if self.errors:
            print("\n❌ ERRORS:")
            for error in self.errors:
                print(f"  • {error}")
        
        if self.warnings:
            print("\n⚠️  WARNINGS:")
            for warning in self.warnings:
                print(f"  • {warning}")
        
        if not self.errors and not self.warnings:
            print("\n✅ All required environment variables are configured!")
        
        print("=" * 70 + "\n")


def validate_config(strict: bool = None) -> Dict[str, Any]:
    """
    Convenience function to validate configuration.
    
    Args:
        strict: If True, raises exception on errors. Defaults to True in production.
    
    Returns:
        Validation results dictionary
    
    Raises:
        ConfigValidationError: If strict=True and validation fails
    """
    validator = EnvValidator()
    return validator.validate(strict=strict)


def validate_and_exit_on_error():
    """
    Validate configuration and exit with error code 1 if validation fails.
    Useful for startup scripts.
    """
    validator = EnvValidator()
    results = validator.validate(strict=False)
    
    if not results["valid"]:
        validator.print_summary()
        sys.exit(1)
    
    return results


if __name__ == "__main__":
    # Allow running as standalone script
    validator = EnvValidator()
    results = validator.validate(strict=False)
    validator.print_summary()
    
    if not results["valid"]:
        sys.exit(1)
