/**
 * EmptyState - Delightful empty state component
 * Phase 4-5: User-friendly empty screens
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center',
        'py-12 px-6 text-center',
        className
      )}
    >
      <div className="mb-6 rounded-full bg-muted p-6">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} size="lg">
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {action.label}
        </Button>
      )}

      {children}
    </motion.div>
  );
}
