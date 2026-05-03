import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  getPriceTierForQty,
  getSizeUpcharge,
  calcTotalMaterialCost,
  formatCurrency,
  type Product,
} from '../../hooks/useProducts';
import { TouchButton } from '../ui/TouchButton';
import type { JSX } from 'react';

// ─── Print method enum values (must match Prisma PrintMethod enum) ────────────

const PRINT_METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'DTF', label: 'DTF' },
  { value: 'HTV', label: 'HTV' },
  { value: 'SCREEN_PRINT', label: 'Screen Print' },
  { value: 'EMBROIDERY', label: 'Embroidery' },
  { value: 'SUBLIMATION', label: 'Sublimation' },
  { value: 'DTG', label: 'DTG' },
  { value: 'NONE', label: 'None' },
];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SizeQty {
  size: string;
  qty: number;
}

export interface SelectedAddOn {
  id: string;
  name: string;
  pricePerItem: number;
}

export interface ConfiguredOrderItem {
  // Product link
  productId: string | null;
  productName: string;
  isCustomItem: boolean;

  // Garment
  brand: string;
  color: string;

  // Sizes
  sizeMode: 'single' | 'multiple';
  singleSize: string;
  sizeBreakdown: SizeQty[];
  totalQuantity: number;

  // Pricing
  appliedTierPrice: number;
  unitPrice: number;
  isPriceOverridden: boolean;
  priceOverrideReason: string;
  originalTierPrice: number;

  // Extras
  selectedAddOns: SelectedAddOn[];
  printLocations: string[];
  designDescription: string;
  itemNotes: string;
  printMethod: string;

  // Totals (pre-computed)
  lineTotal: number;
  sizeUpchargesTotal: number;
  addOnsTotal: number;

  // Materials
  requiredMaterials: { category: string; description: string; quantity: number; unitPrice: number }[];

  // Legacy fields (for backend)
  productType: string;
  attributes: Record<string, unknown>;
  description: string;
  quantity: number;
}

// ─── Shared input classes ─────────────────────────────────────────────────────

const inputCls =
  'w-full min-h-[44px] rounded-xl border border-white/10 bg-[#0e0e18] px-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 transition-colors cursor-pointer';

const textareaCls =
  'w-full rounded-xl border border-white/10 bg-[#0e0e18] px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/50 resize-none transition-colors';

const labelCls = 'block text-sm font-semibold text-white/70 mb-1.5';

const sectionHeaderCls = 'text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 mb-3';

// ─── Custom item form ─────────────────────────────────────────────────────────

interface CustomItemFormProps {
  onBack: () => void;
  onAdd: (item: ConfiguredOrderItem) => void;
}

