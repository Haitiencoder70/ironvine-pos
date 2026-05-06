# Product Material → Inventory Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link product material template rows to real inventory items so the `inventoryItemId` flows Product → Order required materials → PO/inventory workflow, with tenant-safe guards at every write boundary.

**Architecture:** Add `inventoryItemId?` to the `ProductMaterialTemplate` Prisma model (SetNull FK), wire it through the product validator/service (with tenant guard), add a tenant guard to `createOrder`, add a `MaterialCombobox` component with inline dropdown and status badge to the product editor, and update `buildMaterials()` to use templates as the authoritative materials source when present.

**Tech Stack:** Prisma (PostgreSQL), Zod, Express, React, react-hook-form, react-query, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-05-06-product-material-inventory-link-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/prisma/schema.prisma` | Modify | Add `inventoryItemId?` + FK to `ProductMaterialTemplate`; reverse relation on `InventoryItem` |
| `backend/prisma/migrations/<ts>_product_material_inventory_link/` | Generated | Migration SQL |
| `backend/src/validators/product.ts` | Modify | Full materialTemplate schema: add `materialCategory`, `notes`, `inventoryItemId` |
| `backend/src/services/productService.ts` | Modify | Add `inventoryItemId?` to input type; tenant guard in create + update |
| `backend/src/services/orderService.ts` | Modify | Tenant guard for all required material `inventoryItemId` values |
| `frontend/src/types/index.ts` | Modify | Add `inventoryItemId?` to `Product.materialTemplates` item type |
| `frontend/src/components/products/MaterialCombobox.tsx` | Create | Searchable combobox + status badge for inventory item selection |
| `frontend/src/pages/products/AddEditProduct.tsx` | Modify | Wire `MaterialCombobox`; add `inventoryItemId` to form state, load, save |
| `frontend/src/components/orders/ProductOrderConfigurator.tsx` | Modify | `buildMaterials()`: templates-authoritative when present, hardcoded fallback otherwise |
| `frontend/src/pages/orders/NewOrder.tsx` | Modify | Pass `inventoryItemId` in required materials payload |

---

## Task 1: Prisma Schema — Add `inventoryItemId` to `ProductMaterialTemplate`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Generated: `backend/prisma/migrations/`

- [ ] **Step 1.1: Open `backend/prisma/schema.prisma`. Find the `ProductMaterialTemplate` model (search for `@@map("product_material_templates")`). Add the new field and relation immediately before the existing `@@index` lines:**

```prisma
model ProductMaterialTemplate {
  id                   String       @id @default(cuid())
  organizationId       String
  productId            String
  materialCategory     String
  description          String
  quantityPerUnit      Decimal      @db.Decimal(10, 4)
  estimatedCostPerUnit Decimal      @db.Decimal(10, 2)
  notes                String?
  createdAt            DateTime     @default(now())
  updatedAt            DateTime     @updatedAt
  inventoryItemId      String?
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  product              Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  inventoryItem        InventoryItem? @relation(fields: [inventoryItemId], references: [id], onDelete: SetNull)

  @@index([organizationId])
  @@index([productId])
  @@index([inventoryItemId])
  @@map("product_material_templates")
}
```

- [ ] **Step 1.2: Find the `InventoryItem` model in the same file (search for `@@map("inventory_items")`). Add the reverse relation after the existing relation fields, before the `@@index` lines:**

```prisma
  productMaterialTemplates ProductMaterialTemplate[]
```

The `InventoryItem` model's relation block should now include this line alongside `materialUsages`, `receivingItems`, etc.

- [ ] **Step 1.3: Run the migration from the `backend` directory:**

```bash
cd "I:\POS Projects\touchscreenpos\backend"
npx.cmd prisma migrate dev --name product_material_inventory_link
npx.cmd prisma generate
```

Expected: Prisma creates a migration file under `backend/prisma/migrations/` and prints "Your database is now in sync with your schema." The generated migration SQL will be an `ALTER TABLE "product_material_templates" ADD COLUMN "inventoryItemId" TEXT` with a FK constraint.

- [ ] **Step 1.4: Commit:**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(schema): add inventoryItemId to ProductMaterialTemplate"
```

