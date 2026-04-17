import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  PrinterIcon,
  PencilSquareIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CubeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Fragment } from 'react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { Modal } from '../../components/ui/Modal';
import { OrderWorkflow } from '../../components/orders/OrderWorkflow';
import { OrderLabelPrint } from '../../components/orders/OrderLabelPrint';
import { UseMaterialsModal } from '../../components/orders/UseMaterialsModal';
import { CreateShipmentModal } from '../../components/shipments/CreateShipmentModal';
import { useOrder, useUpdateOrderStatus, orderKeys } from '../../hooks/useOrders';
import { useConfirm } from '../../hooks/useConfirm';
import { SkeletonLoader } from '../../components/ui';
import { subscribeToOrders } from '../../services/socket';
import confetti from 'canvas-confetti';
import type { JSX } from 'react';
import type { OrderStatus, OrderPriority } from '../../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<OrderPriority, string> = {
  NORMAL: 'bg-gray-100 text-gray-700',
  HIGH: 'bg-amber-100 text-amber-800',
  RUSH: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<OrderPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'High Priority',
  RUSH: '🔥 Rush',
};

const PRINT_LOCATION_LABELS: Record<string, string> = {
  FRONT: 'Front',
  BACK: 'Back',
  LEFT_SLEEVE: 'Left Sleeve',
  RIGHT_SLEEVE: 'Right Sleeve',
  FULL_PRINT: 'Full Print',
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  TSHIRT: 'T-Shirt',
  HOODIE: 'Hoodie',
  POLO: 'Polo',
  TANK_TOP: 'Tank Top',
  LONG_SLEEVE: 'Long Sleeve',
  SWEATSHIRT: 'Sweatshirt',
  HAT: 'Hat',
  BAG: 'Bag',
  OTHER: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function OrderDetailSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <SkeletonLoader variant="detail" />
    </div>
  );
}

// ─── Cancel Confirmation Modal ────────────────────────────────────────────────

interface CancelModalProps {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isLoading: boolean;
}

