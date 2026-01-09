/**
 * OIDC Provider
 * 
 * OpenID Connect authentication provider for enterprise SSO.
 */

import type {
    SSOProvider,
    OIDCConfig,
    SSOSession,
    SSOUser,
} from './types';
import {
    BaseSSOProvider,
    AuthenticationRequest,
    AuthenticationResponse,
    LogoutRequest,
    LogoutResponse,
} from './base-provider';

// ============================================================================
// OIDC UTILITIES
// ============================================================================

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
}

interface JWTPayload {
    iss: string;
    sub: string;
    aud: string | string[];
    exp: number;
    iat: number;
    nonce?: string;
    [key: string]: unknown;
}

function base64UrlDecode(str: string): string {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    return Buffer.from(base64 + padding, 'base64').toString('utf-8');
}

function generateCodeVerifier(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(hash);
    return Buffer.from(bytes).toString('base64url');
}

// ============================================================================
// OIDC PROVIDER
// ============================================================================

export class OIDCProvider extends BaseSSOProvider {
    private config: OIDCConfig;
    private pkceStore = new Map<string, string>();  // state -> verifier

    constructor(provider: SSOProvider) {
        super(provider);
        if (provider.config.type !== 'oidc') {
            throw new Error('Invalid provider config type for OIDC provider');
        }
        this.config = provider.config;
    }

