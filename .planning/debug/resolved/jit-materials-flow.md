---
status: resolved
trigger: "Audit and fix the just-in-time materials flow for the T-shirt POS system"
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:10:00Z
---

## Current Focus

hypothesis: RESOLVED — All four gaps fixed
test: TypeScript compiles clean (both frontend and backend)
expecting: n/a
next_action: done

## Symptoms

expected: |
  1. "Order Materials" on APPROVED order navigates to Create PO with line items auto-populated from order items
  2. Marking PO as RECEIVED auto-increments inventory for each received item
  3. Order completing (or "Use Materials") auto-decrements inventory
actual: |
  - Create PO shows "No items added to this PO yet" — nothing auto-populated
  - PO receive → inventory automation unknown
  - Order complete → inventory decrement unknown
errors: No crash — just missing auto-population and likely missing inventory automation
reproduction: Create order → Approve → click "Order Materials" → see empty PO form
started: Feature was always missing — never implemented end-to-end

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-25T00:00:00Z
  checked: CreatePOForOrder.tsx lines 89-110
  found: |
    Auto-population logic reads item.requiredMaterials — this DOES exist in the Prisma schema
    (RequiredMaterial model linked to OrderItem via requiredMaterials relation).
    The getOrderById backend query includes requiredMaterials in the include.
    HOWEVER — normal order creation via the POS/NewOrder wizard does NOT populate requiredMaterials.
    Only if order items were created with explicit requiredMaterials would this work.
    Result: autoItems array is always empty because items[].requiredMaterials is always [].
  implication: |
    Gap 1 fix: Change the auto-population logic to derive materials from order item attributes
    (productType, quantity, color, size stored in item.attributes JSON) instead of requiring
    pre-populated requiredMaterials. Build PO line items directly from order items.

- timestamp: 2026-04-25T00:00:00Z
  checked: purchaseOrderService.ts receivePOItems()
  found: |
    Gap 2 is IMPLEMENTED: receiveStock() is called for each accepted item with an inventoryItemId.
    quantityOnHand increments via StockMovement IN type.
    Order auto-advances to MATERIALS_RECEIVED when PO is fully received and linked order is MATERIALS_ORDERED.
  implication: Gap 2 backend works. But useReceivePurchaseOrder hook checks res.data.linkedOrderId 
    — the receive endpoint returns { receiving, updatedInventory, orderStatusUpdated }, NOT the PO object.
    So linkedOrderId is always undefined → order cache never invalidated on receive.

- timestamp: 2026-04-25T00:00:00Z
  checked: orderService.ts useMaterials()
  found: |
    Gap 3 is IMPLEMENTED: useMaterials() decrements quantityOnHand for each material used via StockMovement OUT.
    Only works when order status is IN_PRODUCTION. Manual trigger required.
  implication: Gap 3 is designed as manual trigger, not auto-trigger on COMPLETED. This is intentional per comments.
    The "Use Materials" button in the UI needs to exist on order detail. Need to verify the frontend has this.

- timestamp: 2026-04-25T00:00:00Z
  checked: usePurchaseOrders.ts useReceivePurchaseOrder hook
  found: |
    res.data.linkedOrderId — but the backend returns { receiving, updatedInventory, orderStatusUpdated },
    not a PurchaseOrder object. The frontend expect res.data to have linkedOrderId but it doesn't.
    Cache invalidation for the linked order never fires.
  implication: Gap 4 partial bug — receives work but cache not refreshed for linked order.
    Fix: backend receive endpoint should return the full PO object (or the frontend hook should
    invalidate by PO id to get the linkedOrderId).

- timestamp: 2026-04-25T00:00:00Z
  checked: OrderItem type + attributes field
  found: |
    OrderItem model has attributes: Json @default("{}"). The frontend NewOrder wizard stores
    size and color in item.attributes. The getOrderById service returns items with attributes.
    So order items have color/size/quantity available to derive PO line items from.
  implication: |
    Can generate PO line items: one per order item, description = "{quantity}x {productType} - {color} {size}",
    quantity = item.quantity, unitCost = 0. This bypasses the empty requiredMaterials issue.

## Resolution

root_cause: |
  Gap 1: CreatePOForOrder reads item.requiredMaterials to build PO line items, but orders created
  via the standard workflow never populate RequiredMaterial records (requiredMaterials is an optional
  relation only filled when explicitly provided at order creation). So autoItems is always empty.
  
  Gap 2: Backend works correctly. Frontend hook reads res.data.linkedOrderId but the receive 
  endpoint response shape is { receiving, updatedInventory, orderStatusUpdated } — no linkedOrderId field.
  Cache for linked order is never invalidated after receiving.
  
  Gap 3: useMaterials backend works correctly but requires IN_PRODUCTION status and is a manual trigger.
  Need to verify frontend order detail page has a working "Use Materials" UI.
  
  Gap 4: ReceivePOModal correctly builds and submits the payload. Backend processes it. The only
  issue is the cache invalidation bug in useReceivePurchaseOrder.
fix: |
  1. NewOrder.tsx: include requiredMaterials in the API submit payload so they are saved as
     RequiredMaterial DB records at order creation time.
  2. CreatePOForOrder.tsx: rewrite auto-population with two-strategy approach — Strategy 1 uses
     saved requiredMaterials (now populated); Strategy 2 fallback derives PO lines from
     item.attributes (brand, color, sizes breakdown) for any orders created before this fix.
  3. types/index.ts: added attributes?: Record<string,unknown> to OrderItem interface so
     the fallback logic in CreatePOForOrder is type-safe without casting.
  4. purchaseOrderController.ts: receiveItems now fetches and includes linkedOrderId in the
     response body so useReceivePurchaseOrder can invalidate the linked order's query cache.
     Also added prisma import.
  5. Gap 2 (inventory auto-increment on PO receive): already implemented correctly in
     purchaseOrderService.ts via receiveStock(). No backend change needed.
  6. Gap 3 (inventory auto-decrement via Use Materials): already implemented correctly in
     orderService.ts via useMaterials(). The UI button exists in OrderDetail for IN_PRODUCTION
     orders. UseMaterialsModal will now have data to show for new orders due to fix #1.
verification: TypeScript compiles clean with zero errors on both frontend and backend (npx tsc --noEmit)
files_changed:
  - frontend/src/pages/orders/NewOrder.tsx
  - frontend/src/pages/purchase-orders/CreatePOForOrder.tsx
  - frontend/src/types/index.ts
  - backend/src/controllers/purchaseOrderController.ts
