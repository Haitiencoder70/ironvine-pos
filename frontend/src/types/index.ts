export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscriptionStatus: string | null;
  logoUrl?: string;
  taxRate?: number;
  orderNumberPrefix?: string;
  currency?: string;
  timezone?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  organizationId: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  isActive: boolean;
}

export type OrderStatus =
  | 'QUOTE'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'MATERIALS_ORDERED'
  | 'MATERIALS_RECEIVED'
  | 'IN_PRODUCTION'
  | 'QUALITY_CHECK'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type PrintMethod = 'DTF' | 'HTV' | 'SCREEN_PRINT' | 'EMBROIDERY' | 'SUBLIMATION' | 'DTG';
export type PrintLocation = 'FRONT' | 'BACK' | 'LEFT_SLEEVE' | 'RIGHT_SLEEVE' | 'FULL_PRINT';
export type OrderPriority = 'NORMAL' | 'HIGH' | 'RUSH';

export type InventoryCategory =
  | 'BLANK_SHIRTS'
  | 'DTF_TRANSFERS'
  | 'VINYL'
  | 'INK'
  | 'PACKAGING'
  | 'EMBROIDERY_THREAD'
  | 'OTHER';

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export type ShipmentStatus =
  | 'PENDING'
  | 'LABEL_CREATED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'EXCEPTION';

export type ShipmentCarrier = 'UPS' | 'FEDEX' | 'USPS' | 'DHL' | 'OTHER';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  billingCountry?: string;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productType: string;
  size?: string;
  color?: string;
  sleeveType?: string;
  quantity: number;
  unitPrice: number;
  printMethod?: PrintMethod;
  printLocations: PrintLocation[];
  description?: string;
  requiredMaterials: RequiredMaterial[];
}

export interface RequiredMaterial {
  id: string;
  inventoryItemId?: string;
  description: string;
  quantityRequired: number;
  quantityUnit: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  priority: OrderPriority;
  customerId: string;
  customer?: Customer;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  dueDate?: string;
  notes?: string;
  internalNotes?: string;
  designNotes?: string;
  designFiles: string[];
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  brand?: string;
  size?: string;
  color?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number; // Computed frontend or returned
  reorderPoint: number;
  reorderQuantity: number;
  costPrice: number;
  isActive: boolean;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor?: Vendor;
  linkedOrderId?: string;
  status: PurchaseOrderStatus;
  expectedDate?: string;
  notes?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  items: POItem[];
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  id: string;
  inventoryItemId?: string;
  description: string;
  quantity: number;
  quantityRecv: number;
  unitCost: number;
  totalCost: number;
}

export interface Vendor {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  categories: string[];
  paymentTerms?: string;
  leadTimeDays?: number;
  isActive: boolean;
}

export interface Shipment {
  id: string;
  orderId: string;
  order?: Order;
  carrier: ShipmentCarrier;
  trackingNumber?: string;
  status: ShipmentStatus;
  shippingStreet?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZip?: string;
  shippingCountry?: string;
  shippingCost?: number;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WorkflowStep {
  status: OrderStatus;
  label: string;
  completed: boolean;
  current: boolean;
}

export interface OrderWorkflow {
  steps: WorkflowStep[];
  currentIndex: number;
  canAdvance: boolean;
  nextStatus: OrderStatus | null;
}

export interface MaterialUsage {
  id: string;
  orderId: string;
  inventoryItemId: string;
  inventoryItem?: InventoryItem;
  quantityUsed: number;
  usedAt: string;
  performedBy: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RESERVED' | 'UNRESERVED';
  quantity: number;
  reason: string;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export interface DashboardStats {
  ordersToday: number;
  inProduction: number;
  readyToShip: number;
  revenueToday: number;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscriptionStatus: string | null;
  taxRate: number;
  orderNumberPrefix: string;
  currency: string;
  timezone: string;
  // extended business info stored separately or via metadata
  phone?: string;
  email?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
}

export interface OrgUser {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  isActive: boolean;
  createdAt: string;
}

export interface NotificationSettings {
  newOrderEmail: boolean;
  orderStatusEmail: boolean;
  lowStockEmail: boolean;
  poReceivedEmail: boolean;
  shipmentDeliveredEmail: boolean;
  recipients: string[];
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'custom';

export type ReportGroupBy = 'day' | 'week' | 'month';

export interface RevenuePoint {
  label: string;
  revenue: number;
}

export interface OrderStatusCount {
  status: string;
  count: number;
  revenue: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  orderCount: number;
  totalSpent: number;
}

export interface TopProduct {
  productType: string;
  quantitySold: number;
  revenue: number;
}

export interface SalesReportSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  revenueChange: number | null;
  ordersChange: number | null;
}

export interface SalesReportRow {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
}

export interface SalesReport {
  summary: SalesReportSummary;
  revenueOverTime: RevenuePoint[];
  ordersByStatus: OrderStatusCount[];
  topCustomers: TopCustomer[];
  topProducts: TopProduct[];
  rows: SalesReportRow[];
}

export interface InventoryReportItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantityOnHand: number;
  reorderPoint: number;
  costPrice: number;
}

export interface ReorderRecommendation extends InventoryReportItem {
  reorderQuantity: number;
  estimatedCost: number;
}

export interface MostUsedItem {
  id: string;
  name: string;
  sku: string;
  totalUsed: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  value: number;
}

export interface InventoryReportRow {
  sku: string;
  name: string;
  category: string;
  quantityOnHand: number;
  quantityReserved: number;
  reorderPoint: number;
  costPrice: number;
  totalValue: number;
  status: 'OK' | 'LOW' | 'OUT';
}

export interface InventoryReport {
  summary: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInventoryValue: number;
  };
  lowStock: InventoryReportItem[];
  reorderRecommendations: ReorderRecommendation[];
  mostUsed: MostUsedItem[];
  byCategory: CategoryBreakdown[];
  rows: InventoryReportRow[];
}

export interface ProductionReport {
  avgProductionDays: number;
  completedCount: number;
  ordersByPrintMethod: { method: string; count: number }[];
  ordersByPriority: { priority: string; count: number }[];
}
