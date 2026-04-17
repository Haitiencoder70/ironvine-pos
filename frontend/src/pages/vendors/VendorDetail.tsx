import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useVendor, useVendorPurchaseOrders, useDeleteVendor } from '../../hooks/useVendors';
import { useConfirm } from '../../hooks/useConfirm';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonLoader } from '../../components/ui';
import type { JSX } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function parseVendorMeta(notes?: string) {
  if (!notes) return { vendorCode: '', address: null, rawNotes: '' };
  try {
    const parsed = JSON.parse(notes);
    return {
      vendorCode: parsed.vendorCode || '',
      address: parsed.address || null,
      rawNotes: parsed.notes || '',
    };
  } catch {
    return { vendorCode: '', address: null, rawNotes: notes };
  }
}

const SUPPLIER_BADGE_CONFIG: Record<string, string> = {
  'Garments': 'bg-blue-100 text-blue-800',
  'DTF': 'bg-purple-100 text-purple-800',
  'HTV': 'bg-pink-100 text-pink-800',
  'Other': 'bg-gray-100 text-gray-800',
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function VendorDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Queries
  const { data: vendorData, isLoading: isLoadingVendor, isError: isErrorVendor, refetch } = useVendor(id ?? '');
  const { data: posData, isLoading: isLoadingPOs } = useVendorPurchaseOrders(id ?? '');

  const vendor = vendorData?.data;
  const purchaseOrders = posData?.data?.data ?? []; // pagination assumed array wrapped

  // Stats Derived locally
  const totalPOs = purchaseOrders.length;
  // Technically we exclude Canceled from total spend logically.
  const totalSpend = purchaseOrders.reduce((acc, po) => acc + (po.status !== 'CANCELLED' ? po.total : 0), 0);
  const avgPoValue = totalPOs > 0 ? totalSpend / totalPOs : 0;
  
  // Fake mock logic for fulfillment duration - logically derived via standard DB metrics subtracting createdAt from received at, we use simplistic assumptions if valid:
  const deliveredPOs = purchaseOrders.filter(p => p.status === 'RECEIVED');
  
  const { confirm } = useConfirm();
  const deleteVendor = useDeleteVendor();

  if (isLoadingVendor) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <SkeletonLoader variant="detail" />
      </div>
    );
  }

  if (isErrorVendor || !vendor) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Vendor not found</h2>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/vendors')}>
            Back to Vendors
          </TouchButton>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!id) return;
    const ok = await confirm({
      title: 'Delete Vendor',
      description: `Are you sure you want to delete ${vendor.name}? This cannot be undone.`,
      confirmText: 'Delete Vendor',
      variant: 'danger',
    });
    if (ok) {
      await deleteVendor.mutateAsync(id);
      navigate('/vendors', { replace: true });
    }
  };

  const { vendorCode, address, rawNotes } = parseVendorMeta(vendor.notes);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors')}
            className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {vendor.name}
              </h1>
              {!vendor.isActive && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-widest text-red-700 bg-red-100 border border-red-200">
                  Inactive
                </span>
              )}
            </div>
            {vendorCode && (
              <p className="text-sm font-mono text-gray-500 mt-1">Ref: {vendorCode}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TouchButton
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={deleteVendor.isPending}
          >
            Delete
          </TouchButton>
          <TouchButton
            variant="secondary"
            size="md"
            icon={<PencilSquareIcon className="h-5 w-5" />}
            onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
          >
            Edit Vendor
          </TouchButton>
          <TouchButton
            variant="primary"
            size="md"
            icon={<DocumentTextIcon className="h-5 w-5" />}
            onClick={() => navigate(`/purchase-orders/new?vendorId=${vendor.id}`)}
            disabled={!vendor.isActive}
          >
            New PO
          </TouchButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Static Reference Data) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Profile Basic */}
          <TouchCard padding="md" className="border border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
              <BuildingStorefrontIcon className="h-4 w-4 text-gray-400" />
              Contact Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                  {vendor.contactName ? vendor.contactName.substring(0, 2).toUpperCase() : vendor.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{vendor.contactName || 'No Contact Defined'}</p>
                  <p className="text-xs text-gray-500">Primary Contact</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 text-sm text-gray-700">
                {vendor.phone && (
                  <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl">
                     <PhoneIcon className="h-4 w-4 text-gray-400 shrink-0" />
                     <a href={`tel:${vendor.phone}`} className="hover:text-blue-600 transition-colors font-medium">{vendor.phone}</a>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl">
                     <EnvelopeIcon className="h-4 w-4 text-gray-400 shrink-0" />
                     <a href={`mailto:${vendor.email}`} className="hover:text-blue-600 transition-colors font-medium truncate">{vendor.email}</a>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-xl">
                     <GlobeAltIcon className="h-4 w-4 text-gray-400 shrink-0" />
                     <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors font-medium truncate">
                       {vendor.website.replace(/^https?:\/\//, '')}
                     </a>
                  </div>
                )}
                {address && (
                  <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-xl">
                     <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                     <div>
                       <p>{address.street}</p>
                       <p>{address.city}, {address.state} {address.zip}</p>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </TouchCard>

          {/* Business Meta */}
          <TouchCard padding="md" className="border border-gray-200">
             <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
               <ShieldCheckIcon className="h-4 w-4 text-gray-400" />
               Vendor Details
             </h2>

             <div className="space-y-5">
               <div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Supplies</p>
                 <div className="flex flex-wrap gap-2">
                   {vendor.categories.length === 0 && <span className="text-sm text-gray-400 italic">None logged.</span>}
                   {vendor.categories.map(cat => {
                      const cfg = SUPPLIER_BADGE_CONFIG[cat] || SUPPLIER_BADGE_CONFIG['Other'];
                      return (
                        <span key={cat} className={clsx('px-2.5 py-1 rounded-md text-xs font-bold tracking-wide', cfg)}>
                          {cat}
                        </span>
                      )
                   })}
                 </div>
               </div>

               <div>
                 <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Terms</p>
                 <p className="text-sm text-gray-900 font-medium">{vendor.paymentTerms || 'Not specified'}</p>
               </div>

               {vendor.leadTimeDays && (
                 <div>
                   <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Avg Lead Time</p>
                   <p className="text-sm text-gray-900 font-medium tracking-wide flex items-center gap-1.5 border border-gray-200 inline-flex px-2 py-1 rounded-md bg-gray-50">
                     <ClockIcon className="h-4 w-4" /> {vendor.leadTimeDays} Days
                   </p>
                 </div>
               )}

               {rawNotes && (
                 <div className="pt-2 border-t border-gray-100">
                   <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Internal Notes</p>
                   <div className="bg-yellow-50 text-yellow-800 text-sm p-3 rounded-xl border border-yellow-100 whitespace-pre-wrap">
                     {rawNotes}
                   </div>
                 </div>
               )}
             </div>
          </TouchCard>

        </div>

        {/* Right Column (Dynamic Activity Feed) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Metrics summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TouchCard className="border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <DocumentTextIcon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Total Orders</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalPOs}</p>
            </TouchCard>

            <TouchCard className="border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <BanknotesIcon className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Avg PO Value</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 font-mono tracking-tight">{fmt(avgPoValue)}</p>
            </TouchCard>

            <TouchCard className="border border-gray-200 p-4 relative overflow-hidden">
               <div className="flex items-center gap-2 text-gray-500 mb-1 z-10 relative">
                  <ClipboardDocumentCheckIcon className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">Delivered</span>
               </div>
               <p className="text-3xl font-bold text-emerald-700 z-10 relative">{deliveredPOs.length} <span className="text-sm font-medium text-emerald-600">POs</span></p>
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <ShieldCheckIcon className="h-24 w-24 text-emerald-800" />
               </div>
            </TouchCard>
          </div>

          {/* Deep Feed */}
          <TouchCard padding="md" className="border border-gray-200 h-[600px] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4 flex-shrink-0">
               <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                 Purchase Order History
               </h2>
               <div className="text-sm text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium border border-gray-100 shadow-inner">
                  {purchaseOrders.length} Records found
               </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {isLoadingPOs ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-[88px] bg-gray-50 rounded-xl border border-gray-100" />
                ))
              ) : purchaseOrders.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center">
                  <DocumentTextIcon className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-gray-500 text-sm">No recorded POs associated with this vendor.</p>
                  <TouchButton
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(`/purchase-orders/new?vendorId=${vendor.id}`)}
                    disabled={!vendor.isActive}
                  >
                    Draft First PO
                  </TouchButton>
                </div>
              ) : (
                purchaseOrders.map((po) => {
                  return (
                    <div 
                      key={po.id} 
                      onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white group flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            <DocumentTextIcon className="h-4 w-4" />
                            {po.poNumber}
                          </span>
                          <StatusBadge status={po.status} size="sm" />
                        </div>
                        <div className="text-xs text-gray-500 flex gap-4 mt-1.5">
                          <span>Issued: {format(new Date(po.createdAt), 'MMM d, yyyy')}</span>
                          {po.expectedDate && <span>Due: {format(new Date(po.expectedDate), 'MMM d')}</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 font-mono text-lg">{fmt(po.total)}</span>
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