---

## Task 2: Fix Product Validator — Add `materialCategory`, `notes`, `inventoryItemId`

**Files:**
- Modify: `backend/src/validators/product.ts`

The current `materialTemplates` schema only accepts `description`, `quantityPerUnit`, and `estimatedCostPerUnit`. The frontend has always sent `materialCategory` but Zod strips unknown keys by default — so category has been silently dropped on every save.

- [ ] **Step 2.1: In `backend/src/validators/product.ts`, find the `materialTemplates` field inside `createProductSchema` (lines ~37–42). Replace the inline schema object with a named schema and update it:**

Replace:
```typescript
  materialTemplates: z.array(z.object({
    description: z.string(),
    quantityPerUnit: z.number().positive(),
    estimatedCostPerUnit: z.number().nonnegative(),
  })).optional(),
```

With (add the `materialTemplateSchema` const above `createProductSchema`, then reference it):
```typescript
const materialTemplateSchema = z.object({
  materialCategory:     z.string().min(1).max(50),
  description:          z.string().min(1).max(500),
  quantityPerUnit:      z.number().positive(),
  estimatedCostPerUnit: z.number().nonnegative(),
  notes:                z.string().max(500).optional(),
  inventoryItemId:      z.string().cuid().optional().nullable(),
});
```

Then inside `createProductSchema`:
```typescript
  materialTemplates: z.array(materialTemplateSchema).optional(),
```

- [ ] **Step 2.2: Run backend typecheck to verify no errors:**

```bash
npm.cmd run typecheck --prefix backend
```

Expected: exits 0, no errors.

- [ ] **Step 2.3: Commit:**

```bash
git add backend/src/validators/product.ts
git commit -m "fix(validator): materialTemplate schema — add materialCategory, notes, inventoryItemId"
```

---

## Task 3: Backend `productService.ts` — Input Type + Tenant Guard

**Files:**
- Modify: `backend/src/services/productService.ts`

- [ ] **Step 3.1: Open `backend/src/services/productService.ts`. Find the `CreateProductInput` type or interface (search for `CreateProductInput`). Locate the `materialTemplates` field inside it. Add `inventoryItemId` and `notes` to the material template item type:**

Find the materialTemplates item type (it may look like):
```typescript
materialTemplates?: Array<{
  materialCategory: string;
  description: string;
  quantityPerUnit: number;
  estimatedCostPerUnit: number;
  notes?: string;
}>;
```

Update it to:
```typescript
materialTemplates?: Array<{
  materialCategory: string;
  description: string;
  quantityPerUnit: number;
  estimatedCostPerUnit: number;
  notes?: string;
  inventoryItemId?: string | null;
}>;
```

- [ ] **Step 3.2: Add a helper function at the top of the service file (after imports, before the first export). This validates that all non-null `inventoryItemId` values in a template list belong to the given org:**

```typescript
async function validateTemplateInventoryItems(
  tx: Prisma.TransactionClient | typeof prisma,
  organizationId: string,
  templates: Array<{ inventoryItemId?: string | null }>,
): Promise<void> {
  const ids = templates
    .map(t => t.inventoryItemId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return;

  const count = await tx.inventoryItem.count({
    where: { id: { in: ids }, organizationId },
  });
  if (count !== ids.length) {
    throw new AppError(400, 'One or more inventory items not found', 'INVALID_INVENTORY_ITEM');
  }
}
```

`Prisma` and `AppError` are already imported in the file.

- [ ] **Step 3.3: In the `createProduct` function, call the guard before the `prisma.product.create` call:**

Find the section just before `return prisma.product.create({` and add:

```typescript
  if (materialTemplates?.length) {
    await validateTemplateInventoryItems(prisma, organizationId, materialTemplates);
  }
```

The full updated section looks like:

