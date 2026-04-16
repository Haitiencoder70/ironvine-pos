import type { JSX } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { dashboardApi } from '../../services/api';
import type { TopProductProfit } from '../../types';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const MARGIN_COLOR = (margin: number) =>
  margin >= 60 ? '#34d399' : margin >= 45 ? '#60a5fa' : margin >= 30 ? '#fbbf24' : '#f87171';

const PIE_PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h3 className="text-sm font-bold tracking-wide text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ProductProfitTable({ products, highlight }: { products: TopProductProfit[]; highlight: 'high' | 'low' }): JSX.Element {
  if (!products.length) return <p className="text-sm text-gray-500 py-6 text-center">No data.</p>;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_70px_80px_60px] gap-2 px-2 pb-1 border-b border-white/[0.06]">
        {['Product', 'Units', 'Revenue', 'Margin'].map((h) => (
          <span key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 last:text-right">{h}</span>
        ))}
      </div>
      {products.map((p) => (
        <div key={p.productType} className="grid grid-cols-[1fr_70px_80px_60px] gap-2 items-center px-2 py-2 rounded-xl hover:bg-white/[0.03] min-h-[44px]">
          <span className="text-sm text-gray-200 truncate" title={p.productType}>{p.productType}</span>
          <span className="text-sm text-gray-400">{p.unitsSold}</span>
          <span className="text-sm font-semibold text-white">{fmt(p.revenue)}</span>
          <span className="text-sm font-bold text-right" style={{ color: highlight === 'high' ? '#34d399' : '#f87171' }}>
            {p.margin.toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function ProfitReportPage(): JSX.Element {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));

  const sdISO = startDate.toISOString();
  const edISO = endDate.toISOString();

  const profitQ = useQuery({
    queryKey: ['profit-stats', sdISO, edISO],
    queryFn: () => dashboardApi.getProfitStats({ startDate: sdISO, endDate: edISO }),
    select: (r) => r.data,
  });

  const topQ = useQuery({
    queryKey: ['top-products', sdISO, edISO],
    queryFn: () => dashboardApi.getTopProducts({ startDate: sdISO, endDate: edISO }),
    select: (r) => r.data,
  });

  const trendQ = useQuery({
    queryKey: ['profit-trend', 6],
    queryFn: () => dashboardApi.getProfitTrend({ months: 6 }),
    select: (r) => r.data,
  });

  const stats = profitQ.data;
  const products = topQ.data ?? [];
  const trendData = trendQ.data ?? [];

  // Pie: top 7 products by revenue + others
  const pieData = (() => {
    if (!products.length) return [];
    const top7 = products.slice(0, 7);
    const othersRevenue = products.slice(7).reduce((s, p) => s + p.revenue, 0);
    const result = top7.map((p) => ({ name: p.productType, value: Math.round(p.revenue) }));
    if (othersRevenue > 0) result.push({ name: 'Others', value: Math.round(othersRevenue) });
    return result;
  })();

  const sorted = [...products].sort((a, b) => b.margin - a.margin);
  const mostProfitable = sorted.slice(0, 5);
  const leastProfitable = [...sorted].reverse().slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link
          to="/reports"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors min-h-[44px] px-3 rounded-xl hover:bg-white/5"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Reports
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Profit Report</h1>
          <p className="text-xs text-gray-500 mt-0.5">Revenue, costs, and margin analysis</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">From</label>
            <input
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="text-sm bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white min-h-[44px] focus:outline-none focus:border-blue-500/60"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">To</label>
            <input
              type="date"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="text-sm bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-white min-h-[44px] focus:outline-none focus:border-blue-500/60"
            />
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Revenue', value: fmt(stats.revenue), color: '#60a5fa' },
            { label: 'Costs',   value: fmt(stats.costs),   color: '#f87171' },
            { label: 'Profit',  value: fmt(stats.profit),  color: '#34d399' },
            { label: 'Margin',  value: `${stats.margin.toFixed(1)}%`, color: '#a78bfa' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: s.color }}>{s.label}</p>
              <p className="text-2xl font-extrabold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue vs Cost Line Chart (6-month trend) */}
      <SectionCard title="Revenue vs Cost Trend (Last 6 Months)">
        {trendQ.isLoading ? (
          <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                contentStyle={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Line type="monotone" dataKey="revenue" stroke="#60a5fa" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="costs"   stroke="#f87171" strokeWidth={2} dot={false} name="Costs" />
              <Line type="monotone" dataKey="profit"  stroke="#34d399" strokeWidth={2} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Profit by Product Bar Chart */}
      <SectionCard title="Profit by Product">
        {topQ.isLoading ? (
          <div className="h-72 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No data for selected period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={products.slice(0, 10)} margin={{ top: 4, right: 16, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="productType" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                contentStyle={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit"  name="Profit"  radius={[4, 4, 0, 0]}>
                {products.map((p) => <Cell key={p.productType} fill={MARGIN_COLOR(p.margin)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* Revenue Pie + Add-on breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Revenue by Product (Pie)">
          {topQ.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : pieData.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No data for selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Add-on Revenue Breakdown">
          <p className="text-xs text-gray-500 mb-3">Estimated base vs. add-on split per product.</p>
          {topQ.isLoading ? (
            <div className="h-56 animate-pulse rounded-xl bg-white/[0.04]" />
          ) : products.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No data for selected period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={products.slice(0, 8).map((p) => ({
                  name: p.productType,
                  base:   Math.round(p.revenue * 0.82),
                  addOns: Math.round(p.revenue * 0.18),
                }))}
                margin={{ top: 4, right: 16, left: 0, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
                <Tooltip contentStyle={{ background: '#1e2030', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
                <Bar dataKey="base"   name="Base Price" fill="#6366f1" stackId="a" />
                <Bar dataKey="addOns" name="Add-ons"    fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* Most & Least profitable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Most Profitable Products">
          <ProductProfitTable products={mostProfitable} highlight="high" />
        </SectionCard>
        <SectionCard title="Least Profitable Products">
          <ProductProfitTable products={leastProfitable} highlight="low" />
        </SectionCard>
      </div>
    </div>
  );
}
