import { api } from '../lib/api';

/** Strip empty strings, null, and undefined so they don't reach backend Zod validators. */
function cleanParams(params?: unknown): unknown {
  if (!params || typeof params !== 'object') return params;
  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>).filter(
      ([, v]) => v !== '' && v !== undefined && v !== null,
    ),
  );
}
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
  DashboardWorkQueues,
  ProfitStats,
  TopProductProfit,
  SalesReport,
  InventoryReport,
  ProductionReport,
  ReportPreset,
  ReportGroupBy,
  OrgSettings,
  OrgUser,
  NotificationSettings,
  POSProduct,
  Sale,
  PaymentMethod,
  CartItem,
  GlobalSearchResult,
  Image,
} from '../types';

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * Centralized API endpoints for Orders management.
 * Contains methods for querying, creating, updating, and transitioning orders.
 */
export const orderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Order>>>('/orders', { params: cleanParams(params) }).then((r) => r.data),
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
  requestApproval: (id: string) =>
    api.patch<ApiResponse<{ requested: boolean }>>(`/orders/${id}/request-approval`).then((r) => r.data),
  approveDesign: (id: string) =>
    api.patch<ApiResponse<{ id: string; designApproved: boolean; designApprovedAt: string; designApprovedBy: string }>>(`/orders/${id}/approve-design`).then((r) => r.data),
};

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * Inventory management service functions.
 * Handles stock, items, movements, and low stock analytics.
 */
export const inventoryApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<InventoryItem>>>('/inventory', { params: cleanParams(params) }).then((r) => r.data),
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
    api.get<ApiResponse<PaginatedResult<StockMovement>>>(`/inventory/${id}/movements`).then((r) => r.data),
};

// ─── Customers ────────────────────────────────────────────────────────────────

/**
 * Customer CRM interactions.
 * Queries, updates, and order history mappings for clients.
 */
export const customerApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Customer>>>('/customers', { params: cleanParams(params) }).then((r) => r.data),
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

/**
 * Purchase Order operations with Vendors.
 * Responsible for creating POs, receiving them, and updating PO status.
 */
export const purchaseOrderApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<PurchaseOrder>>>('/purchase-orders', { params: cleanParams(params) }).then((r) => r.data),
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

/**
 * Vendor directory management.
 * Controls supplier contact sheets and categorizations.
 */
export const vendorApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Vendor>>>('/vendors', { params: cleanParams(params) }).then((r) => r.data),
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

/**
 * Shipment resolution and Carrier tracking endpoints.
 * Handles tracking numbers, delivery states, and shipping integrations.
 */
