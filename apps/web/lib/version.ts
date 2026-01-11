/**
 * Application Version Configuration
 * 
 * Semantic versioning for the application.
 * Addresses: Audit High Priority #12 - Implement semantic versioning
 */

/**
 * Current application version
 * Format: MAJOR.MINOR.PATCH
 * 
 * - MAJOR: Breaking changes
 * - MINOR: New features (backwards compatible)
 * - PATCH: Bug fixes (backwards compatible)
 */
export const VERSION = '3.0.0' as const;

/**
 * Version metadata
 */
export const VERSION_INFO = {
    version: VERSION,
    name: 'Prisma Glow',
    codename: 'Production Readiness',
    releaseDate: '2026-01-11',

    // Build info (populated at build time)
    buildNumber: process.env.BUILD_NUMBER || 'local',
    commitSha: process.env.COMMIT_SHA || 'unknown',
    branch: process.env.BRANCH || 'main',

    // Runtime info
    nodeVersion: process.version || 'unknown',
    environment: process.env.NODE_ENV || 'development',
} as const;

/**
 * Get version string for display
 */
export function getVersionString(): string {
    return `v${VERSION}`;
}

/**
 * Get full version info for debugging
 */
export function getFullVersionInfo(): typeof VERSION_INFO {
    return VERSION_INFO;
}

/**
 * Compare versions (semver)
 */
export function compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (partsA[i] > partsB[i]) return 1;
        if (partsA[i] < partsB[i]) return -1;
    }

    return 0;
}

/**
 * Check if current version is newer than given version
 */
export function isNewerVersion(other: string): boolean {
    return compareVersions(VERSION, other) > 0;
}
