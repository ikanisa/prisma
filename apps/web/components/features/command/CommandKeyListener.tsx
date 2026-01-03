'use client';

import { useEffect } from 'react';
import { useCommand } from './CommandProvider';

/**
 * Keyboard listener component for ⌘K shortcut
 * Must be rendered within CommandProvider
 */
export function CommandKeyListener() {
    const { open, close, isOpen } = useCommand();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ⌘K or Ctrl+K to toggle
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (isOpen) {
                    close();
                } else {
                    open();
                }
            }
            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                close();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, close, isOpen]);

    return null;
}
