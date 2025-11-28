import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  estimateSize?: number;
  overscan?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

/**
 * Virtual Table Component
 * Renders only visible rows for optimal performance with large datasets
 * 
 * @example
 * <VirtualTable
 *   data={tasks}
 *   columns={[
 *     { key: 'title', header: 'Title', cell: (task) => task.title },
 *     { key: 'status', header: 'Status', cell: (task) => <Badge>{task.status}</Badge> },
 *   ]}
 * />
 */
export function VirtualTable<T>({
  data,
  columns,
  estimateSize = 48,
  overscan = 10,
  className,
  onRowClick,
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  return (
    <div className={cn('h-full overflow-auto', className)}>
      <div ref={parentRef} className="h-full overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-background shadow-sm">
            <tr className="border-b">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-semibold text-muted-foreground',
                    column.className
                  )}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = data[virtualRow.index];
              return (
                <tr
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={cn(
                    'border-b hover:bg-muted/50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(item, virtualRow.index)}
                  style={{
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`,
                    width: '100%',
                    display: 'table',
                    tableLayout: 'fixed',
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm"
                      style={{ width: column.width }}
                    >
                      {column.cell(item, virtualRow.index)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
