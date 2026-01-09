/**
 * Alert Summary Widget
 * 
 * Displays a prioritized list of dashboard alerts with severity indicators,
 * action buttons, and read/unread state management.
 */

import React, { useState } from 'react';
import type { DashboardAlert, AlertSummaryProps, AlertType } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const severityConfig = {
    info: {
        bg: '#eff6ff',
        border: '#bfdbfe',
        text: '#1e40af',
        icon: 'ℹ',
    },
    warning: {
        bg: '#fffbeb',
        border: '#fcd34d',
        text: '#b45309',
        icon: '⚠',
    },
    critical: {
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b',
        icon: '🔴',
    },
};

const typeIcons: Record<AlertType, string> = {
    deadline: '⏰',
    risk: '⚡',
    approval: '✓',
    system: '⚙',
    mention: '@',
    task: '📋',
};

function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

// ============================================================================
// SINGLE ALERT ITEM
// ============================================================================

interface AlertItemProps {
    alert: DashboardAlert;
    onClick?: (alert: DashboardAlert) => void;
}

function AlertItem({ alert, onClick }: AlertItemProps): React.ReactElement {
    const severity = severityConfig[alert.severity];
    const typeIcon = typeIcons[alert.type];

    return (
        <div
            onClick={() => onClick?.(alert)}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: alert.read ? 'transparent' : severity.bg,
                border: `1px solid ${alert.read ? 'var(--color-border-light)' : severity.border}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                opacity: alert.read ? 0.7 : 1,
            }}
        >
            {/* Icon */}
            <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: severity.bg,
                border: `1px solid ${severity.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0,
            }}>
                {typeIcon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '8px',
                }}>
                    <span style={{
                        fontWeight: alert.read ? 500 : 600,
                        color: 'var(--color-text-primary)',
                        fontSize: '0.875rem',
                        lineHeight: 1.3,
                    }}>
                        {alert.title}
                    </span>
                    {!alert.read && (
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: severity.text,
                            flexShrink: 0,
                            marginTop: '4px',
                        }} />
                    )}
                </div>
                <p style={{
                    margin: '4px 0 0 0',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                }}>
                    {alert.message}
                </p>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '8px',
                }}>
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        {formatRelativeTime(alert.timestamp)}
                    </span>
                    {alert.source && (
                        <>
                            <span style={{ color: 'var(--color-border)', fontSize: '0.7rem' }}>•</span>
                            <span style={{
                                fontSize: '0.7rem',
                                color: 'var(--color-text-tertiary)',
                            }}>
                                {alert.source.name}
                            </span>
                        </>
                    )}
                    {alert.actionLabel && (
                        <button style={{
                            marginLeft: 'auto',
                            padding: '4px 10px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: `1px solid ${severity.border}`,
                            background: 'white',
                            color: severity.text,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}>
                            {alert.actionLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// ALERT SUMMARY
// ============================================================================

export function AlertSummary({
    alerts,
    maxVisible = 5,
    onAlertClick,
    onMarkAllRead,
}: AlertSummaryProps): React.ReactElement {
    const [showAll, setShowAll] = useState(false);

    const unreadCount = alerts.filter(a => !a.read).length;
    const visibleAlerts = showAll ? alerts : alerts.slice(0, maxVisible);
    const hasMore = alerts.length > maxVisible;

    // Sort by severity then date
    const sortedAlerts = [...visibleAlerts].sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (sevDiff !== 0) return sevDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
    });

    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid var(--color-border, #e5e7eb)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                    }}>
                        Alerts
                    </h3>
                    {unreadCount > 0 && (
                        <span style={{
                            background: 'var(--color-primary, #3b82f6)',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                        }}>
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && onMarkAllRead && (
                    <button
                        onClick={onMarkAllRead}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            padding: '4px 8px',
                        }}
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Alert List */}
            <div style={{ padding: '12px 16px' }}>
                {sortedAlerts.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: 'var(--color-text-tertiary)',
                        fontSize: '0.875rem',
                    }}>
                        No alerts at this time
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sortedAlerts.map(alert => (
                            <AlertItem
                                key={alert.id}
                                alert={alert}
                                onClick={onAlertClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {hasMore && (
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--color-border-light)',
                    textAlign: 'center',
                }}>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        {showAll ? 'Show less' : `View all ${alerts.length} alerts`}
                    </button>
                </div>
            )}
        </div>
    );
}

export default AlertSummary;
