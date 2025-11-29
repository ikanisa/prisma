export const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

// Password strength thresholds (based on requirements met out of 5)
const WEAK_MAX_SCORE = 2;
const MEDIUM_MAX_SCORE = 4;
const TOTAL_REQUIREMENTS = 5;

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let score = 0;

  if (password.length < passwordRequirements.minLength) {
    errors.push(`At least ${passwordRequirements.minLength} characters`);
  } else {
    score++;
  }

  if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  } else {
    score++;
  }

  if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  } else {
    score++;
  }

  if (passwordRequirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('One number');
  } else {
    score++;
  }

  if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character');
  } else {
    score++;
  }

  // Calculate strength based on score thresholds
  const strength: 'weak' | 'medium' | 'strong' = 
    score <= WEAK_MAX_SCORE 
      ? 'weak' 
      : score <= MEDIUM_MAX_SCORE 
        ? 'medium' 
        : 'strong';

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}
