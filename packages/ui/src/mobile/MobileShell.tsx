/**
 * Mobile Navigation Shell
 * 
 * App shell with bottom navigation, header, and safe area handling.
 */

import React from 'react';
import type { MobileShellProps } from './types';

// ============================================================================
// HEADER
// ============================================================================

interface HeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightAction?: React.ReactNode;
}

function MobileHeader({ title, showBackButton, onBack, rightAction }: HeaderProps): React.ReactElement {
    return (
        <header style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: 'var(--color-card-bg, white)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            paddingTop: 'env(safe-area-inset-top)',
            zIndex: 100,
        }}>
            {/* Left Side */}
            <div style={{ width: '48px', display: 'flex', alignItems: 'center' }}>
                {showBackButton && (
                    <button
                        onClick={onBack}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '8px',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                        }}
                    >
                        ←
                    </button>
                )}
            </div>

            {/* Title */}
            <h1 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                textAlign: 'center',
                flex: 1,
            }}>
                {title}
            </h1>

            {/* Right Side */}
            <div style={{ width: '48px', display: 'flex', justifyContent: 'flex-end' }}>
                {rightAction}
            </div>
        </header>
    );
}

// ============================================================================
// BOTTOM NAVIGATION
// ============================================================================

interface BottomNavProps {
    items: MobileShellProps['navItems'];
    currentRoute: string;
    onNavigate: (route: string) => void;
}

function BottomNavigation({ items, currentRoute, onNavigate }: BottomNavProps): React.ReactElement {
    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '64px',
            background: 'var(--color-card-bg, white)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 100,
        }}>
            {items.map(item => {
                const isActive = currentRoute === item.route;

                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.route)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 4px',
                            position: 'relative',
                        }}
                    >
                        {/* Icon */}
                        <span style={{
                            fontSize: '1.5rem',
                            opacity: isActive ? 1 : 0.5,
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                            transition: 'all 0.2s',
                        }}>
                            {item.icon}
                        </span>

                        {/* Label */}
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                            transition: 'all 0.2s',
                        }}>
                            {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge !== undefined && item.badge > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '4px',
                                right: 'calc(50% - 20px)',
                                minWidth: '18px',
                                height: '18px',
                                borderRadius: '9px',
                                background: 'var(--color-danger, #ef4444)',
                                color: 'white',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                            }}>
                                {item.badge > 99 ? '99+' : item.badge}
                            </span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

// ============================================================================
// MOBILE SHELL
// ============================================================================

export function MobileShell({
    children,
    currentRoute,
    navItems,
    onNavigate,
    title,
    showBackButton,
    onBack,
    rightAction,
}: MobileShellProps): React.ReactElement {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-bg-primary, #f9fafb)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Header */}
            <MobileHeader
                title={title}
                showBackButton={showBackButton}
                onBack={onBack}
                rightAction={rightAction}
            />

            {/* Main Content */}
            <main style={{
                flex: 1,
                marginTop: 'calc(56px + env(safe-area-inset-top))',
                marginBottom: 'calc(64px + env(safe-area-inset-bottom))',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
            }}>
                {children}
            </main>

            {/* Bottom Navigation */}
            <BottomNavigation
                items={navItems}
                currentRoute={currentRoute}
                onNavigate={onNavigate}
            />
        </div>
    );
}

export default MobileShell;
