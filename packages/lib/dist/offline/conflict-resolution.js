const valueChanged = (left, right) => {
    if (left === right) {
        return false;
    }
    if (typeof left === 'number' && typeof right === 'number' && Number.isNaN(left) && Number.isNaN(right)) {
        return false;
    }
    return true;
};
const compareMetadataPriority = (local, remote) => {
    if (local.updatedAt !== remote.updatedAt) {
        return local.updatedAt > remote.updatedAt ? 'local' : 'remote';
    }
    if (local.version !== remote.version) {
        return local.version > remote.version ? 'local' : 'remote';
    }
    if (local.clientId !== remote.clientId) {
        return local.clientId.localeCompare(remote.clientId) <= 0 ? 'local' : 'remote';
    }
    return 'local';
};
const sortKeys = (keys) => Array.from(new Set(keys)).sort();
export function deterministicMerge(base, local, remote) {
    const resultData = {};
    const conflicts = [];
    let resolvedByLocal = false;
    let resolvedByRemote = false;
    const allKeys = sortKeys([
        ...Object.keys(base?.data ?? {}),
        ...Object.keys(local.data),
        ...Object.keys(remote.data),
    ]);
    for (const key of allKeys) {
        const typedKey = key;
        const baseValue = base?.data?.[typedKey];
        const localValue = local.data[typedKey];
        const remoteValue = remote.data[typedKey];
        const localChanged = !base || valueChanged(localValue, baseValue);
        const remoteChanged = !base || valueChanged(remoteValue, baseValue);
        if (!localChanged && !remoteChanged) {
            resultData[key] = baseValue;
            continue;
        }
        if (!localChanged && remoteChanged) {
            resultData[key] = remoteValue;
            resolvedByRemote = true;
            continue;
        }
        if (localChanged && !remoteChanged) {
            resultData[key] = localValue;
            resolvedByLocal = true;
            continue;
        }
        if (!valueChanged(localValue, remoteValue)) {
            resultData[key] = remoteValue;
            continue;
        }
        const winner = compareMetadataPriority(local.metadata, remote.metadata);
        const resolvedValue = winner === 'local' ? localValue : remoteValue;
        if (winner === 'local') {
            resolvedByLocal = true;
        }
        else {
            resolvedByRemote = true;
        }
        conflicts.push({
            field: key,
            baseValue,
            localValue,
            remoteValue,
            resolvedValue,
            winner,
        });
        resultData[key] = resolvedValue;
    }
    const metadataWinner = compareMetadataPriority(local.metadata, remote.metadata);
    const mergedMetadata = {
        updatedAt: Math.max(local.metadata.updatedAt, remote.metadata.updatedAt),
        version: Math.max(local.metadata.version, remote.metadata.version),
        clientId: metadataWinner === 'local' ? local.metadata.clientId : remote.metadata.clientId,
    };
    const winner = resolvedByLocal && resolvedByRemote
        ? 'mixed'
        : resolvedByLocal
            ? 'local'
            : 'remote';
    return {
        merged: {
            entityType: remote.entityType,
            entityId: remote.entityId,
            data: resultData,
            metadata: mergedMetadata,
        },
        conflicts,
        winner,
    };
}
