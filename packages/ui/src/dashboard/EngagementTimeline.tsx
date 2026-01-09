/**
 * Engagement Timeline Component
 * 
 * Displays engagements in various views: list, timeline, or calendar.
 * Shows progress, risk levels, and team assignments.
 */

import React, { useState } from 'react';
import type { EngagementStatus, EngagementTimelineProps, EngagementPhase } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const phaseConfig: Record<EngagementPhase, { color: string; bg: string; label: string; icon: string }> = {
    planning: { color: '#3b82f6', bg: '#eff6ff', label: 'Planning', icon: '📋' },
    fieldwork: { color: '#f59e0b', bg: '#fffbeb', label: 'Fieldwork', icon: '🔍' },
    review: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Review', icon: '👁' },
    reporting: { color: '#06b6d4', bg: '#ecfeff', label: 'Reporting', icon: '📊' },
    completed: { color: '#10b981', bg: '#d1fae5', label: 'Completed', icon: '✓' },
    on_hold: { color: '#6b7280', bg: '#f3f4f6', label: 'On Hold', icon: '⏸' },
};

const riskColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
};

function formatDaysRemaining(days: number): { text: string; urgent: boolean } {
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, urgent: true };
    if (days === 0) return { text: 'Due today', urgent: true };
    if (days <= 7) return { text: `${days}d left`, urgent: true };
    if (days <= 14) return { text: `${days}d left`, urgent: false };
    return { text: `${days}d left`, urgent: false };
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ProgressBarProps {
    progress: number;
    phase: EngagementPhase;
    size?: 'sm' | 'md';
}

function ProgressBar({ progress, phase, size = 'sm' }: ProgressBarProps): React.ReactElement {
    const phaseInfo = phaseConfig[phase];
    const heights = { sm: '4px', md: '8px' };

    return (
        <div style={{
            height: heights[size],
            background: 'var(--color-bg-secondary, #f3f4f6)',
            borderRadius: '4px',
            overflow: 'hidden',
        }}>
            <div style={{
                width: `${progress}%`,
                height: '100%',
                background: phase === 'completed'
                    ? phaseInfo.color
                    : `linear-gradient(90deg, ${phaseInfo.color} 0%, ${phaseInfo.color}aa 100%)`,
                borderRadius: '4px',
                transition: 'width 0.3s ease',
            }} />
        </div>
    );
}

// ============================================================================
// PHASE BADGE
// ============================================================================

function PhaseBadge({ phase }: { phase: EngagementPhase }): React.ReactElement {
    const info = phaseConfig[phase];

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: info.bg,
            color: info.color,
        }}>
            <span>{info.icon}</span>
            {info.label}
        </span>
    );
}

// ============================================================================
// TEAM AVATARS
// ============================================================================

interface TeamAvatarsProps {
    team: EngagementStatus['team'];
    maxVisible?: number;
}

function TeamAvatars({ team, maxVisible = 3 }: TeamAvatarsProps): React.ReactElement {
    const visible = team.slice(0, maxVisible);
    const remaining = team.length - maxVisible;

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {visible.map((member, index) => (
                <div
                    key={member.id}
                    title={`${member.name} (${member.role})`}
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: `hsl(${(index * 60) % 360}, 60%, 70%)`,
                        border: '2px solid white',
                        marginLeft: index > 0 ? '-8px' : 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'white',
                        zIndex: visible.length - index,
                    }}
                >
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
            ))}
            {remaining > 0 && (
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-bg-secondary)',
                    border: '2px solid white',
                    marginLeft: '-8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'var(--color-text-secondary)',
                }}>
                    +{remaining}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ENGAGEMENT CARD (List View)
// ============================================================================

interface EngagementCardProps {
    engagement: EngagementStatus;
    onClick?: (engagement: EngagementStatus) => void;
}

