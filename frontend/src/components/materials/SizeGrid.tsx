import type { JSX } from 'react';

interface SizeGridProps {
  sizes: string[];
  values: Record<string, number>;
  onChange: (size: string, qty: number) => void;
}

export function SizeGrid({ sizes, values, onChange }: SizeGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
      {sizes.map((size) => (
        <div key={size} className="flex flex-col gap-1">
          <span className="text-center text-xs font-bold text-gray-500 uppercase">{size}</span>
          <input
            type="number"
            min="0"
            value={values[size] || 0}
            onChange={(e) => onChange(size, parseInt(e.target.value) || 0)}
            className="w-full min-h-[44px] text-center rounded-lg border border-gray-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      ))}
    </div>
  );
}
