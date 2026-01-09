/**
 * Risk Heatmap Component
 * 
 * Interactive heatmap visualization for risk assessment data across
 * multiple dimensions (e.g., account categories vs. risk types).
 */

import React, { useState } from 'react';
import type { RiskCell, RiskHeatmapProps } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const riskColors = {
    low: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
    medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    high: { bg: '#fed7aa', text: '#c2410c', border: '#fb923c' },
    critical: { bg: '#fecaca', text: '#991b1b', border: '#f87171' },
};

function getRiskLevel(value: number): 'low' | 'medium' | 'high' | 'critical' {
    if (value <= 25) return 'low';
    if (value <= 50) return 'medium';
    if (value <= 75) return 'high';
    return 'critical';
}

// ============================================================================
// HEATMAP CELL
// ============================================================================

interface HeatmapCellProps {
    cell: RiskCell | null;
    isSelected: boolean;
    onHover: (cell: RiskCell | null) => void;
    onClick?: (cell: RiskCell) => void;
}

function HeatmapCell({ cell, isSelected, onHover, onClick }: HeatmapCellProps): React.ReactElement {
    if (!cell) {
        return (
            <div style={{
                background: 'var(--color-bg-tertiary, #f9fafb)',
                border: '1px solid var(--color-border-light, #e5e7eb)',
                borderRadius: '4px',
                height: '100%',
                minHeight: '40px',
            }} />
        );
    }

    const colors = riskColors[cell.riskLevel];

    return (
        <div
            onMouseEnter={() => onHover(cell)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onClick?.(cell)}
            style={{
                background: colors.bg,
                border: `2px solid ${isSelected ? colors.border : 'transparent'}`,
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                minHeight: '60px',
            }}
        >
            <span style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: colors.text,
            }}>
                {cell.value}
            </span>
            <span style={{
                fontSize: '0.7rem',
                color: colors.text,
                opacity: 0.8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                {cell.riskLevel}
            </span>
        </div>
    );
}

// ============================================================================
// RISK HEATMAP LEGEND
// ============================================================================

function HeatmapLegend(): React.ReactElement {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '16px',
            justifyContent: 'center',
        }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Risk Level:</span>
            {(Object.keys(riskColors) as Array<keyof typeof riskColors>).map((level) => (
                <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '3px',
                        background: riskColors[level].bg,
                        border: `1px solid ${riskColors[level].border}`,
                    }} />
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        textTransform: 'capitalize',
                    }}>
                        {level}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// TOOLTIP
// ============================================================================

interface TooltipProps {
    cell: RiskCell;
    position: { x: number; y: number };
}

function Tooltip({ cell, position }: TooltipProps): React.ReactElement {
    return (
        <div style={{
            position: 'fixed',
            left: position.x + 16,
            top: position.y + 16,
            background: 'var(--color-card-bg, white)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxWidth: '280px',
        }}>
            <div style={{
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--color-text-primary)',
            }}>
                {cell.label}
            </div>
            <div style={{
                display: 'grid',
                gap: '4px',
                fontSize: '0.875rem',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Category:</span>
                    <span>{cell.category}</span>
                </div>
                {cell.subCategory && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>Sub-category:</span>
                        <span>{cell.subCategory}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Risk Score:</span>
                    <span style={{ fontWeight: 600, color: riskColors[cell.riskLevel].text }}>
                        {cell.value}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Level:</span>
                    <span style={{
                        background: riskColors[cell.riskLevel].bg,
                        color: riskColors[cell.riskLevel].text,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                    }}>
                        {cell.riskLevel}
                    </span>
                </div>
            </div>
            {cell.details && (
                <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-border-light)',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-secondary)',
                }}>
                    {cell.details}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// RISK HEATMAP
// ============================================================================

export function RiskHeatmap({
    data,
    rows,
    columns,
    title,
    onCellClick,
}: RiskHeatmapProps): React.ReactElement {
    const [hoveredCell, setHoveredCell] = useState<RiskCell | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Build grid data
    const getCellData = (row: string, col: string): RiskCell | null => {
        return data.find(cell =>
            cell.category === row && cell.subCategory === col
        ) ?? null;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div
            style={{
                background: 'var(--color-card-bg, white)',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid var(--color-border, #e5e7eb)',
            }}
            onMouseMove={handleMouseMove}
        >
            {/* Header */}
            {title && (
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                }}>
                    {title}
                </h3>
            )}

            {/* Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `120px repeat(${columns.length}, 1fr)`,
                gap: '4px',
            }}>
                {/* Header Row */}
                <div />
                {columns.map(col => (
                    <div key={col} style={{
                        textAlign: 'center',
                        padding: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        {col}
                    </div>
                ))}

                {/* Data Rows */}
                {rows.map(row => (
                    <React.Fragment key={row}>
                        {/* Row Label */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                        }}>
                            {row}
                        </div>
                        {/* Cells */}
                        {columns.map(col => {
                            const cell = getCellData(row, col);
                            return (
                                <HeatmapCell
                                    key={`${row}-${col}`}
                                    cell={cell}
                                    isSelected={hoveredCell?.id === cell?.id}
                                    onHover={setHoveredCell}
                                    onClick={onCellClick}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>

            {/* Legend */}
            <HeatmapLegend />

            {/* Tooltip */}
            {hoveredCell && <Tooltip cell={hoveredCell} position={mousePos} />}
        </div>
    );
}

export default RiskHeatmap;
