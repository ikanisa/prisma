'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

type InsightType = 'info' | 'warning' | 'success' | 'action';

interface InsightCardProps {
    title: string;
    description: string;
    type?: InsightType;
    icon?: ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const typeStyles: Record<InsightType, { bg: string; icon: string; iconBg: string }> = {
    info: {
        bg: 'bg-blue-500/5 border-blue-500/20',
        icon: 'text-blue-500',
        iconBg: 'bg-blue-500/10',
    },
    warning: {
        bg: 'bg-yellow-500/5 border-yellow-500/20',
        icon: 'text-yellow-500',
        iconBg: 'bg-yellow-500/10',
    },
    success: {
        bg: 'bg-green-500/5 border-green-500/20',
        icon: 'text-green-500',
        iconBg: 'bg-green-500/10',
    },
    action: {
        bg: 'bg-purple-500/5 border-purple-500/20',
        icon: 'text-purple-500',
        iconBg: 'bg-purple-500/10',
    },
};

const defaultIcons: Record<InsightType, React.ElementType> = {
    info: TrendingUp,
    warning: AlertTriangle,
    success: Sparkles,
    action: Clock,
};

export function InsightCard({
    title,
    description,
    type = 'info',
    icon,
    action,
}: InsightCardProps) {
    const styles = typeStyles[type];
    const DefaultIcon = defaultIcons[type];

    return (
        <div className={cn('rounded-xl border p-4', styles.bg)}>
            <div className="flex gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', styles.iconBg)}>
                    {icon || <DefaultIcon className={cn('h-5 w-5', styles.icon)} />}
                </div>
                <div className="flex-1">
                    <h4 className="font-medium text-foreground">{title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    {action && (
                        <button
                            onClick={action.onClick}
                            className={cn(
                                'mt-3 text-sm font-medium transition-colors hover:underline',
                                styles.icon
                            )}
                        >
                            {action.label} →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
