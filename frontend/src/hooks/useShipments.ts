import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { shipmentApi } from '../services/api';
import { orderKeys } from './useOrders';
import { useIsReady } from './useIsReady';
import type { ShipmentStatus, ShipmentCarrier } from '../types';

export const shipmentKeys = {
  all: ['shipments'] as const,
  lists: () => [...shipmentKeys.all, 'list'] as const,
  list: (params: unknown) => [...shipmentKeys.lists(), params] as const,
  details: () => [...shipmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...shipmentKeys.details(), id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export interface ShipmentListParams {
  page?: number;
  limit?: number;
  status?: ShipmentStatus;
  carrier?: ShipmentCarrier;
  search?: string;
}

export function useShipments(params: ShipmentListParams) {
  const isReady = useIsReady();
  return useQuery({
    queryKey: shipmentKeys.list(params),
    queryFn: () => shipmentApi.getAll(params),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    enabled: isReady,
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: shipmentKeys.detail(id),
    queryFn: () => shipmentApi.getById(id),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: unknown) => shipmentApi.create(data),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      if (res.data.orderId) {
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(res.data.orderId) });
        void queryClient.invalidateQueries({ queryKey: orderKeys.workflow(res.data.orderId) });
      }
      toast.success('Shipment record created');
    },
    onError: () => {
      toast.error('Failed to create shipment');
    },
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: ShipmentStatus }) =>
      shipmentApi.updateStatus(id, { newStatus }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(res.data.id) });
      if (res.data.orderId) {
        // Force refresh order workflow history if status shifts
        void queryClient.invalidateQueries({ queryKey: orderKeys.detail(res.data.orderId) });
        void queryClient.invalidateQueries({ queryKey: orderKeys.workflow(res.data.orderId) });
      }
      toast.success('Shipment status updated');
    },
    onError: () => {
      toast.error('Failed to update shipment status');
    },
  });
}

export function useUpdateTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { trackingNumber?: string; carrier?: ShipmentCarrier; estimatedDelivery?: string; sendTrackingEmail?: boolean } }) =>
      shipmentApi.updateTracking(id, payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: shipmentKeys.detail(res.data.id) });
      toast.success('Tracking details updated');
    },
    onError: () => {
      toast.error('Failed to update tracking');
    },
  });
}
