import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed',
        'border-muted-foreground/20 bg-muted/5 p-12 text-center',
        className
      )}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
            'bg-primary text-primary-foreground shadow transition-colors hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