export const shipmentApi = {
  getAll: (params?: unknown) =>
    api.get<ApiResponse<PaginatedResult<Shipment>>>('/shipments', { params: cleanParams(params) }).then((r) => r.data),
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

/**
 * Core Organization and User settings constraints.
 * Allows adjustments to Tax strings, user invitations, and profiles.
 */
export const settingsApi = {
  getOrg: () =>
    api.get<ApiResponse<OrgSettings>>('/settings/org').then((r) => r.data),
  updateOrg: (data: Partial<OrgSettings>) =>
    api.patch<ApiResponse<OrgSettings>>('/settings/org', data).then((r) => r.data),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<{ logoUrl: string }>>('/branding/upload-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  getUsers: () =>
    api.get<ApiResponse<OrgUser[]>>('/settings/users').then((r) => r.data),
  inviteUser: (data: { email: string; firstName: string; lastName: string; role: string }) =>
    api.post<ApiResponse<OrgUser>>('/settings/users/invite', data).then((r) => r.data),
  updateUser: (id: string, data: { role?: string; isActive?: boolean; firstName?: string; lastName?: string }) =>
    api.patch<ApiResponse<OrgUser>>(`/settings/users/${id}`, data).then((r) => r.data),
  removeUser: (id: string) => api.delete<ApiResponse<null>>(`/settings/users/${id}`).then((r) => r.data),
  // Notifications
  getNotifications: () => api.get<ApiResponse<NotificationSettings>>('/settings/notifications').then((r) => r.data),
  updateNotifications: (data: Partial<NotificationSettings>) => api.patch<ApiResponse<NotificationSettings>>('/settings/notifications', data).then((r) => r.data),
  // Profile
  updateProfile: (data: { firstName?: string; lastName?: string; avatarUrl?: string }) => api.patch<ApiResponse<OrgUser>>('/settings/profile', data).then((r) => r.data),
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchApi = {
  globalSearch: (q: string) => api.get<ApiResponse<GlobalSearchResult>>(`/search?q=${encodeURIComponent(q)}`).then((r) => r.data),
};

// ─── Reports ──────────────────────────────────────────────────────────────────

/**
 * Aggregated analytics reporting generators.
 * Calculates sales thresholds, inventory valuations, and production cycles.
 */
export const reportApi = {
  getSales: (params: { preset?: ReportPreset; startDate?: string; endDate?: string; groupBy?: ReportGroupBy }) =>
    api.get<ApiResponse<SalesReport>>('/reports/sales', { params }).then((r) => r.data),
  getInventory: () =>
    api.get<ApiResponse<InventoryReport>>('/reports/inventory').then((r) => r.data),
  getProduction: (params: { preset?: ReportPreset; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<ProductionReport>>('/reports/production', { params }).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * High-velocity overview endpoints mapped to the main root dashboard.
 */
// ─── POS Terminal ─────────────────────────────────────────────────────────────

export interface CompleteSalePayload {
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discount: { type: 'FLAT' | 'PERCENT'; value: number };
  shippingAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeDue?: number;
  cardAmount?: number;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const productApi = {
  getAll: (params?: { search?: string; categoryId?: string; isActive?: boolean; isFeatured?: boolean }) =>
    api.get<ApiResponse<BackendProduct[]>>('/products', { params: cleanParams(params) }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<BackendProduct>>(`/products/${id}`).then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<BackendProduct>>('/products', body).then((r) => r.data),
  update: (id: string, body: unknown) =>
    api.patch<ApiResponse<BackendProduct>>(`/products/${id}`, body).then((r) => r.data),
  remove: (id: string) =>
    api.delete<ApiResponse<void>>(`/products/${id}`).then((r) => r.data),
  duplicate: (id: string) =>
    api.post<ApiResponse<BackendProduct>>(`/products/${id}/duplicate`).then((r) => r.data),
  getCategories: () =>
    api.get<ApiResponse<BackendProductCategory[]>>('/product-categories').then((r) => r.data),
  createCategory: (body: { name: string; description?: string; icon?: string; displayOrder?: number }) =>
    api.post<ApiResponse<BackendProductCategory>>('/product-categories', body).then((r) => r.data),
  seedDefaults: () =>
    api.post<ApiResponse<void>>('/products/seed-defaults').then((r) => r.data),
};

export interface BackendProductCategory {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

export interface BackendProduct {
  id: string;
  organizationId: string;
  categoryId: string;
  category?: BackendProductCategory;
  name: string;
  description?: string;
  sku?: string;
  garmentType: string;
  printMethod: string;
  includedPrintLocations: string[];
  maxPrintLocations: number;
  basePrice: number | string;
  sizeUpcharges?: Record<string, number>;
  priceTiers?: Array<{ minQty: number; price: number }>;
  availableBrands: string[];
  availableSizes: string[];
  availableColors: string[];
  estimatedProductionMinutes?: number;
  difficultyLevel?: string;
  isActive: boolean;
  isFeatured: boolean;
  addOns?: Array<{ id: string; name: string; price: number | string; type: string; isActive: boolean }>;
  materialTemplates?: Array<{ id: string; materialCategory?: string; description: string; quantityPerUnit: number | string; estimatedCostPerUnit: number | string; inventoryItemId?: string | null }>;
  primaryImage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const posApi = {
  getProducts: (params?: { search?: string; category?: string }) =>
    api.get<ApiResponse<POSProduct[]>>('/pos/products', { params }).then((r) => r.data),
  completeSale: (body: CompleteSalePayload) =>
    api.post<ApiResponse<Sale>>('/pos/sale', body).then((r) => r.data),
  getSaleHistory: (params?: { limit?: number; offset?: number }) =>
    api.get<ApiResponse<PaginatedResult<Sale>>>('/pos/sales', { params }).then((r) => r.data),
};

// ─── Images ───────────────────────────────────────────────────────────────────

export const imagesApi = {
  getForEntity: (entityType: string, entityId: string) =>
    api.get<ApiResponse<Image[]>>(`/images/${entityType}/${entityId}`).then((r) => r.data),
  delete: (imageId: string) =>
    api.delete<ApiResponse<void>>(`/images/${imageId}`).then((r) => r.data),
  setPrimary: (imageId: string) =>
    api.patch<ApiResponse<Image>>(`/images/${imageId}/primary`).then((r) => r.data),
  reorder: (imageIds: string[]) =>
    api.patch<ApiResponse<void>>('/images/reorder', { imageIds }).then((r) => r.data),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () =>
    api.get<ApiResponse<DashboardStats>>('/dashboard/stats').then((r) => r.data),
  getRecentOrders: () =>
    api.get<ApiResponse<Order[]>>('/dashboard/recent-orders').then((r) => r.data),
  getWorkQueues: () =>
    api.get<ApiResponse<DashboardWorkQueues>>('/dashboard/work-queues').then((r) => r.data),
  getLowStockAlerts: () =>
    api.get<ApiResponse<InventoryItem[]>>('/dashboard/low-stock').then((r) => r.data),
  getPendingPOs: () =>
    api.get<ApiResponse<PurchaseOrder[]>>('/dashboard/pending-pos').then((r) => r.data),
  getOrdersByStatus: () =>
    api.get<ApiResponse<{ status: string; count: number }[]>>('/dashboard/orders-by-status').then((r) => r.data),
  getProfitStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<ProfitStats>>('/dashboard/profit-stats', { params }).then((r) => r.data),
  getProfitTrend: (params?: { months?: number }) =>
    api.get<ApiResponse<{ month: string; revenue: number; costs: number; profit: number }[]>>('/dashboard/profit-trend', { params }).then((r) => r.data),
  getTopProducts: (params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<TopProductProfit[]>>('/dashboard/top-products', { params }).then((r) => r.data),
};
