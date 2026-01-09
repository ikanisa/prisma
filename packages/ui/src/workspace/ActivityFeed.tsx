/**
 * Activity Feed Component
 * 
 * Real-time activity stream showing engagement-related events.
 */

import React from 'react';
import type { ActivityItem, ActivityFeedProps, ActivityType } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const activityConfig: Record<ActivityType, { icon: string; color: string }> = {
    task_created: { icon: '➕', color: '#3b82f6' },
    task_completed: { icon: '✓', color: '#10b981' },
    task_assigned: { icon: '👤', color: '#8b5cf6' },
    document_uploaded: { icon: '📄', color: '#06b6d4' },
    document_approved: { icon: '✅', color: '#10b981' },
    workpaper_reviewed: { icon: '👁', color: '#8b5cf6' },
    comment_added: { icon: '💬', color: '#6b7280' },
    issue_raised: { icon: '⚠', color: '#f59e0b' },
    issue_resolved: { icon: '🔧', color: '#10b981' },
    team_joined: { icon: '👋', color: '#3b82f6' },
    deadline_updated: { icon: '📅', color: '#f59e0b' },
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
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// ACTIVITY ITEM
// ============================================================================

interface ActivityItemComponentProps {
    activity: ActivityItem;
    onClick?: (activity: ActivityItem) => void;
}

function ActivityItemComponent({ activity, onClick }: ActivityItemComponentProps): React.ReactElement {
    const config = activityConfig[activity.type];

    return (
        <div
            onClick={() => onClick?.(activity)}
            style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 16px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
            }}
            onMouseOver={(e) => {
                if (onClick) {
                    e.currentTarget.style.background = 'var(--color-bg-hover, #f9fafb)';
                }
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
            }}
        >
            {/* Icon */}
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                flexShrink: 0,
            }}>
                {config.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.4,
                }}>
                    <span style={{ fontWeight: 600 }}>{activity.userName}</span>
                    {' '}
                    <span>{activity.message}</span>
                    {activity.targetName && (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                            {' '}{activity.targetName}
                        </span>
                    )}
                </p>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                }}>
                    {formatRelativeTime(activity.timestamp)}
                </span>
            </div>
        </div>
    );
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export function ActivityFeed({
    activities,
    maxItems = 20,
    onActivityClick,
}: ActivityFeedProps): React.ReactElement {
    const visibleActivities = activities.slice(0, maxItems);

    // Group by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groupedActivities = new Map<string, ActivityItem[]>();

    for (const activity of visibleActivities) {
        const actDate = new Date(activity.timestamp);
        actDate.setHours(0, 0, 0, 0);

        let label: string;
        if (actDate.getTime() === today.getTime()) {
            label = 'Today';
        } else if (actDate.getTime() === yesterday.getTime()) {
            label = 'Yesterday';
        } else {
            label = actDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        if (!groupedActivities.has(label)) {
            groupedActivities.set(label, []);
        }
        groupedActivities.get(label)!.push(activity);
    }

    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <span style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                }}>
                    Activity
                </span>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                }}>
                    {activities.length} events
                </span>
            </div>

            {/* Feed */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {[...groupedActivities.entries()].map(([dateLabel, items]) => (
                    <div key={dateLabel}>
                        {/* Date Header */}
                        <div style={{
                            padding: '8px 16px',
                            background: 'var(--color-bg-secondary)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--color-text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {dateLabel}
                        </div>

                        {/* Activities */}
                        {items.map(activity => (
                            <ActivityItemComponent
                                key={activity.id}
                                activity={activity}
                                onClick={onActivityClick}
                            />
                        ))}
                    </div>
                ))}

                {activities.length === 0 && (
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: 'var(--color-text-tertiary)',
                        fontSize: '0.875rem',
                    }}>
                        No recent activity
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivityFeed;
