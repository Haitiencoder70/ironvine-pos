import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  estimatedRowHeight?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * Drop-in virtual scroller for lists with 100+ items.
 * Renders only visible rows, keeping the DOM lean regardless of dataset size.
 */
export function VirtualList<T>({
  items,
  estimatedRowHeight = 70,
  renderItem,
  className,
}: VirtualListProps<T>): React.JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className={className}
      style={{ overflow: 'auto' }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(items[virtualRow.index]!, virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