function CancelModal({ open, orderNumber, onClose, onConfirm, isLoading }: CancelModalProps) {
  const [notes, setNotes] = useState('');
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel Order"
      description={`Are you sure you want to cancel order ${orderNumber}? This action can be undone by changing the status.`}
      size="sm"
      closeOnOverlayClick={!isLoading}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Reason (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Why is this order being cancelled?"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-base shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          />
        </div>
        <div className="flex gap-3">
          <TouchButton variant="secondary" size="md" fullWidth onClick={onClose} disabled={isLoading}>
            Keep Order
          </TouchButton>
          <TouchButton
            id="confirm-cancel-order"
            variant="danger"
            size="md"
            fullWidth
            loading={isLoading}
            onClick={() => onConfirm(notes)}
          >
            Cancel Order
          </TouchButton>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function OrderDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data, isLoading, isError, refetch } = useOrder(id ?? '');
  const updateStatus = useUpdateOrderStatus();

  const order = data?.data;

  // Real-time socket updates for this specific order
  useEffect(() => {
    const unsub = subscribeToOrders({
      onStatusChanged: (updated) => {
        if (updated.id === id) {
          void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id ?? '') });
          void queryClient.invalidateQueries({ queryKey: orderKeys.workflow(id ?? '') });
          toast(`Status → ${updated.status.replace(/_/g, ' ')}`, { icon: '📋', id: 'status-update' });
        }
      },
      onUpdated: (updated) => {
        if (updated.id === id) {
          void queryClient.invalidateQueries({ queryKey: orderKeys.detail(id ?? '') });
        }
      },
    });
    return unsub;
  }, [id, queryClient]);

  const toggleItemExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const { confirm } = useConfirm();

  const handleAdvanceStatus = useCallback(
    async (nextStatus: OrderStatus, requiresModal?: string) => {
      if (requiresModal === 'materials') {
        setShowMaterialsModal(true);
        return;
      }
      if (requiresModal === 'materials_po' && id) {
        navigate(`/purchase-orders/new?orderId=${id}`);
        return;
      }
      if (requiresModal === 'shipment') {
        setShowShipmentModal(true);
        return;
      }
      if (!id) return;
      
      // If moving to COMPLETED, confirm first and then fire confetti
      if (nextStatus === 'COMPLETED') {
        const ok = await confirm({
          title: 'Complete Order',
          description: 'Are you sure you want to mark this order as completed? This signifies all items are delivered and paid for.',
          confirmText: 'Complete',
          variant: 'primary',
        });
        if (!ok) return;
      }

      try {
        await updateStatus.mutateAsync({ id, newStatus: nextStatus });
        toast.success(`Order moved to ${nextStatus.replace(/_/g, ' ')}`);
        
        if (nextStatus === 'COMPLETED') {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3B82F6', '#10B981', '#F59E0B']
          });
        }
      } catch {
        // error toast handled by hook
      }
    },
    [id, updateStatus, navigate, confirm]
  );

  const handleCancel = useCallback(
    async (notes: string) => {
      if (!id) return;
      try {
        await updateStatus.mutateAsync({ id, newStatus: 'CANCELLED', notes });
        setShowCancelModal(false);
        toast.success('Order cancelled');
      } catch {
        // error toast handled by hook
      }
    },
    [id, updateStatus]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ── Loading / Error states ─────────────────────────────────────────────────

  if (isLoading) return <OrderDetailSkeleton />;

  if (isError || !order) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Order not found</h2>
        <p className="text-sm text-gray-500 mb-6">
          This order may have been deleted or you may not have access.
        </p>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/orders')}>
            Back to Orders
          </TouchButton>
        </div>
      </div>
    );
  }

  const priority = order.priority as OrderPriority;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 print:p-0">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-start gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors min-h-[44px] -ml-2 px-2 rounded-xl hover:bg-gray-100 print:hidden"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Orders
          </button>

          {/* Order number + badges */}
          <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.status} size="md" />
            <span
              className={clsx(
                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                PRIORITY_STYLES[priority]
              )}
            >
              {PRIORITY_LABELS[priority]}
            </span>
            {order.dueDate && (
              <span className="text-sm text-gray-400">
                Due {format(new Date(order.dueDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>

          {/* Actions menu */}
          <Menu as="div" className="relative print:hidden">
            <MenuButton
              id="order-actions-menu"
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
              aria-label="Order actions"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </MenuButton>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems className="absolute right-0 z-30 mt-1 w-52 origin-top-right rounded-2xl bg-white shadow-xl ring-1 ring-black/5 focus:outline-none py-1">
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={() => navigate(`/orders/${order.id}/edit`)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 min-h-[44px]',
                        focus && 'bg-gray-50'
                      )}
                    >
                      <PencilSquareIcon className="h-4 w-4 text-gray-400" />
                      Edit Order
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={handlePrint}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 min-h-[44px]',
                        focus && 'bg-gray-50'
                      )}
                    >
                      <PrinterIcon className="h-4 w-4 text-gray-400" />
                      Print Order
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={handlePrint}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 min-h-[44px]',
                        focus && 'bg-gray-50'
                      )}
                    >
                      <QrCodeIcon className="h-4 w-4 text-gray-400" />
                      Print Label
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ focus }) => (
                    <button
                      onClick={() => toast('Duplicate coming soon', { icon: '📋' })}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 min-h-[44px]',
                        focus && 'bg-gray-50'
                      )}
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 text-gray-400" />
                      Duplicate Order
                    </button>
                  )}
                </MenuItem>
                {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <MenuItem>
                      {({ focus }) => (
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className={clsx(
                            'flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 min-h-[44px]',
                            focus && 'bg-red-50'
                          )}
                        >
                          <XCircleIcon className="h-4 w-4" />
                          Cancel Order
                        </button>
                      )}
                    </MenuItem>
                  </>
                )}
              </MenuItems>
            </Transition>
          </Menu>

          {/* Refetch indicator */}
          {updateStatus.isPending && (
            <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Left column (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer Card */}
            <TouchCard padding="md" className="shadow-sm border border-gray-100">
              <SectionHeader
                icon={<UserIcon className="h-4 w-4 text-gray-500" />}
                title="Customer"
                action={
                  order.customer && (
                    <Link
                      to={`/customers/${order.customer.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium min-h-[44px] flex items-center px-2 -mr-2 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      View Profile
                    </Link>
                  )
                }
              />
              {order.customer ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name + contact */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {order.customer.firstName[0]}{order.customer.lastName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {order.customer.firstName} {order.customer.lastName}
                        </p>
                        {order.customer.company && (
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <BuildingOfficeIcon className="h-3.5 w-3.5" />
                            {order.customer.company}
                          </p>
                        )}
                      </div>
                    </div>
                    {order.customer.phone && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a href={`tel:${order.customer.phone}`} className="hover:text-blue-600 transition-colors">
                          {order.customer.phone}
                        </a>
                      </p>
                    )}
                    {order.customer.email && (
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${order.customer.email}`} className="hover:text-blue-600 transition-colors truncate">
                          {order.customer.email}
                        </a>
                      </p>
                    )}
                  </div>

                  {/* Addresses */}
                  <div className="space-y-3">
                    {order.customer.shippingStreet && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                          Shipping
                        </p>
                        <p className="text-sm text-gray-600 flex items-start gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>
                            {order.customer.shippingStreet}<br />
                            {order.customer.shippingCity}, {order.customer.shippingState} {order.customer.shippingZip}
                          </span>
                        </p>
                      </div>
                    )}
                    {order.customer.billingStreet && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                          Billing
                        </p>
                        <p className="text-sm text-gray-600 flex items-start gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>
                            {order.customer.billingStreet}<br />
                            {order.customer.billingCity}, {order.customer.billingState} {order.customer.billingZip}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No customer information</p>
              )}
            </TouchCard>

            {/* Order Items */}
            <TouchCard padding="md" className="shadow-sm border border-gray-100">
              <SectionHeader
                icon={<CubeIcon className="h-4 w-4 text-gray-500" />}
                title={`Order Items (${order.items.length})`}
              />
              <div className="space-y-3">
                {order.items.map((item, idx) => {
                  const lineTotal = item.quantity * item.unitPrice;
                  const isExpanded = expandedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      {/* Item row */}
                      <button
                        type="button"
                        onClick={() => toggleItemExpand(item.id)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors min-h-[52px]"
                        aria-expanded={isExpanded}
                      >
                        <span className="text-xs font-bold text-gray-400 mt-0.5 flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                            {item.size ? ` · ${item.size}` : ''}
                            {item.color ? ` · ${item.color}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.quantity} × {fmt(item.unitPrice)}
                            {item.printMethod ? ` · ${item.printMethod.replace(/_/g, ' ')}` : ''}
                          </p>
                          {item.printLocations.length > 0 && (
                            <p className="text-xs text-gray-400">
                              {item.printLocations
                                .map((l) => PRINT_LOCATION_LABELS[l as string] ?? l)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-gray-900">{fmt(lineTotal)}</p>
                          <span className="text-xs text-gray-400">
                            {isExpanded ? '▲ Less' : '▼ Materials'}
                          </span>
                        </div>
                      </button>

                      {/* Expandable materials */}
                      <AnimatePresence initial={false}>
                        {isExpanded && item.requiredMaterials.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="px-4 pb-3 border-t border-gray-100 bg-amber-50">
                              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide pt-3 pb-1.5">
                                Required Materials
                              </p>
                              <ul className="space-y-1">
                                {item.requiredMaterials.map((rm) => (
                                  <li key={rm.id} className="text-sm text-amber-900 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                    {rm.description} — {rm.quantityRequired} {rm.quantityUnit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </motion.div>
                        )}
                        {isExpanded && item.requiredMaterials.length === 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <p className="px-4 pb-3 text-xs text-gray-400 border-t border-gray-100 pt-2">
                              No required materials listed for this item.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Use Materials button (in production) */}
              {order.status === 'IN_PRODUCTION' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <TouchButton
                    id="order-use-materials"
                    variant="warning"
                    size="md"
                    fullWidth
                    onClick={() => setShowMaterialsModal(true)}
                  >
                    Record Material Usage
                  </TouchButton>
                </div>
              )}
            </TouchCard>

            {/* Notes */}
            {(order.notes || order.designNotes || order.internalNotes) && (
              <TouchCard padding="md" className="shadow-sm border border-gray-100">
                <SectionHeader
                  icon={<ClipboardDocumentListIcon className="h-4 w-4 text-gray-500" />}
                  title="Notes"
                />
                <div className="space-y-3">
                  {order.notes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Order Notes</p>
                      <p className="text-sm text-gray-700">{order.notes}</p>
                    </div>
                  )}
                  {order.designNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Design Notes</p>
                      <p className="text-sm text-gray-700">{order.designNotes}</p>
                    </div>
                  )}
                  {order.internalNotes && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Internal Notes</p>
                      <p className="text-sm text-gray-700 italic">{order.internalNotes}</p>
                    </div>
                  )}
                </div>
              </TouchCard>
            )}

            {/* Totals */}
            <TouchCard padding="md" className="shadow-sm border border-gray-100">
              <SectionHeader
                icon={<CurrencyDollarIcon className="h-4 w-4 text-gray-500" />}
                title="Order Totals"
              />
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{fmt(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>−{fmt(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tax</span>
                  <span>{fmt(order.tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg">{fmt(order.total)}</span>
                </div>
              </div>
            </TouchCard>
          </div>

          {/* ── Right column (1/3) ── */}
          <div className="space-y-5">
            {/* Order Workflow */}
            <TouchCard padding="md" className="shadow-sm border border-gray-100">
              <SectionHeader
                icon={<ShoppingCartIcon className="h-4 w-4 text-gray-500" />}
                title="Order Progress"
              />
              <OrderWorkflow
                order={order}
                onAdvanceStatus={handleAdvanceStatus}
                isAdvancing={updateStatus.isPending}
              />
            </TouchCard>

            {/* Order Metadata */}
            <TouchCard padding="md" className="shadow-sm border border-gray-100">
              <SectionHeader
                icon={<ClipboardDocumentListIcon className="h-4 w-4 text-gray-500" />}
                title="Details"
              />
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Created</dt>
                  <dd className="text-gray-700 font-medium">
                    {format(new Date(order.createdAt), 'MMM d, yyyy')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Last Updated</dt>
                  <dd className="text-gray-700 font-medium">
                    {format(new Date(order.updatedAt), 'MMM d, h:mm a')}
                  </dd>
                </div>
                {order.dueDate && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Due Date</dt>
                    <dd className="text-gray-700 font-medium">
                      {format(new Date(order.dueDate), 'MMM d, yyyy')}
                    </dd>
                  </div>
                )}
                {order.designFiles.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <dt className="text-gray-400 mb-1">Design Files</dt>
                    <dd className="space-y-1">
                      {order.designFiles.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 hover:text-blue-700 text-xs truncate"
                        >
                          File {i + 1}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </TouchCard>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <CancelModal
        open={showCancelModal}
        orderNumber={order.orderNumber}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        isLoading={updateStatus.isPending}
      />

      <UseMaterialsModal
        open={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        orderId={order.id}
        orderNumber={order.orderNumber}
        items={order.items}
      />

      <CreateShipmentModal
        open={showShipmentModal}
        onClose={() => setShowShipmentModal(false)}
        order={order}
      />

      <OrderLabelPrint 
        orderNumber={order.orderNumber}
        customerName={order.customer?.company || (order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'No Customer')}
        createdAt={order.createdAt}
        itemsSummary={order.items.map(i => `${i.quantity}x ${i.productType}`).join('\n')}
      />
    </>
  );
}
