/**
 * DataCard - Compound component for data display
 * Phase 4-5: Reusable card pattern
 */

import { createContext, useContext, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';
import { staggerItem } from '@/lib/animations';

interface DataCardContextValue {
  loading?: boolean;
}

const DataCardContext = createContext<DataCardContextValue>({});

interface DataCardProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function DataCard({
  children,
  loading,
  className,
  onClick,
  hoverable = !!onClick,
}: DataCardProps) {
  return (
    <DataCardContext.Provider value={{ loading }}>
      <motion.div
        variants={staggerItem}
        onClick={onClick}
        className={cn(
          'rounded-lg border bg-card p-6',
          hoverable &&
            'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
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

DataCard.Header = function DataCardHeader({
  children,
  className,
}: DataCardHeaderProps) {
  const { loading } = useContext(DataCardContext);

  if (loading) {
    return <Skeleton className="h-6 w-32 mb-2" />;
  }

  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
};

interface DataCardTitleProps {
  children: ReactNode;
  className?: string;
}

DataCard.Title = function DataCardTitle({
  children,
  className,
}: DataCardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold', className)}>
      {children}
    </h3>
  );
};

interface DataCardContentProps {
  children: ReactNode;
  className?: string;
}

DataCard.Content = function DataCardContent({
  children,
  className,
}: DataCardContentProps) {
  const { loading } = useContext(DataCardContext);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </div>
  );
};

interface DataCardFooterProps {
  children: ReactNode;
  className?: string;
}

DataCard.Footer = function DataCardFooter({
  children,
  className,
}: DataCardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t', className)}>
      {children}
    </div>
  );
};
