---
status: awaiting_human_verify
trigger: "Failed to create order. Please try again. and Please check your inputs for errors. errors appear when submitting the New Order wizard on the Review & Submit step."
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T02:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — printMethod enum mismatch causes 400 VALIDATION_ERROR + double toast
test: Verified via code read of backend validator vs frontend values
expecting: Fix all confirmed bugs
next_action: Apply fixes

## Symptoms

expected: Submitting the Review & Submit step of the New Order wizard creates an order successfully and redirects to the order detail page.
actual: Three toast errors appear: "Failed to create order. Please try again." (twice) and "Please check your inputs for errors." No order is created.
errors: "Failed to create order. Please try again." / "Please check your inputs for errors."
reproduction: Go to New Order wizard → fill in customer, items (with sizes, colors, quantities, print method) → reach Review & Submit → click Create Order.
timeline: Found during testing. Unknown if it ever worked end-to-end.

## Eliminated

(none eliminated — root causes found directly)

## Evidence

- timestamp: 2026-04-25T01:00:00Z
  checked: backend/src/validators/order.ts createOrderItemSchema
  found: printMethod uses z.nativeEnum(PrintMethod) → accepts DTF, HTV, SCREEN_PRINT, EMBROIDERY, SUBLIMATION, DTG, NONE only
  implication: Frontend sends "Screen Print", "Embroidery", "None" which fail Zod enum validation → 400 VALIDATION_ERROR

- timestamp: 2026-04-25T01:00:00Z
  checked: frontend/src/components/orders/ProductOrderConfigurator.tsx CustomItemForm
  found: print method options are ['DTF', 'HTV', 'Screen Print', 'Embroidery', 'None'] — "Screen Print" ≠ SCREEN_PRINT, "Embroidery" ≠ EMBROIDERY, "None" ≠ NONE
  implication: Any order using Screen Print, Embroidery, or None print method fails validation

- timestamp: 2026-04-25T01:00:00Z
  checked: frontend/src/lib/api.ts interceptor
  found: 400 with code VALIDATION_ERROR → fires toast "Please check your inputs for errors." THEN error propagates to useCreateOrder.onError → fires "Failed to create order. Please try again." THEN NewOrder.tsx catch block → fires ANOTHER "Failed to create order. Please try again."
  implication: Three toasts instead of one (confirmed exact match to user report)

- timestamp: 2026-04-25T01:00:00Z
  checked: frontend/src/types/index.ts Order interface vs Prisma schema
  found: Order.tax in frontend type but backend Prisma model uses taxAmount. OrderDetail.tsx renders order.tax which will always be undefined/0
  implication: Tax amount always shows $0.00 on order detail page

- timestamp: 2026-04-25T01:00:00Z
  checked: frontend/src/pages/orders/OrderDetail.tsx line 769
  found: {fmt(order.tax)} — but Order type has tax: number and Prisma has taxAmount. The backend returns taxAmount in JSON but the frontend type/usage reads .tax
  implication: Tax shows 0 on order detail

- timestamp: 2026-04-25T01:00:00Z
  checked: createOrderItemSchema vs NewOrder.tsx onSubmit payload
  found: Frontend sends requiredMaterials from ConfiguredOrderItem: [{category, description, quantity, unitPrice}] but backend schema expects [{inventoryItemId?, description, quantityRequired, quantityUnit?}]. Field names "quantity" → "quantityRequired" mismatch.
  implication: If requiredMaterials are sent they would fail validation. However they currently bypass the issue because frontend maps item.requiredMaterials only from _configured which isn't included in the submit payload (onSubmit strips it out).

- timestamp: 2026-04-25T01:00:00Z
  checked: NewOrder.tsx onSubmit items mapping
  found: requiredMaterials is NOT included in the payload sent to backend — correct, items just send productType/attributes/quantity/unitPrice/printMethod/printLocations/description. Backend createOrderItemSchema.requiredMaterials is optional so no mismatch here.
  implication: requiredMaterials mismatch does NOT cause the current failure, but noting for completeness.

## Resolution

root_cause: |
  PRIMARY: printMethod values from CustomItemForm used display strings ("Screen Print",
  "Embroidery", "None") instead of Prisma enum values (SCREEN_PRINT, EMBROIDERY, NONE).
  Backend z.nativeEnum(PrintMethod) rejected them with a 400 VALIDATION_ERROR.
  SECONDARY: printLocations from product catalog stored as display strings ("Front", "Back",
  "Front Left Chest") but backend requires enum values (FRONT, BACK). Same Zod rejection.
  TERTIARY: Three separate places fired error toasts on one failure — api interceptor +
  useCreateOrder.onError + NewOrder.tsx catch block = 3 toasts from 1 error.
  QUATERNARY: Order frontend type had tax: number but Prisma/backend returns taxAmount —
  tax always showed $0.00 on order detail page.

fix: |
  1. Added PRINT_METHOD_OPTIONS constant with enum values and display labels in
     ProductOrderConfigurator.tsx — CustomItemForm now stores SCREEN_PRINT not "Screen Print".
  2. Added normalisePrintLocation() helper in NewOrder.tsx that maps free-text location
     strings to PrintLocation enum values before sending to backend.
  3. Removed onError toast from useCreateOrder hook — api interceptor handles it.
  4. Removed duplicate error toast from NewOrder.tsx catch block.
  5. Renamed Order.tax → Order.taxAmount in frontend types/index.ts. Updated
     OrderDetail.tsx to use order.taxAmount. Added statusHistory/purchaseOrders/shipments
     as optional fields on Order type to match what the backend actually returns.
  6. Fixed OrderWorkflow type: canAdvance → canProgress to match backend response shape.

verification: TypeScript compiles clean (both frontend and backend, 0 errors).
files_changed:
  - frontend/src/components/orders/ProductOrderConfigurator.tsx
  - frontend/src/pages/orders/NewOrder.tsx
  - frontend/src/hooks/useOrders.ts
  - frontend/src/types/index.ts
  - frontend/src/pages/orders/OrderDetail.tsx
