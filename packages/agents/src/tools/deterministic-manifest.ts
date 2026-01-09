/**
 * Deterministic Manifest Utilities
 *
 * Creates and validates deterministic computation manifests for auditability.
 */

import crypto from 'node:crypto';

export type ManifestAlgorithm = 'sha256';

export interface DeterministicManifest<TInput = unknown, TOutput = unknown> {
    version: '1.0';
    generatedAt: string;
    algorithm: ManifestAlgorithm;
    hash: string;
    tool: string;
    inputs: TInput;
    outputs: TOutput;
    evidenceIds: string[];
}

export interface ManifestPayload<TInput = unknown, TOutput = unknown> {
    tool: string;
    inputs: TInput;
    outputs: TOutput;
    evidenceIds?: string[];
    algorithm?: ManifestAlgorithm;
}

export interface ManifestValidationResult {
    valid: boolean;
    reason?: string;
    computedHash?: string;
}

export function createDeterministicManifest<TInput, TOutput>(
    payload: ManifestPayload<TInput, TOutput>
): DeterministicManifest<TInput, TOutput> {
    const algorithm = payload.algorithm ?? 'sha256';
    const evidenceIds = payload.evidenceIds ?? [];
    const hashPayload = {
        version: '1.0' as const,
        tool: payload.tool,
        inputs: payload.inputs,
        outputs: payload.outputs,
        evidenceIds,
    };

    const hash = computeManifestHash(hashPayload, algorithm);

    return {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        algorithm,
        hash,
        tool: payload.tool,
        inputs: payload.inputs,
        outputs: payload.outputs,
        evidenceIds,
    };
}

export function validateDeterministicManifest(
    manifest?: DeterministicManifest
): ManifestValidationResult {
    if (!manifest) {
        return { valid: false, reason: 'missing_manifest' };
    }

    if (!manifest.hash || !manifest.algorithm) {
        return { valid: false, reason: 'missing_hash' };
    }

    const computedHash = computeManifestHash(
        {
            version: manifest.version,
            tool: manifest.tool,
            inputs: manifest.inputs,
            outputs: manifest.outputs,
            evidenceIds: manifest.evidenceIds ?? [],
        },
        manifest.algorithm
    );

    if (computedHash !== manifest.hash) {
        return { valid: false, reason: 'hash_mismatch', computedHash };
    }

    return { valid: true, computedHash };
}

export function computeManifestHash(
    payload: {
        version: string;
        tool: string;
        inputs: unknown;
        outputs: unknown;
        evidenceIds: string[];
    },
    algorithm: ManifestAlgorithm = 'sha256'
): string {
    const serialized = stableStringify(payload);
    return crypto.createHash(algorithm).update(serialized).digest('hex');
}

function stableStringify(value: unknown): string {
    if (value === undefined) {
        return 'null';
    }

    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (value instanceof Date) {
        return JSON.stringify(value.toISOString());
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const entries = keys.map((key) => `"${key}":${stableStringify(record[key])}`);

    return `{${entries.join(',')}}`;
}
