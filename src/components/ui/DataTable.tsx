/**
 * Data Table with Virtual Scrolling
 * High-performance table for large datasets
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualList } from './VirtualList';
import { Input } from './input';
import { Button } from './button';

interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (item: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight?: number;
  onRowClick?: (item: T) => void;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 56,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    
    return data.filter((item) =>
      Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b font-medium text-sm">
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className={cn(
              'flex items-center gap-1',
              column.width || 'flex-1',
              column.sortable && 'cursor-pointer hover:text-primary'
            )}
            onClick={() => column.sortable && handleSort(String(column.key))}
          >
            {column.label}
            {column.sortable && sortKey === column.key && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {sortDirection === 'asc' ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Virtual scrolling body */}
      <div className="flex-1">
        <VirtualList
          items={sortedData}
          itemHeight={rowHeight}
          renderItem={(item) => (
            <div
              className={cn(
                'flex items-center gap-2 px-4 border-b hover:bg-accent/50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
              onClick={() => onRowClick?.(item)}
              style={{ height: rowHeight }}
            >
              {columns.map((column) => (
                <div
                  key={String(column.key)}
                  className={cn('text-sm', column.width || 'flex-1')}
                >
                  {column.render
                    ? column.render(item)
                    : item[column.key as keyof T]}
                </div>
              ))}
            </div>
          )}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
        <div>
          Showing {sortedData.length} of {data.length} items
        </div>
      </div>
    </div>
  );
}
