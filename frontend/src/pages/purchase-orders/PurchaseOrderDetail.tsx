import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  PrinterIcon,
  BuildingStorefrontIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { usePurchaseOrder, useSendPurchaseOrder } from '../../hooks/usePurchaseOrders';
import { useOrder } from '../../hooks/useOrders';
import { useConfirm } from '../../hooks/useConfirm';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { SkeletonLoader } from '../../components/ui';
import { ReceivePOModal } from '../../components/purchase-orders/ReceivePOModal';
import type { PurchaseOrderStatus } from '../../types';
import type { JSX } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; bg: string; text: string }> = {
  DRAFT: { label: 'Draft', bg: 'bg-white/[0.08]', text: 'text-slate-300' },
  SENT: { label: 'Sent to Vendor', bg: 'bg-blue-100', text: 'text-blue-800' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', bg: 'bg-amber-100', text: 'text-amber-800' },
  RECEIVED: { label: 'Fully Received', bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-800' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function PurchaseOrderDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const { data, isLoading, isError, refetch } = usePurchaseOrder(id ?? '');
  const po = data?.data;
  const { data: linkedOrderData } = useOrder(po?.linkedOrderId ?? '');

  const sendPO = useSendPurchaseOrder();
  const { confirm } = useConfirm();

  const hasRemainingMaterials = useMemo(() => {
    const order = linkedOrderData?.data;
    if (!order) return false;

    const coveredDescriptions = new Set(
      (order.purchaseOrders ?? [])
        .filter((orderPO) => orderPO.status !== 'CANCELLED')
        .flatMap((orderPO) => orderPO.items.map((item) => item.description)),
    );

    return order.items
      .flatMap((item) => item.requiredMaterials)
      .some((material) => !material.isFulfilled && !coveredDescriptions.has(material.description));
  }, [linkedOrderData]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <SkeletonLoader variant="detail" />
      </div>
    );
  }

  if (isError || !po) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Purchase Order not found</h2>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/purchase-orders')}>
            Back to POs
          </TouchButton>
        </div>
      </div>
    );
  }

  const badge = STATUS_CONFIG[po.status];

  // Derive global receiving stats
  const totalOrdered = po.items.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalReceived = po.items.reduce((acc, curr) => acc + curr.quantityRecv, 0);
  const receiveProgress = totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0;
  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 print:p-0">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/purchase-orders')}
              className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-100">{po.poNumber}</h1>
              <span className={clsx('px-3 py-1 rounded-full text-xs font-semibold tracking-wide', badge.bg, badge.text)}>
                {badge.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {po.status === 'DRAFT' && (
              <TouchButton
                variant="primary"
                size="md"
                icon={<PaperAirplaneIcon className="h-5 w-5" />}
                loading={sendPO.isPending}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Send Purchase Order',
                    description: 'Are you sure you want to send this PO to the vendor? This will mark it as SENT.',
                    confirmText: 'Send PO',
                    variant: 'primary',
                  });
                  if (ok) {
                    await sendPO.mutateAsync(po.id);
                  }
                }}
              >
                Send to Vendor
              </TouchButton>
            )}
            
            {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
              <TouchButton
                variant="success"
                size="md"
                onClick={() => setShowReceiveModal(true)}
              >
                Receive Items
              </TouchButton>
            )}

            {po.linkedOrderId && hasRemainingMaterials && (po.status === 'RECEIVED' || po.status === 'PARTIALLY_RECEIVED') && (
              <TouchButton
                variant="primary"
                size="md"
                icon={<ShoppingCartIcon className="h-5 w-5" />}
                onClick={() => navigate(`/purchase-orders/new?orderId=${po.linkedOrderId}`)}
              >
                Order Remaining Materials
              </TouchButton>
            )}

            <TouchButton
              variant="secondary"
              size="md"
              icon={<PrinterIcon className="h-5 w-5" />}
              onClick={() => window.print()}
            >
              Print
            </TouchButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Vendor Info */}
            <TouchCard padding="md" className="border border-white/10 print:border-none print:shadow-none">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <BuildingStorefrontIcon className="h-4 w-4 text-slate-400" />
                Vendor & Order Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">{po.vendor?.name}</h3>
                  {po.vendor?.contactName && <p className="text-sm text-slate-400 mt-1">Attn: {po.vendor.contactName}</p>}

                  <div className="mt-3 space-y-1.5">
                    {po.vendor?.phone && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <PhoneIcon className="h-3.5 w-3.5" />
                        {po.vendor.phone}
                      </p>
                    )}
                    {po.vendor?.email && (
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        <EnvelopeIcon className="h-3.5 w-3.5" />
                        {po.vendor.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white/[0.04] p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Order Date:</span>
                    <span className="font-medium text-slate-100">{format(new Date(po.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                  {po.expectedDate && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Expected:</span>
                      <span className="font-medium text-slate-100">{format(new Date(po.expectedDate), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {po.linkedOrderId && (
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-white/10">
                      <span className="text-slate-500">Linked Customer Job:</span>
                      <span
                        className="font-medium text-blue-400 cursor-pointer hover:underline"
                        onClick={() => navigate(`/orders/${po.linkedOrderId}`)}
                      >
                        View Order Profile
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {po.notes && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Notes to Vendor</p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
            </TouchCard>

            {/* Line Items */}
            <TouchCard padding="md" className="border border-white/10 print:shadow-none print:border-none">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <CubeIcon className="h-5 w-5 text-slate-400" />
                  Line Items
                </h2>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Fulfillment Progress</p>
                  <div className="flex items-center gap-2 mt-1 min-w-[120px]">
                    <div className="flex-1 h-2 bg-white/[0.08] rounded-full overflow-hidden">
                      <div 
                        className={clsx('h-full transition-all', receiveProgress === 100 ? 'bg-green-500' : 'bg-blue-500')}
                        style={{ width: `${Math.min(100, receiveProgress)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{totalReceived}/{totalOrdered}</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap lg:whitespace-normal">
                  <thead className="bg-white/[0.04] text-slate-400 uppercase tracking-wide text-[10px] font-semibold">
                    <tr>
                      <th className="px-4 py-2 rounded-l-lg">Description</th>
                      <th className="px-4 py-2 text-right">Ordered</th>
                      <th className="px-4 py-2 text-right">Received</th>
                      <th className="px-4 py-2 text-right">Unit Cost</th>
                      <th className="px-4 py-2 text-right rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => {
                      const fulfilled = item.quantityRecv >= item.quantity;
                      const partial = item.quantityRecv > 0 && !fulfilled;
                      return (
                        <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-100">{item.description}</td>
                          <td className="px-4 py-3 text-right text-slate-400 font-bold">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={clsx(
                              'px-2 py-0.5 rounded text-xs font-bold',
                              fulfilled ? 'bg-green-100 text-green-800' : partial ? 'bg-amber-100 text-amber-800' : 'text-slate-500'
                            )}>
                              {item.quantityRecv}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 font-mono">{fmt(item.unitCost)}</td>
                          <td className="px-4 py-3 text-right text-slate-100 font-bold font-mono">{fmt((item.totalCost ?? 0) || item.unitCost * item.quantity)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TouchCard>

          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Totals */}
            <TouchCard padding="md" className="border border-white/10">
               <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                 <ClipboardDocumentListIcon className="h-4 w-4 text-slate-400" />
                 Totals
               </h2>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm text-slate-400">
                   <span>Subtotal</span>
                   <span className="font-mono">{fmt(po.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-slate-400">
                   <span>Estimated Tax</span>
                   <span className="font-mono">{fmt(po.taxAmount)}</span>
                 </div>
                 <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold text-slate-100 text-lg">
                   <span>Total</span>
                   <span className="font-mono text-xl">{fmt(po.total)}</span>
                 </div>
               </div>
            </TouchCard>

          </div>
        </div>
      </div>

      <ReceivePOModal
        open={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        po={po}
      />
    </>
  );
}
