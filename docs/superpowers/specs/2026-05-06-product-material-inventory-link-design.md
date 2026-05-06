# Product Material → Inventory Link Design

**Date:** 2026-05-06
**Status:** Approved

---

## Problem

Product Material Costs rows are free-text. They drive profit estimates but have no link to real inventory items, so the order → PO → receive → usage chain cannot reuse the same inventory record. Required materials created from product templates carry no `inventoryItemId`, making traceability impossible.

---

## Goal

1. Each product material template row can optionally link to an existing inventory item.
2. Linked rows auto-fill category, name, and estimated cost from the inventory item.
3. Linked inventory IDs flow: **Product template → Order required materials → PO line items → inventory receive/usage**.
4. Free-text (custom) rows still work. No existing products break.
5. Tenant isolation is enforced at every write boundary.

---

## Scope

- Product material template editor (link + auto-fill + status badge)
- Product create/update backend (store `inventoryItemId`, validate tenant)
- Order creation frontend (template-authoritative `buildMaterials`)
- Order creation backend (tenant guard in `orderService.ts`; validator already accepts `inventoryItemId`)

Out of scope: PO auto-generation, inventory receive flow, dashboard costs (addressed separately).

---

## Data Layer

### Prisma Migration

Add one nullable column to `ProductMaterialTemplate`:

```prisma
model ProductMaterialTemplate {
  // ... existing fields ...
  inventoryItemId  String?        // NEW
  inventoryItem    InventoryItem? @relation(fields: [inventoryItemId], references: [id], onDelete: SetNull)
}
```

`onDelete: SetNull` — if the inventory item is deleted, the template row stays but loses its link. No cascade.

`InventoryItem` gets the reverse relation:

```prisma
model InventoryItem {
  // ... existing fields ...
  productMaterialTemplates ProductMaterialTemplate[]  // NEW
}
```

### Backend Validator — `product.ts`

The existing material template schema accepts only `description`, `quantityPerUnit`, and `estimatedCostPerUnit`. `materialCategory` and `notes` are already sent by the frontend but currently stripped by Zod. Replace the schema with:

```typescript
z.object({
  materialCategory: z.string().min(1).max(50),
  description:      z.string().min(1).max(500),
  quantityPerUnit:  z.number().positive(),
  estimatedCostPerUnit: z.number().nonnegative(),
  notes:            z.string().max(500).optional(),
  inventoryItemId:  z.string().cuid().optional().nullable(),
})
```

This fixes the silent category-stripping bug and adds the new `inventoryItemId` field in one change.

### Backend Service — `productService.ts`

**CreateProductInput / UpdateProductInput** — add `inventoryItemId?: string | null` to the material template item type.

**Tenant guard** — before saving (both create and update), if any template has a non-null `inventoryItemId`, verify all those IDs belong to the same `organizationId`:

```typescript
const ids = templates.filter(t => t.inventoryItemId).map(t => t.inventoryItemId!);
if (ids.length) {
  const count = await tx.inventoryItem.count({
    where: { id: { in: ids }, organizationId },
  });
  if (count !== ids.length) throw new AppError(400, 'One or more inventory items not found', 'INVALID_INVENTORY_ITEM');
}
```

This runs inside the existing transaction (create) or before the delete-and-recreate block (update). Any inventory ID from another tenant fails the entire save.

**Storage** — `inventoryItemId`, `materialCategory`, and `notes` flow through the existing `...t` spread in both `createProduct` and `updateProduct` once they are in the input type. No further changes to the storage logic needed.

**Order validator** (`order.ts`) — already accepts `inventoryItemId: z.string().min(1).optional()` in `requiredMaterialSchema`. No change needed.

---

## Frontend Types — `types/index.ts`

Add `inventoryItemId` to `ProductMaterialTemplate`:

```typescript
interface ProductMaterialTemplate {
  id: string;
  materialCategory: string;
  description: string;
  quantityPerUnit: number | string;
  estimatedCostPerUnit: number | string;
  inventoryItemId?: string | null;  // NEW
}
```

Add `inventoryItemId` to the `requiredMaterials` item shape inside `ConfiguredOrderItem`:

