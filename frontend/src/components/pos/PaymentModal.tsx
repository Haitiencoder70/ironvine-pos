import { useState } from 'react';
import { XMarkIcon, CreditCardIcon, BanknotesIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useCompleteSale } from '../../hooks/usePOS';
import type { CartState } from '../../hooks/usePOS';
import type { PaymentMethod, Sale } from '../../types';

interface PaymentModalProps {
  cartState: CartState;
  onClose: () => void;
  onSaleComplete: (sale: Sale) => void;
}

type Tab = 'CASH' | 'CARD' | 'SPLIT';

export function PaymentModal({
  cartState,
  onClose,
  onSaleComplete,
}: PaymentModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [splitCash, setSplitCash] = useState('');

  const { cart, subtotal, taxAmount, discountAmount, total, clearCart } = cartState;
  const completeSale = useCompleteSale();

  const cashTenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = Math.max(0, cashTenderedNum - total);

  const splitCashNum = parseFloat(splitCash) || 0;
  const splitCardNum = Math.max(0, total - splitCashNum);

  const paymentMethodMap: Record<Tab, PaymentMethod> = {
    CASH: 'CASH',
    CARD: 'CARD',
    SPLIT: 'SPLIT',
  };

  const isValid = (): boolean => {
    if (cart.length === 0) return false;
    if (activeTab === 'CASH') return cashTenderedNum >= total;
    if (activeTab === 'CARD') return true;
    if (activeTab === 'SPLIT') return splitCashNum >= 0 && splitCashNum <= total;
    return false;
  };

  const handleComplete = (): void => {
    completeSale.mutate(
      {
        items: cart,
        subtotal,
        taxAmount,
        discount: discountAmount,
        total,
        paymentMethod: paymentMethodMap[activeTab],
        cashTendered: activeTab === 'CASH' ? cashTenderedNum : undefined,
        changeDue: activeTab === 'CASH' ? changeDue : undefined,
        cardAmount: activeTab === 'SPLIT' ? splitCardNum : undefined,
      },
      {
        onSuccess: (res) => {
          clearCart();
          onSaleComplete(res.data);
        },
      },
    );
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'CASH', label: 'Cash', icon: <BanknotesIcon className="h-5 w-5" /> },
    { id: 'CARD', label: 'Card', icon: <CreditCardIcon className="h-5 w-5" /> },
    { id: 'SPLIT', label: 'Split', icon: <ArrowsRightLeftIcon className="h-5 w-5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Payment</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Total */}
        <div className="px-5 pt-4 pb-3 flex-shrink-0">
          <div className="bg-blue-50 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">Total Due</span>
            <span className="text-2xl font-bold text-blue-700">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-5 flex-shrink-0">
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]',
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {activeTab === 'CASH' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amount Tendered
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[52px] rounded-xl border border-gray-200 px-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  autoFocus
                />
              </div>
              {cashTenderedNum >= total && cashTenderedNum > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-green-700">Change Due</span>
                  <span className="text-2xl font-bold text-green-700">${changeDue.toFixed(2)}</span>
                </div>
              )}
              {/* Quick cash buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, 20, 50, 100]
                  .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
                  .slice(0, 6)
                  .map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashTendered(amount.toFixed(2))}
                      className="py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 transition-colors min-h-[44px]"
                    >
                      ${amount.toFixed(2)}
                    </button>
                  ))}
              </div>
            </>
          )}

          {activeTab === 'CARD' && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                <CreditCardIcon className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-base font-medium text-gray-900">Process Card Payment</p>
              <p className="text-sm text-gray-500">
                Present card to terminal or enter card details on device.
              </p>
              <input
                type="text"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                placeholder="Card #  (last 4, optional)"
                className="w-full min-h-[44px] rounded-xl border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {activeTab === 'SPLIT' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cash Amount
                </label>
                <input
                  type="number"
                  min="0"
                  max={total}
                  step="0.01"
                  value={splitCash}
                  onChange={(e) => setSplitCash(e.target.value)}
                  placeholder="0.00"
                  className="w-full min-h-[52px] rounded-xl border border-gray-200 px-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Card Amount
                </label>
                <div className="w-full min-h-[52px] rounded-xl border border-gray-100 bg-gray-50 px-4 flex items-center justify-center text-xl font-bold text-gray-700">
                  ${splitCardNum.toFixed(2)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-100">
          <button
            onClick={handleComplete}
            disabled={!isValid() || completeSale.isPending}
            className={clsx(
              'w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-h-[52px] text-lg font-semibold transition-colors',
              (!isValid() || completeSale.isPending) && 'opacity-50 cursor-not-allowed',
            )}
          >
            {completeSale.isPending ? 'Processing…' : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
}
