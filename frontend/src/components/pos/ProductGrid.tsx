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
  DTF:        'bg-purple-900/40 text-purple-300 border border-purple-500/30',
  HTV:        'bg-pink-900/40 text-pink-300 border border-pink-500/30',
  SCREEN:     'bg-blue-900/40 text-blue-300 border border-blue-500/30',
  EMBROIDERY: 'bg-amber-900/40 text-amber-300 border border-amber-500/30',
  SUBLIMATION:'bg-green-900/40 text-green-300 border border-green-500/30',
  DEFAULT:    'bg-white/[0.08] text-slate-300 border border-white/10',
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
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 min-h-[44px] rounded-xl border border-white/10 bg-white/[0.06] text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategory('')}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium min-h-[36px] transition-colors whitespace-nowrap',
              category === ''
                ? 'bg-[#ff6b00] text-white'
                : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-400',
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
                  ? 'bg-[#ff6b00] text-white'
                  : 'bg-white/[0.06] border border-white/10 text-slate-300 hover:border-orange-500/40 hover:text-orange-400',
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
                    'rounded-xl p-3 text-left cursor-pointer transition-all duration-150 min-h-[120px] flex flex-col justify-between active:scale-95',
                    'border border-white/10 hover:border-orange-500/30 hover:shadow-lg',
                    isTapped && 'scale-95 border-orange-500/60 ring-2 ring-orange-500/30',
                  )}
                  style={{
                    background: 'linear-gradient(160deg, rgba(14,14,28,0.80) 0%, rgba(8,8,18,0.88) 100%)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Image or placeholder */}
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-200 mb-2 flex-shrink-0 flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">👕</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{product.categoryName}</p>

                    {/* Print method badge */}
                    <span className={clsx('inline-block text-xs font-medium px-2 py-0.5 rounded-full', methodColor(product.printMethod))}>
                      {methodLabel(product.printMethod)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/[0.06]">
                    <span className="text-base font-bold text-[#ff6b00]">
                      ${product.basePrice.toFixed(2)}
                    </span>
                    {product.priceTiers && product.priceTiers.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
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