```typescript
requiredMaterials: {
  category: string;
  description: string;
  quantity: number;      // existing field name — keep as-is
  unitPrice: number;
  inventoryItemId?: string;  // NEW
}[];
```

---

## Product Editor UI — `AddEditProduct.tsx`

### Form state

Each row in `materialCosts[]` gains `inventoryItemId: string | null`.

Load (product → form):
```typescript
materialCosts: (product.materialTemplates ?? []).map(m => ({
  id: m.id,
  category: m.materialCategory ?? '',
  material: m.description,
  qtyPerUnit: Number(m.quantityPerUnit),
  estimatedCost: Number(m.estimatedCostPerUnit),
  inventoryItemId: m.inventoryItemId ?? null,  // NEW
}))
```

Save (form → API payload):
```typescript
materialTemplates: data.materialCosts.map(m => ({
  materialCategory: m.category,
  description: m.material,
  quantityPerUnit: m.qtyPerUnit,
  estimatedCostPerUnit: m.estimatedCost,
  inventoryItemId: m.inventoryItemId ?? null,  // NEW
}))
```

### Inventory data

Load inventory items once when the product editor mounts via the existing `useInventory` hook (`{ limit: 200 }`). Used only to populate the combobox dropdown — no new API endpoint needed.

### Material column — combobox

Replace the `<input type="text">` in the Material column with a combobox. Behaviour:

| User action | Effect |
|---|---|
| Opens / focuses | Shows dropdown filtered to org inventory items |
| Types text | Filters dropdown by name and SKU (case-insensitive) |
| Selects inventory item | Sets `inventoryItemId`, overwrites `category` (mapped), `material` (item name), `estimatedCost` (item `costPrice`) |
| Clears field | Sets `inventoryItemId = null`, leaves other fields editable as free-text |
| Types text not in list | `inventoryItemId` remains `null` — treated as custom |

Combobox is an uncontrolled `<input>` with a toggled `<ul>` dropdown. No external library required. The dropdown is absolutely positioned below the cell and closes on outside click or Escape.

**Inventory category → material category mapping:**

```typescript
const INVENTORY_TO_MATERIAL_CATEGORY: Record<string, string> = {
  BLANK_SHIRTS:        'BLANK_SHIRTS',
  DTF_TRANSFERS:       'DTF_TRANSFERS',
  VINYL:               'VINYL',
  INK:                 'INK',
  PACKAGING:           'PACKAGING',
  EMBROIDERY_THREAD:   'EMBROIDERY_THREAD',
  OTHER:               'OTHER',
};
```

### Status badge

Rendered inline in the Material column, below or beside the combobox input. Compact, no height change to the row.

- **Linked** (inventoryItemId set): `text-xs text-green-700 bg-green-50 rounded px-1` — shows `"SKU: {sku}"` truncated to 12 chars if long
- **Custom** (inventoryItemId null): `text-xs text-gray-400` — shows `"Custom"`

Badge is read-only display only. No interaction.

---

## Order Creation — `ProductOrderConfigurator.tsx`

### `buildMaterials()` — updated logic

```
if product.materialTemplates?.length > 0:
  return templates.map(t => ({
    category:        t.materialCategory ?? '',
    description:     t.description,
    quantity:        Math.ceil(Number(t.quantityPerUnit) * totalQty),
    unitPrice:       Number(t.estimatedCostPerUnit),
    inventoryItemId: t.inventoryItemId ?? undefined,
  }))
else:
  // existing hardcoded blank-garment + DTF/HTV logic — UNCHANGED
```

`Math.ceil` handles fractional per-unit quantities (e.g., 0.5 DTF sheets per unit × 10 units = 5).

`quantity` is the existing field name in `ConfiguredOrderItem['requiredMaterials']` — kept as-is.

Custom (free-text) template rows have `inventoryItemId = null`, which becomes `undefined` here — omitted from the payload, matching what the backend expects for unlinked materials.

### `handleAdd()` — no change needed

`buildMaterials()` return value is already spread into `requiredMaterials`. The updated return shape (with optional `inventoryItemId`) flows through automatically.

---

## Order Submission — `NewOrder.tsx`

Add `inventoryItemId` to the required materials mapping:

