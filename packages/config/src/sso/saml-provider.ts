/**
 * SAML 2.0 Service Provider
 * 
 * SAML 2.0 authentication provider for enterprise SSO.
 */

import type {
    SSOProvider,
    SAMLConfig,
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
// SAML UTILITIES
// ============================================================================

interface SAMLAssertion {
    issuer: string;
    nameId: string;
    nameIdFormat: string;
    sessionIndex?: string;
    notBefore: Date;
    notOnOrAfter: Date;
    attributes: Record<string, string | string[]>;
    conditions: {
        audience: string;
    };
}

function base64Encode(str: string): string {
    return Buffer.from(str, 'utf-8').toString('base64');
}

function base64Decode(str: string): string {
    return Buffer.from(str, 'base64').toString('utf-8');
}

function deflateAndEncode(xml: string): string {
    // In production, use zlib.deflateRaw
    return base64Encode(xml);
}

// ============================================================================
// SAML PROVIDER
// ============================================================================

export class SAMLProvider extends BaseSSOProvider {
    private config: SAMLConfig;

    constructor(provider: SSOProvider) {
        super(provider);
        if (provider.config.type !== 'saml') {
            throw new Error('Invalid provider config type for SAML provider');
        }
        this.config = provider.config;
    }

    /**
     * Generate SAML AuthnRequest URL
     */
    async getAuthUrl(request: AuthenticationRequest): Promise<string> {
        const id = `_${crypto.randomUUID().replace(/-/g, '')}`;
        const issueInstant = new Date().toISOString();

        const authnRequest = `
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${this.config.idpSSOUrl}"
    AssertionConsumerServiceURL="${this.config.assertionConsumerServiceUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
    ${request.forceReauth ? 'ForceAuthn="true"' : ''}>
    <saml:Issuer>${this.config.entityId}</saml:Issuer>
    <samlp:NameIDPolicy
        Format="urn:oasis:names:tc:SAML:1.1:nameid-format:${this.config.nameIdFormat}"
        AllowCreate="true"/>
</samlp:AuthnRequest>`.trim();

        const encodedRequest = deflateAndEncode(authnRequest);
        const state = this.generateState();

        // Build redirect URL
        const params = new URLSearchParams({
            SAMLRequest: encodedRequest,
            RelayState: JSON.stringify({
                state,
                returnUrl: request.returnUrl,
            }),
        });

        this.emitEvent('login_initiated', {
            metadata: { requestId: id },
        });

        return `${this.config.idpSSOUrl}?${params.toString()}`;
    }

    /**
     * Handle SAML Response callback
     */
    async handleCallback(params: Record<string, string>): Promise<AuthenticationResponse> {
        try {
            const samlResponse = params.SAMLResponse;
            const relayState = params.RelayState;

            if (!samlResponse) {
                throw new Error('Missing SAMLResponse');
            }

            // Decode and parse response
            const responseXml = base64Decode(samlResponse);
            const assertion = this.parseAssertion(responseXml);

            // Validate assertion
            this.validateAssertion(assertion);

            // Extract user info
            const user = this.extractUser(assertion);

            // Map roles
            const groups = this.extractGroups(assertion);
            const roles = this.extractRoles(assertion);
            const roleResult = this.mapRoles(groups, roles, assertion.attributes);
            user.groups = groups;
            user.roles = roleResult.mappedRoles;

            // Create session
            const session = this.createSession(user, {
                expiresIn: (assertion.notOnOrAfter.getTime() - Date.now()) / 1000,
            });
            session.nameId = assertion.nameId;
            session.providerSessionId = assertion.sessionIndex;

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
                    code: 'SAML_ERROR',
                    message: errorMessage,
                },
            };
        }
    }

    /**
     * Initiate SAML Single Logout
     */
    async logout(request: LogoutRequest): Promise<LogoutResponse> {
        if (!this.config.idpSLOUrl) {
            return { success: true };
        }

        const id = `_${crypto.randomUUID().replace(/-/g, '')}`;
        const issueInstant = new Date().toISOString();

        const logoutRequest = `
<samlp:LogoutRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${this.config.idpSLOUrl}">
    <saml:Issuer>${this.config.entityId}</saml:Issuer>
    <saml:NameID>${request.sessionId}</saml:NameID>
</samlp:LogoutRequest>`.trim();

        const encodedRequest = deflateAndEncode(logoutRequest);
        const params = new URLSearchParams({
            SAMLRequest: encodedRequest,
        });

        this.emitEvent('logout_initiated', {
            sessionId: request.sessionId,
        });

        return {
            success: true,
            redirectUrl: `${this.config.idpSLOUrl}?${params.toString()}`,
        };
    }

    /**
     * SAML sessions don't refresh - return null
     */
    async refreshSession(_session: SSOSession): Promise<SSOSession | null> {
        return null;
    }

    /**
     * Validate SAML session
     */
    async validateSession(session: SSOSession): Promise<boolean> {
        return session.expiresAt > new Date();
    }

    /**
     * Get SP metadata XML
     */
    getMetadata(): string {
        return `
<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor
    xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${this.config.entityId}">
    <SPSSODescriptor
        AuthnRequestsSigned="${this.config.signRequests}"
        WantAssertionsSigned="${this.config.wantAssertionsSigned}"
        protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
        
        <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:${this.config.nameIdFormat}</NameIDFormat>
        
        <AssertionConsumerService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
            Location="${this.config.assertionConsumerServiceUrl}"
            index="0"
            isDefault="true"/>
        
        ${this.config.singleLogoutServiceUrl ? `
        <SingleLogoutService
            Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
            Location="${this.config.singleLogoutServiceUrl}"/>
        ` : ''}
    </SPSSODescriptor>
</EntityDescriptor>`.trim();
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private parseAssertion(xml: string): SAMLAssertion {
        // Simplified parsing - in production use xml2js or similar
        const getElement = (name: string, ns?: string): string | null => {
            const regex = new RegExp(`<${ns ? `${ns}:` : ''}${name}[^>]*>([^<]*)</${ns ? `${ns}:` : ''}${name}>`, 's');
            const match = xml.match(regex);
            return match ? match[1].trim() : null;
        };

        const getAttribute = (elementName: string, attrName: string): string | null => {
            const regex = new RegExp(`<${elementName}[^>]*${attrName}="([^"]*)"`, 's');
            const match = xml.match(regex);
            return match ? match[1] : null;
        };

        // Parse basic assertion structure
        const issuer = getElement('Issuer', 'saml') ?? '';
        const nameId = getElement('NameID', 'saml') ?? '';
        const nameIdFormat = getAttribute('NameID', 'Format') ?? 'unspecified';
        const sessionIndex = getAttribute('AuthnStatement', 'SessionIndex') ?? undefined;

        // Parse conditions
        const notBefore = getAttribute('Conditions', 'NotBefore') ?? new Date().toISOString();
        const notOnOrAfter = getAttribute('Conditions', 'NotOnOrAfter') ??
            new Date(Date.now() + 3600000).toISOString();
        const audience = getElement('Audience', 'saml') ?? '';

        // Parse attributes (simplified)
        const attributes: Record<string, string | string[]> = {};
        const attrRegex = /<saml:Attribute\s+Name="([^"]+)"[^>]*>\s*<saml:AttributeValue[^>]*>([^<]*)<\/saml:AttributeValue>/g;
        let match;
        while ((match = attrRegex.exec(xml)) !== null) {
            const name = match[1];
            const value = match[2].trim();
            if (attributes[name]) {
                if (Array.isArray(attributes[name])) {
                    (attributes[name] as string[]).push(value);
                } else {
                    attributes[name] = [attributes[name] as string, value];
                }
            } else {
                attributes[name] = value;
            }
        }

        return {
            issuer,
            nameId,
            nameIdFormat,
            sessionIndex,
            notBefore: new Date(notBefore),
            notOnOrAfter: new Date(notOnOrAfter),
            attributes,
            conditions: { audience },
        };
    }

    private validateAssertion(assertion: SAMLAssertion): void {
        const now = new Date();

        // Validate issuer
        if (assertion.issuer !== this.config.idpEntityId) {
            throw new Error(`Invalid issuer: ${assertion.issuer}`);
        }

        // Validate audience
        if (assertion.conditions.audience !== this.config.entityId) {
            throw new Error(`Invalid audience: ${assertion.conditions.audience}`);
        }

        // Validate time window
        if (now < assertion.notBefore) {
            throw new Error('Assertion not yet valid');
        }

        if (now > assertion.notOnOrAfter) {
            throw new Error('Assertion has expired');
        }
    }

    private extractUser(assertion: SAMLAssertion): SSOUser {
        const mapping = this.config.attributeMapping;
        const attrs = assertion.attributes;

        const getAttr = (key: string): string | undefined => {
            const value = attrs[key];
            return Array.isArray(value) ? value[0] : value;
        };

        return {
            id: crypto.randomUUID(),
            externalId: assertion.nameId,
            providerId: this.provider.id,
            email: getAttr(mapping.email) ?? assertion.nameId,
            emailVerified: true,
            firstName: mapping.firstName ? getAttr(mapping.firstName) : undefined,
            lastName: mapping.lastName ? getAttr(mapping.lastName) : undefined,
            displayName: mapping.displayName ? getAttr(mapping.displayName) : undefined,
            department: mapping.department ? getAttr(mapping.department) : undefined,
            employeeId: mapping.employeeId ? getAttr(mapping.employeeId) : undefined,
            groups: [],
            roles: [],
            rawAttributes: attrs as Record<string, unknown>,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date(),
        };
    }

    private extractGroups(assertion: SAMLAssertion): string[] {
        const groupAttr = this.config.attributeMapping.groups;
        if (!groupAttr) return [];

        const groups = assertion.attributes[groupAttr];
        if (!groups) return [];

        return Array.isArray(groups) ? groups : [groups];
    }

    private extractRoles(assertion: SAMLAssertion): string[] {
        const roleAttr = this.config.attributeMapping.roles;
        if (!roleAttr) return [];

        const roles = assertion.attributes[roleAttr];
        if (!roles) return [];

        return Array.isArray(roles) ? roles : [roles];
    }
}

export function createSAMLProvider(provider: SSOProvider): SAMLProvider {
    return new SAMLProvider(provider);
}
