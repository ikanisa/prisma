/**
 * SSO Provider Abstract Base
 * 
 * Base class for SSO providers with common functionality.
 */

import type {
    SSOProvider,
    SSOSession,
    SSOUser,
    RoleMapping,
    RoleMappingResult,
    SSOEvent,
    SSOEventType,
} from './types';

// ============================================================================
// ABSTRACT SSO PROVIDER
// ============================================================================

export interface AuthenticationRequest {
    returnUrl?: string;
    state?: string;
    forceReauth?: boolean;
}

export interface AuthenticationResponse {
    success: boolean;
    user?: SSOUser;
    session?: SSOSession;
    error?: {
        code: string;
        message: string;
    };
}

export interface LogoutRequest {
    sessionId: string;
    singleLogout?: boolean;
}

export interface LogoutResponse {
    success: boolean;
    redirectUrl?: string;
    error?: string;
}

export abstract class BaseSSOProvider {
    protected provider: SSOProvider;
    protected roleMappings: RoleMapping[] = [];
    protected eventHandlers: ((event: SSOEvent) => void)[] = [];

    constructor(provider: SSOProvider) {
        this.provider = provider;
    }

    /**
     * Get the provider ID
     */
    getId(): string {
        return this.provider.id;
    }

    /**
     * Get the provider type
     */
    getType(): string {
        return this.provider.type;
    }

    /**
     * Check if provider is enabled
     */
    isEnabled(): boolean {
        return this.provider.enabled;
    }

    /**
     * Generate authentication URL
     */
    abstract getAuthUrl(request: AuthenticationRequest): Promise<string>;

    /**
     * Handle authentication callback
     */
    abstract handleCallback(params: Record<string, string>): Promise<AuthenticationResponse>;

    /**
     * Initiate logout
     */
    abstract logout(request: LogoutRequest): Promise<LogoutResponse>;

    /**
     * Refresh tokens (if applicable)
     */
    abstract refreshSession(session: SSOSession): Promise<SSOSession | null>;

    /**
     * Validate session
     */
    abstract validateSession(session: SSOSession): Promise<boolean>;

    /**
     * Set role mappings
     */
    setRoleMappings(mappings: RoleMapping[]): void {
        this.roleMappings = mappings.filter(m => m.providerId === this.provider.id && m.enabled);
        this.roleMappings.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Map roles from IdP attributes
     */
    protected mapRoles(userGroups: string[], userRoles: string[], attributes: Record<string, unknown>): RoleMappingResult {
        const mappedRoles = new Set<string>();
        const appliedMappings: RoleMapping[] = [];
        const processedGroups = new Set<string>();

        for (const mapping of this.roleMappings) {
            let matches = false;

            switch (mapping.sourceType) {
                case 'group':
                    matches = userGroups.includes(mapping.sourceValue);
                    if (matches) processedGroups.add(mapping.sourceValue);
                    break;
                case 'role':
                    matches = userRoles.includes(mapping.sourceValue);
                    break;
                case 'attribute':
                    const [attrName, attrValue] = mapping.sourceValue.split('=');
                    matches = attributes[attrName] === attrValue;
                    break;
            }

            if (matches) {
                mappedRoles.add(mapping.targetRole);
                appliedMappings.push(mapping);
            }
        }

        return {
            mappedRoles: Array.from(mappedRoles),
            unmappedGroups: userGroups.filter(g => !processedGroups.has(g)),
            appliedMappings,
        };
    }

    /**
     * Register event handler
     */
    onEvent(handler: (event: SSOEvent) => void): void {
        this.eventHandlers.push(handler);
    }

    /**
     * Emit SSO event
     */
    protected emitEvent(
        type: SSOEventType,
        details: Partial<Omit<SSOEvent, 'id' | 'type' | 'providerId' | 'timestamp'>>
    ): void {
        const event: SSOEvent = {
            id: crypto.randomUUID(),
            type,
            providerId: this.provider.id,
            timestamp: new Date(),
            success: true,
            ...details,
        };

        for (const handler of this.eventHandlers) {
            try {
                handler(event);
            } catch (e) {
                console.error('SSO event handler error:', e);
            }
        }
    }

    /**
     * Generate secure random state
     */
    protected generateState(): string {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Create session from user
     */
    protected createSession(
        user: SSOUser,
        options: { accessToken?: string; refreshToken?: string; idToken?: string; expiresIn?: number }
    ): SSOSession {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (options.expiresIn ?? 3600) * 1000);

        return {
            id: crypto.randomUUID(),
            userId: user.id,
            providerId: this.provider.id,
            accessToken: options.accessToken,
            refreshToken: options.refreshToken,
            idToken: options.idToken,
            tokenExpiry: expiresAt,
            createdAt: now,
            expiresAt,
            lastActivityAt: now,
        };
    }
}

// ============================================================================
// SESSION MANAGER
// ============================================================================

export interface SessionStore {
    get(sessionId: string): Promise<SSOSession | null>;
    set(session: SSOSession): Promise<void>;
    delete(sessionId: string): Promise<void>;
    findByUserId(userId: string): Promise<SSOSession[]>;
    cleanup(): Promise<number>;
}

export class InMemorySessionStore implements SessionStore {
    private sessions = new Map<string, SSOSession>();

    async get(sessionId: string): Promise<SSOSession | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        if (session.expiresAt < new Date()) {
            this.sessions.delete(sessionId);
            return null;
        }
        return session;
    }

    async set(session: SSOSession): Promise<void> {
        this.sessions.set(session.id, session);
    }

    async delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }

    async findByUserId(userId: string): Promise<SSOSession[]> {
        const now = new Date();
        return Array.from(this.sessions.values())
            .filter(s => s.userId === userId && s.expiresAt > now);
    }

    async cleanup(): Promise<number> {
        const now = new Date();
        let cleaned = 0;
        for (const [id, session] of this.sessions) {
            if (session.expiresAt < now) {
                this.sessions.delete(id);
                cleaned++;
            }
        }
        return cleaned;
    }
}
