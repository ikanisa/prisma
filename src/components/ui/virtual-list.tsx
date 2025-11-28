import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
}

/**
 * Virtual List Component
 * Renders only visible items for optimal performance with large lists
 * 
 * @example
 * <VirtualList
 *   items={documents}
 *   renderItem={(doc) => <DocumentCard document={doc} />}
 *   estimateSize={72}
 * />
 */
export function VirtualList<T>({
  items,
  estimateSize = 72,
  overscan = 5,
  renderItem,
  className,
  itemClassName,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
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
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className={cn('absolute top-0 left-0 w-full', itemClassName)}
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
