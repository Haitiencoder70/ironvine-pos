import { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { ReportPreset } from '../../types';

export interface DateRange {
  preset: ReportPreset;
  startDate: Date;
  endDate: Date;
  groupBy: 'day' | 'week' | 'month';
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: { value: ReportPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom' },
];

function presetToRange(preset: ReportPreset, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date; groupBy: 'day' | 'week' | 'month' } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { startDate: now, endDate: now, groupBy: 'day' };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { startDate: y, endDate: y, groupBy: 'day' };
    }
    case 'this_week':
      return { startDate: startOfWeek(now), endDate: endOfWeek(now), groupBy: 'day' };
    case 'last_week': {
      const lw = subDays(now, 7);
      return { startDate: startOfWeek(lw), endDate: endOfWeek(lw), groupBy: 'day' };
    }
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now), groupBy: 'day' };
    case 'last_month': {
      const lm = subMonths(now, 1);
      return { startDate: startOfMonth(lm), endDate: endOfMonth(lm), groupBy: 'day' };
    }
    case 'custom':
      return {
        startDate: customStart ?? subDays(now, 29),
        endDate: customEnd ?? now,
        groupBy: 'day',
      };
  }
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps): React.JSX.Element {
  const [customStart, setCustomStart] = useState(format(value.startDate, 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(value.endDate, 'yyyy-MM-dd'));

  function selectPreset(preset: ReportPreset) {
    if (preset === 'custom') {
      onChange({ preset, ...presetToRange(preset, new Date(customStart), new Date(customEnd)), groupBy: value.groupBy });
    } else {
      onChange({ preset, ...presetToRange(preset), groupBy: value.groupBy });
    }
  }

  function applyCustom() {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const groupBy: 'day' | 'week' | 'month' = diffDays > 90 ? 'month' : diffDays > 30 ? 'week' : 'day';
    onChange({ preset: 'custom', startDate: start, endDate: end, groupBy });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap items-end gap-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => selectPreset(p.value)}
            className={clsx(
              'min-h-[44px] px-4 rounded-xl text-sm font-medium transition-colors',
              value.preset === p.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={applyCustom}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {/* Group by toggle */}
      <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {(['day', 'week', 'month'] as const).map((g) => (
          <button
            key={g}
            onClick={() => onChange({ ...value, groupBy: g })}
            className={clsx(
              'min-h-[36px] px-3 rounded-lg text-xs font-medium capitalize transition-colors',
              value.groupBy === g ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
