/**
 * Trend Chart Component
 * 
 * SVG-based chart component for time series data visualization.
 * Supports line, area, and bar chart types.
 */

import React from 'react';
import type { TimeSeriesDataPoint, ChartConfig } from './types';

// ============================================================================
// CHART UTILITIES
// ============================================================================

interface ChartDimensions {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
}

function getChartArea(dims: ChartDimensions) {
    return {
        x: dims.padding.left,
        y: dims.padding.top,
        width: dims.width - dims.padding.left - dims.padding.right,
        height: dims.height - dims.padding.top - dims.padding.bottom,
    };
}

function scaleValue(value: number, min: number, max: number, targetMin: number, targetMax: number): number {
    if (max === min) return targetMin;
    return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}

const defaultColors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
];

// ============================================================================
// LINE CHART
// ============================================================================

interface TrendChartProps {
    data: TimeSeriesDataPoint[];
    config?: Partial<ChartConfig>;
    width?: number;
    height?: number;
    categories?: string[];
}

export function TrendChart({
    data,
    config = {},
    width = 400,
    height = 200,
    categories,
}: TrendChartProps): React.ReactElement {
    const {
        type = 'line',
        title,
        xAxisLabel,
        yAxisLabel,
        showLegend = true,
        showGrid = true,
        colors = defaultColors,
    } = config;

    const dims: ChartDimensions = {
        width,
        height,
        padding: { top: 20, right: 20, bottom: 40, left: 50 },
    };

    const area = getChartArea(dims);

    // Group data by category
    const groupedData = new Map<string, TimeSeriesDataPoint[]>();
    const allCategories = categories ?? [...new Set(data.map(d => d.category ?? 'default'))];

    for (const category of allCategories) {
        groupedData.set(
            category,
            data.filter(d => (d.category ?? 'default') === category)
        );
    }

    // Calculate scales
    const allValues = data.map(d => d.value);
    const minValue = Math.min(0, ...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const yMin = minValue - valueRange * 0.1;
    const yMax = maxValue + valueRange * 0.1;

    const dates = data.map(d => d.date.getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    // Generate grid lines
    const yTicks = 5;
    const gridLines = Array.from({ length: yTicks }, (_, i) => {
        const value = yMin + ((yMax - yMin) / (yTicks - 1)) * i;
        const y = scaleValue(value, yMin, yMax, area.y + area.height, area.y);
        return { value, y };
    });

    // Generate paths for each category
    const paths = Array.from(groupedData.entries()).map(([category, points], catIndex) => {
        if (points.length === 0) return null;

        const sortedPoints = [...points].sort((a, b) => a.date.getTime() - b.date.getTime());
        const color = colors[catIndex % colors.length];

        const pathPoints = sortedPoints.map(point => {
            const x = scaleValue(point.date.getTime(), minDate, maxDate, area.x, area.x + area.width);
            const y = scaleValue(point.value, yMin, yMax, area.y + area.height, area.y);
            return { x, y, point };
        });

        if (type === 'line' || type === 'area') {
            const linePath = pathPoints.map((p, i) =>
                `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
            ).join(' ');

            const areaPath = type === 'area'
                ? `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${area.y + area.height} L ${pathPoints[0].x} ${area.y + area.height} Z`
                : '';

            return (
                <g key={category}>
                    {type === 'area' && (
                        <path
                            d={areaPath}
                            fill={color}
                            fillOpacity={0.1}
                        />
                    )}
                    <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {pathPoints.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            fill="white"
                            stroke={color}
                            strokeWidth={2}
                        />
                    ))}
                </g>
            );
        }

        if (type === 'bar') {
            const barWidth = (area.width / sortedPoints.length) * 0.8;
            const barGap = (area.width / sortedPoints.length) * 0.2;

            return (
                <g key={category}>
                    {pathPoints.map((p, i) => (
                        <rect
                            key={i}
                            x={p.x - barWidth / 2}
                            y={p.y}
                            width={barWidth}
                            height={area.y + area.height - p.y}
                            fill={color}
                            rx={4}
                        />
                    ))}
                </g>
            );
        }

        return null;
    });

    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid var(--color-border)',
        }}>
            {title && (
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1rem',
                    fontWeight: 600,
                }}>
                    {title}
                </h3>
            )}

            <svg width={width} height={height} style={{ overflow: 'visible' }}>
                {/* Grid */}
                {showGrid && (
                    <g>
                        {gridLines.map((line, i) => (
                            <g key={i}>
                                <line
                                    x1={area.x}
                                    y1={line.y}
                                    x2={area.x + area.width}
                                    y2={line.y}
                                    stroke="var(--color-border-light, #e5e7eb)"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x={area.x - 8}
                                    y={line.y}
                                    textAnchor="end"
                                    alignmentBaseline="middle"
                                    fontSize="10"
                                    fill="var(--color-text-tertiary)"
                                >
                                    {line.value >= 1000000
                                        ? `${(line.value / 1000000).toFixed(1)}M`
                                        : line.value >= 1000
                                            ? `${(line.value / 1000).toFixed(0)}K`
                                            : line.value.toFixed(0)
                                    }
                                </text>
                            </g>
                        ))}
                    </g>
                )}

                {/* X Axis */}
                <line
                    x1={area.x}
                    y1={area.y + area.height}
                    x2={area.x + area.width}
                    y2={area.y + area.height}
                    stroke="var(--color-border)"
                />

                {/* Y Axis Label */}
                {yAxisLabel && (
                    <text
                        x={16}
                        y={height / 2}
                        textAnchor="middle"
                        fontSize="11"
                        fill="var(--color-text-secondary)"
                        transform={`rotate(-90, 16, ${height / 2})`}
                    >
                        {yAxisLabel}
                    </text>
                )}

                {/* Data */}
                {paths}
            </svg>

            {/* Legend */}
            {showLegend && allCategories.length > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    marginTop: '12px',
                }}>
                    {allCategories.map((category, i) => (
                        <div key={category} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}>
                            <div style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '2px',
                                background: colors[i % colors.length],
                            }} />
                            <span style={{
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                            }}>
                                {category}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default TrendChart;
