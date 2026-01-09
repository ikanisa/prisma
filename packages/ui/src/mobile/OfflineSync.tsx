/**
 * Offline Sync Indicator
 * 
 * Shows sync status and pending items for offline-first functionality.
 */

import React, { useState } from 'react';
import type { OfflineSyncState, SyncItem, SyncStatus } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const statusConfig: Record<SyncStatus, { color: string; icon: string; label: string }> = {
    synced: { color: '#10b981', icon: '✓', label: 'Synced' },
    pending: { color: '#f59e0b', icon: '○', label: 'Pending' },
    syncing: { color: '#3b82f6', icon: '↻', label: 'Syncing' },
    error: { color: '#ef4444', icon: '✕', label: 'Error' },
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(diff / 3600000);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// SYNC INDICATOR BAR
// ============================================================================

interface SyncIndicatorProps {
    state: OfflineSyncState;
    onSyncNow?: () => void;
    onShowDetails?: () => void;
}

export function SyncIndicator({ state, onSyncNow, onShowDetails }: SyncIndicatorProps): React.ReactElement {
    if (state.isOnline && state.pendingItems.length === 0) {
        return <></>;
    }

    const hasErrors = state.pendingItems.some(i => i.status === 'error');
    const isSyncing = state.pendingItems.some(i => i.status === 'syncing');

    return (
        <div
            onClick={onShowDetails}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: state.isOnline
                    ? (hasErrors ? '#fef2f2' : '#fffbeb')
                    : '#f3f4f6',
                borderBottom: '1px solid',
                borderColor: state.isOnline
                    ? (hasErrors ? '#fecaca' : '#fcd34d')
                    : '#e5e7eb',
                cursor: onShowDetails ? 'pointer' : 'default',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Status Icon */}
                <span style={{
                    fontSize: '1rem',
                    animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                }}>
                    {!state.isOnline ? '📵' : isSyncing ? '↻' : hasErrors ? '⚠' : '○'}
                </span>

                {/* Status Text */}
                <span style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                }}>
                    {!state.isOnline
                        ? 'Offline mode'
                        : isSyncing
                            ? 'Syncing...'
                            : hasErrors
                                ? `${state.pendingItems.filter(i => i.status === 'error').length} sync errors`
                                : `${state.totalPending} pending`
                    }
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Size */}
                {state.totalSize > 0 && (
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        {formatBytes(state.totalSize)}
                    </span>
                )}

                {/* Sync Button */}
                {state.isOnline && !isSyncing && state.pendingItems.length > 0 && onSyncNow && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSyncNow();
                        }}
                        style={{
                            padding: '4px 12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--color-primary)',
                            color: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        Sync Now
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SYNC DETAIL PANEL
// ============================================================================

interface SyncDetailPanelProps {
    state: OfflineSyncState;
    onRetry?: (itemId: string) => void;
    onRemove?: (itemId: string) => void;
    onClose?: () => void;
}

export function SyncDetailPanel({ state, onRetry, onRemove, onClose }: SyncDetailPanelProps): React.ReactElement {
    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            maxHeight: '60vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                        Sync Status
                    </h3>
                    {state.lastSyncTime && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-tertiary)',
                        }}>
                            Last synced: {formatRelativeTime(state.lastSyncTime)}
                        </span>
                    )}
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            padding: '4px',
                        }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Summary */}
            <div style={{
                display: 'flex',
                gap: '16px',
                padding: '12px 16px',
                background: 'var(--color-bg-secondary)',
            }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {state.pendingItems.filter(i => i.status === 'pending').length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                        Pending
                    </div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {state.pendingItems.filter(i => i.status === 'syncing').length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                        Syncing
                    </div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                        {state.pendingItems.filter(i => i.status === 'error').length}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)' }}>
                        Errors
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                {state.pendingItems.map(item => {
                    const config = statusConfig[item.status];

                    return (
                        <div
                            key={item.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 16px',
                            }}
                        >
                            {/* Status */}
                            <span style={{
                                color: config.color,
                                fontSize: '1rem',
                            }}>
                                {config.icon}
                            </span>

                            {/* Info */}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'var(--color-text-primary)',
                                }}>
                                    {item.name}
                                </div>
                                {item.error && (
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--color-danger)',
                                    }}>
                                        {item.error}
                                    </div>
                                )}
                            </div>

                            {/* Size */}
                            {item.size && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    {formatBytes(item.size)}
                                </span>
                            )}

                            {/* Actions */}
                            {item.status === 'error' && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {onRetry && (
                                        <button
                                            onClick={() => onRetry(item.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '0.7rem',
                                                borderRadius: '4px',
                                                border: '1px solid var(--color-border)',
                                                background: 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Retry
                                        </button>
                                    )}
                                    {onRemove && (
                                        <button
                                            onClick={() => onRemove(item.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '0.7rem',
                                                borderRadius: '4px',
                                                border: '1px solid var(--color-danger)',
                                                color: 'var(--color-danger)',
                                                background: 'white',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default SyncIndicator;