```typescript
  // ... category validation already here ...

  if (materialTemplates?.length) {
    await validateTemplateInventoryItems(prisma, organizationId, materialTemplates);
  }

  return prisma.product.create({
    data: {
      ...rest,
      organizationId,
      categoryId,
      basePrice: new Prisma.Decimal(basePrice),
      sizeUpcharges: sizeUpcharges ? toJson(sizeUpcharges) : Prisma.JsonNull,
      priceTiers: priceTiers ? toJson(priceTiers) : Prisma.JsonNull,
      materialTemplates: materialTemplates
        ? {
            create: materialTemplates.map((t) => ({
              ...t,
              materialCategory: t.materialCategory || 'GENERAL',
              organizationId,
              quantityPerUnit: new Prisma.Decimal(t.quantityPerUnit),
              estimatedCostPerUnit: new Prisma.Decimal(t.estimatedCostPerUnit),
            })),
          }
        : undefined,
    },
```

The `...t` spread now includes `inventoryItemId` automatically since it's in the input type.

- [ ] **Step 3.4: In the `updateProduct` function, call the same guard before the `deleteMany` + recreate block:**

Find the section:
```typescript
  if (materialTemplates) {
    await prisma.productMaterialTemplate.deleteMany({ where: { productId, organizationId } });
```

Add the guard immediately before it:
```typescript
  if (materialTemplates?.length) {
    await validateTemplateInventoryItems(prisma, organizationId, materialTemplates);
  }

  if (materialTemplates) {
    await prisma.productMaterialTemplate.deleteMany({ where: { productId, organizationId } });
    updateData.materialTemplates = {
      create: materialTemplates.map((t) => ({
        ...t,
        materialCategory: t.materialCategory || 'GENERAL',
        organizationId,
        quantityPerUnit: new Prisma.Decimal(t.quantityPerUnit),
        estimatedCostPerUnit: new Prisma.Decimal(t.estimatedCostPerUnit),
      })),
    };
  }
```

- [ ] **Step 3.5: Run typecheck:**

```bash
npm.cmd run typecheck --prefix backend
```

Expected: exits 0.

- [ ] **Step 3.6: Commit:**

```bash
git add backend/src/services/productService.ts
git commit -m "feat(product): inventoryItemId on templates + tenant guard"
```

---

## Task 4: Backend `orderService.ts` — Tenant Guard for Required Material IDs

**Files:**
- Modify: `backend/src/services/orderService.ts`

`POST /orders` is a write boundary. A crafted payload could embed another tenant's `inventoryItemId` in a required material. Add a guard inside the transaction before any rows are written.

- [ ] **Step 4.1: Open `backend/src/services/orderService.ts`. Find the `createOrder` function. Inside the `prisma.$transaction(async (tx) => {` block, add the guard as the very first thing before `tx.order.create`:**

The transaction currently starts with `const created = await tx.order.create({`. Add before it:

```typescript
    // Validate all required-material inventory links belong to this org
    const matInventoryIds = items
      .flatMap(i => i.requiredMaterials ?? [])
      .map(m => m.inventoryItemId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (matInventoryIds.length > 0) {
      const count = await tx.inventoryItem.count({
        where: { id: { in: matInventoryIds }, organizationId },
      });
      if (count !== matInventoryIds.length) {
        throw new AppError(400, 'One or more inventory items not found', 'INVALID_INVENTORY_ITEM');
      }
    }

    const created = await tx.order.create({
```

`AppError` is already imported in this file.

- [ ] **Step 4.2: Run typecheck:**

```bash
npm.cmd run typecheck --prefix backend
```

Expected: exits 0.

- [ ] **Step 4.3: Run lint:**

```bash
npm.cmd run lint --prefix backend
```

Expected: exits 0.

- [ ] **Step 4.4: Commit:**

```bash
git add backend/src/services/orderService.ts
git commit -m "feat(order): tenant guard for required material inventoryItemIds"
```

---

