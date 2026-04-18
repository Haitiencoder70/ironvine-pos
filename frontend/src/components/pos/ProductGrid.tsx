import { useState } from 'react';
import { MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useProducts } from '../../hooks/usePOS';
import { useDebounce } from '../../hooks/useDebounce';
import { SkeletonLoader, EmptyState } from '../ui';
import type { POSProduct } from '../../types';

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'BLANK_SHIRTS', label: 'Blank Shirts' },
  { value: 'DTF_TRANSFERS', label: 'DTF Transfers' },
  { value: 'VINYL', label: 'Vinyl' },
  { value: 'INK', label: 'Ink' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'EMBROIDERY_THREAD', label: 'Embroidery' },
  { value: 'OTHER', label: 'Other' },
];

interface ProductGridProps {
  onAddToCart: (product: POSProduct) => void;
  onOpenConfigurator: () => void;
}

export function ProductGrid({ onAddToCart, onOpenConfigurator }: ProductGridProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tappedId, setTappedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useProducts(
    debouncedSearch || undefined,
    category || undefined,
  );

  const products = data?.data ?? [];

  const handleTap = (product: POSProduct): void => {
    if (product.quantityAvailable <= 0) return;
    setTappedId(product.id);
    onAddToCart(product);
    setTimeout(() => setTappedId(null), 200);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-4 pb-2 flex-shrink-0 space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value);
              }}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors whitespace-nowrap',
                category === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonLoader key={i} lines={3} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <EmptyState
              icon={<TagIcon className="h-12 w-12 text-gray-300" />}
              title="No products found"
              description={
                search || category
                  ? 'Try adjusting your search or filter'
                  : 'No products are available for sale'
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => {
              const outOfStock = product.quantityAvailable <= 0;
              const isTapped = tappedId === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => handleTap(product)}
                  disabled={outOfStock}
                  className={clsx(
                    'rounded-xl shadow-sm bg-white p-4 text-left cursor-pointer transition-all duration-150 min-h-[100px] flex flex-col justify-between',
                    outOfStock
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-md active:scale-95',
                    isTapped && 'scale-95 ring-2 ring-blue-500',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{product.sku}</p>
                    {(product.size || product.color) && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {[product.color, product.size].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <span className="text-base font-bold text-blue-600">
                      ${product.costPrice.toFixed(2)}
                    </span>
                    <span
                      className={clsx(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        outOfStock
                          ? 'bg-red-50 text-red-600'
                          : product.quantityAvailable <= 5
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-green-50 text-green-700',
                      )}
                    >
                      {outOfStock ? 'Out' : `${product.quantityAvailable}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
