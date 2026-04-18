import { twMerge } from 'tailwind-merge';

export interface SkeletonLoaderProps {
  variant?: 'table' | 'card' | 'stat' | 'detail' | 'text';
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ variant = 'text', rows = 1, className }: SkeletonLoaderProps) {
  
  if (variant === 'table') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <tr key={i} className="animate-pulse">
            <td className="px-6 py-4">
              <div className="flex flex-col gap-2">
                <div className="h-4 w-48 bg-gray-100 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </div>
            </td>
            <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
            <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded ml-auto" /></td>
            <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-100 rounded ml-auto" /></td>
            <td className="px-6 py-4"><div className="h-8 w-8 bg-gray-100 rounded-full ml-auto" /></td>
          </tr>
        ))}
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={twMerge('animate-pulse bg-white p-5 rounded-2xl border border-gray-100 h-[140px] flex flex-col justify-between', className)}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 bg-gray-100 rounded" />
                <div className="h-4 w-1/2 bg-gray-100 rounded" />
              </div>
              <div className="h-8 w-16 bg-gray-100 rounded" />
            </div>
            <div className="h-6 w-24 bg-gray-100 rounded-lg" />
          </div>
        ))}
      </>
    );
  }

  if (variant === 'stat') {
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={twMerge('animate-pulse bg-white p-6 rounded-2xl border border-gray-100 space-y-4', className)}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-100 rounded-xl" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-32 bg-gray-100 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        ))}
      </>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={twMerge('animate-pulse space-y-6', className)}>
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="h-16 w-16 bg-gray-100 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-64 bg-gray-100 rounded" />
            <div className="h-4 w-48 bg-gray-100 rounded" />
          </div>
          <div className="h-10 w-24 bg-gray-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-gray-100 rounded-2xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // default 'text' fallback
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className={twMerge('animate-pulse h-4 bg-gray-100 rounded w-full mb-2', className)} 
        />
      ))}
    </>
  );
}
