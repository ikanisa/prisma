import { memo, useRef, useEffect, CSSProperties, ReactElement } from 'react';
import { FixedSizeList, VariableSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

export interface VirtualListItem {
  id: string | number;
  height?: number;
  [key: string]: any;
}

interface VirtualListProps<T extends VirtualListItem> {
  items: T[];
  itemHeight?: number | ((index: number) => number);
  renderItem: (props: { item: T; index: number; style: CSSProperties }) => ReactElement;
  className?: string;
  overscanCount?: number;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
}

function VirtualListInner<T extends VirtualListItem>({
  items,
  itemHeight = 60,
  renderItem,
  className,
  overscanCount = 5,
  onScroll,
  scrollToIndex,
}: VirtualListProps<T>) {
  const listRef = useRef<FixedSizeList | VariableSizeList | null>(null);
  const isVariableHeight = typeof itemHeight === 'function';

  // Scroll to index when requested
  useEffect(() => {
    if (scrollToIndex !== undefined && listRef.current) {
      listRef.current.scrollToItem(scrollToIndex, 'center');
    }
  }, [scrollToIndex]);

  // Handle scroll events
  const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
    if (onScroll) {
      onScroll(scrollOffset);
    }
    
    // Persist scroll position
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('virtualListScrollPosition', String(scrollOffset));
    }
  };

  // Restore scroll position on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && listRef.current) {
      const savedPosition = sessionStorage.getItem('virtualListScrollPosition');
      if (savedPosition) {
        listRef.current.scrollTo(Number(savedPosition));
      }
    }
  }, []);

  // Row renderer for fixed height
  const FixedRow = memo(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    if (!item) return null;
    
    return renderItem({ item, index, style });
  });
  FixedRow.displayName = 'FixedRow';

  // Row renderer for variable height
  const VariableRow = memo(({ index, style }: ListChildComponentProps) => {
    const item = items[index];
    if (!item) return null;
    
    return renderItem({ item, index, style });
  });
  VariableRow.displayName = 'VariableRow';

  // Get item size for variable height lists
  const getItemSize = (index: number): number => {
    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }
    return items[index]?.height || itemHeight;
  };

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <AutoSizer>
        {({ height, width }) => {
          if (isVariableHeight) {
            return (
              <VariableSizeList
                ref={listRef as any}
                height={height}
                width={width}
                itemCount={items.length}
                itemSize={getItemSize}
                overscanCount={overscanCount}
                onScroll={handleScroll}
              >
                {VariableRow}
              </VariableSizeList>
            );
          }

          return (
            <FixedSizeList
              ref={listRef as any}
              height={height}
              width={width}
              itemCount={items.length}
              itemSize={typeof itemHeight === 'number' ? itemHeight : 60}
              overscanCount={overscanCount}
              onScroll={handleScroll}
            >
              {FixedRow}
            </FixedSizeList>
          );
        }}
      </AutoSizer>
    </div>
  );
}

/**
 * VirtualList - High-performance list virtualization component
 * 
 * Efficiently renders large lists (10K+ items) by only rendering visible items.
 * Supports both fixed and variable height items.
 * 
 * @example
 * ```tsx
 * // Fixed height items
 * <VirtualList
 *   items={documents}
 *   itemHeight={80}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>
 *       <DocumentCard document={item} />
 *     </div>
 *   )}
 * />
 * 
 * // Variable height items
 * <VirtualList
 *   items={tasks}
 *   itemHeight={(index) => tasks[index].expanded ? 200 : 60}
 *   renderItem={({ item, style }) => (
 *     <div style={style}>
 *       <TaskCard task={item} />
 *     </div>
 *   )}
 * />
 * ```
 */
export const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;

VirtualList.displayName = 'VirtualList';