function CustomItemForm({ onBack, onAdd }: CustomItemFormProps): JSX.Element {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [printMethod, setPrintMethod] = useState('DTF'); // enum value (e.g. SCREEN_PRINT)
  const [itemNotes, setItemNotes] = useState('');

  const isValid = description.trim().length > 0 && quantity >= 1 && unitPrice >= 0;

  const handleAdd = () => {
    const item: ConfiguredOrderItem = {
      productId: null,
      productName: description,
      isCustomItem: true,
      brand: '',
      color: '',
      sizeMode: 'single',
      singleSize: '',
      sizeBreakdown: [],
      totalQuantity: quantity,
      appliedTierPrice: unitPrice,
      unitPrice,
      isPriceOverridden: false,
      priceOverrideReason: '',
      originalTierPrice: unitPrice,
      selectedAddOns: [],
      printLocations: [],
      designDescription: '',
      itemNotes,
      printMethod,
      lineTotal: quantity * unitPrice,
      sizeUpchargesTotal: 0,
      addOnsTotal: 0,
      requiredMaterials: [],
      productType: 'OTHER',
      attributes: { printMethod },
      description,
      quantity,
    };
    onAdd(item);
  };

  return (
    <div className="space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Product Catalog
      </button>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/10">
        <InformationCircleIcon className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Custom item — no catalog pricing</p>
          <p className="text-xs text-amber-400/80 mt-0.5">
            Consider adding this as a product for future orders so pricing is automatic.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Custom DTF T-shirt, Gildan 5000 Black..."
            className={textareaCls}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Quantity *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Unit Price ($) *</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Print Method</label>
          <div className="flex flex-wrap gap-2">
            {PRINT_METHOD_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPrintMethod(value)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-semibold border min-h-[44px] transition-all',
                  printMethod === value
                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/25 hover:text-white/80'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            rows={2}
            value={itemNotes}
            onChange={e => setItemNotes(e.target.value)}
            placeholder="Special instructions..."
            className={textareaCls}
          />
        </div>
      </div>

      {/* Total preview */}
      <div className="p-3 glass rounded-xl flex justify-between items-center">
        <span className="text-sm text-white/50">Line Total</span>
        <span className="font-black text-white text-lg">{formatCurrency(quantity * unitPrice)}</span>
      </div>

      <div className="flex gap-3 pt-2">
        <TouchButton variant="secondary" size="md" fullWidth onClick={onBack}>Cancel</TouchButton>
        <TouchButton
          variant="primary"
          size="md"
          fullWidth
          disabled={!isValid}
          icon={<PlusCircleIcon className="h-5 w-5" />}
          onClick={handleAdd}
        >
          Add to Order
        </TouchButton>
      </div>
    </div>
  );
}

// ─── Price override input ─────────────────────────────────────────────────────

interface PriceOverrideProps {
  originalPrice: number;
  overridePrice: number;
  overrideReason: string;
  onPriceChange: (v: number) => void;
  onReasonChange: (v: string) => void;
}

function PriceOverrideRow({ originalPrice, overridePrice, overrideReason, onPriceChange, onReasonChange }: PriceOverrideProps): JSX.Element {
  const [showOverride, setShowOverride] = useState(overridePrice !== originalPrice);
  const discountPct = originalPrice > 0 ? ((originalPrice - overridePrice) / originalPrice) * 100 : 0;
  const needsApproval = discountPct > 20;

  return (
    <div>
      {!showOverride ? (
        <button
          type="button"
          onClick={() => setShowOverride(true)}
          className="text-xs text-white/30 hover:text-blue-400 underline min-h-[36px] px-1 transition-colors"
        >
          Override price
        </button>
      ) : (
        <div className="space-y-2 p-3 rounded-xl border border-amber-500/25 bg-amber-500/8">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-300">
              Price override from {formatCurrency(originalPrice)}
              {discountPct > 0 && ` (−${discountPct.toFixed(0)}%)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-white/50 mb-1">Override Unit Price ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={overridePrice}
                onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] rounded-xl border border-amber-500/30 bg-[#0e0e18] px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1">
              Reason for override{needsApproval ? ' (required — discount >20%)' : ''}
            </label>
            <input
              type="text"
              value={overrideReason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="e.g. Repeat customer discount, price match..."
              className="w-full min-h-[44px] rounded-xl border border-amber-500/30 bg-[#0e0e18] px-3 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
          {needsApproval && (
            <p className="text-xs font-bold text-red-400">
              ⚠ Discount exceeds 20% — manager approval required before submitting.
            </p>
          )}
          <button
            type="button"
            onClick={() => { setShowOverride(false); onPriceChange(originalPrice); onReasonChange(''); }}
            className="text-xs text-white/30 hover:text-white/60 underline transition-colors"
          >
            Cancel override
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main configurator ────────────────────────────────────────────────────────

interface ProductOrderConfiguratorProps {
  product: Product;
  onBack: () => void;
  onAdd: (item: ConfiguredOrderItem) => void;
}

export function ProductOrderConfigurator({ product, onBack, onAdd }: ProductOrderConfiguratorProps): JSX.Element {
  const [brand, setBrand] = useState(product.availableBrands[0] ?? '');
  const [color, setColor] = useState('');
  const [sizeMode, setSizeMode] = useState<'single' | 'multiple'>('multiple');
  const [singleSize, setSingleSize] = useState(product.availableSizes[3] ?? product.availableSizes[0] ?? '');
  const [singleQty, setSingleQty] = useState(1);
  const [sizeBreakdown, setSizeBreakdown] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    product.availableSizes.forEach(s => { init[s] = 0; });
    return init;
  });
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set());
  const [designDescription, setDesignDescription] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [overridePrice, setOverridePrice] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const activeAddOns = (product.addOns ?? []).filter(a => a.isActive);

  // Total qty
  const totalQty = useMemo(() => {
    if (sizeMode === 'single') return singleQty;
    return Object.values(sizeBreakdown).reduce((s, v) => s + v, 0);
  }, [sizeMode, singleQty, sizeBreakdown]);

  // Tier for total qty
  const tier = useMemo(() => getPriceTierForQty(product, totalQty), [product, totalQty]);
  const tierUnitPrice = tier ? Number(tier.price) : Number(product.basePrice);

  // Final unit price (override or tier)
  const finalUnitPrice = overridePrice !== null ? overridePrice : tierUnitPrice;
  const isPriceOverridden = overridePrice !== null && overridePrice !== tierUnitPrice;

  // Garments subtotal with per-size upcharges
  const { garmentsSubtotal, sizeUpchargesTotal, sizeLines } = useMemo(() => {
    let total = 0;
    let upchargesTotal = 0;
    const lines: { size: string; qty: number; unitBase: number; upcharge: number; lineTotal: number }[] = [];

    const pairs: Array<{ size: string; qty: number }> =
      sizeMode === 'single'
        ? [{ size: singleSize, qty: singleQty }]
        : product.availableSizes
            .filter(s => (sizeBreakdown[s] ?? 0) > 0)
            .map(s => ({ size: s, qty: sizeBreakdown[s] }));

    for (const { size, qty } of pairs) {
      const upcharge = getSizeUpcharge(product, size);
      const lineUnit = finalUnitPrice + upcharge;
      const lineTotal = qty * lineUnit;
      total += lineTotal;
      upchargesTotal += qty * upcharge;
      lines.push({ size, qty, unitBase: finalUnitPrice, upcharge, lineTotal });
    }
    return { garmentsSubtotal: total, sizeUpchargesTotal: upchargesTotal, sizeLines: lines };
  }, [sizeMode, singleSize, singleQty, sizeBreakdown, product, finalUnitPrice]);

  // Add-ons total
  const addOnsTotal = useMemo(() => {
    let total = 0;
    for (const ao of activeAddOns) {
      if (selectedAddOnIds.has(ao.id)) total += Number(ao.price) * totalQty;
    }
    return total;
  }, [activeAddOns, selectedAddOnIds, totalQty]);

  const lineTotal = garmentsSubtotal + addOnsTotal;

  // Material cost estimate
  const costPerUnit = calcTotalMaterialCost(product);
  const estimatedCost = costPerUnit * totalQty;
  const estimatedProfit = lineTotal - estimatedCost;
  const profitMargin = lineTotal > 0 ? (estimatedProfit / lineTotal) * 100 : 0;

  const isValid = totalQty >= 1 && (sizeMode === 'single' ? singleSize !== '' : true);

  // Build materials list
  const buildMaterials = useCallback(() => {
    const mats: ConfiguredOrderItem['requiredMaterials'] = [];
    const sizeDesc = sizeMode === 'single'
      ? `${totalQty}× ${singleSize}`
      : product.availableSizes.filter(s => (sizeBreakdown[s] ?? 0) > 0).map(s => `${sizeBreakdown[s]}${s}`).join(', ');

    mats.push({
      category: 'BLANK_GARMENT',
      description: `${totalQty}× ${(brand || product.availableBrands[0]) ?? 'Blank'} ${product.garmentType}${color ? ` - ${color}` : ''} - ${sizeDesc}`,
      quantity: totalQty,
      unitPrice: costPerUnit,
    });

    if (product.printMethod === 'DTF') {
      const locations = (product.includedPrintLocations ?? []).length || 1;
      const sheetsNeeded = Math.ceil((totalQty * locations) / 6);
      mats.push({
        category: 'DTF_TRANSFER',
        description: `DTF Gang Sheets - ${totalQty} transfers × ${locations} location${locations > 1 ? 's' : ''} (est. ${sheetsNeeded} gang sheet${sheetsNeeded !== 1 ? 's' : ''})`,
        quantity: sheetsNeeded,
        unitPrice: 30,
      });
    } else if (product.printMethod === 'HTV') {
      const locations = (product.includedPrintLocations ?? []).length || 1;
      mats.push({
        category: 'HTV_VINYL',
        description: `HTV Vinyl cuts - ${totalQty * locations} pieces × ${locations} location${locations > 1 ? 's' : ''}`,
        quantity: totalQty * locations,
        unitPrice: 2.50,
      });
    }
    return mats;
  }, [sizeMode, totalQty, singleSize, sizeBreakdown, brand, color, product, costPerUnit]);

  const handleAdd = () => {
    const addOnsList: SelectedAddOn[] = activeAddOns
      .filter(ao => selectedAddOnIds.has(ao.id))
      .map(ao => ({ id: ao.id, name: ao.name, pricePerItem: Number(ao.price) }));

    const finalSizeBreakdown: SizeQty[] =
      sizeMode === 'single'
        ? [{ size: singleSize, qty: singleQty }]
        : product.availableSizes.filter(s => (sizeBreakdown[s] ?? 0) > 0).map(s => ({ size: s, qty: sizeBreakdown[s] }));

    const descParts: string[] = [];
    if (brand) descParts.push(brand);
    if (color) descParts.push(color);
    const sizeStr = sizeMode === 'single'
      ? `${totalQty}× ${singleSize}`
      : finalSizeBreakdown.map(s => `${s.qty}${s.size}`).join(', ');
    descParts.push(sizeStr);
    if (addOnsList.length) descParts.push(addOnsList.map(a => `+${a.name}`).join(', '));
    if (designDescription) descParts.push(designDescription);

    const item: ConfiguredOrderItem = {
      productId: product.id,
      productName: product.name,
      isCustomItem: false,
      brand,
      color,
      sizeMode,
      singleSize,
      sizeBreakdown: finalSizeBreakdown,
      totalQuantity: totalQty,
      appliedTierPrice: tierUnitPrice,
      unitPrice: finalUnitPrice,
      isPriceOverridden,
      priceOverrideReason: overrideReason,
      originalTierPrice: tierUnitPrice,
      selectedAddOns: addOnsList,
      printLocations: product.includedPrintLocations ?? [],
      designDescription,
      itemNotes,
      printMethod: product.printMethod,
      lineTotal,
      sizeUpchargesTotal,
      addOnsTotal,
      requiredMaterials: buildMaterials(),
      // Legacy backend fields
      productType: product.garmentType.toUpperCase().replace(/ /g, '_'),
      attributes: {
        brand,
        color,
        sizes: finalSizeBreakdown,
        printMethod: product.printMethod,
        addOns: addOnsList.map(a => a.name),
      },
      description: `${product.name} — ${descParts.join(' · ')}`,
      quantity: totalQty,
    };
    onAdd(item);
  };

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: '72vh' }}>

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-white/5 transition-colors flex-shrink-0"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Product Catalog
      </button>

      {/* Product header */}
      <div
        className="p-4 rounded-2xl border border-blue-500/25"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.06) 100%)' }}
      >
        <h3 className="font-bold text-white text-base">{product.name}</h3>
        <p className="text-sm text-blue-300/80 mt-0.5">
          Starting at {formatCurrency((product.priceTiers ?? []).reduce((m, t) => Math.min(m, Number(t.price)), Number(product.basePrice)))} per unit
          {product.description && ` · ${product.description}`}
        </p>
      </div>

      {/* ── Garment Selection ── */}
      <section className="glass-panel rounded-2xl p-4 space-y-4">
        <p className={sectionHeaderCls}>Garment Selection</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Brand</label>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className={inputCls}
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Any brand</option>
              {product.availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Color</label>
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="e.g. Black, Navy..."
              className={inputCls}
            />
          </div>
        </div>
      </section>

      {/* ── Sizes & Quantities ── */}
      <section className="glass-panel rounded-2xl p-4 space-y-4">
        <p className={sectionHeaderCls}>Sizes & Quantities</p>

        {/* Mode toggle */}
        <div className="flex gap-2">
          {(['single', 'multiple'] as const).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => setSizeMode(mode)}
              className={clsx(
                'flex-1 min-h-[44px] rounded-xl border text-sm font-semibold transition-all',
                sizeMode === mode
                  ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_16px_rgba(59,130,246,0.35)]'
                  : 'bg-white/5 text-white/55 border-white/10 hover:border-white/25 hover:text-white/75'
              )}
            >
              {mode === 'single' ? '○ Single Size' : '● Multiple Sizes'}
            </button>
          ))}
        </div>

        {sizeMode === 'single' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Size *</label>
              <select
                value={singleSize}
                onChange={e => setSingleSize(e.target.value)}
                className={inputCls}
                style={{ colorScheme: 'dark' }}
              >
                <option value="">Select size...</option>
                {product.availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Quantity *</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={singleQty}
                onChange={e => setSingleQty(Math.max(1, parseInt(e.target.value) || 1))}
                className={clsx(inputCls, 'text-base font-semibold text-center')}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {product.availableSizes.map(size => {
                  const upcharge = getSizeUpcharge(product, size);
                  const qty = sizeBreakdown[size] ?? 0;
                  return (
                    <div key={size} className="flex flex-col items-center gap-1.5 w-16">
                      <div className="text-center">
                        <span className="text-xs font-bold text-white/80">{size}</span>
                        {upcharge > 0 && (
                          <span className="block text-[9px] text-amber-400 font-medium">+${upcharge}</span>
                        )}
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={qty}
                        onChange={e => setSizeBreakdown(prev => ({
                          ...prev,
                          [size]: Math.max(0, parseInt(e.target.value) || 0),
                        }))}
                        className={clsx(
                          'w-full text-center min-h-[48px] rounded-xl border text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-colors',
                          qty > 0
                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                            : 'bg-[#0e0e18] border-white/10 text-white/60'
                        )}
                        style={{ appearance: 'textfield' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Size breakdown summary */}
            {totalQty > 0 && (
              <div className="mt-3 text-xs text-white/40">
                {product.availableSizes.filter(s => (sizeBreakdown[s] ?? 0) > 0).map(s => `${sizeBreakdown[s]}×${s}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Tier info */}
        {totalQty > 0 && (
          <div className="flex items-center gap-3 p-3 glass rounded-xl">
            <div className="flex-1">
              <p className="text-xs text-white/40">Total Quantity</p>
              <p className="text-lg font-black text-white">{totalQty} units</p>
            </div>
            {tier && (
              <div className="flex-1 text-right">
                <p className="text-xs text-white/40">
                  {tier.minQty}+ qty tier
                </p>
                <p className="text-lg font-black text-blue-400">{formatCurrency(tierUnitPrice)}/unit</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Design Details ── */}
      <section className="glass-panel rounded-2xl p-4 space-y-3">
        <p className={sectionHeaderCls}>Design Details</p>

        {(product.includedPrintLocations ?? []).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/50 mb-2">Print Locations (included with product)</p>
            <div className="flex flex-wrap gap-1.5">
              {(product.includedPrintLocations ?? []).map(loc => (
                <span
                  key={loc}
                  className="text-xs bg-blue-500/15 text-blue-300 px-2.5 py-1 rounded-lg font-semibold border border-blue-500/25"
                >
                  ✅ {loc}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className={labelCls}>Design Description</label>
          <textarea
            rows={2}
            value={designDescription}
            onChange={e => setDesignDescription(e.target.value)}
            placeholder="Describe the design, colors, artwork file reference..."
            className={textareaCls}
          />
        </div>
      </section>

      {/* ── Add-Ons ── */}
      {activeAddOns.length > 0 && (
        <section className="glass-panel rounded-2xl p-4 space-y-3">
          <p className={sectionHeaderCls}>Add-Ons</p>
          <div className="space-y-2">
            {activeAddOns.map(ao => {
              const checked = selectedAddOnIds.has(ao.id);
              return (
                <label
                  key={ao.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all min-h-[48px]',
                    checked
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-white/8 bg-white/3 hover:border-white/15'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedAddOnIds(prev => {
                      const next = new Set(prev);
                      if (next.has(ao.id)) {
                        next.delete(ao.id);
                      } else {
                        next.add(ao.id);
                      }
                      return next;
                    })}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50 accent-blue-500"
                  />
                  <span className={clsx('flex-1 text-sm font-medium', checked ? 'text-white' : 'text-white/65')}>
                    {ao.name}
                  </span>
                  <span className="text-sm text-white/45">+{formatCurrency(Number(ao.price))}/item</span>
                  {checked && totalQty > 0 && (
                    <span className="text-sm font-bold text-blue-400">= {formatCurrency(Number(ao.price) * totalQty)}</span>
                  )}
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Price Breakdown ── */}
      {totalQty > 0 && (
        <section className="space-y-3">
          <p className={sectionHeaderCls}>Price Breakdown</p>
          <div className="glass-panel-weighted rounded-xl p-4 space-y-1.5 text-sm">
            {sizeLines.map((line, i) => (
              <div key={i} className="flex justify-between text-white/60">
                <span>
                  {line.qty}× {line.size}
                  {line.upcharge > 0 && <span className="text-amber-400"> (+{formatCurrency(line.upcharge)} upcharge)</span>}
                  {' '}× {formatCurrency(line.unitBase + line.upcharge)}
                </span>
                <span className="font-semibold text-white/80">{formatCurrency(line.lineTotal)}</span>
              </div>
            ))}
            {activeAddOns.filter(ao => selectedAddOnIds.has(ao.id)).map(ao => (
              <div key={ao.id} className="flex justify-between text-white/60">
                <span>{ao.name} ({totalQty} × {formatCurrency(Number(ao.price))})</span>
                <span className="font-semibold text-white/80">{formatCurrency(Number(ao.price) * totalQty)}</span>
              </div>
            ))}
            <div className="border-t border-white/8 pt-2 mt-2">
              <div className="flex justify-between font-bold text-white text-base">
                <span>Item Total</span>
                <span className="text-gradient-blue">{formatCurrency(lineTotal)}</span>
              </div>
              {totalQty > 0 && (
                <div className="flex justify-between text-xs text-white/30 mt-0.5">
                  <span>Avg per unit</span>
                  <span>{formatCurrency(lineTotal / totalQty)}</span>
                </div>
              )}
            </div>

            {/* Profit estimate */}
            {costPerUnit > 0 && (
              <div className="border-t border-white/8 pt-2 mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-white/35">
                  <span>Est. material cost</span>
                  <span>{formatCurrency(estimatedCost)}</span>
                </div>
                <div className={clsx('flex justify-between font-semibold', estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  <span>Est. profit</span>
                  <span>{formatCurrency(estimatedProfit)} ({profitMargin.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* Price override */}
          <PriceOverrideRow
            originalPrice={tierUnitPrice}
            overridePrice={finalUnitPrice}
            overrideReason={overrideReason}
            onPriceChange={v => setOverridePrice(v)}
            onReasonChange={setOverrideReason}
          />
        </section>
      )}

      {/* ── Required Materials ── */}
      {totalQty > 0 && (
        <section className="space-y-3">
          <p className={sectionHeaderCls}>Required Materials (auto-calculated)</p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 space-y-1.5">
            {buildMaterials().map((mat, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-300/80">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span>{mat.quantity}× {mat.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Item Notes ── */}
      <div>
        <label className={labelCls}>Item Notes</label>
        <textarea
          rows={2}
          value={itemNotes}
          onChange={e => setItemNotes(e.target.value)}
          placeholder="Customer will provide name list by Friday..."
          className={textareaCls}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2 sticky bottom-0 pb-1" style={{ background: 'transparent' }}>
        <TouchButton variant="secondary" size="md" fullWidth onClick={onBack}>Cancel</TouchButton>
        <TouchButton
          variant="primary"
          size="md"
          fullWidth
          disabled={!isValid}
          icon={<PlusCircleIcon className="h-5 w-5" />}
          onClick={handleAdd}
        >
          Add to Order
        </TouchButton>
      </div>
    </div>
  );
}

// ─── Export custom item form too ──────────────────────────────────────────────

export { CustomItemForm };
