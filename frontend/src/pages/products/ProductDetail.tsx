import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TagIcon,
  CubeIcon,
  CurrencyDollarIcon,
  BeakerIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  useProduct,
  useDuplicateProduct,
  useUpdateProduct,
  formatCurrency,
  calcTotalMaterialCost,
  getPriceTierForQty,
  type Product,
} from '../../hooks/useProducts';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { PriceCalculator } from '../../components/products/PriceCalculator';
import type { JSX } from 'react';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }): JSX.Element {
  return (
    <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3 mb-4">
      <span className="text-gray-400">{icon}</span>
      {title}
    </h2>
  );
}

// ─── Profit Tier Table ────────────────────────────────────────────────────────

function ProfitTable({ product }: { product: Product }): JSX.Element {
  const costPerUnit = calcTotalMaterialCost(product);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
            <th className="text-left py-2 pr-4">Qty Range</th>
            <th className="text-right py-2 px-2">Sell Price</th>
            <th className="text-right py-2 px-2">Cost</th>
            <th className="text-right py-2 px-2">Profit</th>
            <th className="text-right py-2 pl-2">Margin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(product.priceTiers ?? []).map((tier, i) => {
            const tierPrice = Number(tier.price);
            const profit = tierPrice - costPerUnit;
            const margin = tierPrice > 0 ? (profit / tierPrice) * 100 : 0;
            const marginColor =
              margin >= 50 ? 'text-emerald-600'
              : margin >= 30 ? 'text-amber-600'
              : 'text-red-500';

            return (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-700">
                  {tier.minQty}+ units
                </td>
                <td className="text-right py-2.5 px-2 font-bold text-gray-900">
                  {formatCurrency(tierPrice)}
                </td>
                <td className="text-right py-2.5 px-2 text-gray-500">
                  {formatCurrency(costPerUnit)}
                </td>
                <td className="text-right py-2.5 px-2 font-semibold text-gray-800">
                  {formatCurrency(profit)}
                </td>
                <td className={clsx('text-right py-2.5 pl-2 font-bold', marginColor)}>
                  {margin.toFixed(1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Margin bar chart ─────────────────────────────────────────────────────────

function MarginChart({ product }: { product: Product }): JSX.Element {
  const costPerUnit = calcTotalMaterialCost(product);
  const maxPrice = Math.max(...(product.priceTiers ?? []).map(t => Number(t.price)), Number(product.basePrice));

  return (
    <div className="space-y-3 mt-4">
      {(product.priceTiers ?? []).map((tier, i) => {
        const tierPrice = Number(tier.price);
        const margin = tierPrice > 0 ? ((tierPrice - costPerUnit) / tierPrice) * 100 : 0;
        const profitPct = (tierPrice - costPerUnit) / maxPrice * 100;
        const costPct = costPerUnit / maxPrice * 100;

        return (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1 text-gray-500">
              <span>{tier.minQty}+ units</span>
              <span className="font-semibold">{formatCurrency(tierPrice)} · {margin.toFixed(0)}% margin</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
              <div
                className="h-full bg-rose-200 transition-all"
                style={{ width: `${Math.max(0, costPct)}%` }}
                title={`Cost: ${formatCurrency(costPerUnit)}`}
              />
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{ width: `${Math.max(0, profitPct)}%` }}
                title={`Profit: ${formatCurrency(Number(tier.price) - costPerUnit)}`}
              />
            </div>
          </div>
        );
      })}
      <div className="flex gap-4 text-xs text-gray-500 pt-1">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-200 inline-block" /> Cost</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block" /> Profit</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: productData, isLoading } = useProduct(id ?? '');
  const product = productData?.data;
  const duplicateMutation = useDuplicateProduct();
  const updateMutation = useUpdateProduct();

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded-xl w-64" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 max-w-7xl mx-auto text-center py-20">
        <p className="text-gray-400 text-lg">Product not found.</p>
        <TouchButton variant="secondary" size="md" className="mt-4" onClick={() => navigate('/products')}>
          Back to Products
        </TouchButton>
      </div>
    );
  }

  const handleDuplicate = async () => {
    const result = await duplicateMutation.mutateAsync(product.id);
    navigate(`/products/${result.data.id}/edit`);
  };

  const handleToggleActive = () => {
    updateMutation.mutate({ id: product.id, body: { isActive: !product.isActive } });
  };

  const costPerUnit = calcTotalMaterialCost(product);
  const basePrice = Number(product.basePrice);
  const baseProfit = basePrice - costPerUnit;
  const baseMargin = basePrice > 0 ? (baseProfit / basePrice) * 100 : 0;

  // Compute "starting at" using tier for qty=1
  const singleTier = getPriceTierForQty(product, 1);
  const startingAt = singleTier ? Number(singleTier.price) : basePrice;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex items-start gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mt-0.5"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>
                {product.isFeatured && (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                    <SparklesIcon className="h-3 w-3" /> Featured
                  </span>
                )}
                <span className={clsx(
                  'text-xs font-bold px-2.5 py-1 rounded-full',
                  product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {product.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>
              {product.description && (
                <p className="text-gray-500 text-sm mt-1">{product.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <TouchButton
            variant="secondary"
            size="sm"
            icon={<DocumentDuplicateIcon className="h-4 w-4" />}
            onClick={handleDuplicate}
          >
            Duplicate
          </TouchButton>
          <TouchButton
            variant={product.isActive ? 'warning' : 'success'}
            size="sm"
            onClick={handleToggleActive}
          >
            {product.isActive ? 'Deactivate' : 'Activate'}
          </TouchButton>
          <TouchButton
            variant="primary"
            size="sm"
            icon={<PencilSquareIcon className="h-4 w-4" />}
            onClick={() => navigate(`/products/${product.id}/edit`)}
          >
            Edit
          </TouchButton>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left column (2/3) ── */}
        <div className="xl:col-span-2 space-y-6">

          {/* Basic Info */}
          <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
            <SectionHeader icon={<TagIcon className="h-5 w-5" />} title="Product Info" />
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</dt>
                <dd className="mt-1 font-semibold text-gray-900">{product.category?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Garment Type</dt>
                <dd className="mt-1 font-semibold text-gray-900">{product.garmentType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Print Method</dt>
                <dd className="mt-1 font-semibold text-gray-900">{product.printMethod}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Print Locations</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {(product.includedPrintLocations ?? []).map(loc => (
                    <span key={loc} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">{loc}</span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">SKU</dt>
                <dd className="mt-1 font-mono text-sm text-gray-700">{product.sku || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Difficulty</dt>
                <dd className={clsx('mt-1 font-semibold',
                  product.difficultyLevel === 'EASY' ? 'text-emerald-600'
                  : product.difficultyLevel === 'MEDIUM' ? 'text-amber-600'
                  : 'text-red-600'
                )}>
                  {product.difficultyLevel ? product.difficultyLevel.charAt(0) + product.difficultyLevel.slice(1).toLowerCase() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Prod. Time</dt>
                <dd className="mt-1 font-semibold text-gray-900">{product.estimatedProductionMinutes} min/unit</dd>
              </div>
            </dl>
            {product.description && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-semibold text-amber-700 mb-1">Description</p>
                <p className="text-sm text-amber-800">{product.description}</p>
              </div>
            )}
          </TouchCard>

          {/* Available Options */}
          <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
            <SectionHeader icon={<CubeIcon className="h-5 w-5" />} title="Available Options" />
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Brands</p>
                <div className="flex flex-wrap gap-2">
                  {product.availableBrands.map(b => (
                    <span key={b} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-medium">{b}</span>
                  ))}
                  {product.availableBrands.length === 0 && <span className="text-gray-400 text-sm">All brands</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sizes</p>
                <div className="flex flex-wrap gap-2">
                  {product.availableSizes.map(s => (
                    <span key={s} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-lg font-bold">{s}</span>
                  ))}
                </div>
              </div>
              {product.sizeUpcharges && Object.keys(product.sizeUpcharges).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Size Upcharges</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(product.sizeUpcharges).map(([size, upcharge]) => (
                      <span key={size} className="text-sm bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-lg font-medium">
                        {size}: +{formatCurrency(Number(upcharge))}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TouchCard>

          {/* Pricing Section */}
          <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
            <SectionHeader icon={<CurrencyDollarIcon className="h-5 w-5" />} title="Pricing" />

            <div className="flex items-center gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Starting At</p>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(startingAt)}</p>
              </div>
              <div className="h-10 w-px bg-gray-200" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Base Price</p>
                <p className="text-3xl font-black text-gray-900">{formatCurrency(Number(product.basePrice))}</p>
              </div>
            </div>

            <ProfitTable product={product} />
          </TouchCard>

          {/* Cost & Profit */}
          {costPerUnit > 0 && (
            <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
              <SectionHeader icon={<BeakerIcon className="h-5 w-5" />} title="Cost & Profit Analysis" />

              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Cost/Unit</p>
                  <p className="text-xl font-black text-rose-700 mt-1">{formatCurrency(costPerUnit)}</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Profit @ Base</p>
                  <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(baseProfit)}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Base Margin</p>
                  <p className="text-xl font-black text-blue-700 mt-1">{baseMargin.toFixed(1)}%</p>
                </div>
              </div>

              <MarginChart product={product} />

              {/* Material costs breakdown */}
              {(product.materialTemplates ?? []).length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Material Breakdown</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-semibold">Material</th>
                        <th className="text-center pb-2 font-semibold">Qty/Unit</th>
                        <th className="text-right pb-2 font-semibold">Est. Cost</th>
                        <th className="text-right pb-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(product.materialTemplates ?? []).map(m => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-700">{m.description}</td>
                          <td className="py-2 text-center text-gray-500">{Number(m.quantityPerUnit)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(Number(m.estimatedCostPerUnit))}</td>
                          <td className="py-2 text-right font-semibold text-gray-800">
                            {formatCurrency(Number(m.quantityPerUnit) * Number(m.estimatedCostPerUnit))}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={3} className="py-2 font-bold text-gray-700 pl-0">Total est. cost/unit</td>
                        <td className="py-2 text-right font-black text-gray-900">{formatCurrency(costPerUnit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </TouchCard>
          )}

          {/* Add-Ons */}
          {(product.addOns ?? []).length > 0 && (
            <TouchCard padding="lg" className="border border-gray-200 shadow-sm">
              <SectionHeader icon={<WrenchScrewdriverIcon className="h-5 w-5" />} title="Add-Ons" />
              <div className="space-y-2">
                {(product.addOns ?? []).map(ao => (
                  <div
                    key={ao.id}
                    className={clsx(
                      'flex items-center justify-between p-3 rounded-xl border',
                      ao.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'h-2 w-2 rounded-full flex-shrink-0',
                        ao.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                      )} />
                      <span className="font-medium text-gray-800">{ao.name}</span>
                      {!ao.isActive && <span className="text-xs text-gray-400">(inactive)</span>}
                    </div>
                    <span className="font-bold text-gray-900">+{formatCurrency(Number(ao.price))}/item</span>
                  </div>
                ))}
              </div>
            </TouchCard>
          )}
        </div>

        {/* ── Right column (1/3) — sticky calculator ── */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <PriceCalculator product={product} />
            <p className="text-xs text-gray-400 text-center mt-3">
              Tax rate based on your settings. Adjust in Settings → Tax.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
