import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  PencilSquareIcon,
  ShoppingCartIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useCustomer, useCustomerOrders, useUpdateCustomer } from '../../hooks/useCustomers';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import type { OrderStatus } from '../../types';
import type { JSX } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; text: string; bg: string }> = {
  QUOTE: { label: 'Quote', text: 'text-gray-700', bg: 'bg-gray-100' },
  PENDING_APPROVAL: { label: 'Pending Approval', text: 'text-amber-800', bg: 'bg-amber-100' },
  APPROVED: { label: 'Approved', text: 'text-blue-800', bg: 'bg-blue-100' },
  MATERIALS_ORDERED: { label: 'Materials Ordered', text: 'text-purple-800', bg: 'bg-purple-100' },
  MATERIALS_RECEIVED: { label: 'In Production', text: 'text-indigo-800', bg: 'bg-indigo-100' },
  IN_PRODUCTION: { label: 'In Production', text: 'text-indigo-800', bg: 'bg-indigo-100' },
  QUALITY_CHECK: { label: 'Quality Check', text: 'text-indigo-800', bg: 'bg-indigo-100' },
  READY_TO_SHIP: { label: 'Ready to Ship', text: 'text-emerald-800', bg: 'bg-emerald-100' },
  SHIPPED: { label: 'Shipped', text: 'text-green-800', bg: 'bg-green-100' },
  DELIVERED: { label: 'Delivered', text: 'text-green-800', bg: 'bg-green-100' },
  COMPLETED: { label: 'Completed', text: 'text-teal-800', bg: 'bg-teal-100' },
  ON_HOLD: { label: 'On Hold', text: 'text-red-800', bg: 'bg-red-100' },
  CANCELLED: { label: 'Cancelled', text: 'text-red-800', bg: 'bg-red-100' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function CustomerDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [notesEdit, setNotesEdit] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Queries
  const { data: customerData, isLoading: isLoadingCust, isError: isErrorCust, refetch } = useCustomer(id ?? '');
  const { data: ordersData, isLoading: isLoadingOrders } = useCustomerOrders(id ?? '');
  const updateCustomer = useUpdateCustomer();

  const customer = customerData?.data;
  const orders = ordersData?.data ?? [];

  // Derived Stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((acc, order) => acc + (order.status !== 'CANCELLED' ? order.total : 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
  
  // Exclude cancelled and draft if you only want definitive history, but sticking to last order creation logic:
  const lastOrderDate = orders.length > 0 
    ? [...orders].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt 
    : null;

  if (isLoadingCust) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="h-64 bg-gray-100 rounded-2xl" />
            <div className="h-32 bg-gray-100 rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
             <div className="grid grid-cols-4 gap-4"><div className="h-24 bg-gray-100 rounded-xl col-span-1" /><div className="col-span-3"/></div>
             <div className="h-96 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isErrorCust || !customer) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Customer not found</h2>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/customers')}>
            Back to Customers
          </TouchButton>
        </div>
      </div>
    );
  }

  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      await updateCustomer.mutateAsync({
        id,
        data: { notes: notesEdit }
      });
      setIsEditingNotes(false);
    } catch {
      // Handled
    }
  };

  const handleStartNotesEdit = () => {
    setNotesEdit(customer.notes || '');
    setIsEditingNotes(true);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {customer.firstName} {customer.lastName}
            </h1>
            {customer.company && (
              <p className="text-sm font-medium text-gray-500 mt-0.5">{customer.company}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TouchButton
            variant="secondary"
            size="md"
            icon={<PencilSquareIcon className="h-5 w-5" />}
            onClick={() => navigate(`/customers/${customer.id}/edit`)}
          >
            Edit Profile
          </TouchButton>
          <TouchButton
            variant="primary"
            size="md"
            icon={<ShoppingCartIcon className="h-5 w-5" />}
            onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
          >
            New Order
          </TouchButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Contact Card */}
          <TouchCard padding="md" className="border border-gray-200">
            <div className="flex items-center gap-4 mb-5 border-b border-gray-100 pb-4">
              <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                {customer.firstName[0]}{customer.lastName[0]}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-lg leading-tight">
                  {customer.firstName} {customer.lastName}
                </h2>
                {customer.company && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 shrink-0" />
                    {customer.company}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <PhoneIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-0.5">Phone</p>
                  <p className="font-medium text-gray-900">{customer.phone || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-0.5">Email</p>
                  <p className="font-medium text-gray-900">{customer.email || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm pt-4 border-t border-gray-100">
                <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-0.5">Billing Address</p>
                  {customer.billingStreet ? (
                     <p className="font-medium text-gray-900 leading-snug">
                       {customer.billingStreet}<br />
                       {customer.billingCity}, {customer.billingState} {customer.billingZip}
                     </p>
                  ) : (
                     <p className="text-gray-400 italic">No address on file</p>
                  )}
                </div>
              </div>
            </div>
          </TouchCard>

          {/* Notes Card */}
          <TouchCard padding="md" className="border border-gray-200">
            <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-gray-500" />
                Tags & Notes
              </h2>
              {!isEditingNotes && (
                <button
                  type="button"
                  onClick={handleStartNotesEdit}
                  className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg text-xs font-semibold"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  rows={4}
                  value={notesEdit}
                  onChange={(e) => setNotesEdit(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  placeholder="Enter custom tags (comma separated) or notes here..."
                />
                <div className="flex gap-2 justify-end">
                  <TouchButton size="sm" variant="secondary" onClick={() => setIsEditingNotes(false)}>Cancel</TouchButton>
                  <TouchButton size="sm" variant="primary" loading={updateCustomer.isPending} onClick={handleSaveNotes}>Save</TouchButton>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px]">
                {customer.notes ? customer.notes : <span className="text-gray-400 italic">No notes or tags added.</span>}
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-2">
              * Include tags natively in your notes representation (e.g. #VIP #Wholesale)
            </p>
          </TouchCard>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TouchCard padding="md" className="border border-gray-200">
              <div className="text-gray-500 mb-1 flex items-center gap-1.5"><BanknotesIcon className="h-4 w-4 flex-shrink-0" /><span className="text-xs uppercase tracking-wide font-semibold">Total Spent</span></div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{fmt(totalSpent)}</div>
            </TouchCard>
            <TouchCard padding="md" className="border border-gray-200">
              <div className="text-gray-500 mb-1 flex items-center gap-1.5"><ShoppingCartIcon className="h-4 w-4 flex-shrink-0" /><span className="text-xs uppercase tracking-wide font-semibold">Orders</span></div>
              <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
            </TouchCard>
            <TouchCard padding="md" className="border border-gray-200">
              <div className="text-gray-500 mb-1 flex items-center gap-1.5"><ReceiptPercentIcon className="h-4 w-4 flex-shrink-0" /><span className="text-xs uppercase tracking-wide font-semibold">Avg Order</span></div>
              <div className="text-2xl font-bold text-gray-900 font-mono">{fmt(avgOrderValue)}</div>
            </TouchCard>
            <TouchCard padding="md" className="border border-gray-200">
              <div className="text-gray-500 mb-1 flex items-center gap-1.5"><CalendarDaysIcon className="h-4 w-4 flex-shrink-0" /><span className="text-xs uppercase tracking-wide font-semibold">Last Order</span></div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                {lastOrderDate ? format(new Date(lastOrderDate), 'MMM d, yyyy') : '—'}
              </div>
            </TouchCard>
          </div>

          {/* Order Feed */}
          <TouchCard padding="md" className="border border-gray-200 h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 flex-shrink-0">
               <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                 Order History
               </h2>
               <div className="text-sm text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium border border-gray-100">
                  {orders.length} Records
               </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {isLoadingOrders ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-[88px] bg-gray-50 rounded-xl border border-gray-100" />
                ))
              ) : orders.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <ShoppingCartIcon className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-gray-500 text-sm">No orders found for this customer.</p>
                  <TouchButton
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}
                  >
                    Start First Order
                  </TouchButton>
                </div>
              ) : (
                orders.map((order) => {
                  const badge = ORDER_STATUS_CONFIG[order.status];
                  return (
                    <div 
                      key={order.id} 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="border border-gray-100 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {order.orderNumber}
                          </span>
                          <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide', badge.bg, badge.text)}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 flex gap-4">
                          <span>{format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}</span>
                          <span>{order.items?.length || 0} items</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 font-mono text-lg">{fmt(order.total)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TouchCard>

        </div>
      </div>
    </div>
  );
}
