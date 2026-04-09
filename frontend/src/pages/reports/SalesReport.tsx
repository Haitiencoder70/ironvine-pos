import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { reportApi } from '../../services/api';
import { DateRangePicker, type DateRange } from '../../components/reports/DateRangePicker';
import type { SalesReportRow } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  QUOTE: '#94a3b8', PENDING_APPROVAL: '#f59e0b', APPROVED: '#3b82f6',
  MATERIALS_ORDERED: '#8b5cf6', MATERIALS_RECEIVED: '#06b6d4', IN_PRODUCTION: '#f97316',
  QUALITY_CHECK: '#eab308', READY_TO_SHIP: '#10b981', SHIPPED: '#6366f1',
  DELIVERED: '#22c55e', COMPLETED: '#16a34a', ON_HOLD: '#ef4444', CANCELLED: '#6b7280',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function exportCSV(rows: SalesReportRow[], filename: string) {
  const headers = ['Order #', 'Date', 'Customer', 'Status', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total'];
  const csvRows = rows.map((r) => [
    r.orderNumber,
    format(new Date(r.createdAt), 'yyyy-MM-dd'),
    r.customerName,
    r.status,
    r.itemCount,
    r.subtotal.toFixed(2),
    r.tax.toFixed(2),
    r.discount.toFixed(2),
    r.total.toFixed(2),
  ]);
  const csv = [headers, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SalesReportPage(): React.JSX.Element {
  const [range, setRange] = useState<DateRange>({
    preset: 'this_month',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    groupBy: 'day',
  });

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const params = {
    preset: range.preset !== 'custom' ? range.preset : undefined,
    startDate: range.preset === 'custom' ? format(range.startDate, 'yyyy-MM-dd') : undefined,
    endDate: range.preset === 'custom' ? format(range.endDate, 'yyyy-MM-dd') : undefined,
    groupBy: range.groupBy,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => reportApi.getSales(params),
    select: (r) => r.data,
  });

  const filteredRows = (data?.rows ?? []).filter((row) => {
    const matchStatus = !statusFilter || row.status === statusFilter;
    const matchSearch = !search || row.orderNumber.toLowerCase().includes(search.toLowerCase()) || row.customerName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const uniqueStatuses = Array.from(new Set((data?.rows ?? []).map((r) => r.status)));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/reports" className="min-h-[44px] w-11 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-sm text-gray-500 mt-0.5">Detailed sales breakdown</p>
          </div>
        </div>
        <button
          onClick={() => data && exportCSV(data.rows, `sales-report-${format(range.startDate, 'yyyy-MM-dd')}.csv`)}
          disabled={!data || data.rows.length === 0}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date Range */}
      <DateRangePicker value={range} onChange={setRange} />

      {/* Summary */}
      {isLoading ? (
        <div className="h-24 animate-pulse bg-gray-50 rounded-2xl" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: formatCurrency(data?.summary.totalRevenue ?? 0) },
            { label: 'Total Orders', value: String(data?.summary.totalOrders ?? 0) },
            { label: 'Avg Order Value', value: formatCurrency(data?.summary.avgOrderValue ?? 0) },
            { label: 'Completed', value: String(data?.summary.completedOrders ?? 0) },
          ].map((m) => (
            <div key={m.label} className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-gray-50 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.revenueOverTime ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders by Status */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue by Status</h2>
        {isLoading ? (
          <div className="h-48 animate-pulse bg-gray-50 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.ordersByStatus ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(s: string) => s.replace(/_/g, ' ')} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: number, name: string) => [name === 'revenue' ? formatCurrency(v) : v, name]} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {(data?.ordersByStatus ?? []).map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search order # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] flex-1 min-w-[200px] rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">All Statuses</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Order Details</h2>
          <span className="text-sm text-gray-400">{filteredRows.length} orders</span>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-gray-50 rounded-lg" />)}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">No orders match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Order #', 'Date', 'Customer', 'Status', 'Items', 'Total'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRows.map((row) => (
                  <tr key={row.orderNumber} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-blue-600">
                      <Link to={`/orders`} className="hover:underline">{row.orderNumber}</Link>
                    </td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{format(new Date(row.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-5 py-3 text-gray-900">{row.customerName || '—'}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${STATUS_COLORS[row.status] ?? '#94a3b8'}20`, color: STATUS_COLORS[row.status] ?? '#94a3b8' }}
                      >
                        {row.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-center">{row.itemCount}</td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{formatCurrency(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-sm font-semibold text-gray-700">Total ({filteredRows.length} orders)</td>
                  <td className="px-5 py-3 font-bold text-gray-900">
                    {formatCurrency(filteredRows.reduce((sum, r) => sum + r.total, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
