import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { clsx } from 'clsx';
import { reportApi } from '../../services/api';
import type { InventoryReportRow } from '../../types';

const CATEGORY_COLORS: Record<string, string> = {
  BLANK_SHIRTS: '#3b82f6',
  DTF_TRANSFERS: '#10b981',
  VINYL: '#f59e0b',
  INK: '#ef4444',
  PACKAGING: '#8b5cf6',
  EMBROIDERY_THREAD: '#06b6d4',
  OTHER: '#94a3b8',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function exportCSV(rows: InventoryReportRow[], filename: string) {
  const headers = ['SKU', 'Name', 'Category', 'On Hand', 'Reserved', 'Reorder Point', 'Cost Price', 'Total Value', 'Status'];
  const csvRows = rows.map((r) => [
    r.sku, r.name, r.category, r.quantityOnHand, r.quantityReserved,
    r.reorderPoint, r.costPrice.toFixed(2), r.totalValue.toFixed(2), r.status,
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

export function InventoryReportPage(): React.JSX.Element {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'LOW' | 'OUT' | 'OK'>('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => reportApi.getInventory(),
    select: (r) => r.data,
  });

  const filteredRows = (data?.rows ?? []).filter((row) => {
    const matchCat = !categoryFilter || row.category === categoryFilter;
    const matchStatus = !statusFilter || row.status === statusFilter;
    const matchSearch = !search || row.name.toLowerCase().includes(search.toLowerCase()) || row.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchStatus && matchSearch;
  });

  const uniqueCategories = Array.from(new Set((data?.rows ?? []).map((r) => r.category)));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/reports" className="min-h-[44px] w-11 flex items-center justify-center rounded-xl bg-white/[0.06] hover:bg-white/10 transition-colors">
            <ArrowLeftIcon className="h-4 w-4 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Inventory Report</h1>
            <p className="text-sm text-muted mt-0.5">Stock levels, movements & reorder recommendations</p>
          </div>
        </div>
        <button
          onClick={() => data && exportCSV(data.rows, 'inventory-report.csv')}
          disabled={!data || data.rows.length === 0}
          className="min-h-[44px] px-4 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="h-24 animate-pulse bg-white/[0.04] rounded-2xl" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel-weighted rounded-2xl p-4">
            <p className="text-xs text-muted">Total SKUs</p>
            <p className="text-2xl font-bold text-slate-100 stat-number">{data?.summary.totalItems ?? 0}</p>
          </div>
          <div className="glass-panel-weighted rounded-2xl p-4 border border-amber-500/20">
            <p className="text-xs text-amber-400">Low Stock</p>
            <p className="text-2xl font-bold text-amber-400 stat-number">{data?.summary.lowStockCount ?? 0}</p>
          </div>
          <div className="glass-panel-weighted rounded-2xl p-4 border border-red-500/20">
            <p className="text-xs text-red-400">Out of Stock</p>
            <p className="text-2xl font-bold text-red-400 stat-number">{data?.summary.outOfStockCount ?? 0}</p>
          </div>
          <div className="glass-panel-weighted rounded-2xl p-4 border border-green-500/20">
            <p className="text-xs text-green-400">Total Value</p>
            <p className="text-2xl font-bold text-green-400 stat-number">{formatCurrency(data?.summary.totalInventoryValue ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value by Category */}
        <div className="card-cinema rounded-2xl p-5">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Value by Category</h2>
          {isLoading ? (
            <div className="h-48 animate-pulse bg-white/[0.04] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.byCategory ?? []} margin={{ left: 0, right: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(s: string) => s.replace(/_/g, ' ')} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Value']} labelFormatter={(l: string) => l.replace(/_/g, ' ')} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {(data?.byCategory ?? []).map((entry) => (
                    <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Most Used (last 30 days) */}
        <div className="card-cinema rounded-2xl p-5">
          <h2 className="text-base font-semibold text-slate-100 mb-4">Most Used (Last 30 Days)</h2>
          {isLoading ? (
            <div className="h-48 animate-pulse bg-white/[0.04] rounded-xl" />
          ) : (data?.mostUsed.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No usage data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.mostUsed.slice(0, 8) ?? []} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip />
                <Bar dataKey="totalUsed" name="Units Used" radius={[0, 4, 4, 0]}>
                  {(data?.mostUsed.slice(0, 8) ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Reorder Recommendations */}
      {(data?.reorderRecommendations.length ?? 0) > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-500/20 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-semibold text-amber-400">Reorder Recommendations</h2>
            <span className="ml-auto bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {data?.reorderRecommendations.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-amber-500/20">
                  {['SKU', 'Name', 'On Hand', 'Min', 'Reorder Qty', 'Est. Cost'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-amber-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {(data?.reorderRecommendations ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-amber-500/[0.06] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{r.sku}</td>
                    <td className="px-5 py-3 font-medium text-slate-100">{r.name}</td>
                    <td className="px-5 py-3 font-bold text-amber-400">{r.quantityOnHand}</td>
                    <td className="px-5 py-3 text-slate-500">{r.reorderPoint}</td>
                    <td className="px-5 py-3 text-slate-300">{r.reorderQuantity}</td>
                    <td className="px-5 py-3 font-semibold text-slate-100">{formatCurrency(r.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search SKU or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] flex-1 min-w-[200px] rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="min-h-[44px] rounded-xl border border-white/10 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[rgba(10,10,20,0.85)]"
        >
          <option value="">All Categories</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {(['', 'OK', 'LOW', 'OUT'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                'min-h-[44px] px-3 rounded-xl text-sm font-medium transition-colors',
                statusFilter === s
                  ? s === 'LOW' ? 'bg-amber-500 text-white' : s === 'OUT' ? 'bg-red-600 text-white' : 'glass-panel-weighted text-slate-100'
                  : 'bg-white/[0.06] text-slate-400 hover:bg-white/10',
              )}
            >
              {s === '' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="card-cinema rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-100">Stock Levels</h2>
          <span className="text-sm text-slate-500">{filteredRows.length} items</span>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 animate-pulse bg-white/[0.04] rounded-lg" />)}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No items match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['SKU', 'Name', 'Category', 'On Hand', 'Reserved', 'Reorder Point', 'Unit Cost', 'Total Value', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRows.map((row) => (
                  <tr key={row.sku} className={clsx('hover:bg-white/[0.04] transition-colors', row.status === 'OUT' && 'bg-red-500/[0.06]', row.status === 'LOW' && 'bg-amber-500/[0.06]')}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sku}</td>
                    <td className="px-4 py-3 font-medium text-slate-100">{row.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.category.replace(/_/g, ' ')}</td>
                    <td className={clsx('px-4 py-3 font-bold', row.status === 'OUT' ? 'text-red-400' : row.status === 'LOW' ? 'text-amber-400' : 'text-slate-100')}>
                      {row.quantityOnHand}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.quantityReserved}</td>
                    <td className="px-4 py-3 text-slate-500">{row.reorderPoint}</td>
                    <td className="px-4 py-3 text-slate-400">{formatCurrency(row.costPrice)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100">{formatCurrency(row.totalValue)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        row.status === 'OK' ? 'bg-green-500/20 text-green-400' : row.status === 'LOW' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400',
                      )}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-white/10 bg-white/[0.04]">
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-sm font-semibold text-slate-300">Total Value ({filteredRows.length} items)</td>
                  <td className="px-4 py-3 font-bold text-slate-100">
                    {formatCurrency(filteredRows.reduce((sum, r) => sum + r.totalValue, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
