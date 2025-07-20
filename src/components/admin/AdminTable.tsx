import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminTableProps, AdminTableColumn, SortOrder } from '@/types/admin';

interface AdminTableState {
  sortField?: string;
  sortOrder?: SortOrder;
}

export function AdminTable<T extends Record<string, any>>({
  data,
  loading,
  columns,
  onSort,
  onAction,
  className,
  emptyMessage = "No data available",
  loadingRows = 5
}: AdminTableProps<T> & {
  className?: string;
  emptyMessage?: string;
  loadingRows?: number;
}) {
  const [sortState, setSortState] = React.useState<AdminTableState>({});

  const handleSort = (column: AdminTableColumn<T>) => {
    if (!column.sortable || !onSort) return;

    const isCurrentSort = sortState.sortField === String(column.key);
    const newOrder: SortOrder = 
      isCurrentSort && sortState.sortOrder === 'asc' ? 'desc' : 'asc';

    setSortState({
      sortField: String(column.key),
      sortOrder: newOrder
    });

    onSort(column.key, newOrder);
  };

  const getSortIcon = (column: AdminTableColumn<T>) => {
    if (!column.sortable) return null;

    const isCurrentSort = sortState.sortField === String(column.key);
    
    if (!isCurrentSort) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }

    return sortState.sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const renderCellValue = (column: AdminTableColumn<T>, item: T) => {
    const value = item[column.key];
    
    if (column.render) {
      return column.render(value, item);
    }

    // Default rendering based on value type
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }

    if (typeof value === 'number') {
      return <span className="font-mono">{value.toLocaleString()}</span>;
    }

    if (value && typeof value === 'object' && value.constructor === Date) {
      const dateValue = value as Date;
      return (
        <div className="space-y-1">
          <div className="text-sm">{dateValue.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {dateValue.toLocaleTimeString()}
          </div>
        </div>
      );
    }

    if (typeof value === 'string' && value.includes('T') && !isNaN(Date.parse(value))) {
      const date = new Date(value);
      return (
        <div className="space-y-1">
          <div className="text-sm">{date.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {date.toLocaleTimeString()}
          </div>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const LoadingRow = () => (
    <TableRow>
      {columns.map((column, index) => (
        <TableCell key={index}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead 
                key={String(column.key)}
                className={cn(
                  column.sortable && "cursor-pointer select-none hover:bg-muted/50",
                  column.sortable && "transition-colors"
                )}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {getSortIcon(column)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: loadingRows }).map((_, index) => (
              <LoadingRow key={index} />
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length} 
                className="text-center py-8 text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => (
              <TableRow key={item.id || index}>
                {columns.map((column) => (
                  <TableCell key={String(column.key)}>
                    {renderCellValue(column, item)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// Utility function to create common column types
export const createColumn = <T,>(
  key: keyof T,
  label: string,
  options: Partial<AdminTableColumn<T>> = {}
): AdminTableColumn<T> => ({
  key,
  label,
  sortable: false,
  ...options
});

// Pre-built column renderers
export const columnRenderers = {
  badge: (value: string, variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default') => (
    <Badge variant={variant}>{value}</Badge>
  ),
  
  currency: (amount: number, currency = 'RWF') => (
    <span className="font-mono">{amount.toLocaleString()} {currency}</span>
  ),
  
  phone: (phone: string) => (
    <span className="font-mono text-sm">{phone}</span>
  ),
  
  status: (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  },
  
  percentage: (value: number) => (
    <span className="font-mono">{value.toFixed(1)}%</span>
  )
};