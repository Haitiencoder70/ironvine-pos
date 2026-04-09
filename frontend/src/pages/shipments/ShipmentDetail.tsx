import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  PrinterIcon,
  ExclamationCircleIcon,
  TruckIcon,
  ShoppingBagIcon,
  MapPinIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { useShipment } from '../../hooks/useShipments';
import { TouchButton } from '../../components/ui/TouchButton';
import { TouchCard } from '../../components/ui/TouchCard';
import { UpdateShipmentStatusModal } from '../../components/shipments/UpdateShipmentStatusModal';
import { UpdateTrackingModal } from '../../components/shipments/UpdateTrackingModal';
import type { ShipmentStatus } from '../../types';
import type { JSX } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; text: string; bg: string; step: number }> = {
  PENDING: { label: 'Pending', text: 'text-amber-800', bg: 'bg-amber-100', step: 1 },
  LABEL_CREATED: { label: 'Label Created', text: 'text-blue-800', bg: 'bg-blue-100', step: 2 },
  IN_TRANSIT: { label: 'In Transit', text: 'text-purple-800', bg: 'bg-purple-100', step: 3 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', text: 'text-indigo-800', bg: 'bg-indigo-100', step: 4 },
  DELIVERED: { label: 'Delivered', text: 'text-green-800', bg: 'bg-green-100', step: 5 },
  EXCEPTION: { label: 'Exception', text: 'text-red-800', bg: 'bg-red-100', step: -1 },
};

const TIMELINE_STEPS = [
  { status: 'PENDING', label: 'Processing' },
  { status: 'LABEL_CREATED', label: 'Label Created' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
] as const;

// ─── Component ─────────────────────────────────────────────────────────────────

export function ShipmentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);

  const { data, isLoading, isError, refetch } = useShipment(id ?? '');
  const shipment = data?.data;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-pulse space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 space-y-4">
             <div className="h-32 bg-gray-100 rounded-2xl" />
             <div className="h-64 bg-gray-100 rounded-2xl" />
           </div>
           <div className="lg:col-span-1 space-y-4">
             <div className="h-48 bg-gray-100 rounded-2xl" />
             <div className="h-48 bg-gray-100 rounded-2xl" />
           </div>
        </div>
      </div>
    );
  }

  if (isError || !shipment) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center mt-16">
        <ExclamationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Shipment details not found</h2>
        <div className="flex gap-3 justify-center">
          <TouchButton variant="secondary" size="md" onClick={() => void refetch()}>
            Retry
          </TouchButton>
          <TouchButton variant="primary" size="md" onClick={() => navigate('/shipments')}>
            Back to Shipments
          </TouchButton>
        </div>
      </div>
    );
  }

  const badge = STATUS_CONFIG[shipment.status];
  const currentStep = badge.step;

  // Attempt to build tracking URL if UPS/FedEx/USPS natively mapping structure:
  let trackingUrl = '#';
  if (shipment.trackingNumber) {
    if (shipment.carrier === 'UPS') trackingUrl = `https://www.ups.com/track?tracknum=${shipment.trackingNumber}`;
    else if (shipment.carrier === 'FEDEX') trackingUrl = `https://www.fedex.com/fedextrack/?trknbr=${shipment.trackingNumber}`;
    else if (shipment.carrier === 'USPS') trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${shipment.trackingNumber}`;
    else if (shipment.carrier === 'DHL') trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${shipment.trackingNumber}`;
  }

  return (
    <>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)} // generally safe if routed through lists, or /shipments specifically
              className="flex items-center justify-center min-h-[44px] -ml-2 px-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 border-r border-gray-300 pr-3 mr-1">
                Ref: {shipment.id.substring(0, 8).toUpperCase()}
              </h1>
              <span className={clsx('px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wide', badge.bg, badge.text)}>
                {badge.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <TouchButton
               variant="secondary"
               size="md"
               icon={<TruckIcon className="h-4 w-4" />}
               onClick={() => setShowTrackingModal(true)}
             >
               Manage Tracking
             </TouchButton>
             <TouchButton
               variant="primary"
               size="md"
               icon={<ClockIcon className="h-4 w-4" />}
               onClick={() => setShowStatusModal(true)}
             >
               Update Status
             </TouchButton>
             <TouchButton
               variant="secondary"
               size="md"
               icon={<PrinterIcon className="h-4 w-4" />}
               onClick={() => window.print()}
             >
               Label
             </TouchButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Visual Core (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Timeline Progress */}
            <TouchCard padding="lg" className="border border-gray-200">
               <h2 className="text-base font-semibold text-gray-900 mb-6">Delivery Progress</h2>
               
               {shipment.status === 'EXCEPTION' ? (
                 <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 font-medium">
                    <ExclamationCircleIcon className="h-6 w-6" />
                    Delivery Exception Logged. Check carrier notes or contact delivery agent.
                 </div>
               ) : (
                 <div className="relative flex justify-between items-center px-4 sm:px-8 mt-4 mb-2">
                   {/* Background Line */}
                   <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-gray-100 rounded-full z-0" />
                   
                   {/* Progress Line */}
                   <div 
                     className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full z-0 transition-all duration-500" 
                     style={{ width: `calc(${(currentStep > 0 ? (currentStep - 1) : 0) * 25}% - ${currentStep > 1 ? 0 : 2}rem)` }}
                   />

                   {TIMELINE_STEPS.map((stepDef, idx) => {
                     const isCompleted = currentStep > (idx + 1);
                     const isCurrent = currentStep === (idx + 1);

                     return (
                       <div key={stepDef.status} className="relative z-10 flex flex-col items-center">
                         <div 
                           className={clsx(
                             'h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 flex items-center justify-center shadow-sm transition-colors',
                             isCompleted ? 'bg-blue-500 border-blue-500 text-white' : 
                             isCurrent ? 'bg-white border-blue-500 text-blue-600 ring-4 ring-blue-50' : 
                             'bg-white border-gray-200 text-gray-300'
                           )}
                         >
                            <div className={clsx("h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full", isCompleted ? 'bg-white' : isCurrent ? 'bg-blue-600' : 'bg-transparent')} />
                         </div>
                         <p className={clsx(
                           'absolute top-10 w-24 text-center text-[10px] sm:text-xs font-bold leading-tight',
                            isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                         )}>
                           {stepDef.label}
                         </p>
                       </div>
                     )
                   })}
                 </div>
               )}
            </TouchCard>

            {/* Event History / Detailed Log */}
             <TouchCard padding="md" className="border border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900 border-b pb-3 mb-3 flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-gray-500" /> Event Log
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                     <div className="h-full pt-1">
                       <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-50" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-gray-900 mb-0.5">Shipment Updated: {badge.label}</p>
                       <p className="text-xs text-gray-500 font-mono tracking-wide">{format(new Date(shipment.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                       {shipment.notes && <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded-lg">{shipment.notes}</p>}
                     </div>
                  </div>
                  {/* Assuming backend only records latest updatedAt realistically without a separate history table. If event array existed, we map it here inline. */}
                  <div className="flex items-start gap-4 opacity-50 relative">
                     <div className="absolute left-[3px] -top-6 bottom-4 w-[2px] bg-gray-200 rounded" />
                     <div className="h-full pt-1 z-10">
                       <div className="h-2 w-2 rounded-full bg-gray-400" />
                     </div>
                     <div>
                       <p className="text-sm font-bold text-gray-900 mb-0.5">Shipment Generated</p>
                       <p className="text-xs text-gray-500 font-mono tracking-wide">{format(new Date(shipment.createdAt), 'MMM d, yyyy h:mm a')}</p>
                     </div>
                  </div>
                </div>
             </TouchCard>
          </div>

          {/* Right Reference Column (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Tracking Reference */}
            <TouchCard padding="md" className="border border-gray-200">
               <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4 border-b pb-2">
                 <TruckIcon className="h-4 w-4 text-gray-500" />
                 Carrier Details
               </h2>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-gray-500">Carrier Service</span>
                   <span className="font-bold text-gray-900">{shipment.carrier}</span>
                 </div>
                 {shipment.trackingNumber && trackingUrl !== '#' && (
                   <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-3">
                     <span className="text-gray-500">Tracking Info</span>
                     <a 
                       href={trackingUrl}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="font-mono font-bold text-blue-600 hover:underline flex items-center gap-1"
                     >
                       {shipment.trackingNumber}
                       <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                     </a>
                   </div>
                 )}
                 {shipment.trackingNumber && trackingUrl === '#' && (
                   <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-3">
                     <span className="text-gray-500">Tracking Number</span>
                     <span className="font-mono font-bold text-gray-900">{shipment.trackingNumber}</span>
                   </div>
                 )}
                 <div className="flex justify-between items-center text-sm border-t border-gray-50 pt-3">
                   <span className="text-gray-500">Est. Delivery</span>
                   <span className="font-medium text-gray-900">{shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), 'MMM d, yyyy') : 'Pending Calculation'}</span>
                 </div>
               </div>
            </TouchCard>

            {/* Order Identity Link */}
            <TouchCard padding="md" className="border border-gray-200 bg-gray-50">
               <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                 <ShoppingBagIcon className="h-4 w-4 text-gray-500" />
                 Linked Workflow
               </h2>
               <div className="bg-white p-3 border border-gray-200 rounded-xl">
                 <p className="text-sm font-medium text-gray-600 mb-1">Customer Order Reference:</p>
                 <button 
                  onClick={() => navigate(`/orders/${shipment.orderId}`)}
                  className="font-bold text-lg text-blue-600 hover:text-blue-800 transition-colors w-full text-left"
                 >
                   {shipment.order?.orderNumber || 'View Active Job'}
                 </button>
               </div>
            </TouchCard>

            {/* Destination Address */}
            <TouchCard padding="md" className="border border-gray-200">
               <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                 <MapPinIcon className="h-4 w-4 text-gray-500" />
                 Final Destination
               </h2>
               <div className="text-sm text-gray-800 leading-snug">
                  {shipment.shippingStreet ? (
                    <>
                      <p className="font-bold mb-1">
                        {shipment.order?.customer?.firstName} {shipment.order?.customer?.lastName}
                      </p>
                      <p>{shipment.shippingStreet}</p>
                      <p>{shipment.shippingCity}, {shipment.shippingState} {shipment.shippingZip}</p>
                      {shipment.shippingCountry && <p>{shipment.shippingCountry}</p>}
                    </>
                  ) : (
                    <p className="text-gray-500 italic">No destination block recorded.</p>
                  )}
               </div>
            </TouchCard>

          </div>

        </div>
      </div>

      <UpdateShipmentStatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        shipment={shipment}
      />
      <UpdateTrackingModal
        open={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        shipment={shipment}
      />
    </>
  );
}
