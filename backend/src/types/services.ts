import {
  OrderStatus,
  OrderPriority,
  PrintMethod,
  PrintLocation,
  StockMovementType,
  InventoryCategory,
} from '@prisma/client';

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Order Service Types ──────────────────────────────────────────────────────

export interface RequiredMaterialInput {
  inventoryItemId?: string;
  description: string;
  quantityRequired: number;
  quantityUnit?: string;
}

export interface CreateOrderItemInput {
  productType: string;
  size?: string;
  color?: string;
  sleeveType?: string;
  quantity: number;
  unitPrice: number;
  printMethod?: PrintMethod;
  printLocations?: PrintLocation[];
  description?: string;
  requiredMaterials?: RequiredMaterialInput[];
}

export interface CreateOrderInput {
  organizationId: string;
  customerId: string;
  orderNumberPrefix?: string;
  priority?: OrderPriority;
  dueDate?: Date;
  notes?: string;
  internalNotes?: string;
  designNotes?: string;
  designFiles?: string[];
  items: CreateOrderItemInput[];
  performedBy: string;
}

export interface UpdateOrderStatusInput {
  organizationId: string;
  orderId: string;
  newStatus: OrderStatus;
  notes?: string;
  performedBy: string;
}

export interface GetOrdersInput extends PaginationInput {
  organizationId: string;
  status?: OrderStatus | OrderStatus[];
  customerId?: string;
  priority?: OrderPriority;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface UseMaterialsInput {
  organizationId: string;
  orderId: string;
  materials: {
    inventoryItemId: string;
    quantityUsed: number;
    quantityUnit?: string;
    notes?: string;
  }[];
  performedBy: string;
}

// ─── Inventory Service Types ──────────────────────────────────────────────────

export interface ReserveMaterialsInput {
  organizationId: string;
  inventoryItemId: string;
  quantity: number;
  orderId?: string;
  performedBy: string;
}

export interface AdjustStockInput {
  organizationId: string;
  inventoryItemId: string;
  quantityDelta: number;
  type: StockMovementType;
  reason?: string;
  orderId?: string;
  performedBy: string;
}

export interface GetLowStockInput {
  organizationId: string;
  category?: InventoryCategory;
}

// ─── Purchase Order Service Types ────────────────────────────────────────────

export interface CreatePOItemInput {
  inventoryItemId?: string;
  description: string;
  quantity: number;
  unitCost: number;
}

export interface CreatePOInput {
  organizationId: string;
  vendorId: string;
  linkedOrderId?: string;
  notes?: string;
  expectedDate?: Date;
  items: CreatePOItemInput[];
  performedBy: string;
}

export interface ReceivePOItemInput {
  purchaseOrderItemId: string;
  inventoryItemId?: string;
  quantityReceived: number;
  notes?: string;
  isAccepted?: boolean;
}

export interface ReceivePOInput {
  organizationId: string;
  purchaseOrderId: string;
  receivedBy: string;
  notes?: string;
  items: ReceivePOItemInput[];
}
