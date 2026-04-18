import React from 'react';
import { clsx } from 'clsx';

interface CascadingSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder?: string;
}

export function CascadingSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  error,
  placeholder = 'Select option...',
}: CascadingSelectProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={clsx(
            'w-full min-h-[48px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-base appearance-none cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 outline-none',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            error && 'border-red-400 focus:border-red-500'
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
