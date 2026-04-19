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

// ─── Custom item form ─────────────────────────────────────────────────────────

interface CustomItemFormProps {
  onBack: () => void;
  onAdd: (item: ConfiguredOrderItem) => void;
}

function CustomItemForm({ onBack, onAdd }: CustomItemFormProps): JSX.Element {
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [printMethod, setPrintMethod] = useState('DTF');
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
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-gray-100 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Product Catalog
      </button>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
        <InformationCircleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Custom item — no catalog pricing</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Consider adding this as a product for future orders so pricing is automatic.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Custom DTF T-shirt, Gildan 5000 Black..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit Price ($) *</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Print Method</label>
          <div className="flex flex-wrap gap-2">
            {['DTF', 'HTV', 'Screen Print', 'Embroidery', 'None'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPrintMethod(m)}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-semibold border min-h-[44px] transition-all',
                  printMethod === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
          <textarea
            rows={2}
            value={itemNotes}
            onChange={e => setItemNotes(e.target.value)}
            placeholder="Special instructions..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Total preview */}
      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
        <span className="text-sm text-gray-600">Line Total</span>
        <span className="font-black text-gray-900 text-lg">{formatCurrency(quantity * unitPrice)}</span>
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
          className="text-xs text-gray-400 hover:text-blue-600 underline min-h-[36px] px-1"
        >
          Override price
        </button>
      ) : (
        <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-amber-800">
              Price override from {formatCurrency(originalPrice)}
              {discountPct > 0 && ` (−${discountPct.toFixed(0)}%)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Override Unit Price ($)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={overridePrice}
                onChange={e => onPriceChange(parseFloat(e.target.value) || 0)}
                className="w-full min-h-[44px] rounded-xl border border-amber-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Reason for override{needsApproval ? ' (required — discount >20%)' : ''}
            </label>
            <input
              type="text"
              value={overrideReason}
              onChange={e => onReasonChange(e.target.value)}
              placeholder="e.g. Repeat customer discount, price match..."
              className="w-full min-h-[44px] rounded-xl border border-amber-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {needsApproval && (
            <p className="text-xs font-bold text-red-600">
              ⚠ Discount exceeds 20% — manager approval required before submitting.
            </p>
          )}
          <button
            type="button"
            onClick={() => { setShowOverride(false); onPriceChange(originalPrice); onReasonChange(''); }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
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

  const activeAddOns = product.addOns.filter(a => a.isActive);

  // Total qty
  const totalQty = useMemo(() => {
    if (sizeMode === 'single') return singleQty;
    return Object.values(sizeBreakdown).reduce((s, v) => s + v, 0);
  }, [sizeMode, singleQty, sizeBreakdown]);

  // Tier for total qty
  const tier = useMemo(() => getPriceTierForQty(product, totalQty), [product, totalQty]);
  const tierUnitPrice = tier?.unitPrice ?? product.basePrice;

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
      if (selectedAddOnIds.has(ao.id)) total += ao.price * totalQty;
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
      const locations = product.printLocations.length || 1;
      const sheetsNeeded = Math.ceil((totalQty * locations) / 6);
      mats.push({
        category: 'DTF_TRANSFER',
        description: `DTF Gang Sheets - ${totalQty} transfers × ${locations} location${locations > 1 ? 's' : ''} (est. ${sheetsNeeded} gang sheet${sheetsNeeded !== 1 ? 's' : ''})`,
        quantity: sheetsNeeded,
        unitPrice: 30,
      });
    } else if (product.printMethod === 'HTV') {
      const locations = product.printLocations.length || 1;
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
      .map(ao => ({ id: ao.id, name: ao.name, pricePerItem: ao.price }));

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
      printLocations: product.printLocations,
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
    <div className="space-y-5 overflow-y-auto" style={{ maxHeight: '72vh' }}>
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to Product Catalog
      </button>

      {/* Product header */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-bold text-blue-900 text-base">{product.name}</h3>
        <p className="text-sm text-blue-700 mt-0.5">
          Starting at {formatCurrency(product.priceTiers.reduce((m, t) => Math.min(m, t.unitPrice), product.basePrice))} per unit
          {product.description && ` · ${product.description}`}
        </p>
      </div>

      {/* ── Garment Selection ── */}
      <section className="space-y-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Garment Selection</h4>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand</label>
            <select
              value={brand}
              onChange={e => setBrand(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Any brand</option>
              {product.availableBrands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Color</label>
            <input
              type="text"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder="e.g. Black, Navy..."
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>

      {/* ── Sizes & Quantities ── */}
      <section className="space-y-4">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sizes & Quantities</h4>

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
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              {mode === 'single' ? '○ Single Size' : '● Multiple Sizes'}
            </button>
          ))}
        </div>

        {sizeMode === 'single' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Size *</label>
              <select
                value={singleSize}
                onChange={e => setSingleSize(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Select size...</option>
                {product.availableSizes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity *</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={singleQty}
                onChange={e => setSingleQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-1">
                {product.availableSizes.map(size => {
                  const upcharge = getSizeUpcharge(product, size);
                  return (
                    <div key={size} className="flex flex-col items-center gap-1.5 w-16">
                      <div className="text-center">
                        <span className="text-xs font-bold text-gray-700">{size}</span>
                        {upcharge > 0 && (
                          <span className="block text-[9px] text-amber-600 font-medium">+${upcharge}</span>
                        )}
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={sizeBreakdown[size] ?? 0}
                        onChange={e => setSizeBreakdown(prev => ({
                          ...prev,
                          [size]: Math.max(0, parseInt(e.target.value) || 0),
                        }))}
                        className="w-full text-center min-h-[48px] rounded-xl border border-gray-200 text-base font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        style={{ appearance: 'textfield' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Size breakdown summary */}
            {totalQty > 0 && (
              <div className="mt-3 text-xs text-gray-500">
                {product.availableSizes.filter(s => (sizeBreakdown[s] ?? 0) > 0).map(s => `${sizeBreakdown[s]}×${s}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Tier info */}
        {totalQty > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1">
              <p className="text-xs text-gray-500">Total Quantity</p>
              <p className="text-lg font-black text-gray-900">{totalQty} units</p>
            </div>
            {tier && (
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500">
                  {tier.minQty}{tier.maxQty ? `–${tier.maxQty}` : '+'} qty tier
                </p>
                <p className="text-lg font-black text-blue-700">{formatCurrency(tierUnitPrice)}/unit</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Design Details ── */}
      <section className="space-y-3">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Design Details</h4>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Print Locations (included with product)</p>
          <div className="flex flex-wrap gap-1.5">
            {product.printLocations.map(loc => (
              <span key={loc} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-200">
                ✅ {loc}
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Design Description</label>
          <textarea
            rows={2}
            value={designDescription}
            onChange={e => setDesignDescription(e.target.value)}
            placeholder="Describe the design, colors, artwork file reference..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </section>

      {/* ── Add-Ons ── */}
      {activeAddOns.length > 0 && (
        <section className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add-Ons</h4>
          <div className="space-y-2">
            {activeAddOns.map(ao => {
              const checked = selectedAddOnIds.has(ao.id);
              return (
                <label
                  key={ao.id}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all min-h-[48px]',
                    checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => setSelectedAddOnIds(prev => {
                      const next = new Set(prev);
                      next.has(ao.id) ? next.delete(ao.id) : next.add(ao.id);
                      return next;
                    })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className={clsx('flex-1 text-sm font-medium', checked ? 'text-blue-900' : 'text-gray-700')}>
                    {ao.name}
                  </span>
                  <span className="text-sm text-gray-600">+{formatCurrency(ao.price)}/item</span>
                  {checked && totalQty > 0 && (
                    <span className="text-sm font-bold text-blue-700">= {formatCurrency(ao.price * totalQty)}</span>
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
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price Breakdown</h4>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1.5 text-sm">
            {sizeLines.map((line, i) => (
              <div key={i} className="flex justify-between text-gray-700">
                <span>
                  {line.qty}× {line.size}
                  {line.upcharge > 0 && <span className="text-amber-600"> (+{formatCurrency(line.upcharge)} upcharge)</span>}
                  {' '}× {formatCurrency(line.unitBase + line.upcharge)}
                </span>
                <span className="font-semibold">{formatCurrency(line.lineTotal)}</span>
              </div>
            ))}
            {activeAddOns.filter(ao => selectedAddOnIds.has(ao.id)).map(ao => (
              <div key={ao.id} className="flex justify-between text-gray-700">
                <span>{ao.name} ({totalQty} × {formatCurrency(ao.price)})</span>
                <span className="font-semibold">{formatCurrency(ao.price * totalQty)}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Item Total</span>
                <span>{formatCurrency(lineTotal)}</span>
              </div>
              {totalQty > 0 && (
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>Avg per unit</span>
                  <span>{formatCurrency(lineTotal / totalQty)}</span>
                </div>
              )}
            </div>

            {/* Profit estimate */}
            {costPerUnit > 0 && (
              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Est. material cost</span>
                  <span>{formatCurrency(estimatedCost)}</span>
                </div>
                <div className={clsx('flex justify-between font-semibold', estimatedProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
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
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Required Materials (auto-calculated)</h4>
          <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3 space-y-1.5">
            {buildMaterials().map((mat, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span>{mat.quantity}× {mat.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Item Notes ── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Notes</label>
        <textarea
          rows={2}
          value={itemNotes}
          onChange={e => setItemNotes(e.target.value)}
          placeholder="Customer will provide name list by Friday..."
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
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
