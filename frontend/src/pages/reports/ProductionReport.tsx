import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ChevronLeftIcon, ClockIcon, CheckCircleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { reportApi } from '../../services/api';
import { DateRangePicker, type DateRange } from '../../components/reports/DateRangePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import type { JSX } from 'react';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const PRIORITY_COLOR: Record<string, string> = {
  NORMAL: '#3b82f6',
  HIGH:   '#f59e0b',
  RUSH:   '#ef4444',
};

function SkeletonCard(): JSX.Element {
  return <div className="bg-white rounded-2xl shadow-sm p-5 h-28 animate-pulse bg-gray-50" />;
}

export function ProductionReportPage(): JSX.Element {
  const navigate = useNavigate();
  const [range, setRange] = useState<DateRange>({
    preset: 'this_month',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    groupBy: 'day',
  });

  const params = {
    preset: range.preset !== 'custom' ? range.preset : undefined,
    startDate: range.preset === 'custom' ? format(range.startDate, 'yyyy-MM-dd') : undefined,
    endDate:   range.preset === 'custom' ? format(range.endDate,   'yyyy-MM-dd') : undefined,
  };

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['reports', 'production', params],
    queryFn: () => reportApi.getProduction(params),
    select: (r) => r.data,
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] -ml-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Completed orders, print methods, and throughput</p>
        </div>
      </div>

      <DateRangePicker value={range} onChange={setRange} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-50 flex-shrink-0">
                <ClockIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Days to Complete</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.avgProductionDays ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">from order creation</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-50 flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Orders Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.completedCount ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">in selected period</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-50 flex-shrink-0">
                <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Print Methods Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{report?.ordersByPrintMethod.length ?? 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">unique methods</p>
              </div>
            </div>
          </>
        )}
      </div>

      {isError && (
        <EmptyState
          title="Failed to load report"
          description="Could not fetch production data. Please try again."
        />
      )}

      {!isLoading && !isError && (report?.completedCount ?? 0) === 0 && (
        <EmptyState
          title="No completed orders"
          description="No orders were completed in the selected date range."
        />
      )}

      {/* Charts */}
      {!isLoading && !isError && (report?.completedCount ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Print Methods */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Items by Print Method</h2>
            {(report?.ordersByPrintMethod.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No print method data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={report?.ordersByPrintMethod ?? []}
                    dataKey="count"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ method, count }: { method: string; count: number }) =>
                      `${method.replace(/_/g, ' ')} (${count})`
                    }
                  >
                    {(report?.ordersByPrintMethod ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders by Priority */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Orders by Priority</h2>
            {(report?.ordersByPriority.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No priority data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={report?.ordersByPriority ?? []}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]}>
                    {(report?.ordersByPriority ?? []).map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLOR[entry.priority] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