function EngagementCard({ engagement, onClick }: EngagementCardProps): React.ReactElement {
    const daysInfo = formatDaysRemaining(engagement.daysRemaining);

    return (
        <div
            onClick={() => onClick?.(engagement)}
            style={{
                background: 'var(--color-card-bg, white)',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid var(--color-border)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
            }}>
                <div>
                    <h4 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                    }}>
                        {engagement.name}
                    </h4>
                    <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)',
                    }}>
                        {engagement.clientName}
                    </span>
                </div>
                <PhaseBadge phase={engagement.phase} />
            </div>

            {/* Progress */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    fontSize: '0.75rem',
                }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Progress</span>
                    <span style={{ fontWeight: 600 }}>{engagement.progress}%</span>
                </div>
                <ProgressBar progress={engagement.progress} phase={engagement.phase} size="md" />
            </div>

            {/* Footer */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Risk Indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: riskColors[engagement.riskLevel],
                        }} />
                        <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                            {engagement.riskLevel} risk
                        </span>
                    </div>

                    {/* Issues */}
                    {engagement.openIssues > 0 && (
                        <span style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                        }}>
                            {engagement.openIssues} open issues
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Due Date */}
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: daysInfo.urgent ? 600 : 400,
                        color: daysInfo.urgent ? 'var(--color-danger, #ef4444)' : 'var(--color-text-secondary)',
                    }}>
                        {daysInfo.text}
                    </span>

                    {/* Team */}
                    <TeamAvatars team={engagement.team} />
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// VIEW TOGGLE
// ============================================================================

interface ViewToggleProps {
    view: 'list' | 'timeline' | 'calendar';
    onChange: (view: 'list' | 'timeline' | 'calendar') => void;
}

function ViewToggle({ view, onChange }: ViewToggleProps): React.ReactElement {
    const options: Array<{ value: 'list' | 'timeline' | 'calendar'; icon: string; label: string }> = [
        { value: 'list', icon: '≡', label: 'List' },
        { value: 'timeline', icon: '━', label: 'Timeline' },
        { value: 'calendar', icon: '▦', label: 'Calendar' },
    ];

    return (
        <div style={{
            display: 'flex',
            background: 'var(--color-bg-secondary)',
            borderRadius: '8px',
            padding: '4px',
        }}>
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    title={option.label}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: view === option.value ? 'white' : 'transparent',
                        boxShadow: view === option.value ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                    }}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
}

// ============================================================================
// ENGAGEMENT TIMELINE
// ============================================================================

export function EngagementTimeline({
    engagements,
    view: initialView = 'list',
    onEngagementClick,
}: EngagementTimelineProps): React.ReactElement {
    const [view, setView] = useState<'list' | 'timeline' | 'calendar'>(initialView);

    // Group by phase for list view
    const phaseOrder: EngagementPhase[] = ['fieldwork', 'planning', 'review', 'reporting', 'completed', 'on_hold'];
    const sortedEngagements = [...engagements].sort((a, b) => {
        const phaseCompare = phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase);
        if (phaseCompare !== 0) return phaseCompare;
        return a.daysRemaining - b.daysRemaining;
    });

    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid var(--color-border)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <div>
                    <h3 style={{
                        margin: '0 0 4px 0',
                        fontSize: '1.125rem',
                        fontWeight: 600,
                    }}>
                        Engagements
                    </h3>
                    <span style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-text-secondary)',
                    }}>
                        {engagements.length} active engagements
                    </span>
                </div>
                <ViewToggle view={view} onChange={setView} />
            </div>

            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
                {view === 'list' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sortedEngagements.map(engagement => (
                            <EngagementCard
                                key={engagement.id}
                                engagement={engagement}
                                onClick={onEngagementClick}
                            />
                        ))}
                    </div>
                )}

                {view === 'timeline' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        position: 'relative',
                        paddingLeft: '24px',
                    }}>
                        {/* Vertical line */}
                        <div style={{
                            position: 'absolute',
                            left: '8px',
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            background: 'var(--color-border)',
                        }} />

                        {sortedEngagements.map(engagement => (
                            <div
                                key={engagement.id}
                                onClick={() => onEngagementClick?.(engagement)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '8px 12px',
                                    marginLeft: '8px',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                            >
                                {/* Dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-24px',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: phaseConfig[engagement.phase].color,
                                    border: '2px solid white',
                                }} />

                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 500 }}>{engagement.name}</span>
                                    <span style={{
                                        marginLeft: '8px',
                                        fontSize: '0.8rem',
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        {engagement.clientName}
                                    </span>
                                </div>

                                <ProgressBar progress={engagement.progress} phase={engagement.phase} />
                                <span style={{ width: '80px', textAlign: 'right', fontSize: '0.8rem' }}>
                                    {engagement.progress}%
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'calendar' && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Calendar view coming soon
                    </div>
                )}
            </div>
        </div>
    );
}

export default EngagementTimeline;
