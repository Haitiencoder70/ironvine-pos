import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  CalculatorIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { reportApi } from '../../services/api';
import { DateRangePicker, type DateRange } from '../../components/reports/DateRangePicker';

const STATUS_COLORS: Record<string, string> = {
  QUOTE: '#94a3b8',
  PENDING_APPROVAL: '#f59e0b',
  APPROVED: '#3b82f6',
  MATERIALS_ORDERED: '#8b5cf6',
  MATERIALS_RECEIVED: '#06b6d4',
  IN_PRODUCTION: '#f97316',
  QUALITY_CHECK: '#eab308',
  READY_TO_SHIP: '#10b981',
  SHIPPED: '#6366f1',
  DELIVERED: '#22c55e',
  COMPLETED: '#16a34a',
  ON_HOLD: '#ef4444',
  CANCELLED: '#6b7280',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function ChangePill({ value }: { value: number | null }): React.JSX.Element {
  if (value === null) return <span className="text-xs text-gray-400">No prior data</span>;
  const positive = value >= 0;
  return (
    <span className={clsx('flex items-center gap-0.5 text-xs font-medium', positive ? 'text-green-600' : 'text-red-600')}>
      {positive ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" /> : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function MetricCard({
  label, value, sub, change, icon, color,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
  icon: React.ReactNode;
  color: string;
}): React.JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex items-start gap-4">
      <div className={clsx('p-3 rounded-xl flex-shrink-0', color)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {change !== undefined && <ChangePill value={change ?? null} />}
      </div>
    </div>
  );
}

function SkeletonCard(): React.JSX.Element {
  return <div className="bg-white rounded-2xl shadow-sm p-5 h-28 animate-pulse bg-gray-50" />;
}

export function ReportsPage(): React.JSX.Element {
  const [range, setRange] = useState<DateRange>({
    preset: 'this_month',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    groupBy: 'day',
  });

  const params = {
    preset: range.preset !== 'custom' ? range.preset : undefined,
    startDate: range.preset === 'custom' ? format(range.startDate, 'yyyy-MM-dd') : undefined,
    endDate: range.preset === 'custom' ? format(range.endDate, 'yyyy-MM-dd') : undefined,
    groupBy: range.groupBy,
  };

  const salesQuery = useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => reportApi.getSales(params),
    select: (r) => r.data,
  });

  const inventoryQuery = useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => reportApi.getInventory(),
    select: (r) => r.data,
  });

  const productionQuery = useQuery({
    queryKey: ['reports', 'production', params],
    queryFn: () => reportApi.getProduction(params),
    select: (r) => r.data,
  });

  const sales = salesQuery.data;
  const inventory = inventoryQuery.data;
  const production = productionQuery.data;
  const loading = salesQuery.isLoading;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business performance overview</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/reports/sales"
            className="min-h-[44px] px-4 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors flex items-center"
          >
            Sales Report
          </Link>
          <Link
            to="/reports/inventory"
            className="min-h-[44px] px-4 rounded-xl bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors flex items-center"
          >
            Inventory Report
          </Link>
        </div>
      </div>

      {/* Date Range Picker */}
      <DateRangePicker value={range} onChange={setRange} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(sales?.summary.totalRevenue ?? 0)}
              change={sales?.summary.revenueChange ?? null}
              icon={<CurrencyDollarIcon className="h-5 w-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <MetricCard
              label="Total Orders"
              value={String(sales?.summary.totalOrders ?? 0)}
              change={sales?.summary.ordersChange ?? null}
              icon={<ShoppingCartIcon className="h-5 w-5 text-purple-600" />}
              color="bg-purple-50"
            />
            <MetricCard
              label="Avg Order Value"
              value={formatCurrency(sales?.summary.avgOrderValue ?? 0)}
              icon={<CalculatorIcon className="h-5 w-5 text-amber-600" />}
              color="bg-amber-50"
            />
            <MetricCard
              label="Completed Orders"
              value={String(sales?.summary.completedOrders ?? 0)}
              sub={sales ? `${Math.round((sales.summary.completedOrders / Math.max(sales.summary.totalOrders, 1)) * 100)}% completion rate` : undefined}
              icon={<CheckCircleIcon className="h-5 w-5 text-green-600" />}
              color="bg-green-50"
            />
          </>
        )}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Over Time</h2>
        {loading ? (
          <div className="h-64 animate-pulse bg-gray-50 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sales?.revenueOverTime ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Orders by Status + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Orders by Status</h2>
          {loading ? (
            <div className="h-56 animate-pulse bg-gray-50 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sales?.ordersByStatus ?? []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, count }: { status: string; count: number }) => `${status.replace(/_/g, ' ')} (${count})`}
                  labelLine={false}
                >
                  {(sales?.ordersByStatus ?? []).map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, name.replace(/_/g, ' ')]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Products</h2>
          {loading ? (
            <div className="h-56 animate-pulse bg-gray-50 rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sales?.topProducts.slice(0, 6) ?? []} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <YAxis type="category" dataKey="productType" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {(sales?.topProducts.slice(0, 6) ?? []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Top Customers</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse bg-gray-50 rounded-lg" />
            ))}
          </div>
        ) : (sales?.topCustomers.length ?? 0) === 0 ? (
          <p className="p-5 text-sm text-gray-400">No customer data for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Orders</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Spent</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(sales?.topCustomers ?? []).map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c.orderCount}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatCurrency(c.totalSpent)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/customers/${c.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inventory + Production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Report Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Inventory Overview</h2>
          {inventoryQuery.isLoading ? (
            <div className="h-40 animate-pulse bg-gray-50 rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{inventory?.summary.totalItems ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total SKUs</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{inventory?.summary.lowStockCount ?? 0}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Low Stock</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-700">{inventory?.summary.outOfStockCount ?? 0}</p>
                  <p className="text-xs text-red-600 mt-0.5">Out of Stock</p>
                </div>
              </div>
              <div className="pt-1">
                <p className="text-xs text-gray-500">Total inventory value</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(inventory?.summary.totalInventoryValue ?? 0)}</p>
              </div>
              {(inventory?.byCategory.length ?? 0) > 0 && (
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={inventory?.byCategory ?? []} margin={{ left: 0, right: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Value ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          )}
        </div>

        {/* Production Report Card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Production Overview</h2>
          {productionQuery.isLoading ? (
            <div className="h-40 animate-pulse bg-gray-50 rounded-xl" />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{production?.avgProductionDays ?? 0}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Avg Days to Complete</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{production?.completedCount ?? 0}</p>
                  <p className="text-xs text-green-600 mt-0.5">Completed Orders</p>
                </div>
              </div>
              {(production?.ordersByPrintMethod.length ?? 0) > 0 && (
                <>
                  <p className="text-sm font-medium text-gray-700">Orders by Print Method</p>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={production?.ordersByPrintMethod ?? []}
                        dataKey="count"
                        nameKey="method"
                        cx="50%"
                        cy="50%"
                        outerRadius={55}
                      >
                        {(production?.ordersByPrintMethod ?? []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {(inventory?.lowStock.length ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-200 flex items-center justify-between">
            <h2 className="text-base font-semibold text-amber-900">Low Stock Items</h2>
            <Link to="/reports/inventory" className="text-sm font-medium text-amber-700 hover:text-amber-900">
              Full Report →
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {(inventory?.lowStock.slice(0, 5) ?? []).map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-700">{item.quantityOnHand} left</p>
                  <p className="text-xs text-gray-400">min {item.reorderPoint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
