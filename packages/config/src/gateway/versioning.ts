/**
 * API Versioning
 * 
 * API version extraction and management.
 */

import type {
    VersionConfig,
    VersionStrategy,
    GatewayRequest,
    GatewayContext,
    GatewayMiddleware,
} from './types';

// ============================================================================
// VERSION EXTRACTOR
// ============================================================================

export class VersionExtractor {
    private config: VersionConfig;

    constructor(config: VersionConfig) {
        this.config = {
            headerName: 'X-API-Version',
            queryParam: 'api_version',
            ...config,
        };
    }

    /**
     * Extract version from request
     */
    extract(request: GatewayRequest): string {
        switch (this.config.strategy) {
            case 'path':
                return this.extractFromPath(request);
            case 'header':
                return this.extractFromHeader(request);
            case 'query':
                return this.extractFromQuery(request);
            case 'accept':
                return this.extractFromAccept(request);
            default:
                return this.config.defaultVersion;
        }
    }

    /**
     * Validate version
     */
    validate(version: string): { valid: boolean; deprecated: boolean; sunset?: Date } {
        const valid = this.config.supportedVersions.includes(version);
        const deprecated = this.config.deprecatedVersions?.includes(version) ?? false;
        const sunset = this.config.sunsetDates?.[version];

        return { valid, deprecated, sunset };
    }

    /**
     * Get version headers for response
     */
    getHeaders(version: string): Record<string, string> {
        const headers: Record<string, string> = {
            'X-API-Version': version,
        };

        const validation = this.validate(version);

        if (validation.deprecated) {
            headers['Deprecation'] = 'true';

            if (validation.sunset) {
                headers['Sunset'] = validation.sunset.toUTCString();
            }

            // Add link to newer version
            const latestVersion = this.config.supportedVersions[this.config.supportedVersions.length - 1];
            if (latestVersion !== version) {
                headers['Link'] = `<https://api.example.com/docs/${latestVersion}>; rel="successor-version"`;
            }
        }

        return headers;
    }

    /**
     * Create middleware
     */
    middleware(): GatewayMiddleware {
        return async (ctx: GatewayContext, next: () => Promise<void>) => {
            const version = this.extract(ctx.request);
            const validation = this.validate(version);

            ctx.version = version;

            if (!validation.valid) {
                ctx.response = {
                    status: 400,
                    headers: {
                        'X-Supported-Versions': this.config.supportedVersions.join(', '),
                    },
                    body: {
                        error: 'Invalid API Version',
                        message: `Version '${version}' is not supported`,
                        supportedVersions: this.config.supportedVersions,
                    },
                };
                return;
            }

            await next();

            // Add version headers to response
            if (ctx.response) {
                const versionHeaders = this.getHeaders(version);
                ctx.response.headers = { ...ctx.response.headers, ...versionHeaders };
            }
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private extractFromPath(request: GatewayRequest): string {
        // Match /v1/, /v2/, etc.
        const match = request.path.match(/\/v(\d+(?:\.\d+)?)\//);
        return match ? `v${match[1]}` : this.config.defaultVersion;
    }

    private extractFromHeader(request: GatewayRequest): string {
        const header = request.headers[this.config.headerName!.toLowerCase()];
        if (typeof header === 'string') {
            return header;
        }
        return this.config.defaultVersion;
    }

    private extractFromQuery(request: GatewayRequest): string {
        const param = request.query[this.config.queryParam!];
        if (typeof param === 'string') {
            return param;
        }
        return this.config.defaultVersion;
    }

    private extractFromAccept(request: GatewayRequest): string {
        // Parse Accept header: application/vnd.api.v1+json
        const accept = request.headers['accept'];
        if (typeof accept === 'string') {
            const match = accept.match(/application\/vnd\.[^.]+\.v(\d+(?:\.\d+)?)/);
            if (match) {
                return `v${match[1]}`;
            }
        }
        return this.config.defaultVersion;
    }
}

// ============================================================================
// VERSION ROUTER
// ============================================================================

type VersionHandler = (ctx: GatewayContext, next: () => Promise<void>) => Promise<void>;

export class VersionRouter {
    private handlers = new Map<string, VersionHandler>();
    private config: VersionConfig;
    private extractor: VersionExtractor;

    constructor(config: VersionConfig) {
        this.config = config;
        this.extractor = new VersionExtractor(config);
    }

    /**
     * Register handler for a version
     */
    version(version: string, handler: VersionHandler): this {
        this.handlers.set(version, handler);
        return this;
    }

    /**
     * Create middleware that routes to version-specific handlers
     */
    middleware(): GatewayMiddleware {
        return async (ctx: GatewayContext, next: () => Promise<void>) => {
            const version = this.extractor.extract(ctx.request);
            const validation = this.extractor.validate(version);

            ctx.version = version;

            if (!validation.valid) {
                ctx.response = {
                    status: 400,
                    headers: {},
                    body: {
                        error: 'Invalid API Version',
                        message: `Version '${version}' is not supported`,
                        supportedVersions: this.config.supportedVersions,
                    },
                };
                return;
            }

            // Find handler for this version
            let handler = this.handlers.get(version);

            // Fall back to default version handler
            if (!handler) {
                handler = this.handlers.get(this.config.defaultVersion);
            }

            if (handler) {
                await handler(ctx, next);
            } else {
                await next();
            }

            // Add version headers
            if (ctx.response) {
                const versionHeaders = this.extractor.getHeaders(version);
                ctx.response.headers = { ...ctx.response.headers, ...versionHeaders };
            }
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createVersionExtractor(config: VersionConfig): VersionExtractor {
    return new VersionExtractor(config);
}

export function createVersionRouter(config: VersionConfig): VersionRouter {
    return new VersionRouter(config);
}
