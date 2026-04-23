import { useState, useMemo } from 'react';
import { MinusIcon, PlusIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  type Product,
  getPriceTierForQty,
  getSizeUpcharge,
  calcTotalMaterialCost,
  formatCurrency,
} from '../../hooks/useProducts';
import type { JSX } from 'react';

interface PriceCalculatorProps {
  product: Product;
  taxRate?: number; // 0–1, e.g. 0.0825
  className?: string;
}

export function PriceCalculator({ product, taxRate = 0.0825, className }: PriceCalculatorProps): JSX.Element {
  const [qty, setQty] = useState(12);
  const [size, setSize] = useState(product.availableSizes[3] ?? product.availableSizes[0] ?? 'XL');
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  const activeAddOns = (product.addOns ?? []).filter(a => a.isActive);

  const toggleAddOn = (id: string) => {
    setSelectedAddOns(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const adjustQty = (delta: number) => {
    setQty(q => Math.max(1, q + delta));
  };

  const calc = useMemo(() => {
    const tier = getPriceTierForQty(product, qty);
    const unitBase = tier ? Number(tier.price) : Number(product.basePrice);
    const sizeUC = getSizeUpcharge(product, size);
    const unitPrice = unitBase + sizeUC;
    const garmentsSubtotal = unitPrice * qty;

    let addOnsTotal = 0;
    const addOnLines: { name: string; perItem: number; total: number }[] = [];
    for (const ao of activeAddOns) {
      if (selectedAddOns.has(ao.id)) {
        const aoPrice = Number(ao.price);
        const lineTotal = aoPrice * qty;
        addOnsTotal += lineTotal;
        addOnLines.push({ name: ao.name, perItem: aoPrice, total: lineTotal });
      }
    }

    const subtotal = garmentsSubtotal + addOnsTotal;
    const taxAmount = subtotal * taxRate;
    const grandTotal = subtotal + taxAmount;

    const materialCostPerUnit = calcTotalMaterialCost(product);
    const totalMaterialCost = materialCostPerUnit * qty;
    const estimatedProfit = subtotal - totalMaterialCost;
    const profitMargin = subtotal > 0 ? (estimatedProfit / subtotal) * 100 : 0;

    return {
      tier,
      unitBase,
      sizeUC,
      unitPrice,
      garmentsSubtotal,
      addOnLines,
      addOnsTotal,
      subtotal,
      taxAmount,
      grandTotal,
      totalMaterialCost,
      estimatedProfit,
      profitMargin,
    };
  }, [product, qty, size, selectedAddOns, taxRate, activeAddOns]);

  const marginColor =
    calc.profitMargin >= 50 ? 'text-emerald-600'
    : calc.profitMargin >= 30 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <div className={clsx('bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <CalculatorIcon className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-gray-900 text-base">Price Calculator</h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Qty + Size row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Quantity */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustQty(-1)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:scale-95 transition-all min-h-[44px] min-w-[44px]"
                aria-label="Decrease quantity"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center text-lg font-bold border border-gray-200 rounded-xl min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => adjustQty(1)}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 active:scale-95 transition-all min-h-[44px] min-w-[44px]"
                aria-label="Increase quantity"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
            {/* Quick qty buttons */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[12, 24, 50, 100].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQty(n)}
                  className={clsx(
                    'px-3 py-1 text-xs font-semibold rounded-lg border transition-all min-h-[32px]',
                    qty === n
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Size
            </label>
            <select
              value={size}
              onChange={e => setSize(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {product.availableSizes.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {calc.sizeUC > 0 && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                +{formatCurrency(calc.sizeUC)} upcharge for {size}
              </p>
            )}
          </div>
        </div>

        {/* Add-ons */}
        {activeAddOns.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Add-Ons
            </label>
            <div className="space-y-2">
              {activeAddOns.map(ao => (
                <label
                  key={ao.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all min-h-[44px]',
                    selectedAddOns.has(ao.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedAddOns.has(ao.id)}
                    onChange={() => toggleAddOn(ao.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={clsx(
                    'flex-1 text-sm font-medium',
                    selectedAddOns.has(ao.id) ? 'text-blue-900' : 'text-gray-700'
                  )}>
                    {ao.name}
                  </span>
                  <span className="text-sm font-semibold text-gray-600">
                    +{formatCurrency(Number(ao.price))}/item
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <hr className="border-gray-100" />

        {/* Price Breakdown */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Price Breakdown
          </p>
          <div className="space-y-1.5 text-sm">
            <BreakdownRow
              label={`Base price (${calc.tier ? `${calc.tier.minQty}+` : ''}qty tier)`}
              value={formatCurrency(calc.unitBase)}
            />
            {calc.sizeUC > 0 && (
              <BreakdownRow label={`Size upcharge (${size})`} value={`+${formatCurrency(calc.sizeUC)}`} />
            )}
            <BreakdownRow label="Unit price" value={formatCurrency(calc.unitPrice)} bold />
            <BreakdownRow label="× Quantity" value={`× ${qty}`} />
            <BreakdownRow label="Garments subtotal" value={formatCurrency(calc.garmentsSubtotal)} />

            {calc.addOnLines.map(line => (
              <BreakdownRow
                key={line.name}
                label={`${line.name} (${qty} × ${formatCurrency(line.perItem)})`}
                value={formatCurrency(line.total)}
              />
            ))}

            <div className="border-t border-gray-100 pt-2 mt-2">
              <BreakdownRow label="Subtotal" value={formatCurrency(calc.subtotal)} />
              <BreakdownRow label={`Tax (${(taxRate * 100).toFixed(2)}%)`} value={formatCurrency(calc.taxAmount)} />
            </div>

            <div
              className="mt-2 p-3 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)' }}
            >
              <BreakdownRow
                label="TOTAL"
                value={formatCurrency(calc.grandTotal)}
                bold
                className="text-base text-blue-900"
              />
            </div>
          </div>
        </div>

        {/* Profit */}
        {calc.totalMaterialCost > 0 && (
          <>
            <hr className="border-gray-100" />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Profit Estimate
              </p>
              <div className="space-y-1.5 text-sm">
                <BreakdownRow label="Material cost" value={formatCurrency(calc.totalMaterialCost)} />
                <BreakdownRow
                  label="Estimated profit"
                  value={formatCurrency(calc.estimatedProfit)}
                  bold
                  className={marginColor}
                />
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-500">Margin</span>
                    <span className={clsx('text-sm font-bold', marginColor)}>
                      {calc.profitMargin.toFixed(1)}%
                      {calc.profitMargin >= 50 ? ' ✅' : calc.profitMargin >= 30 ? ' ⚠️' : ' ❌'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        calc.profitMargin >= 50 ? 'bg-emerald-500'
                        : calc.profitMargin >= 30 ? 'bg-amber-500'
                        : 'bg-red-500'
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, calc.profitMargin))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Breakdown Row ────────────────────────────────────────────────────────────

function BreakdownRow({
  label,
  value,
  bold = false,
  className,
}: {
  label: string;
  value: string;
  bold?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <span className={clsx('text-gray-600', bold && 'font-semibold text-gray-900')}>{label}</span>
      <span className={clsx('font-medium text-gray-900', bold && 'font-bold')}>{value}</span>
    </div>
  );
}