    /**
     * Generate OIDC authorization URL
     */
    async getAuthUrl(request: AuthenticationRequest): Promise<string> {
        const state = this.generateState();
        const nonce = this.generateState();

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: this.config.responseType,
            scope: this.config.scopes.join(' '),
            state,
            nonce,
        });

        // Add PKCE if enabled
        if (this.config.usePKCE) {
            const verifier = generateCodeVerifier();
            const challenge = await generateCodeChallenge(verifier);
            this.pkceStore.set(state, verifier);

            params.set('code_challenge', challenge);
            params.set('code_challenge_method', 'S256');
        }

        // Add response mode if specified
        if (this.config.responseMode) {
            params.set('response_mode', this.config.responseMode);
        }

        // Add prompt for force reauth
        if (request.forceReauth) {
            params.set('prompt', 'login');
        }

        this.emitEvent('login_initiated', {
            metadata: { state },
        });

        return `${this.config.authorizationEndpoint}?${params.toString()}`;
    }

    /**
     * Handle OIDC callback
     */
    async handleCallback(params: Record<string, string>): Promise<AuthenticationResponse> {
        try {
            const { code, state, error, error_description } = params;

            // Check for error response
            if (error) {
                throw new Error(error_description ?? error);
            }

            if (!code || !state) {
                throw new Error('Missing code or state');
            }

            // Exchange code for tokens
            const tokens = await this.exchangeCode(code, state);

            // Validate ID token
            const idTokenPayload = this.decodeAndValidateIdToken(tokens.id_token!);

            // Get user info
            const userInfo = await this.getUserInfo(tokens.access_token);

            // Merge claims
            const claims = { ...idTokenPayload, ...userInfo };

            // Extract user
            const user = this.extractUser(claims);

            // Map roles
            const groups = this.extractClaim(claims, this.config.claimsMapping.groups) ?? [];
            const roles = this.extractClaim(claims, this.config.claimsMapping.roles) ?? [];
            const roleResult = this.mapRoles(
                Array.isArray(groups) ? groups : [groups],
                Array.isArray(roles) ? roles : [roles],
                claims
            );
            user.groups = Array.isArray(groups) ? groups : [groups];
            user.roles = roleResult.mappedRoles;

            // Create session
            const session = this.createSession(user, {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
                expiresIn: tokens.expires_in,
            });

            this.emitEvent('login_success', {
                userId: user.id,
                sessionId: session.id,
            });

            return {
                success: true,
                user,
                session,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.emitEvent('login_failed', {
                success: false,
                errorMessage,
            });

            return {
                success: false,
                error: {
                    code: 'OIDC_ERROR',
                    message: errorMessage,
                },
            };
        }
    }

    /**
     * Initiate OIDC RP-initiated logout
     */
    async logout(request: LogoutRequest): Promise<LogoutResponse> {
        if (!this.config.endSessionEndpoint) {
            return { success: true };
        }

        const params = new URLSearchParams();

        if (this.config.postLogoutRedirectUri) {
            params.set('post_logout_redirect_uri', this.config.postLogoutRedirectUri);
        }

        this.emitEvent('logout_initiated', {
            sessionId: request.sessionId,
        });

        return {
            success: true,
            redirectUrl: `${this.config.endSessionEndpoint}?${params.toString()}`,
        };
    }

    /**
     * Refresh access token
     */
    async refreshSession(session: SSOSession): Promise<SSOSession | null> {
        if (!session.refreshToken) {
            return null;
        }

        try {
            const response = await fetch(this.config.tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: session.refreshToken,
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                }).toString(),
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const tokens: TokenResponse = await response.json();

            const updatedSession: SSOSession = {
                ...session,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token ?? session.refreshToken,
                idToken: tokens.id_token ?? session.idToken,
                tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                lastActivityAt: new Date(),
            };

            this.emitEvent('token_refreshed', {
                userId: session.userId,
                sessionId: session.id,
            });

            return updatedSession;

        } catch (error) {
            this.emitEvent('session_expired', {
                userId: session.userId,
                sessionId: session.id,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Refresh failed',
            });
            return null;
        }
    }

    /**
     * Validate session
     */
    async validateSession(session: SSOSession): Promise<boolean> {
        if (!session.tokenExpiry) return false;

        // Check if token is expired (with 5 minute buffer)
        const bufferMs = 5 * 60 * 1000;
        return session.tokenExpiry.getTime() - bufferMs > Date.now();
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private async exchangeCode(code: string, state: string): Promise<TokenResponse> {
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.config.redirectUri,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
        });

        // Add PKCE verifier if we have one
        const verifier = this.pkceStore.get(state);
        if (verifier) {
            body.set('code_verifier', verifier);
            this.pkceStore.delete(state);
        }

        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        return response.json();
    }

    private decodeAndValidateIdToken(idToken: string): JWTPayload {
        const parts = idToken.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid ID token format');
        }

        const payload: JWTPayload = JSON.parse(base64UrlDecode(parts[1]));

        // Validate issuer
        if (payload.iss !== this.config.issuer) {
            throw new Error(`Invalid issuer: ${payload.iss}`);
        }

        // Validate audience
        const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!aud.includes(this.config.clientId)) {
            throw new Error('Invalid audience');
        }

        // Validate expiration
        if (payload.exp * 1000 < Date.now()) {
            throw new Error('ID token has expired');
        }

        return payload;
    }

    private async getUserInfo(accessToken: string): Promise<Record<string, unknown>> {
        const response = await fetch(this.config.userInfoEndpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return response.json();
    }

    private extractUser(claims: Record<string, unknown>): SSOUser {
        const mapping = this.config.claimsMapping;

        const getClaim = (key: string): string | undefined => {
            const value = claims[key];
            return typeof value === 'string' ? value : undefined;
        };

        const sub = getClaim('sub') ?? '';
        const email = getClaim(mapping.email) ?? sub;

        return {
            id: crypto.randomUUID(),
            externalId: sub,
            providerId: this.provider.id,
            email,
            emailVerified: claims[mapping.emailVerified ?? 'email_verified'] === true,
            firstName: mapping.givenName ? getClaim(mapping.givenName) : undefined,
            lastName: mapping.familyName ? getClaim(mapping.familyName) : undefined,
            displayName: mapping.name ? getClaim(mapping.name) : undefined,
            avatarUrl: mapping.picture ? getClaim(mapping.picture) : undefined,
            groups: [],
            roles: [],
            rawAttributes: claims,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
        };
    }

    private extractClaim(claims: Record<string, unknown>, key?: string): string[] | null {
        if (!key) return null;

        const value = claims[key];
        if (!value) return null;

        if (Array.isArray(value)) {
            return value.filter((v): v is string => typeof v === 'string');
        }

        if (typeof value === 'string') {
            return [value];
        }

        return null;
    }
}

export function createOIDCProvider(provider: SSOProvider): OIDCProvider {
    return new OIDCProvider(provider);
}
