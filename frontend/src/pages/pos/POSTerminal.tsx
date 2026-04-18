import { useState } from 'react';
import { ShoppingBagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { ProductGrid } from '../../components/pos/ProductGrid';
import { CartPanel } from '../../components/pos/CartPanel';
import { ReceiptModal } from '../../components/pos/ReceiptModal';
import { ProductConfigurator } from '../../components/pos/ProductConfigurator';
import { useCart } from '../../hooks/usePOS';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import type { Sale } from '../../types';

export function POSTerminal(): React.JSX.Element {
  const cartState = useCart();
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);

  const handleSaleComplete = (sale: Sale): void => {
    setCompletedSale(sale);
    setShowMobileCart(false);
  };

  const handleConfigureProduct = (config: {
    name: string;
    sku: string;
    color: string;
    size: string;
    costPrice: number;
  }) => {
    cartState.addToCart({
      id: `custom-${Date.now()}`, // Temporary ID for carted custom items
      name: config.name,
      sku: config.sku,
      color: config.color,
      size: config.size,
      costPrice: config.costPrice,
      quantityAvailable: 999, // Assumed for custom config
    });
    setShowConfigurator(false);
  };

  const cartCount = cartState.cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-full overflow-hidden">
      <ErrorBoundary
        fallback={
          <div className="flex-1 bg-gray-50 flex items-center justify-center p-4">
            <p className="text-gray-500">Failed to load product grid.</p>
          </div>
        }
      >
        {/* ── Left: Product Grid ── */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 lg:w-[60%]">
          <div className="flex-shrink-0 px-4 pt-4 pb-2">
            <h1 className="text-xl font-bold text-gray-900">POS Terminal</h1>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProductGrid
              onAddToCart={cartState.addToCart}
              onOpenConfigurator={() => setShowConfigurator(true)}
            />
          </div>
        </div>
      </ErrorBoundary>

      {/* ── Right: Cart Panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col w-[40%] max-w-sm flex-shrink-0">
        <ErrorBoundary
          fallback={<div className="p-4 text-gray-500">Cart failed to load.</div>}
        >
          <CartPanel cartState={cartState} onSaleComplete={handleSaleComplete} />
        </ErrorBoundary>
      </div>


      {/* ── Mobile: FAB cart button ── */}
      {!showMobileCart && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="Open cart"
        >
          <ShoppingBagIcon className="h-6 w-6" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      )}

      {/* ── Mobile: Cart bottom sheet ── */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col">
          {/* Backdrop */}
          <div
            className="flex-1"
            onClick={() => setShowMobileCart(false)}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            className={clsx(
              'bg-white rounded-t-2xl shadow-2xl flex flex-col',
              'h-[85vh]',
            )}
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <span className="text-base font-bold text-gray-900">Cart</span>
              <button
                onClick={() => setShowMobileCart(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close cart"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel cartState={cartState} onSaleComplete={handleSaleComplete} />
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
}
