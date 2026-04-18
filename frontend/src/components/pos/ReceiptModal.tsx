import { CheckCircleIcon, PrinterIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Sale } from '../../types';

interface ReceiptModalProps {
  sale: Sale;
  changeDue?: number;
  onClose: () => void;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  SPLIT: 'Split (Cash + Card)',
};

export function ReceiptModal({ sale, changeDue, onClose }: ReceiptModalProps): React.JSX.Element {
  const subtotalCalc = sale.orderItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const taxCalc = sale.total - subtotalCalc;

  const handlePrint = (): void => {
    alert('Receipt printing: connect your ESC/POS printer via WebUSB to enable hardware printing.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-bold text-gray-900">Sale Complete</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Order info */}
          <div className="text-center space-y-1">
            <p className="text-sm font-mono font-bold text-gray-900">{sale.orderNumber}</p>
            <p className="text-xs text-gray-400">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Items */}
          <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
            {sale.orderItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} × ${item.unitPrice.toFixed(2)}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900 flex-shrink-0">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotalCalc.toFixed(2)}</span>
            </div>
            {taxCalc > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tax</span>
                <span>${taxCalc.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payment</span>
              <span className="font-medium text-gray-900">
                {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
              </span>
            </div>
            {changeDue !== undefined && changeDue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change Due</span>
                <span className="font-bold text-green-600">${changeDue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-gray-100 flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl min-h-[52px] text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PrinterIcon className="h-5 w-5" />
            Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-h-[52px] text-sm font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
