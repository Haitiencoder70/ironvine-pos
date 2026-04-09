import { api } from '../lib/api';
import {
  Order,
  InventoryItem,
  Customer,
  PurchaseOrder,
  Vendor,
  Shipment,
  ApiResponse,
  PaginatedResult,
  OrderWorkflow,
  StockMovement,
  DashboardStats,
  SalesReport,
  InventoryReport,
  ProductionReport,
  ReportPreset,
  ReportGroupBy,
  OrgSettings,
  OrgUser,
  NotificationSettings,
} from '../types';

// ─── Orders ───────────────────────────────────────────────────────────────────

export const orderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Order>>>('/orders', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Order>>('/orders', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}`, data).then((r) => r.data),
  updateStatus: (id: string, data: { newStatus: string; notes?: string }) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}/status`, data).then((r) => r.data),
  useMaterials: (id: string, materials: { inventoryItemId: string; quantityUsed: number }[]) =>
    api.post<ApiResponse<null>>(`/orders/${id}/use-materials`, { materials }).then((r) => r.data),
  getWorkflow: (id: string) =>
    api.get<ApiResponse<OrderWorkflow>>(`/orders/${id}/workflow`).then((r) => r.data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const inventoryApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<InventoryItem>>>('/inventory', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<InventoryItem>>('/inventory', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/inventory/${id}`).then((r) => r.data),
  adjustStock: (id: string, data: unknown) =>
    api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/adjust`, data).then((r) => r.data),
  getLowStock: () =>
    api.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock').then((r) => r.data),
  getStockMovements: (id: string) =>
    api.get<ApiResponse<StockMovement[]>>(`/inventory/${id}/movements`).then((r) => r.data),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customerApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Customer>>>('/customers', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Customer>>('/customers', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/customers/${id}`).then((r) => r.data),
  getOrderHistory: (id: string) =>
    api.get<ApiResponse<Order[]>>(`/customers/${id}/orders`).then((r) => r.data),
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const purchaseOrderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<PurchaseOrder>>>('/purchase-orders', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`).then((r) => r.data),
  getByOrder: (orderId: string) =>
    api.get<ApiResponse<PurchaseOrder[]>>(`/purchase-orders/by-order/${orderId}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data).then((r) => r.data),
  receive: (id: string, data: unknown) =>
    api.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/receive`, data).then((r) => r.data),
  updateStatus: (id: string, data: { newStatus: string; notes?: string }) =>
    api.patch<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/status`, data).then((r) => r.data),
  send: (id: string) =>
    api.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/send`).then((r) => r.data),
};

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendorApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Vendor>>>('/vendors', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Vendor>>(`/vendors/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Vendor>>('/vendors', data).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch<ApiResponse<Vendor>>(`/vendors/${id}`, data).then((r) => r.data),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/vendors/${id}`).then((r) => r.data),
};

// ─── Shipments ────────────────────────────────────────────────────────────────

export const shipmentApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Shipment>>>('/shipments', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Shipment>>(`/shipments/${id}`).then((r) => r.data),
  create: (data: unknown) =>
    api.post<ApiResponse<Shipment>>('/shipments', data).then((r) => r.data),
  updateStatus: (id: string, data: unknown) =>
    api.patch<ApiResponse<Shipment>>(`/shipments/${id}/status`, data).then((r) => r.data),
  updateTracking: (id: string, data: unknown) =>
    api.patch<ApiResponse<Shipment>>(`/shipments/${id}/tracking`, data).then((r) => r.data),
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settingsApi = {
  getOrg: () =>
    api.get<ApiResponse<OrgSettings>>('/settings/org').then((r) => r.data),
  updateOrg: (data: Partial<OrgSettings>) =>
    api.patch<ApiResponse<OrgSettings>>('/settings/org', data).then((r) => r.data),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post<ApiResponse<{ logoUrl: string }>>('/settings/org/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getUsers: () =>
    api.get<ApiResponse<OrgUser[]>>('/settings/users').then((r) => r.data),
  inviteUser: (data: { email: string; firstName: string; lastName: string; role: string }) =>
    api.post<ApiResponse<OrgUser>>('/settings/users/invite', data).then((r) => r.data),
  updateUser: (id: string, data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string }) =>
    api.patch<ApiResponse<OrgUser>>(`/settings/users/${id}`, data).then((r) => r.data),
  removeUser: (id: string) =>
    api.delete<ApiResponse<null>>(`/settings/users/${id}`).then((r) => r.data),
  getNotifications: () =>
    api.get<ApiResponse<NotificationSettings>>('/settings/notifications').then((r) => r.data),
  updateNotifications: (data: Partial<NotificationSettings>) =>
    api.patch<ApiResponse<NotificationSettings>>('/settings/notifications', data).then((r) => r.data),
  updateProfile: (data: { firstName?: string; lastName?: string; avatarUrl?: string }) =>
    api.patch<ApiResponse<OrgUser>>('/settings/profile', data).then((r) => r.data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportApi = {
  getSales: (params: { preset?: ReportPreset; startDate?: string; endDate?: string; groupBy?: ReportGroupBy }) =>
    api.get<ApiResponse<SalesReport>>('/reports/sales', { params }).then((r) => r.data),
  getInventory: () =>
    api.get<ApiResponse<InventoryReport>>('/reports/inventory').then((r) => r.data),
  getProduction: (params: { preset?: ReportPreset; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<ProductionReport>>('/reports/production', { params }).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/stats').then((r) => r.data),
  getRecentOrders: () =>
    api.get<ApiResponse<Order[]>>('/dashboard/recent-orders').then((r) => r.data),
  getLowStockAlerts: () =>
    api.get<ApiResponse<InventoryItem[]>>('/dashboard/low-stock').then((r) => r.data),
  getPendingPOs: () =>
    api.get<ApiResponse<PurchaseOrder[]>>('/dashboard/pending-pos').then((r) => r.data),
  getOrdersByStatus: () =>
    api.get<ApiResponse<{ status: string; count: number }[]>>('/dashboard/orders-by-status').then((r) => r.data),
};
