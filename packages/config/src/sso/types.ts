/**
 * SSO Types
 * 
 * Type definitions for Single Sign-On integration including SAML and OIDC.
 */

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type SSOProviderType = 'saml' | 'oidc' | 'oauth2';

export interface SSOProvider {
    id: string;
    name: string;
    type: SSOProviderType;
    enabled: boolean;

    // Tenant association
    tenantId?: string;

    // Provider-specific config
    config: SAMLConfig | OIDCConfig | OAuth2Config;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// SAML CONFIGURATION
// ============================================================================

export interface SAMLConfig {
    type: 'saml';

    // Service Provider (SP) settings
    entityId: string;
    assertionConsumerServiceUrl: string;
    singleLogoutServiceUrl?: string;

    // Identity Provider (IdP) settings
    idpEntityId: string;
    idpSSOUrl: string;
    idpSLOUrl?: string;
    idpCertificate: string;

    // Signing & encryption
    signRequests: boolean;
    signatureAlgorithm: 'RSA-SHA256' | 'RSA-SHA512';
    spPrivateKey?: string;
    spCertificate?: string;

    // Name ID format
    nameIdFormat: 'emailAddress' | 'persistent' | 'transient' | 'unspecified';

    // Attribute mapping
    attributeMapping: SAMLAttributeMapping;

    // Options
    wantAssertionsSigned: boolean;
    wantResponseSigned: boolean;
    allowUnencryptedAssertion: boolean;
}

export interface SAMLAttributeMapping {
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
    roles?: string;
    department?: string;
    employeeId?: string;

    // Custom attributes
    custom?: Record<string, string>;
}

// ============================================================================
// OIDC CONFIGURATION
// ============================================================================

export interface OIDCConfig {
    type: 'oidc';

    // Client settings
    clientId: string;
    clientSecret: string;

    // Endpoints
    issuer: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    jwksUri: string;
    endSessionEndpoint?: string;

    // Redirect URIs
    redirectUri: string;
    postLogoutRedirectUri?: string;

    // Scopes
    scopes: string[];

    // Token settings
    responseType: 'code' | 'id_token' | 'code id_token';
    responseMode?: 'query' | 'fragment' | 'form_post';

    // Claims mapping
    claimsMapping: OIDCClaimsMapping;

    // Options
    usePKCE: boolean;
    validateNonce: boolean;
}

export interface OIDCClaimsMapping {
    email: string;
    emailVerified?: string;
    name?: string;
    givenName?: string;
    familyName?: string;
    picture?: string;
    groups?: string;
    roles?: string;

    // Custom claims
    custom?: Record<string, string>;
}

// ============================================================================
// OAUTH2 CONFIGURATION
// ============================================================================

export interface OAuth2Config {
    type: 'oauth2';

    // Client settings
    clientId: string;
    clientSecret: string;

    // Endpoints
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint?: string;

    // Redirect URIs
    redirectUri: string;

    // Scopes
    scopes: string[];

    // Options
    usePKCE: boolean;
}

// ============================================================================
// SESSION & TOKEN TYPES
// ============================================================================

export interface SSOSession {
    id: string;
    userId: string;
    providerId: string;

    // Provider session info
    providerSessionId?: string;
    nameId?: string;

    // Tokens
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    tokenExpiry?: Date;

    // Session info
    createdAt: Date;
    expiresAt: Date;
    lastActivityAt: Date;

    // Client info
    ipAddress?: string;
    userAgent?: string;
}

export interface SSOUser {
    id: string;
    externalId: string;  // ID from IdP
    providerId: string;

    // Profile
    email: string;
    emailVerified: boolean;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;

    // Organization
    tenantId?: string;
    department?: string;
    employeeId?: string;

    // Access
    groups: string[];
    roles: string[];

    // Metadata
    rawAttributes: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt: Date;
}

// ============================================================================
// ROLE MAPPING
// ============================================================================

export interface RoleMapping {
    id: string;
    providerId: string;

    // Source (from IdP)
    sourceType: 'group' | 'role' | 'attribute';
    sourceValue: string;

    // Target (in app)
    targetRole: string;

    // Priority (higher = processed last)
    priority: number;

    enabled: boolean;
}

export interface RoleMappingResult {
    mappedRoles: string[];
    unmappedGroups: string[];
    appliedMappings: RoleMapping[];
}

// ============================================================================
// SSO EVENTS
// ============================================================================

export type SSOEventType =
    | 'login_initiated'
    | 'login_success'
    | 'login_failed'
    | 'logout_initiated'
    | 'logout_success'
    | 'token_refreshed'
    | 'session_expired'
    | 'user_provisioned'
    | 'user_updated';

export interface SSOEvent {
    id: string;
    type: SSOEventType;
    providerId: string;
    userId?: string;
    sessionId?: string;
    timestamp: Date;

    // Details
    success: boolean;
    errorCode?: string;
    errorMessage?: string;

    // Context
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// MULTI-TENANT CONFIG
// ============================================================================

export interface TenantSSOConfig {
    tenantId: string;

    // Provider selection
    defaultProviderId?: string;
    allowedProviders: string[];

    // Behavior
    enforceSSO: boolean;  // Block password login
    autoProvisionUsers: boolean;
    autoUpdateUsers: boolean;

    // Domain-based routing
    emailDomains: string[];

    // Session settings
    sessionDurationMinutes: number;
    idleTimeoutMinutes: number;
    maxConcurrentSessions: number;
}
