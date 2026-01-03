'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, X, RefreshCw } from 'lucide-react';
import type { OfflineDocument } from '@/lib/pwa/db';

interface Conflict {
  id: string;
  local: OfflineDocument;
  server: OfflineDocument;
  conflictType: 'content' | 'metadata' | 'both';
}

interface ConflictResolutionProps {
  conflicts: Conflict[];
  onResolve: (id: string, resolution: 'local' | 'server' | 'merge') => Promise<void>;
  onDismiss?: () => void;
}

export function ConflictResolution({
  conflicts,
  onResolve,
  onDismiss,
}: ConflictResolutionProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  if (conflicts.length === 0) {
    return null;
  }

  const handleResolve = async (
    id: string,
    resolution: 'local' | 'server' | 'merge'
  ) => {
    setResolving(id);
    try {
      await onResolve(id, resolution);
      setResolved((prev) => new Set(prev).add(id));
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolving(null);
    }
  };

  const unresolvedConflicts = conflicts.filter((c) => !resolved.has(c.id));

  if (unresolvedConflicts.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">All conflicts resolved</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-yellow-500/50 bg-yellow-500/10 shadow-lg">
      <div className="flex items-center justify-between border-b border-yellow-500/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
            Sync Conflicts ({unresolvedConflicts.length})
          </h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="rounded p-1 hover:bg-yellow-500/20"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto p-4">
        {unresolvedConflicts.map((conflict) => (
          <div
            key={conflict.id}
            className="mb-4 rounded border border-yellow-500/30 bg-white/50 p-3 last:mb-0 dark:bg-gray-800/50"
          >
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {conflict.local.title || 'Untitled Document'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Conflict: {conflict.conflictType}
              </p>
            </div>

            <div className="mb-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Local:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {new Date(conflict.local.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Server:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {new Date(conflict.server.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleResolve(conflict.id, 'local')}
                disabled={resolving === conflict.id}
                className="flex-1 rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {resolving === conflict.id ? (
                  <RefreshCw className="mx-auto h-3 w-3 animate-spin" />
                ) : (
                  'Use Local'
                )}
              </button>
              <button
                onClick={() => handleResolve(conflict.id, 'server')}
                disabled={resolving === conflict.id}
                className="flex-1 rounded bg-gray-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600 disabled:opacity-50"
              >
                {resolving === conflict.id ? (
                  <RefreshCw className="mx-auto h-3 w-3 animate-spin" />
                ) : (
                  'Use Server'
                )}
              </button>
              <button
                onClick={() => handleResolve(conflict.id, 'merge')}
                disabled={resolving === conflict.id}
                className="flex-1 rounded bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {resolving === conflict.id ? (
                  <RefreshCw className="mx-auto h-3 w-3 animate-spin" />
                ) : (
                  'Merge'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

