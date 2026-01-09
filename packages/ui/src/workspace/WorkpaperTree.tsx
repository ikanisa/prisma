/**
 * Workpaper Tree Component
 * 
 * Hierarchical tree navigator for workpapers organized by section.
 */

import React, { useState } from 'react';
import type { WorkpaperNode, WorkpaperTreeProps } from './types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const statusConfig = {
    not_started: { color: '#9ca3af', bg: '#f3f4f6', icon: '○' },
    in_progress: { color: '#3b82f6', bg: '#eff6ff', icon: '◐' },
    review: { color: '#8b5cf6', bg: '#f5f3ff', icon: '◑' },
    completed: { color: '#10b981', bg: '#d1fae5', icon: '●' },
};

// ============================================================================
// TREE NODE
// ============================================================================

interface TreeNodeComponentProps {
    node: WorkpaperNode;
    depth: number;
    selectedId?: string;
    expandedNodes: Set<string>;
    onSelect: (node: WorkpaperNode) => void;
    onToggle: (nodeId: string) => void;
}

function TreeNodeComponent({
    node,
    depth,
    selectedId,
    expandedNodes,
    onSelect,
    onToggle,
}: TreeNodeComponentProps): React.ReactElement {
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = node.id === selectedId;
    const isFolder = node.type === 'folder';
    const hasChildren = isFolder && node.children && node.children.length > 0;

    const status = node.status ? statusConfig[node.status] : null;

    return (
        <div>
            {/* Node Row */}
            <div
                onClick={() => {
                    if (isFolder && hasChildren) {
                        onToggle(node.id);
                    } else {
                        onSelect(node);
                    }
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    paddingLeft: `${12 + depth * 20}px`,
                    background: isSelected ? 'var(--color-primary-light, #eff6ff)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                onMouseOver={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.background = 'var(--color-bg-hover, #f9fafb)';
                    }
                }}
                onMouseOut={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                {/* Expand/Collapse Arrow */}
                {hasChildren ? (
                    <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                        width: '16px',
                        textAlign: 'center',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                    }}>
                        ▶
                    </span>
                ) : (
                    <span style={{ width: '16px' }} />
                )}

                {/* Icon */}
                <span style={{ fontSize: '1rem' }}>
                    {isFolder ? '📁' : '📄'}
                </span>

                {/* Reference */}
                {node.ref && (
                    <span style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        background: 'var(--color-bg-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 500,
                    }}>
                        {node.ref}
                    </span>
                )}

                {/* Name */}
                <span style={{
                    flex: 1,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                    fontWeight: isFolder ? 500 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {node.name}
                </span>

                {/* Status (for workpapers) */}
                {status && (
                    <span style={{
                        color: status.color,
                        fontSize: '0.875rem',
                    }} title={node.status}>
                        {status.icon}
                    </span>
                )}

                {/* Progress (for folders) */}
                {isFolder && node.totalWorkpapers !== undefined && node.completedWorkpapers !== undefined && (
                    <span style={{
                        fontSize: '0.7rem',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        {node.completedWorkpapers}/{node.totalWorkpapers}
                    </span>
                )}

                {/* Assignee */}
                {node.assignee && (
                    <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }} title={node.assignee}>
                        {node.assignee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                )}
            </div>

            {/* Children */}
            {isFolder && hasChildren && isExpanded && (
                <div>
                    {node.children!.map(child => (
                        <TreeNodeComponent
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            expandedNodes={expandedNodes}
                            onSelect={onSelect}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// WORKPAPER TREE
// ============================================================================

export function WorkpaperTree({
    nodes,
    selectedId,
    onNodeSelect,
    onNodeExpand,
}: WorkpaperTreeProps): React.ReactElement {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));

    const handleToggle = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) {
            newExpanded.delete(nodeId);
            onNodeExpand?.(nodeId, false);
        } else {
            newExpanded.add(nodeId);
            onNodeExpand?.(nodeId, true);
        }
        setExpandedNodes(newExpanded);
    };

    const handleSelect = (node: WorkpaperNode) => {
        onNodeSelect?.(node);
    };

    // Calculate totals
    const countWorkpapers = (nodes: WorkpaperNode[]): { total: number; completed: number } => {
        let total = 0;
        let completed = 0;
        for (const node of nodes) {
            if (node.type === 'workpaper') {
                total++;
                if (node.status === 'completed') completed++;
            }
            if (node.children) {
                const childCounts = countWorkpapers(node.children);
                total += childCounts.total;
                completed += childCounts.completed;
            }
        }
        return { total, completed };
    };

    const counts = countWorkpapers(nodes);

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
                background: 'var(--color-bg-secondary)',
            }}>
                <span style={{
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    color: 'var(--color-text-primary)',
                }}>
                    Workpapers
                </span>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-secondary)',
                }}>
                    {counts.completed}/{counts.total} complete
                </span>
            </div>

            {/* Search (placeholder) */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border-light)' }}>
                <input
                    type="text"
                    placeholder="Search workpapers..."
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Tree */}
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {nodes.map(node => (
                    <TreeNodeComponent
                        key={node.id}
                        node={node}
                        depth={0}
                        selectedId={selectedId}
                        expandedNodes={expandedNodes}
                        onSelect={handleSelect}
                        onToggle={handleToggle}
                    />
                ))}
            </div>

            {/* Legend */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderTop: '1px solid var(--color-border-light)',
                background: 'var(--color-bg-secondary)',
            }}>
                {Object.entries(statusConfig).map(([status, config]) => (
                    <div key={status} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.65rem',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        <span style={{ color: config.color }}>{config.icon}</span>
                        <span style={{ textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default WorkpaperTree;
