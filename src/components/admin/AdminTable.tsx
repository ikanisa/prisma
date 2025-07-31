import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface AdminTableColumn<T = any> {
  key: string;
  header: string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface AdminTableAction<T = any> {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  className?: string;
}

export interface AdminTableProps<T = any> {
  data: T[];
  columns: AdminTableColumn<T>[];
  actions?: AdminTableAction<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  keyExtractor?: (item: T) => string;
}

export function AdminTable<T = any>({
  data,
  columns,
  actions = [],
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
  keyExtractor = (item: any) => item.id || Math.random().toString(),
}: AdminTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const renderCell = (item: T, column: AdminTableColumn<T>) => {
    if (column.cell) {
      return column.cell(item);
    }
    
    const value = (item as any)[column.key];
    
    // Handle different data types
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Yes' : 'No'}
        </Badge>
      );
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    
    return value?.toString() || '-';
  };

  const renderActions = (item: T) => {
    if (actions.length === 0) return null;

    if (actions.length === 1) {
      const action = actions[0];
      const Icon = action.icon;
      return (
        <Button
          variant={action.variant || 'outline'}
          size="sm"
          onClick={() => action.onClick(item)}
          className={action.className}
        >
          {Icon && <Icon className="h-4 w-4 mr-1" />}
          {action.label}
        </Button>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={index}
                onClick={() => action.onClick(item)}
                className={action.className}
              >
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
          {actions.length > 0 && (
            <TableHead className="text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={keyExtractor(item)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {renderCell(item, column)}
              </TableCell>
            ))}
            {actions.length > 0 && (
              <TableCell className="text-right">
                {renderActions(item)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}