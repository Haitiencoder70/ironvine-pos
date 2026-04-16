import type { JSX } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import type { ProfitStats } from '../../types';

interface Props {
  stats: ProfitStats | undefined;
  loading: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function ChangePill({ value, suffix = '%', invert = false }: { value: number | null; suffix?: string; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-gray-500">—</span>;
  const positive = invert ? value <= 0 : value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {positive
        ? <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
        : <ArrowTrendingDownIcon className="h-3.5 w-3.5" />}
      {value >= 0 ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: number | null;
  suffix?: string;
  invert?: boolean;
  accent: string;
}

function StatCard({ label, value, change, suffix, invert, accent }: StatCardProps) {
  return (
    <div
      className="flex-1 min-w-[130px] rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase" style={{ color: accent }}>{label}</p>
      <p className="text-2xl font-extrabold tracking-tight text-white">{value}</p>
      <ChangePill value={change} suffix={suffix} invert={invert} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      className="flex-1 min-w-[130px] rounded-2xl p-4 animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="h-3 w-16 rounded bg-white/10 mb-3" />
      <div className="h-7 w-24 rounded bg-white/10 mb-2" />
      <div className="h-3 w-12 rounded bg-white/10" />
    </div>
  );
}

export function ProfitOverview({ stats, loading }: Props): JSX.Element {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 40px rgba(16,185,129,0.04)',
      }}
    >
      <h2 className="text-sm font-bold tracking-wide text-gray-300 mb-4">
        💰 Profit Overview <span className="text-gray-500 font-normal">(This Month)</span>
      </h2>

      <div className="flex flex-wrap gap-3">
        {loading || !stats ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard label="Revenue"  value={fmt(stats.revenue)}       change={stats.revenueChange}  suffix="%" accent="#60a5fa" />
            <StatCard label="Costs"    value={fmt(stats.costs)}         change={stats.costsChange}    suffix="%" invert accent="#f87171" />
            <StatCard label="Profit"   value={fmt(stats.profit)}        change={stats.profitChange}   suffix="%" accent="#34d399" />
            <StatCard label="Margin"   value={`${stats.margin.toFixed(1)}%`} change={stats.marginChange} suffix=" pts" accent="#a78bfa" />
          </>
        )}
      </div>
    </div>
  );
}
