import { io, Socket } from 'socket.io-client';
import { Order, InventoryItem, PurchaseOrder, Shipment } from '../types';

let socket: Socket | null = null;

/**
 * Initializes and establishes the socket.io connection securely.
 * @param getToken - Function resolving to a valid Clerk session token.
 * @returns A promise resolving to the established Socket instance.
 */
export const initSocket = async (getToken: () => Promise<string | null>): Promise<Socket> => {
  if (socket?.connected) {
    return socket;
  }

  const token = await getToken();
  if (!token) {
    throw new Error('Socket initialization failed: No auth token available.');
  }

  socket = io(import.meta.env['VITE_API_URL']?.replace('/api', '') ?? 'http://localhost:3001', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[socket] connected');
    }
  });

  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[socket] disconnected: ${reason}`);
    }
  });

  return socket;
};

/**
 * Returns the active socket instance.
 * @returns The active Socket or null if undefined.
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Attaches real-time listeners for Order occurrences.
 * @param callbacks - Event callbacks capturing live pushes.
 * @returns A cleanup function returning a void trace to unhook correctly.
 */
export const subscribeToOrders = (callbacks: {
  onCreated?: (order: Order) => void;
  onUpdated?: (order: Order) => void;
  onStatusChanged?: (order: Order) => void;
  onMaterialsUsed?: (data: { orderId: string }) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onCreated, onUpdated, onStatusChanged, onMaterialsUsed } = callbacks;

  if (onCreated) socket.on('order:created', onCreated);
  if (onUpdated) socket.on('order:updated', onUpdated);
  if (onStatusChanged) socket.on('order:status-changed', onStatusChanged);
  if (onMaterialsUsed) socket.on('order:materials-used', onMaterialsUsed);

  return () => {
    if (!socket) return;
    if (onCreated) socket.off('order:created', onCreated);
    if (onUpdated) socket.off('order:updated', onUpdated);
    if (onStatusChanged) socket.off('order:status-changed', onStatusChanged);
    if (onMaterialsUsed) socket.off('order:materials-used', onMaterialsUsed);
  };
};

/**
 * Tracks background changes inside the global inventory matrix securely.
 * @param callbacks - Action handlers responding to low stock bounds dynamically.
 * @returns An unsubscription handler explicitly matching the provided functions natively.
 */
export const subscribeToInventory = (callbacks: {
  onLowStock?: (item: InventoryItem) => void;
  onAdjusted?: (item: InventoryItem) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onLowStock, onAdjusted } = callbacks;

  if (onLowStock) socket.on('inventory:low-stock', onLowStock);
  if (onAdjusted) socket.on('inventory:adjusted', onAdjusted);

  return () => {
    if (!socket) return;
    if (onLowStock) socket.off('inventory:low-stock', onLowStock);
    if (onAdjusted) socket.off('inventory:adjusted', onAdjusted);
  };
};

export const subscribeToPurchaseOrders = (callbacks: {
  onReceived?: (po: PurchaseOrder) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onReceived } = callbacks;

  if (onReceived) socket.on('po:received', onReceived);

  return () => {
    if (!socket) return;
    if (onReceived) socket.off('po:received', onReceived);
  };
};

export const subscribeToShipments = (callbacks: {
  onUpdated?: (shipment: Shipment) => void;
}): (() => void) => {
  if (!socket) return () => {};

  const { onUpdated } = callbacks;

  if (onUpdated) socket.on('shipment:updated', onUpdated);

  return () => {
    if (!socket) return;
    if (onUpdated) socket.off('shipment:updated', onUpdated);
  };
};

/**
 * Safely removes the socket connection implicitly freeing underlying Node connections elegantly.
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
