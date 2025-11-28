import { createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const DataCardContext = createContext<{ loading?: boolean }>({});

interface DataCardProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
}

export function DataCard({ children, loading, className }: DataCardProps) {
  return (
    <DataCardContext.Provider value={{ loading }}>
      <div className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md',
        className
      )}>
        {children}
      </div>
    </DataCardContext.Provider>
  );
}

interface DataCardHeaderProps {
  children: ReactNode;
  className?: string;
}

function DataCardHeader({ children, className }: DataCardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-6 pb-4', className)}>
      {children}
    </div>
  );
}

interface DataCardTitleProps {
  children: ReactNode;
  className?: string;
}

function DataCardTitle({ children, className }: DataCardTitleProps) {
  const { loading } = useContext(DataCardContext);
  
  if (loading) {
    return <Skeleton className="h-6 w-32" />;
  }
  
  return (
    <h3 className={cn('text-lg font-semibold tracking-tight', className)}>
      {children}
    </h3>
  );
}

interface DataCardContentProps {
  children: ReactNode;
  className?: string;
}

function DataCardContent({ children, className }: DataCardContentProps) {
  return (
    <div className={cn('px-6 pb-6', className)}>
      {children}
    </div>
  );
}

interface DataCardValueProps {
  value: string | number;
  label?: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  className?: string;
}

function DataCardValue({ value, label, trend, change, className }: DataCardValueProps) {
  const { loading } = useContext(DataCardContext);
  
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-24" />
        {label && <Skeleton className="h-4 w-16" />}
      </div>
    );
  }
  
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };
  
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight">{value}</span>
        {change && trend && (
          <span className={cn('text-sm font-medium', trendColors[trend])}>
            {change}
          </span>
        )}
      </div>
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
    </div>
  );
}

DataCard.Header = DataCardHeader;
DataCard.Title = DataCardTitle;
DataCard.Content = DataCardContent;
DataCard.Value = DataCardValue;

export { DataCardHeader, DataCardTitle, DataCardContent, DataCardValue };
