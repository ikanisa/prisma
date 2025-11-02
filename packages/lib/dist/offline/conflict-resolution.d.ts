export type DeterministicWinner = 'local' | 'remote' | 'mixed';
export interface SyncMetadata {
    clientId: string;
    version: number;
    updatedAt: number;
}
export interface SyncSnapshot<TValue extends Record<string, unknown>> {
    entityType: string;
    entityId: string;
    data: TValue;
    metadata: SyncMetadata;
}
export interface MergeConflict<TValue extends Record<string, unknown>> {
    field: string;
    baseValue: unknown;
    localValue: unknown;
    remoteValue: unknown;
    resolvedValue: unknown;
    winner: 'local' | 'remote';
}
export interface MergeResult<TValue extends Record<string, unknown>> {
    merged: SyncSnapshot<TValue>;
    conflicts: MergeConflict<TValue>[];
    winner: DeterministicWinner;
}
export declare function deterministicMerge<TValue extends Record<string, unknown>>(base: SyncSnapshot<TValue> | null, local: SyncSnapshot<TValue>, remote: SyncSnapshot<TValue>): MergeResult<TValue>;
//# sourceMappingURL=conflict-resolution.d.ts.map