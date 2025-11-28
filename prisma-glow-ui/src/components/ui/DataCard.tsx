import { createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Context for loading state
const DataCardContext = createContext<{ loading?: boolean }>({});

interface DataCardProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

function DataCardRoot({ children, loading, className, onClick, hoverable }: DataCardProps) {
  return (
    <DataCardContext.Provider value={{ loading }}>
      <motion.div
        whileHover={hoverable ? { y: -2, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' } : undefined}
        onClick={onClick}
        className={cn(
          'bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 transition-shadow',
          onClick && 'cursor-pointer',
          className
        )}
      >
        {children}
      </motion.div>
    </DataCardContext.Provider>
  );
}

interface DataCardHeaderProps {
  children: ReactNode;
  className?: string;
}

function DataCardHeader({ children, className }: DataCardHeaderProps) {
  const { loading } = useContext(DataCardContext);

  if (loading) {
    return <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />;
  }

  return <div className={cn('font-semibold text-neutral-900 dark:text-neutral-100 mb-2', className)}>{children}</div>;
}

interface DataCardContentProps {
  children: ReactNode;
  className?: string;
}

function DataCardContent({ children, className }: DataCardContentProps) {
  const { loading } = useContext(DataCardContext);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    );
  }

  return <div className={cn('text-neutral-600 dark:text-neutral-400', className)}>{children}</div>;
}

interface DataCardFooterProps {
  children: ReactNode;
  className?: string;
}

function DataCardFooter({ children, className }: DataCardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700', className)}>
      {children}
    </div>
  );
}

interface DataCardMetricProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

function DataCardMetric({ label, value, trend, trendValue, className }: DataCardMetricProps) {
  const { loading } = useContext(DataCardContext);

  if (loading) {
    return (
      <div className={className}>
        <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-1" />
        <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{value}</div>
        {trend && trendValue && (
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up' && 'text-green-600 dark:text-green-400',
              trend === 'down' && 'text-red-600 dark:text-red-400',
              trend === 'neutral' && 'text-neutral-500 dark:text-neutral-400'
            )}
          >
            {trend === 'up' && '↑ '}
            {trend === 'down' && '↓ '}
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// Compound component export
export const DataCard = Object.assign(DataCardRoot, {
  Header: DataCardHeader,
  Content: DataCardContent,
  Footer: DataCardFooter,
  Metric: DataCardMetric,
});
