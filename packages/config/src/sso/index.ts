/**
 * SSO Module
 * 
 * Export all SSO components for enterprise authentication.
 */

// Types
export * from './types';

// Base provider
export {
    BaseSSOProvider,
    InMemorySessionStore,
    type SessionStore,
    type AuthenticationRequest,
    type AuthenticationResponse,
    type LogoutRequest,
    type LogoutResponse,
} from './base-provider';

// SAML provider
export { SAMLProvider, createSAMLProvider } from './saml-provider';

// OIDC provider
export { OIDCProvider, createOIDCProvider } from './oidc-provider';
