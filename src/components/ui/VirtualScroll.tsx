import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  emptyState?: ReactNode;
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className,
  emptyState,
}: VirtualScrollProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on mount and resize
  useEffect(() => {
    if (!scrollRef.current) return;

    const updateHeight = () => {
      if (scrollRef.current) {
        setContainerHeight(scrollRef.current.clientHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(scrollRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  if (items.length === 0) {
    return emptyState || null;
  }

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn('overflow-auto', className)}
      style={{ height: '100%' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual scrolling with dynamic heights
export function useVirtualScroll<T>(items: T[], estimatedItemHeight: number = 50) {
  const [heights, setHeights] = useState<Map<number, number>>(new Map());
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    // Measure heights of rendered items
    itemRefs.current.forEach((element, index) => {
      const height = element.getBoundingClientRect().height;
      if (heights.get(index) !== height) {
        setHeights(prev => new Map(prev).set(index, height));
      }
    });
  }, [items, heights]);

  const getItemHeight = (index: number) => {
    return heights.get(index) || estimatedItemHeight;
  };

  const getTotalHeight = () => {
    return items.reduce((sum, _, index) => sum + getItemHeight(index), 0);
  };

  const getOffsetForIndex = (index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  };

  const setItemRef = (index: number, element: HTMLElement | null) => {
    if (element) {
      itemRefs.current.set(index, element);
    } else {
      itemRefs.current.delete(index);
    }
  };

  return {
    getItemHeight,
    getTotalHeight,
    getOffsetForIndex,
    setItemRef,
  };
}