## Task 5: Frontend Types — Add `inventoryItemId` to Material Template and `ConfiguredOrderItem`

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/components/orders/ProductOrderConfigurator.tsx` (interface only)

- [ ] **Step 5.1: Open `frontend/src/types/index.ts`. Find the `Product` interface. Inside it, find the `materialTemplates` field (it's an array type with `materialCategory`, `description`, `quantityPerUnit`, `estimatedCostPerUnit`). Add `inventoryItemId`:**

Current shape (find it and update it to):
```typescript
  materialTemplates?: Array<{
    id: string;
    materialCategory: string;
    description: string;
    quantityPerUnit: number | string;
    estimatedCostPerUnit: number | string;
    notes?: string;
    inventoryItemId?: string | null;   // NEW
  }>;
```

If the field uses a named interface `ProductMaterialTemplate`, find that interface instead and add `inventoryItemId?: string | null` to it.

- [ ] **Step 5.2: Open `frontend/src/components/orders/ProductOrderConfigurator.tsx`. Find the `ConfiguredOrderItem` interface (lines ~44–87). Find the `requiredMaterials` field:**

Current:
```typescript
  requiredMaterials: { category: string; description: string; quantity: number; unitPrice: number }[];
```

Update to:
```typescript
  requiredMaterials: { category: string; description: string; quantity: number; unitPrice: number; inventoryItemId?: string }[];
```

- [ ] **Step 5.3: Run frontend typecheck to see the current error baseline (some errors expected at this step since combobox and buildMaterials haven't been updated yet):**

```bash
npm.cmd run typecheck --prefix frontend
```

Note any new errors for guidance in later tasks.

- [ ] **Step 5.4: Commit types:**

```bash
git add frontend/src/types/index.ts frontend/src/components/orders/ProductOrderConfigurator.tsx
git commit -m "feat(types): add inventoryItemId to material template and ConfiguredOrderItem"
```

---

## Task 6: New `MaterialCombobox` Component

**Files:**
- Create: `frontend/src/components/products/MaterialCombobox.tsx`

This is a self-contained combobox: a text input that filters inventory items, shows a dropdown on focus/type, auto-fills on selection, and shows a status badge (linked/custom).

- [ ] **Step 6.1: Create the file `frontend/src/components/products/MaterialCombobox.tsx` with this full content:**

```tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import type { InventoryItem } from '../../types';

export const INVENTORY_TO_MATERIAL_CATEGORY: Record<string, string> = {
  BLANK_SHIRTS:      'BLANK_SHIRTS',
  DTF_TRANSFERS:     'DTF_TRANSFERS',
  VINYL:             'VINYL',
  INK:               'INK',
  PACKAGING:         'PACKAGING',
  EMBROIDERY_THREAD: 'EMBROIDERY_THREAD',
  OTHER:             'OTHER',
};

interface MaterialComboboxProps {
  value: string;
  inventoryItemId: string | null;
  inventoryItems: InventoryItem[];
  onSelect: (item: InventoryItem) => void;
  onChange: (text: string) => void;
  placeholder?: string;
}

