import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualGridProps<T> {
  items: T[];
  columns?: number;
  estimateSize?: number;
  gap?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * Virtual Grid Component
 * Renders only visible grid items for optimal performance
 * 
 * @example
 * <VirtualGrid
 *   items={documents}
 *   columns={3}
 *   renderItem={(doc) => <DocumentCard document={doc} />}
 *   estimateSize={200}
 * />
 */
export function VirtualGrid<T>({
  items,
  columns = 3,
  estimateSize = 200,
  gap = 16,
  overscan = 2,
  renderItem,
  className,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Calculate number of rows
  const rowCount = Math.ceil(items.length / columns);
  
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
  });

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowItems = items.slice(startIndex, startIndex + columns);
          
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {rowItems.map((item, colIndex) => (
                  <div key={startIndex + colIndex}>
                    {renderItem(item, startIndex + colIndex)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