```typescript
requiredMaterials: item.requiredMaterials?.length
  ? item.requiredMaterials.map((m) => ({
      description:      m.description,
      quantityRequired: m.quantity,
      quantityUnit:     'units',
      materialCategory: m.category,
      unitCost:         m.unitPrice,
      inventoryItemId:  m.inventoryItemId,   // NEW — undefined when not linked
    }))
  : undefined,
```

The backend `requiredMaterialSchema` already accepts `inventoryItemId: z.string().min(1).optional()`. No validator change needed.

---

## Tenant Safety Guards

| Boundary | Guard |
|---|---|
| Product create/update | Validate all non-null template `inventoryItemId` values belong to `organizationId` before saving. Fail entire save on mismatch. Runs inside the existing transaction. |
| Order create | `orderService.ts` collects all non-null `inventoryItemId` values across all order item required materials and validates them against `organizationId` before creating the order. A crafted or stale frontend payload cannot store another tenant's inventory ID. |

Both guards use the same pattern:

```typescript
const ids = items.flatMap(i =>
  (i.requiredMaterials ?? [])
    .filter(m => m.inventoryItemId)
    .map(m => m.inventoryItemId!)
);
if (ids.length) {
  const count = await tx.inventoryItem.count({
    where: { id: { in: ids }, organizationId },
  });
  if (count !== ids.length)
    throw new AppError(400, 'One or more inventory items not found', 'INVALID_INVENTORY_ITEM');
}
```

The order guard runs inside the `prisma.$transaction` in `createOrder`, before any rows are written. Any ID belonging to another tenant fails the entire order creation.

---

## Field Name Contract

Frontend `ConfiguredOrderItem.requiredMaterials` items use:

```
quantity      (not quantityRequired, not requiredQuantity)
unitPrice     (not estimatedCostPerUnit, not cost)
category      (not materialCategory)
description
inventoryItemId   (optional, new)
```

`NewOrder.tsx` maps these to the backend shape (`quantityRequired`, `materialCategory`, `unitCost`) before submission. This mapping is unchanged; `inventoryItemId` is added alongside it.

---

## Backwards Compatibility

| Scenario | Behaviour |
|---|---|
| Existing product with free-text templates | `inventoryItemId` is null — loads as "Custom" badge, saves without inventory link, order falls through to template path (template materials without inventoryItemId) |
| Existing product with no templates | `buildMaterials` falls through to hardcoded blank/DTF/HTV logic — unchanged |
| Seeded products with templates | Templates have no `inventoryItemId` → orders use template materials as free-text required materials (slightly different descriptions than hardcoded, but correct semantically) |
| Inventory item deleted after linking | `onDelete: SetNull` nulls the template's `inventoryItemId` — row becomes custom |

---

## Files Changed

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `inventoryItemId?` + relation to `ProductMaterialTemplate`; add reverse relation on `InventoryItem` |
| `backend/prisma/migrations/<timestamp>_product_material_inventory_link/` | Generated migration |
| `backend/src/validators/product.ts` | Full material template schema: add `materialCategory`, `notes`, `inventoryItemId` (fixes silent category-stripping) |
| `backend/src/services/productService.ts` | Add `inventoryItemId?` to input types; add tenant guard in create + update |
| `backend/src/services/orderService.ts` | Add tenant guard validating all required material `inventoryItemId` values before order creation |
| `frontend/src/types/index.ts` | Add `inventoryItemId?` to `ProductMaterialTemplate`; add `inventoryItemId?` to `ConfiguredOrderItem.requiredMaterials` item |
| `frontend/src/pages/products/AddEditProduct.tsx` | Combobox replacing text input; status badge; `inventoryItemId` in form state + load + save |
| `frontend/src/components/orders/ProductOrderConfigurator.tsx` | Updated `buildMaterials()` |
| `frontend/src/pages/orders/NewOrder.tsx` | Pass `inventoryItemId` in required materials payload |

**Total: 9 files** (migration counts as auto-generated).

---

## Verification

```bash
npm.cmd run typecheck --prefix backend
npm.cmd run lint --prefix backend
npm.cmd run typecheck --prefix frontend
npm.cmd run lint --prefix frontend
```
