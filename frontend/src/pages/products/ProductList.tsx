import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  TagIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  // SparklesIcon kept — used on isFeatured badge in ProductCard
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import {
  useProducts,
  useDuplicateProduct,
  useUpdateProduct,
  formatCurrency,
  PRODUCT_CATEGORIES,
  type Product,
} from '../../hooks/useProducts';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { EmptyState } from '../../components/ui';
import type { JSX } from 'react';

// ─── Method badge config ───────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  DTF:            'bg-purple-100 text-purple-800',
  HTV:            'bg-pink-100 text-pink-800',
  'Screen Print': 'bg-blue-100 text-blue-800',
  Embroidery:     'bg-amber-100 text-amber-800',
  None:           'bg-gray-100 text-gray-600',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY:    'text-emerald-600',
  MEDIUM:  'text-amber-600',
  COMPLEX: 'text-red-600',
};

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  product: Product;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
}): JSX.Element {
  const navigate = useNavigate();

  const lowestTierPrice = (product.priceTiers ?? []).reduce(
    (min, t) => Math.min(min, Number(t.price)),
    Number(product.basePrice)
  );

  const displayedTiers = (product.priceTiers ?? []).slice(0, 5);

  return (
    <TouchCard
      padding="none"
      className={clsx(
        'border flex flex-col transition-all duration-200',
        product.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70'
      )}
      onClick={() => navigate(`/products/${product.id}`)}
    >
      {/* Card Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}
        >
          👕
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={clsx(
              'font-bold text-gray-900 leading-tight truncate text-base',
              !product.isActive && 'line-through text-gray-400'
            )}>
              {product.name}
            </h3>
            {product.isFeatured && (
              <SparklesIcon className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" title="Featured" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-xs text-gray-500">{product.category?.name}</span>
            <span className="text-gray-300">·</span>
            <span className={clsx(
              'text-xs font-semibold px-2 py-0.5 rounded-full',
              METHOD_COLORS[product.printMethod] ?? 'bg-gray-100 text-gray-600'
            )}>
              {product.printMethod}
            </span>
            {(product.includedPrintLocations ?? []).map(loc => (
              <span key={loc} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {loc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Starting price */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-400 font-medium">Starting at</p>
        <p className="text-xl font-black text-gray-900">{formatCurrency(lowestTierPrice)}</p>
      </div>

      {/* Price tiers grid */}
      {displayedTiers.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Price Tiers</p>
          <div className="flex flex-wrap gap-1.5">
            {displayedTiers.map((tier, i) => (
              <div key={i} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-center">
                <span className="text-gray-500">
                  {tier.minQty}+:
                </span>
                {' '}
                <span className="font-bold text-gray-800">{formatCurrency(Number(tier.price))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Size upcharges */}
      {product.sizeUpcharges && Object.keys(product.sizeUpcharges).length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[10px] text-gray-400">
            Size upcharges:{' '}
            {Object.entries(product.sizeUpcharges).map(([size, upcharge]) => `${size}+${formatCurrency(upcharge)}`).join(', ')}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          {product.isActive ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-600">Active</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-gray-300 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-400">Inactive</span>
            </>
          )}
          <span className="text-gray-200 ml-1">·</span>
          <span className={clsx('text-xs font-medium ml-1', DIFFICULTY_COLORS[product.difficultyLevel ?? ''])}>
            {product.difficultyLevel ? product.difficultyLevel.charAt(0) + product.difficultyLevel.slice(1).toLowerCase() : ''}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            title="Duplicate"
            className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            title={product.isActive ? 'Deactivate' : 'Activate'}
            className={clsx(
              'p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center',
              product.isActive
                ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
            )}
          >
            {product.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </TouchCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProductListPage(): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [methodFilter, setMethodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'category'>('name');

  const { data: productsData, isLoading } = useProducts({
    isActive: statusFilter === 'INACTIVE' ? false : statusFilter === 'ACTIVE' ? true : undefined,
  });
  const duplicateProduct = useDuplicateProduct();
  const updateProduct = useUpdateProduct();
  const products = productsData?.data ?? [];

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    for (const cat of PRODUCT_CATEGORIES) {
      counts[cat] = products.filter(p => p.category?.name === cat).length;
    }
    return counts;
  }, [products]);

  // Filtered & sorted products
  const displayed = useMemo(() => {
    let list = [...products];

    if (activeCategory !== 'All') list = list.filter(p => p.category?.name === activeCategory);
    if (methodFilter !== 'All') list = list.filter(p => p.printMethod === methodFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return Number(a.basePrice) - Number(b.basePrice);
      if (sortBy === 'category') return (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
      return 0;
    });

    return list;
  }, [products, activeCategory, methodFilter, search, sortBy]);

  const handleDuplicate = (id: string) => {
    duplicateProduct.mutate(id);
    navigate('/products');
  };

  const handleToggleActive = (product: Product) => {
    updateProduct.mutate({ id: product.id, body: { isActive: !product.isActive } });
  };

  const hasAnyProducts = products.length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Pricing</h1>
          <p className="text-sm text-gray-500 mt-1">Your product catalog — what you sell to customers</p>
        </div>
        <TouchButton
          variant="primary"
          size="md"
          icon={<PlusIcon className="h-5 w-5" />}
          onClick={() => navigate('/products/new')}
        >
          Add Product
        </TouchButton>
      </div>

      {/* ── Category Tabs ── */}
      <div className="overflow-x-auto -mx-4 sm:mx-0 pb-1">
        <div className="flex gap-2 px-4 sm:px-0 min-w-max">
          {['All', ...PRODUCT_CATEGORIES].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] border',
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              )}
            >
              {cat}
              <span className={clsx(
                'text-xs rounded-full px-1.5 py-0.5 font-bold',
                activeCategory === cat ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {categoryCounts[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-200 bg-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
          className="md:w-44 min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Methods</option>
          <option value="DTF">DTF</option>
          <option value="HTV">HTV</option>
          <option value="Screen Print">Screen Print</option>
          <option value="Embroidery">Embroidery</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
          className="md:w-44 min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'price' | 'category')}
          className="md:w-44 min-h-[44px] rounded-xl border border-gray-200 bg-white px-3 text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price</option>
          <option value="category">Sort: Category</option>
        </select>
      </div>

      {/* ── Product Grid / Empty State / Loading ── */}
      {isLoading ? (
        /* Loading skeleton */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : !hasAnyProducts ? (
        /* Full empty state — no products at all */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 flex flex-col items-center text-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-4xl">👕</div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-500 max-w-sm">
              Set up your product catalog to start taking orders with pre-configured pricing.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <TouchButton
              variant="primary"
              size="lg"
              icon={<PlusIcon className="h-5 w-5" />}
              onClick={() => navigate('/products/new')}
            >
              Create First Product
            </TouchButton>
          </div>
        </div>
      ) : displayed.length === 0 ? (
        /* Filters returned nothing */
        <EmptyState
          icon={<TagIcon className="h-10 w-10" />}
          title="No products match your filters"
          description="Try adjusting your search or filters."
          action={{ label: 'Add Product', href: '/products/new', icon: <PlusIcon className="h-5 w-5" /> }}
          minHeight="min-h-[280px]"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayed.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => navigate(`/products/${product.id}/edit`)}
              onDuplicate={() => handleDuplicate(product.id)}
              onToggleActive={() => handleToggleActive(product)}
            />
          ))}
        </div>
      )}

      {/* Summary bar when products exist */}
      {hasAnyProducts && displayed.length > 0 && (
        <p className="text-sm text-gray-400 text-center pb-4">
          Showing {displayed.length} of {products.length} product{products.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
