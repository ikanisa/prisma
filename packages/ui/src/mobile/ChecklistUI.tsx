/**
 * Checklist UI Component
 * 
 * Mobile-optimized checklist for fieldwork with swipe gestures and attachments.
 */

import React, { useState } from 'react';
import type { Checklist, ChecklistItem, ChecklistUIProps } from './types';

// ============================================================================
// CHECKLIST ITEM
// ============================================================================

interface ChecklistItemComponentProps {
    item: ChecklistItem;
    onToggle: (completed: boolean) => void;
    onNote: (note: string) => void;
    onAttach: () => void;
}

function ChecklistItemComponent({
    item,
    onToggle,
    onNote,
    onAttach,
}: ChecklistItemComponentProps): React.ReactElement {
    const [isExpanded, setIsExpanded] = useState(false);
    const [noteText, setNoteText] = useState(item.notes ?? '');

    return (
        <div style={{
            background: item.completed ? 'var(--color-success-light, #f0fdf4)' : 'white',
            borderRadius: '12px',
            border: '1px solid',
            borderColor: item.completed ? 'var(--color-success, #10b981)' : 'var(--color-border)',
            marginBottom: '8px',
            overflow: 'hidden',
            transition: 'all 0.2s',
        }}>
            {/* Main Row */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Checkbox */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(!item.completed);
                    }}
                    style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: `2px solid ${item.completed ? 'var(--color-success)' : 'var(--color-border)'}`,
                        background: item.completed ? 'var(--color-success)' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                    }}
                >
                    {item.completed && (
                        <span style={{ color: 'white', fontSize: '1rem', fontWeight: 700 }}>✓</span>
                    )}
                </button>

                {/* Text */}
                <div style={{ flex: 1 }}>
                    <span style={{
                        fontSize: '0.9rem',
                        color: item.completed ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        textDecoration: item.completed ? 'line-through' : 'none',
                        lineHeight: 1.4,
                    }}>
                        {item.text}
                    </span>

                    {/* Required Badge */}
                    {item.required && !item.completed && (
                        <span style={{
                            display: 'inline-block',
                            marginLeft: '8px',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: 'var(--color-danger)',
                            textTransform: 'uppercase',
                        }}>
                            Required
                        </span>
                    )}

                    {/* Meta Info */}
                    {(item.notes || (item.attachments && item.attachments.length > 0)) && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '6px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-tertiary)',
                        }}>
                            {item.notes && <span>📝 Note</span>}
                            {item.attachments && item.attachments.length > 0 && (
                                <span>📎 {item.attachments.length}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Expand Indicator */}
                <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-tertiary)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                }}>
                    ▼
                </span>
            </div>

            {/* Expanded Section */}
            {isExpanded && (
                <div style={{
                    padding: '0 16px 16px 56px',
                    borderTop: '1px solid var(--color-border-light)',
                }}>
                    {/* Notes Input */}
                    <div style={{ marginTop: '12px' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            color: 'var(--color-text-secondary)',
                            marginBottom: '4px',
                        }}>
                            Notes
                        </label>
                        <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onBlur={() => onNote(noteText)}
                            placeholder="Add a note..."
                            style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Attachments */}
                    <div style={{ marginTop: '12px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px',
                        }}>
                            <label style={{
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                color: 'var(--color-text-secondary)',
                            }}>
                                Attachments
                            </label>
                            <button
                                onClick={onAttach}
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-border)',
                                    background: 'white',
                                    cursor: 'pointer',
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        {item.attachments && item.attachments.length > 0 ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {item.attachments.map((att, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'var(--color-bg-secondary)',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            color: 'var(--color-text-secondary)',
                                        }}
                                    >
                                        📄 Attachment {i + 1}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                padding: '16px',
                                textAlign: 'center',
                                color: 'var(--color-text-tertiary)',
                                fontSize: '0.8rem',
                                background: 'var(--color-bg-secondary)',
                                borderRadius: '8px',
                            }}>
                                No attachments
                            </div>
                        )}
                    </div>

                    {/* Completed Info */}
                    {item.completed && item.completedAt && (
                        <div style={{
                            marginTop: '12px',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-tertiary)',
                        }}>
                            Completed {item.completedAt.toLocaleString()}
                            {item.completedBy && ` by ${item.completedBy}`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// CHECKLIST UI
// ============================================================================

export function ChecklistUI({
    checklist,
    onItemToggle,
    onItemNote,
    onItemAttach,
}: ChecklistUIProps): React.ReactElement {
    const completedCount = checklist.items.filter(i => i.completed).length;
    const requiredRemaining = checklist.items.filter(i => i.required && !i.completed).length;

    return (
        <div style={{
            background: 'var(--color-card-bg, white)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid var(--color-border-light)',
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                }}>
                    <div>
                        <h2 style={{
                            margin: '0 0 4px 0',
                            fontSize: '1.125rem',
                            fontWeight: 600,
                        }}>
                            {checklist.title}
                        </h2>
                        {checklist.description && (
                            <p style={{
                                margin: 0,
                                fontSize: '0.8rem',
                                color: 'var(--color-text-secondary)',
                            }}>
                                {checklist.description}
                            </p>
                        )}
                    </div>
                    <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: checklist.progress === 100 ? 'var(--color-success)' : 'var(--color-text-secondary)',
                    }}>
                        {completedCount}/{checklist.items.length}
                    </span>
                </div>

                {/* Progress Bar */}
                <div style={{
                    marginTop: '12px',
                    height: '6px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${checklist.progress}%`,
                        height: '100%',
                        background: checklist.progress === 100
                            ? 'var(--color-success)'
                            : 'var(--color-primary)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                    }} />
                </div>

                {/* Required Warning */}
                {requiredRemaining > 0 && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '0.75rem',
                        color: 'var(--color-danger)',
                    }}>
                        ⚠ {requiredRemaining} required item{requiredRemaining > 1 ? 's' : ''} remaining
                    </div>
                )}
            </div>

            {/* Items */}
            <div style={{ padding: '16px' }}>
                {checklist.items.map(item => (
                    <ChecklistItemComponent
                        key={item.id}
                        item={item}
                        onToggle={(completed) => onItemToggle(item.id, completed)}
                        onNote={(note) => onItemNote(item.id, note)}
                        onAttach={() => onItemAttach(item.id)}
                    />
                ))}
            </div>

            {/* Sync Status */}
            <div style={{
                padding: '12px 20px',
                borderTop: '1px solid var(--color-border-light)',
                background: 'var(--color-bg-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--color-text-tertiary)',
                }}>
                    Last modified: {checklist.lastModified.toLocaleString()}
                </span>
                <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: checklist.syncStatus === 'synced'
                        ? '#d1fae5'
                        : checklist.syncStatus === 'error'
                            ? '#fecaca'
                            : '#fef3c7',
                    color: checklist.syncStatus === 'synced'
                        ? '#065f46'
                        : checklist.syncStatus === 'error'
                            ? '#991b1b'
                            : '#92400e',
                }}>
                    {checklist.syncStatus}
                </span>
            </div>
        </div>
    );
}

export default ChecklistUI;
