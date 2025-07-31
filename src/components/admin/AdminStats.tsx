import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  progress?: {
    value: number;
    max?: number;
    label?: string;
  };
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: 'border-l-blue-500',
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  danger: 'border-l-red-500'
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  progress,
  loading = false,
  className,
  variant = 'default'
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("border-l-4", variantStyles[variant], className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = (direction: 'up' | 'down') => {
    return direction === 'up' 
      ? <TrendingUp className="h-3 w-3" />
      : <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = (direction: 'up' | 'down') => {
    return direction === 'up' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={cn("border-l-4", variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {formatValue(value)}
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs",
            getTrendColor(trend.direction)
          )}>
            {getTrendIcon(trend.direction)}
            <span className="font-medium">
              {trend.direction === 'up' ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">
              {trend.label}
            </span>
          </div>
        )}

        {progress && (
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <Progress 
                value={(progress.value / (progress.max || 100)) * 100} 
                className="flex-1 h-2" 
              />
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                {progress.value}{progress.max ? `/${progress.max}` : '%'}
              </span>
            </div>
            {progress.label && (
              <p className="text-xs text-muted-foreground">
                {progress.label}
              </p>
            )}
          </div>
        )}

        {description && !trend && !progress && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export function StatsGrid({ 
  children, 
  columns = 4, 
  className 
}: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

// System status component
interface SystemStatusProps {
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    icon?: React.ReactNode;
  }>;
  loading?: boolean;
}

export function SystemStatus({ services, loading = false }: SystemStatusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '●';
      case 'degraded': return '◐';
      case 'down': return '○';
      default: return '?';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {services.map((service, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={getStatusColor(service.status)}>
                {service.icon || getStatusIcon(service.status)}
              </div>
              <div>
                <div className="font-medium text-sm">{service.name}</div>
                <div className={cn("text-xs capitalize", getStatusColor(service.status))}>
                  {service.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}