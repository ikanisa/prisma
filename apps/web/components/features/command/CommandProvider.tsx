'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface CommandContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    // Page context for AI awareness
    currentPage: string;
    setCurrentPage: (page: string) => void;
    selectedContext: any | null;
    setSelectedContext: (context: any) => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function useCommand() {
    const context = useContext(CommandContext);
    if (!context) {
        throw new Error('useCommand must be used within CommandProvider');
    }
    return context;
}

export function CommandProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [selectedContext, setSelectedContext] = useState<any | null>(null);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return (
        <CommandContext.Provider
            value={{
                isOpen,
                open,
                close,
                toggle,
                currentPage,
                setCurrentPage,
                selectedContext,
                setSelectedContext,
            }}
        >
            {children}
        </CommandContext.Provider>
    );
}
