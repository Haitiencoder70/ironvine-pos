import type { JSX } from 'react';
import type { TopProductProfit } from '../../types';

interface Props {
  products: TopProductProfit[] | undefined;
  loading: boolean;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const RANK_COLORS = ['#fbbf24', '#9ca3af', '#cd7f32', '#6b7280', '#6b7280'];

export function TopProducts({ products, loading }: Props): JSX.Element {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 0 40px rgba(168,85,247,0.04)',
      }}
    >
      <h2 className="text-sm font-bold tracking-wide text-gray-300 mb-4">
        🏆 Top Products <span className="text-gray-500 font-normal">(This Month)</span>
      </h2>

      {loading || !products ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-500 py-6 text-center">No order data for this period.</p>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[24px_1fr_80px_90px_60px] gap-3 px-2 pb-1 border-b border-white/[0.06]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">#</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Product</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 text-right">Sold</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 text-right">Revenue</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 text-right">Margin</span>
          </div>
          {products.map((p) => (
            <div
              key={p.rank}
              className="grid grid-cols-[24px_1fr_80px_90px_60px] gap-3 items-center px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors min-h-[44px]"
            >
              <span
                className="text-sm font-black"
                style={{ color: RANK_COLORS[p.rank - 1] ?? '#6b7280' }}
              >
                {p.rank}
              </span>
              <span className="text-sm font-medium text-gray-200 truncate" title={p.productType}>
                {p.productType}
              </span>
              <span className="text-sm text-gray-400 text-right">{p.unitsSold.toLocaleString()}</span>
              <span className="text-sm font-semibold text-white text-right">{fmt(p.revenue)}</span>
              <span
                className="text-sm font-bold text-right"
                style={{ color: p.margin >= 50 ? '#34d399' : p.margin >= 30 ? '#fbbf24' : '#f87171' }}
              >
                {p.margin.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
