"""
Tests for environment variable validation module
"""

import os
import pytest
from unittest.mock import patch
from server.config_validator import EnvValidator, ConfigValidationError, validate_config


class TestEnvValidator:
    """Test suite for EnvValidator class."""

    def setup_method(self):
        """Setup test fixtures."""
        # Store original env vars to restore later
        self.original_env = os.environ.copy()

    def teardown_method(self):
        """Cleanup after tests."""
        # Restore original environment
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_validator_initialization_default_environment(self):
        """Test validator initializes with default environment."""
        validator = EnvValidator()
        assert validator.environment == "development"
        assert not validator.is_production

    def test_validator_initialization_production_environment(self):
        """Test validator detects production environment."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            validator = EnvValidator()
            assert validator.environment == "production"
            assert validator.is_production

    def test_validator_initialization_custom_environment(self):
        """Test validator accepts custom environment."""
        validator = EnvValidator(environment="staging")
        assert validator.environment == "staging"
        assert not validator.is_production

    def test_validation_missing_required_always_vars(self):
        """Test validation fails when required vars are missing."""
        # Clear all env vars
        with patch.dict(os.environ, {}, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert not result["valid"]
            assert len(result["errors"]) >= 2  # At least SUPABASE_URL and SUPABASE_ANON_KEY
            assert any("SUPABASE_URL" in err for err in result["errors"])
            assert any("SUPABASE_ANON_KEY" in err for err in result["errors"])

    def test_validation_success_with_minimal_vars(self):
        """Test validation succeeds with minimal required vars in development."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-anon-key",
            "ENVIRONMENT": "development"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert result["valid"]
            assert len(result["errors"]) == 0

    def test_validation_production_missing_critical_vars(self):
        """Test validation fails in production when critical vars are missing."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-anon-key",
            "ENVIRONMENT": "production"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert not result["valid"]
            assert result["is_production"]
            # Should fail for missing SUPABASE_JWT_SECRET, SENTRY_DSN, etc.
            assert any("SUPABASE_JWT_SECRET" in err for err in result["errors"])
            assert any("SENTRY_DSN" in err for err in result["errors"])

    def test_validation_production_success_with_all_vars(self):
        """Test validation succeeds in production with all required vars."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-anon-key",
            "SUPABASE_JWT_SECRET": "test-jwt-secret",
            "SENTRY_DSN": "https://test@sentry.io/123",
            "GATEWAY_ALLOWED_ORIGINS": "https://app.example.com",
            "API_ALLOWED_ORIGINS": "https://app.example.com",
            "ENVIRONMENT": "production"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert result["valid"]
            assert result["is_production"]
            assert len(result["errors"]) == 0

    def test_url_validation(self):
        """Test URL validation."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "invalid-url",
            "SUPABASE_ANON_KEY": "test-key",
            "ENVIRONMENT": "development"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert not result["valid"]
            assert any("SUPABASE_URL" in err and "valid URL" in err for err in result["errors"])

    def test_list_validation(self):
        """Test comma-separated list validation."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-key",
            "SUPABASE_JWT_SECRET": "test-secret",
            "SENTRY_DSN": "https://test@sentry.io/123",
            "GATEWAY_ALLOWED_ORIGINS": "",  # Empty list
            "API_ALLOWED_ORIGINS": "https://app.example.com",
            "ENVIRONMENT": "production"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert not result["valid"]
            assert any("GATEWAY_ALLOWED_ORIGINS" in err for err in result["errors"])

    def test_strict_mode_raises_exception(self):
        """Test strict mode raises exception on validation failure."""
        with patch.dict(os.environ, {}, clear=True):
            validator = EnvValidator()

            with pytest.raises(ConfigValidationError) as exc_info:
                validator.validate(strict=True)

            assert "Configuration validation failed" in str(exc_info.value)

    def test_recommended_vars_generate_warnings(self):
        """Test that missing recommended vars generate warnings, not errors."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-key",
            "ENVIRONMENT": "development"
        }, clear=True):
            validator = EnvValidator()
            result = validator.validate(strict=False)

            assert result["valid"]  # Should still be valid
            assert len(result["warnings"]) > 0  # But should have warnings
            assert any("OPENAI_API_KEY" in warn or "REDIS_HOST" in warn for warn in result["warnings"])

    def test_validate_convenience_function(self):
        """Test the convenience validate_config function."""
        with patch.dict(os.environ, {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_ANON_KEY": "test-key",
            "ENVIRONMENT": "development"
        }, clear=True):
            result = validate_config(strict=False)

            assert result["valid"]
            assert result["environment"] == "development"