export function MaterialCombobox({
  value,
  inventoryItemId,
  inventoryItems,
  onSelect,
  onChange,
  placeholder = 'Type to search inventory or enter custom…',
}: MaterialComboboxProps) {
  const [query, setQuery]     = useState(value);
  const [isOpen, setIsOpen]   = useState(false);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Sync internal query when the parent value changes (form reset / selection)
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim().length === 0
    ? inventoryItems
    : inventoryItems.filter(
        item =>
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.sku.toLowerCase().includes(query.toLowerCase()),
      );

  const linkedItem = inventoryItemId
    ? inventoryItems.find(i => i.id === inventoryItemId) ?? null
    : null;

  const handleInputChange = useCallback((text: string) => {
    setQuery(text);
    setIsOpen(true);
    onChange(text);
  }, [onChange]);

  const handleSelect = useCallback((item: InventoryItem) => {
    setQuery(item.name);
    setIsOpen(false);
    onSelect(item);
  }, [onSelect]);

  const skuLabel = linkedItem
    ? linkedItem.sku.length > 14
      ? `${linkedItem.sku.slice(0, 14)}…`
      : linkedItem.sku
    : null;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setIsOpen(false);
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {/* Status badge */}
      <div className="mt-0.5 h-4">
        {linkedItem ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded px-1.5 py-0.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
            SKU: {skuLabel}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Custom</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.slice(0, 40).map(item => (
            <li
              key={item.id}
              onMouseDown={e => {
                e.preventDefault(); // prevent input blur before click fires
                handleSelect(item);
              }}
              className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-blue-50 min-h-[44px]"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{item.name}</span>
                <span className="text-xs text-gray-400 truncate">SKU: {item.sku}</span>
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                ${Number(item.costPrice).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 6.2: Run frontend typecheck:**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: exits 0 for this file (may still have errors in `AddEditProduct.tsx` before Task 7).

- [ ] **Step 6.3: Commit:**

```bash
git add frontend/src/components/products/MaterialCombobox.tsx
git commit -m "feat(products): MaterialCombobox component with inventory search and status badge"
```

---

## Task 7: Wire `MaterialCombobox` into `AddEditProduct.tsx`

**Files:**
- Modify: `frontend/src/pages/products/AddEditProduct.tsx`

This task has four parts: add imports, extend form state, replace the Material input cell, and update the save mapping.

- [ ] **Step 7.1: Open `frontend/src/pages/products/AddEditProduct.tsx`. At the top of the file, add two imports alongside existing ones:**

```typescript
import { useInventory } from '../../hooks/useInventory';
import { MaterialCombobox, INVENTORY_TO_MATERIAL_CATEGORY } from '../../components/products/MaterialCombobox';
```

- [ ] **Step 7.2: Inside the component body (but outside JSX), add the inventory query. Place it near the other query hooks (after `useProduct`, etc.):**

```typescript
const { data: inventoryResult } = useInventory({ limit: 200 });
const inventoryItems = inventoryResult?.data?.data ?? [];
```

> If this produces a TypeScript error about the nesting, check the `ApiResponse` and `PaginatedResult` types in `frontend/src/types/index.ts` and adjust the accessor chain accordingly (may be `inventoryResult?.data?.data`, `inventoryResult?.data`, or `inventoryResult?.data?.items`).

- [ ] **Step 7.3: Find the form state type (search for `materialCosts` in the form default values or Zod schema). The `materialCosts` array items currently look like:**

```typescript
{ id?: string; category: string; material: string; qtyPerUnit: number; estimatedCost: number }
```

Add `inventoryItemId: string | null` to wherever this type is defined (inline default value, Zod schema, or explicit interface). Example — in the form's default values:

```typescript
materialCosts: (product.materialTemplates ?? []).map(m => ({
  id: m.id,
  category: m.materialCategory ?? '',
  material: m.description,
  qtyPerUnit: Number(m.quantityPerUnit),
  estimatedCost: Number(m.estimatedCostPerUnit),
  inventoryItemId: m.inventoryItemId ?? null,  // NEW
})),
```

Also add to the "append a new empty row" default:
```typescript
append({ category: '', material: '', qtyPerUnit: 1, estimatedCost: 0, inventoryItemId: null })
```

If there is a Zod schema for the form (search for `z.object` near `materialCosts`), add:
```typescript
inventoryItemId: z.string().nullable().optional(),
```

- [ ] **Step 7.4: Find the Material column cell in the JSX. It currently contains an `<input type="text" ...{...register(`materialCosts.${index}.material`)} />`. Replace it with the combobox:**

```tsx
<td className="px-4 py-3">
  <MaterialCombobox
    value={watch(`materialCosts.${index}.material`) ?? ''}
    inventoryItemId={watch(`materialCosts.${index}.inventoryItemId`) ?? null}
    inventoryItems={inventoryItems}
    onSelect={(item) => {
      const mapped = INVENTORY_TO_MATERIAL_CATEGORY[item.category] ?? 'OTHER';
      setValue(`materialCosts.${index}.material`,      item.name,                    { shouldDirty: true });
      setValue(`materialCosts.${index}.category`,      mapped,                       { shouldDirty: true });
      setValue(`materialCosts.${index}.estimatedCost`, Number(item.costPrice),       { shouldDirty: true });
      setValue(`materialCosts.${index}.inventoryItemId`, item.id,                   { shouldDirty: true });
    }}
    onChange={(text) => {
      setValue(`materialCosts.${index}.material`,        text,                       { shouldDirty: true });
      setValue(`materialCosts.${index}.inventoryItemId`, null,                       { shouldDirty: true });
    }}
  />
</td>
```

Verify that `watch` and `setValue` are already destructured from `useForm`. If `watch` is not yet used, add it: `const { register, handleSubmit, watch, setValue, control, formState } = useForm(...)`.

- [ ] **Step 7.5: Find the save mapping (the `onSubmit` or `handleSubmit` callback, search for `materialTemplates: data.materialCosts.map`). Update it to include `inventoryItemId`:**

```typescript
materialTemplates: data.materialCosts.map(m => ({
  materialCategory:     m.category,
  description:          m.material,
  quantityPerUnit:      m.qtyPerUnit,
  estimatedCostPerUnit: m.estimatedCost,
  inventoryItemId:      m.inventoryItemId ?? null,  // NEW
})),
```

- [ ] **Step 7.6: Run frontend typecheck:**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: exits 0.

- [ ] **Step 7.7: Commit:**

```bash
git add frontend/src/pages/products/AddEditProduct.tsx
git commit -m "feat(products): inventory item combobox in material template grid"
```

---

## Task 8: Update `buildMaterials()` in `ProductOrderConfigurator.tsx`

**Files:**
- Modify: `frontend/src/components/orders/ProductOrderConfigurator.tsx`

When the product has `materialTemplates`, use them as the authoritative required materials list (scaled by order quantity). Fall through to the existing hardcoded logic only when templates are empty or absent.

- [ ] **Step 8.1: Open `frontend/src/components/orders/ProductOrderConfigurator.tsx`. Find `buildMaterials` (lines ~432–464). Replace the entire function body:**

```typescript
const buildMaterials = useCallback((): ConfiguredOrderItem['requiredMaterials'] => {
  // Templates-authoritative path: use product templates when defined
  if (product.materialTemplates && product.materialTemplates.length > 0) {
    return product.materialTemplates.map(t => ({
      category:        t.materialCategory ?? '',
      description:     t.description,
      quantity:        Math.ceil(Number(t.quantityPerUnit) * totalQty),
      unitPrice:       Number(t.estimatedCostPerUnit),
      inventoryItemId: t.inventoryItemId ?? undefined,
    }));
  }

  // Fallback: hardcoded generation for products with no templates
  const mats: ConfiguredOrderItem['requiredMaterials'] = [];
  const sizeDesc = sizeMode === 'single'
    ? `${totalQty}× ${singleSize}`
    : product.availableSizes
        .filter(s => (sizeBreakdown[s] ?? 0) > 0)
        .map(s => `${sizeBreakdown[s]}${s}`)
        .join(', ');

  mats.push({
    category: 'BLANK_GARMENT',
    description: `${totalQty}× ${(brand || product.availableBrands[0]) ?? 'Blank'} ${product.garmentType}${color ? ` - ${color}` : ''} - ${sizeDesc}`,
    quantity: totalQty,
    unitPrice: costPerUnit,
  });

  if (product.printMethod === 'DTF') {
    const locations = (product.includedPrintLocations ?? []).length || 1;
    const sheetsNeeded = Math.ceil((totalQty * locations) / 6);
    mats.push({
      category: 'DTF_TRANSFER',
      description: `DTF Gang Sheets - ${totalQty} transfers × ${locations} location${locations > 1 ? 's' : ''} (est. ${sheetsNeeded} gang sheet${sheetsNeeded !== 1 ? 's' : ''})`,
      quantity: sheetsNeeded,
      unitPrice: 30,
    });
  } else if (product.printMethod === 'HTV') {
    const locations = (product.includedPrintLocations ?? []).length || 1;
    mats.push({
      category: 'HTV_VINYL',
      description: `HTV Vinyl cuts - ${totalQty * locations} pieces × ${locations} location${locations > 1 ? 's' : ''}`,
      quantity: totalQty * locations,
      unitPrice: 2.50,
    });
  }

  return mats;
}, [sizeMode, totalQty, singleSize, sizeBreakdown, brand, color, product, costPerUnit]);
```

The `inventoryItemId` field is `undefined` (not `null`) on free-text template rows, which satisfies the `inventoryItemId?: string` type on `ConfiguredOrderItem['requiredMaterials']`.

- [ ] **Step 8.2: Run frontend typecheck:**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: exits 0.

- [ ] **Step 8.3: Commit:**

```bash
git add frontend/src/components/orders/ProductOrderConfigurator.tsx
git commit -m "feat(order): buildMaterials uses product templates as authoritative source"
```

---

## Task 9: Pass `inventoryItemId` in Order Submission Payload — `NewOrder.tsx`

**Files:**
- Modify: `frontend/src/pages/orders/NewOrder.tsx`

- [ ] **Step 9.1: Open `frontend/src/pages/orders/NewOrder.tsx`. Find the `onSubmit` handler (search for `requiredMaterials: item.requiredMaterials`). The current required materials mapping looks like:**

```typescript
requiredMaterials: item.requiredMaterials?.length
  ? item.requiredMaterials.map((m) => ({
      description:      m.description,
      quantityRequired: m.quantity,
      quantityUnit:     'units',
      materialCategory: m.category,
      unitCost:         m.unitPrice,
    }))
  : undefined,
```

Add `inventoryItemId`:
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

`undefined` values are omitted by JSON serialization, so unlinked materials send nothing — matching what the backend already expects for the optional field.

- [ ] **Step 9.2: Also check the `OrderItemFormValues` interface (lines ~36–53 in `NewOrder.tsx`) which types `requiredMaterials`. Update it to include `inventoryItemId`:**

```typescript
  requiredMaterials: {
    category: string;
    description: string;
    quantity: number;
    unitPrice: number;
    inventoryItemId?: string;   // NEW
  }[];
```

- [ ] **Step 9.3: Run frontend typecheck:**

```bash
npm.cmd run typecheck --prefix frontend
```

Expected: exits 0.

- [ ] **Step 9.4: Run frontend lint:**

```bash
npm.cmd run lint --prefix frontend
```

Expected: exits 0.

- [ ] **Step 9.5: Commit:**

```bash
git add frontend/src/pages/orders/NewOrder.tsx
git commit -m "feat(order): pass inventoryItemId through required materials payload"
```

---

## Task 10: Final Verification

- [ ] **Step 10.1: Run all four checks:**

```bash
npm.cmd run typecheck --prefix backend
npm.cmd run lint --prefix backend
npm.cmd run typecheck --prefix frontend
npm.cmd run lint --prefix frontend
```

All four must exit 0 with no errors or warnings.

- [ ] **Step 10.2: Smoke-check the product editor manually (if dev server available):**

1. Open any product → "Edit"
2. In Material Costs grid, click the Material field for any row
3. Type "shirt" — dropdown should show inventory items matching "shirt" (if any exist)
4. Select one — category, estimated cost should auto-fill; badge should show "SKU: …"
5. Clear the field — badge should return to "Custom"
6. Save product — no Zod validation errors in server logs
7. Create a new order from that product — required materials in the order should include `inventoryItemId`

- [ ] **Step 10.3: Final commit if any clean-up was needed. Otherwise the implementation is complete.**

---

## Acceptance Criteria Reference

| Criterion | Task |
|---|---|
| Material grid selects inventory item | Task 6, 7 |
| Selecting inventory auto-fills category/name/cost | Task 7 |
| Linked/Custom status badge per row | Task 6 |
| Free-text rows still load and save | Task 7 (inventoryItemId defaults to null) |
| `inventoryItemId` flows into order required materials | Task 8, 9 |
| Product save validates inventory tenant | Task 3 |
| Order create validates inventory tenant | Task 4 |
| `materialCategory` no longer stripped by Zod | Task 2 |
| Backend typecheck + lint pass | Task 10 |
| Frontend typecheck + lint pass | Task 10 |
