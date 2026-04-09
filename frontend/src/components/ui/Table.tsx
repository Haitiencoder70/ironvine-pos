import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/20/solid';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  sortKey?: keyof T | string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: keyof T | string) => void;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  sortKey,
  sortDirection = 'asc',
  onSort,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available',
  className,
}: TableProps<T>) {
  const handleSort = (key: keyof T | string) => {
    if (onSort) {
      onSort(key);
    }
  };

  const getValue = (item: T, key: keyof T | string): unknown => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj, k) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (obj as any)?.[k];
      }, item);
    }
    return item[key];
  };

  if (loading) {
    return (
      <div className={twMerge('animate-pulse', className)}>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={twMerge(
          'flex items-center justify-center py-12 text-center',
          className
        )}
      >
        <div>
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={twMerge('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key as string}
                scope="col"
                style={{ width: column.width }}
                className={clsx(
                  'px-4 py-3 text-left text-sm font-semibold text-gray-900',
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable &&
                    onSort &&
                    'cursor-pointer hover:bg-gray-100 select-none',
                  'transition-colors'
                )}
                onClick={() => column.sortable && onSort && handleSort(column.key)}
              >
                <div
                  className={clsx(
                    'flex items-center gap-2',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end',
                    column.align === 'right' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <span>{column.header}</span>
                  {column.sortable && onSort && sortKey === column.key && (
                    <span className="text-gray-400">
                      {sortDirection === 'asc' ? (
                        <ArrowUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {data.map((item, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                'min-h-[44px]',
                onRowClick &&
                  'cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors'
              )}
            >
              {columns.map((column) => (
                <td
                  key={`${index}-${column.key as string}`}
                  className={clsx(
                    'px-4 py-3 text-sm text-gray-700 whitespace-nowrap',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render
                    ? column.render(item, index)
                    : String(getValue(item, column.key) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
