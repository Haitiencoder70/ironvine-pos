# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## jit-materials-flow — PO auto-population empty, inventory automation gaps
- **Date:** 2026-04-25
- **Error patterns:** purchase order, auto-populate, requiredMaterials, empty PO, inventory, receive, use materials, attributes
- **Root cause:** NewOrder.tsx stripped requiredMaterials from the API submit payload so RequiredMaterial DB records were never created. CreatePOForOrder read those empty records and showed nothing. Separately, the PATCH /purchase-orders/:id/receive response omitted linkedOrderId so the frontend cache for the linked customer order was never invalidated after receiving.
- **Fix:** (1) Pass requiredMaterials through in NewOrder.tsx submit payload. (2) Add two-strategy auto-population in CreatePOForOrder — saved requiredMaterials first, then attributes-based fallback. (3) Add attributes field to OrderItem type. (4) Return linkedOrderId in receiveItems controller response.
- **Files changed:** frontend/src/pages/orders/NewOrder.tsx, frontend/src/pages/purchase-orders/CreatePOForOrder.tsx, frontend/src/types/index.ts, backend/src/controllers/purchaseOrderController.ts
---

