import { useState } from 'react';
import { TrashIcon, ShoppingBagIcon, MinusIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { PaymentModal } from './PaymentModal';
import type { CartState } from '../../hooks/usePOS';
import type { Sale } from '../../types';

interface CartPanelProps {
  cartState: CartState;
  onSaleComplete: (sale: Sale) => void;
}

export function CartPanel({ cartState, onSaleComplete }: CartPanelProps): React.JSX.Element {
  const [showPayment, setShowPayment] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');

  const {
    cart,
    removeFromCart,
    updateQty,
    subtotal,
    taxAmount,
    discountAmount,
    total,
    setDiscount,
  } = cartState;

  const handleDiscountChange = (val: string): void => {
    setDiscountInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setDiscount({ type: discountType, value: num });
    } else {
      setDiscount({ type: discountType, value: 0 });
    }
  };

  const handleDiscountTypeChange = (type: 'flat' | 'percent'): void => {
    setDiscountType(type);
    const num = parseFloat(discountInput);
    setDiscount({ type, value: isNaN(num) ? 0 : num });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Cart</h2>
            <span className="text-sm text-gray-500">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 text-gray-400">
              <ShoppingBagIcon className="h-12 w-12 mb-3 text-gray-200" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Tap a product to add it</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.inventoryItemId}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">${item.unitPrice.toFixed(2)} each</p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => updateQty(item.inventoryItemId, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] min-w-[36px]"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-gray-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.inventoryItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] min-w-[36px]"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>

                <span className="w-16 text-right text-sm font-semibold text-gray-900 flex-shrink-0">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </span>

                <button
                  onClick={() => removeFromCart(item.inventoryItemId)}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[44px] min-w-[36px] flex items-center justify-center"
                  aria-label="Remove item"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Discount + Totals */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 space-y-3">
          {/* Discount row */}
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="flex rounded-xl border border-gray-200 overflow-hidden flex-shrink-0">
              <button
                onClick={() => handleDiscountTypeChange('flat')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]',
                  discountType === 'flat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                $
              </button>
              <button
                onClick={() => handleDiscountTypeChange('percent')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px]',
                  discountType === 'percent'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50',
                )}
              >
                %
              </button>
            </div>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={discountInput}
              onChange={(e) => handleDiscountChange(e.target.value)}
              placeholder="Discount"
              className="flex-1 min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-500">
              <span>Tax (8.5%)</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Charge button */}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className={clsx(
              'w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-h-[52px] text-lg font-semibold transition-colors',
              cart.length === 0 && 'opacity-50 cursor-not-allowed',
            )}
          >
            Charge ${total.toFixed(2)}
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          cartState={cartState}
          onClose={() => setShowPayment(false)}
          onSaleComplete={(sale) => {
            setShowPayment(false);
            onSaleComplete(sale);
          }}
        />
      )}
    </>
  );
}
