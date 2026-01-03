/**
 * Accessibility Utilities for Forms
 * 
 * P2-2 FIX: Add ARIA labels and accessibility improvements
 */

import { useId } from 'react';

/**
 * Common ARIA label mappings for form fields
 */
export const ARIA_LABELS = {
    // Financial forms
    amount: 'Enter monetary amount',
    currency: 'Select currency',
    accountCode: 'Select account code',
    description: 'Enter transaction description',
    date: 'Select date',
    reference: 'Enter reference number',

    // Tax forms
    taxRate: 'Select applicable tax rate',
    jurisdiction: 'Select tax jurisdiction',
    vatNumber: 'Enter VAT registration number',

    // Search
    search: 'Search',
    filter: 'Filter results',

    // Actions
    submit: 'Submit form',
    cancel: 'Cancel and go back',
    save: 'Save changes',
    delete: 'Delete this item',
};

/**
 * Generate accessible form field props
 */
export function useAccessibleField(label: string, options?: {
    required?: boolean;
    error?: string;
    hint?: string;
}) {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [
        options?.error ? errorId : null,
        options?.hint ? hintId : null,
    ].filter(Boolean).join(' ') || undefined;

    return {
        id,
        'aria-label': label,
        'aria-required': options?.required,
        'aria-invalid': !!options?.error,
        'aria-describedby': describedBy,
        errorProps: {
            id: errorId,
            role: 'alert' as const,
            'aria-live': 'polite' as const,
        },
        hintProps: {
            id: hintId,
        },
    };
}

/**
 * Accessible currency input component props
 */
export function useCurrencyInputA11y(currency: string, value: number) {
    return {
        role: 'spinbutton' as const,
        'aria-label': `Amount in ${currency}`,
        'aria-valuemin': 0,
        'aria-valuenow': value,
        'aria-valuetext': `${value} ${currency}`,
    };
}

/**
 * Accessible data table props
 */
export function useDataTableA11y(caption: string, rowCount: number) {
    return {
        tableProps: {
            role: 'grid' as const,
            'aria-label': caption,
            'aria-rowcount': rowCount,
        },
        rowProps: (index: number) => ({
            'aria-rowindex': index + 1,
        }),
        cellProps: (columnName: string) => ({
            'aria-label': columnName,
        }),
    };
}

/**
 * Skip link for keyboard navigation
 */
export function SkipLink({ targetId, label = 'Skip to main content' }: {
    targetId: string;
    label?: string;
}) {
    return (
        <a
            href={`#${targetId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
        >
            {label}
        </a>
    );
}

/**
 * Accessible loading indicator
 */
export function LoadingIndicator({ label = 'Loading...' }: { label?: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className="flex items-center justify-center"
        >
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            <span className="sr-only">{label}</span>
        </div>
    );
}

/**
 * Accessible alert component
 */
export function AccessibleAlert({
    type,
    message,
    dismissible = false,
    onDismiss,
}: {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}) {
    const roleMap = {
        success: 'status',
        error: 'alert',
        warning: 'alert',
        info: 'status',
    } as const;

    return (
        <div
            role={roleMap[type]}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`p-4 rounded-md ${type === 'error' ? 'bg-destructive/10 text-destructive' :
                    type === 'warning' ? 'bg-warning/10 text-warning' :
                        type === 'success' ? 'bg-success/10 text-success' :
                            'bg-muted text-muted-foreground'
                }`}
        >
            <span>{message}</span>
            {dismissible && onDismiss && (
                <button
                    onClick={onDismiss}
                    aria-label="Dismiss message"
                    className="ml-4"
                >
                    ×
                </button>
            )}
        </div>
    );
}

/**
 * Focus trap for modals
 */
export function useFocusTrap(isActive: boolean) {
    return {
        onKeyDown: (e: React.KeyboardEvent) => {
            if (!isActive || e.key !== 'Tab') return;

            const focusable = document.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const first = focusable[0] as HTMLElement;
            const last = focusable[focusable.length - 1] as HTMLElement;

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        },
    };
}
