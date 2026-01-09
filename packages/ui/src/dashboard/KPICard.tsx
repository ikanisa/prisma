/**
 * KPI Card Component
 * 
 * Displays a single KPI metric with trend indicator, comparison to target,
 * and optional sparkline visualization.
 */

import React from 'react';
import type { KPIMetric, KPICardProps } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatValue(value: number, format: KPIMetric['format']): string {
    switch (format) {
        case 'currency':
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: value >= 1000000 ? 'compact' : 'standard',
                maximumFractionDigits: 1,
            }).format(value);
        case 'percent':
            return `${value.toFixed(1)}%`;
        case 'duration':
            if (value < 60) return `${Math.round(value)}m`;
            if (value < 1440) return `${Math.round(value / 60)}h`;
            return `${Math.round(value / 1440)}d`;
        default:
            return new Intl.NumberFormat('en-US', {
                notation: value >= 10000 ? 'compact' : 'standard',
                maximumFractionDigits: 1,
            }).format(value);
    }
}

function getTrendColor(trend: KPIMetric['trend'], isPositiveGood = true): string {
    if (!trend || trend === 'stable') return 'var(--color-neutral)';
    const isUp = trend === 'up';
    return (isUp === isPositiveGood) ? 'var(--color-success)' : 'var(--color-danger)';
}

function getStatusColor(status: KPIMetric['status']): string {
    switch (status) {
        case 'good': return 'var(--color-success)';
        case 'warning': return 'var(--color-warning)';
        case 'critical': return 'var(--color-danger)';
        default: return 'var(--color-neutral)';
    }
}

// ============================================================================
// SPARKLINE COMPONENT
// ============================================================================

interface SparklineProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
}

function Sparkline({ data, width = 80, height = 24, color = 'var(--color-primary)' }: SparklineProps): React.ReactElement {
    if (data.length < 2) return <svg width={width} height={height} />;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* End point dot */}
            <circle
                cx={(data.length - 1) / (data.length - 1) * width}
                cy={height - ((data[data.length - 1] - min) / range) * height}
                r="3"
                fill={color}
            />
        </svg>
    );
}

// ============================================================================
// TREND INDICATOR
// ============================================================================

interface TrendIndicatorProps {
    trend: KPIMetric['trend'];
    value?: number;
}

function TrendIndicator({ trend, value }: TrendIndicatorProps): React.ReactElement | null {
    if (!trend) return null;

    const icons = {
        up: '↑',
        down: '↓',
        stable: '→',
    };

    const color = getTrendColor(trend);

    return (
        <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.875rem' }}>
            {icons[trend]}
            {value !== undefined && <span>{Math.abs(value).toFixed(1)}%</span>}
        </span>
    );
}

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

const sizeStyles = {
    sm: {
        padding: '12px 16px',
        valueSize: '1.5rem',
        labelSize: '0.75rem',
    },
    md: {
        padding: '16px 20px',
        valueSize: '2rem',
        labelSize: '0.875rem',
    },
    lg: {
        padding: '20px 24px',
        valueSize: '2.5rem',
        labelSize: '1rem',
    },
};

export function KPICard({
    metric,
    size = 'md',
    showTrend = true,
    showSparkline = false,
    onClick,
}: KPICardProps): React.ReactElement {
    const styles = sizeStyles[size];
    const hasTarget = metric.target !== undefined;
    const progressPercent = hasTarget ? Math.min(100, (metric.value / metric.target!) * 100) : undefined;

    return (
        <div
            onClick={onClick}
            style={{
                background: 'var(--color-card-bg, #ffffff)',
                borderRadius: '12px',
                padding: styles.padding,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid var(--color-border, #e5e7eb)',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s, transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
            }}
            onMouseOver={(e) => {
                if (onClick) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                    fontSize: styles.labelSize,
                    color: 'var(--color-text-secondary, #6b7280)',
                    fontWeight: 500,
                }}>
                    {metric.label}
                </span>
                {metric.status && (
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getStatusColor(metric.status),
                    }} />
                )}
            </div>

            {/* Value and Trend */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{
                    fontSize: styles.valueSize,
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #111827)',
                    lineHeight: 1.2,
                }}>
                    {formatValue(metric.value, metric.format)}
                </span>
                {showTrend && <TrendIndicator trend={metric.trend} value={metric.trendValue} />}
            </div>

            {/* Sparkline */}
            {showSparkline && metric.sparklineData && (
                <div style={{ marginTop: '4px' }}>
                    <Sparkline data={metric.sparklineData} />
                </div>
            )}

            {/* Target Progress */}
            {hasTarget && progressPercent !== undefined && (
                <div style={{ marginTop: '4px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary, #6b7280)',
                        marginBottom: '4px',
                    }}>
                        <span>Target: {formatValue(metric.target!, metric.format)}</span>
                        <span>{progressPercent.toFixed(0)}%</span>
                    </div>
                    <div style={{
                        height: '4px',
                        background: 'var(--color-bg-secondary, #f3f4f6)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: progressPercent >= 100
                                ? 'var(--color-success, #10b981)'
                                : 'var(--color-primary, #3b82f6)',
                            borderRadius: '2px',
                            transition: 'width 0.3s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* Comparison to Previous */}
            {metric.previousValue !== undefined && (
                <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary, #6b7280)',
                }}>
                    vs. {formatValue(metric.previousValue, metric.format)} prior period
                </div>
            )}
        </div>
    );
}

// ============================================================================
// KPI GRID COMPONENT
// ============================================================================

interface KPIGridProps {
    metrics: KPIMetric[];
    columns?: 2 | 3 | 4 | 5;
    size?: 'sm' | 'md' | 'lg';
    showSparklines?: boolean;
    onMetricClick?: (metric: KPIMetric) => void;
}

export function KPIGrid({
    metrics,
    columns = 4,
    size = 'md',
    showSparklines = false,
    onMetricClick,
}: KPIGridProps): React.ReactElement {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: '16px',
        }}>
            {metrics.map((metric) => (
                <KPICard
                    key={metric.id}
                    metric={metric}
                    size={size}
                    showSparkline={showSparklines}
                    onClick={onMetricClick ? () => onMetricClick(metric) : undefined}
                />
            ))}
        </div>
    );
}

export default KPICard;
