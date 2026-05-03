import { useState } from 'react';
import { MagnifyingGlassIcon, TagIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { useProducts } from '../../hooks/usePOS';
import { useDebounce } from '../../hooks/useDebounce';
import { productApi } from '../../services/api';
import { SkeletonLoader, EmptyState } from '../ui';
import type { POSProduct } from '../../types';

const METHOD_COLORS: Record<string, string> = {
  DTF:        'bg-purple-100 text-purple-700',
  HTV:        'bg-pink-100 text-pink-700',
  SCREEN:     'bg-blue-100 text-blue-700',
  EMBROIDERY: 'bg-amber-100 text-amber-700',
  SUBLIMATION:'bg-green-100 text-green-700',
  DEFAULT:    'bg-gray-100 text-gray-600',
};

function methodLabel(method: string): string {
  const MAP: Record<string, string> = {
    DTF: 'DTF', HTV: 'HTV', SCREEN_PRINT: 'Screen', EMBROIDERY: 'Embroidery',
    SUBLIMATION: 'Sublimation', VINYL: 'Vinyl', DIRECT_TO_GARMENT: 'DTG',
  };
  return MAP[method] ?? method;
}

function methodColor(method: string): string {
  const MAP: Record<string, string> = {
    DTF: METHOD_COLORS.DTF, HTV: METHOD_COLORS.HTV,
    SCREEN_PRINT: METHOD_COLORS.SCREEN, EMBROIDERY: METHOD_COLORS.EMBROIDERY,
    SUBLIMATION: METHOD_COLORS.SUBLIMATION,
  };
  return MAP[method] ?? METHOD_COLORS.DEFAULT;
}

interface ProductGridProps {
  onAddToCart: (product: POSProduct) => void;
  onOpenConfigurator: () => void;
}

export function ProductGrid({ onAddToCart }: ProductGridProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tappedId, setTappedId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);
  const { data, isLoading } = useProducts(debouncedSearch || undefined, category || undefined);

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productApi.getCategories(),
    select: (r) => r.data,
    staleTime: 60_000,
  });

  const products = data?.data ?? [];
  const categories = categoriesData ?? [];

  const handleTap = (product: POSProduct): void => {
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
          <button
            onClick={() => setCategory('')}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors whitespace-nowrap',
              category === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.name)}
              className={clsx(
                'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors whitespace-nowrap',
                category === cat.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonLoader key={i} rows={3} />
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
                  : 'No active products available'
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((product) => {
              const isTapped = tappedId === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => handleTap(product)}
                  className={clsx(
                    'rounded-xl shadow-sm bg-white p-3 text-left cursor-pointer transition-all duration-150 min-h-[120px] flex flex-col justify-between active:scale-95',
                    'hover:shadow-md hover:ring-1 hover:ring-blue-200',
                    isTapped && 'scale-95 ring-2 ring-blue-500',
                  )}
                >
                  {/* Image or placeholder */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2 flex-shrink-0 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👕</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{product.categoryName}</p>

                    {/* Print method badge */}
                    <span className={clsx('inline-block text-xs font-medium px-2 py-0.5 rounded-full', methodColor(product.printMethod))}>
                      {methodLabel(product.printMethod)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <span className="text-base font-bold text-blue-600">
                      ${product.basePrice.toFixed(2)}
                    </span>
                    {product.priceTiers && product.priceTiers.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {product.priceTiers.length} tier{product.priceTiers.length !== 1 ? 's' : ''}
                      </p>
                    )}
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
