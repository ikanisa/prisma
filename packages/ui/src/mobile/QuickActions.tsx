/**
 * Quick Actions Menu
 * 
 * Floating action button with expandable quick action menu.
 */

import React, { useState } from 'react';
import type { QuickActionsMenuProps, QuickAction } from './types';

// ============================================================================
// QUICK ACTIONS MENU
// ============================================================================

export function QuickActionsMenu({
    actions,
    isOpen,
    onToggle,
}: QuickActionsMenuProps): React.ReactElement {
    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    onClick={onToggle}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        zIndex: 999,
                        animation: 'fadeIn 0.2s ease',
                    }}
                />
            )}

            {/* Actions Container */}
            <div style={{
                position: 'fixed',
                right: '20px',
                bottom: 'calc(80px + env(safe-area-inset-bottom))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '12px',
                zIndex: 1000,
            }}>
                {/* Action Items */}
                {isOpen && actions.map((action, index) => (
                    <div
                        key={action.id}
                        onClick={() => {
                            action.action();
                            onToggle();
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            animation: `slideUp 0.2s ease ${index * 0.05}s both`,
                        }}
                    >
                        {/* Label */}
                        <span style={{
                            padding: '8px 16px',
                            background: 'var(--color-card-bg, white)',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: 'var(--color-text-primary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            whiteSpace: 'nowrap',
                        }}>
                            {action.label}
                        </span>

                        {/* Icon Button */}
                        <button style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            border: 'none',
                            background: action.color ?? 'var(--color-primary)',
                            color: 'white',
                            fontSize: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        }}>
                            {action.icon}
                        </button>
                    </div>
                ))}

                {/* Main FAB */}
                <button
                    onClick={onToggle}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'var(--color-primary, #3b82f6)',
                        color: 'white',
                        fontSize: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                        transition: 'transform 0.3s ease',
                    }}
                >
                    +
                </button>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
}

// ============================================================================
// PRESET QUICK ACTIONS
// ============================================================================

export const auditQuickActions: QuickAction[] = [
    {
        id: 'capture',
        label: 'Capture Document',
        icon: '📷',
        color: '#3b82f6',
        action: () => console.log('Capture document'),
    },
    {
        id: 'voice',
        label: 'Voice Note',
        icon: '🎤',
        color: '#8b5cf6',
        action: () => console.log('Start voice note'),
    },
    {
        id: 'task',
        label: 'New Task',
        icon: '✓',
        color: '#10b981',
        action: () => console.log('Create task'),
    },
    {
        id: 'issue',
        label: 'Raise Issue',
        icon: '⚠',
        color: '#f59e0b',
        action: () => console.log('Raise issue'),
    },
];

export default QuickActionsMenu;
