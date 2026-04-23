import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TagIcon,
  PencilSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useProducts, formatCurrency, PRODUCT_CATEGORIES, type Product } from '../../hooks/useProducts';
import { TouchButton } from '../ui/TouchButton';
import type { JSX } from 'react';

// ─── Method badge colors ──────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  DTF:            'bg-purple-100 text-purple-800',
  HTV:            'bg-pink-100 text-pink-800',
  'Screen Print': 'bg-blue-100 text-blue-800',
  Embroidery:     'bg-amber-100 text-amber-800',
  None:           'bg-gray-100 text-gray-600',
};

// ─── Product card (picker variant) ────────────────────────────────────────────

function PickerCard({ product, onSelect }: { product: Product; onSelect: () => void }): JSX.Element {
  const startingAt = (product.priceTiers ?? []).reduce(
    (min, t) => Math.min(min, Number(t.price)),
    Number(product.basePrice)
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-full text-left bg-white border border-gray-200 rounded-2xl p-4 hover:border-blue-400 hover:shadow-md active:scale-[0.98] transition-all duration-150 flex flex-col gap-2"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)' }}
        >
          👕
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 leading-tight text-sm group-hover:text-blue-700 transition-colors line-clamp-2">
            {product.name}
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <span className={clsx(
              'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
              METHOD_COLORS[product.printMethod] ?? 'bg-gray-100 text-gray-600'
            )}>
              {product.printMethod}
            </span>
            <span className="text-[10px] text-gray-400">
              {(product.includedPrintLocations ?? []).length} loc.
            </span>
          </div>
        </div>
        {product.isFeatured && (
          <SparklesIcon className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
        )}
      </div>
      <div>
        <p className="text-[10px] text-gray-400 font-medium">Starting at</p>
        <p className="text-base font-black text-gray-900">{formatCurrency(startingAt)}</p>
      </div>
    </button>
  );
}

// ─── Main picker component ────────────────────────────────────────────────────

interface ProductPickerModalProps {
  onSelectProduct: (product: Product) => void;
  onCustomItem: () => void;
  onCancel: () => void;
}

export function ProductPickerModal({ onSelectProduct, onCustomItem, onCancel }: ProductPickerModalProps): JSX.Element {
  const navigate = useNavigate();
  const { data } = useProducts({ isActive: true });
  const products = data?.data ?? [];
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const activeProducts = products.filter(p => p.isActive);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: activeProducts.length };
    for (const cat of PRODUCT_CATEGORIES) {
      counts[cat] = activeProducts.filter(p => p.category?.name === cat).length;
    }
    return counts;
  }, [activeProducts]);

  const displayed = useMemo(() => {
    let list = [...activeProducts];
    if (activeCategory !== 'All') list = list.filter(p => p.category?.name === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.name ?? '').toLowerCase().includes(q) ||
        p.printMethod.toLowerCase().includes(q)
      );
    }
    // Featured first, then alphabetical
    list.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [activeProducts, activeCategory, search]);

  // No products setup yet
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">👕</div>
        <div>
          <h3 className="font-bold text-gray-900 text-base mb-1">Set up your product catalog first</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Pre-configured products make order creation much faster — pricing is calculated automatically.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <TouchButton
            variant="primary"
            size="md"
            fullWidth
            icon={<TagIcon className="h-4 w-4" />}
            onClick={() => { onCancel(); void navigate('/products'); }}
          >
            Set Up Products
          </TouchButton>
          <TouchButton
            variant="secondary"
            size="md"
            fullWidth
            icon={<PencilSquareIcon className="h-4 w-4" />}
            onClick={onCustomItem}
          >
            Continue with Manual Entry
          </TouchButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" style={{ maxHeight: '70vh' }}>
      {/* Search */}
      <div className="relative flex-shrink-0">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 min-h-[44px] rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      <div className="overflow-x-auto -mx-1 flex-shrink-0">
        <div className="flex gap-1.5 px-1 pb-1 min-w-max">
          {['All', ...PRODUCT_CATEGORIES.filter(c => (categoryCounts[c] ?? 0) > 0)].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all min-h-[36px] border',
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              {cat}
              <span className={clsx(
                'text-[10px] rounded-full px-1 py-0.5 font-bold leading-none',
                activeCategory === cat ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                {categoryCounts[cat] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="overflow-y-auto flex-1 -mx-1 px-1">
        {displayed.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            No products match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-3">
            {displayed.map(product => (
              <PickerCard
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Custom item fallback */}
      <div className="flex-shrink-0 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={onCustomItem}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-all font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          Custom Item (manual entry)
        </button>
      </div>
    </div>
  );
}
