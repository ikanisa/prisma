/**
 * OpenAI Apps SDK Authentication
 * 
 * Handles OAuth authentication flow for OpenAI ChatGPT App Store
 */

export interface OpenAIOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
}

export interface OpenAIOAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  state?: string;
}

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthUrl(config: OpenAIOAuthConfig): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
  });

  if (config.state) {
    params.set('state', config.state);
  }

  // OpenAI OAuth endpoint (adjust based on actual OpenAI OAuth implementation)
  const baseUrl = process.env.NEXT_PUBLIC_OPENAI_OAUTH_URL || 'https://auth.openai.com/oauth/authorize';
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  config: OpenAIOAuthConfig
): Promise<OpenAIOAuthResponse> {
  const response = await fetch('/api/auth/openai/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Token exchange failed' }));
    throw new Error(error.error || 'Token exchange failed');
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OpenAIOAuthResponse> {
  const response = await fetch('/api/auth/openai/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Token refresh failed' }));
    throw new Error(error.error || 'Token refresh failed');
  }

  return response.json();
}

/**
 * Validate OAuth configuration
 */
export function validateOAuthConfig(config: OpenAIOAuthConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.clientId || config.clientId.trim().length === 0) {
    errors.push('Client ID is required');
  }

  if (!config.redirectUri || !config.redirectUri.startsWith('https://')) {
    errors.push('Redirect URI must be a valid HTTPS URL');
  }

  if (!config.scopes || config.scopes.length === 0) {
    errors.push('At least one scope is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
