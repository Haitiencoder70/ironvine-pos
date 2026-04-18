import { testPrisma } from './db';

/** Truncate all tenant-data tables in FK-safe order (children first). */
export async function truncateAll(): Promise<void> {
  await testPrisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "stock_movements",
      "material_usage",
      "required_materials",
      "po_receiving_items",
      "po_receivings",
      "purchase_order_items",
      "purchase_orders",
      "shipment_status_history",
      "shipments",
      "order_status_history",
      "order_items",
      "orders",
      "garment_images",
      "images",
      "inventory_items",
      "product_add_ons",
      "product_material_templates",
      "product_categories",
      "products",
      "customers",
      "vendors",
      "billing_history",
      "usage_events",
      "usage_metrics",
      "activity_logs",
      "organization_invites",
      "notification_settings",
      "sequence_counters",
      "users",
      "organizations"
    RESTART IDENTITY CASCADE
  `);
}
