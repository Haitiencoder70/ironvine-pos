---
status: resolved
trigger: "Bug 1 — Customer Delete button does nothing. Bug 2 — Cancelled orders clutter the orders list."
created: 2026-04-25T00:00:00Z
updated: 2026-04-25T00:00:00Z
---

## Current Focus

hypothesis: confirmed — both root causes found and fixed
test: TypeScript compile (noEmit) on frontend and backend
expecting: zero errors
next_action: done

## Symptoms
<!-- IMMUTABLE -->

expected:
  bug1: Clicking Delete on Customer Detail shows confirmation then deletes and redirects to /customers
  bug2: Cancelled orders are hidden from All tab; a dedicated Cancelled tab exists

actual:
  bug1: Delete button does nothing — no dialog, no deletion, no error
  bug2: Cancelled orders appear in All tab with CANCELLED badge, polluting the list

errors: none reported
reproduction:
  bug1: Customers → open any customer → click red Delete button
  bug2: Orders list — cancelled orders visible in All tab, no Cancelled tab exists

started: unknown

## Eliminated

- hypothesis: Delete button onClick handler or useDeleteCustomer hook missing
  evidence: CustomerDetail.tsx has correct handleDelete, useConfirm, and useDeleteCustomer wiring
  timestamp: 2026-04-25

- hypothesis: Backend DELETE /api/customers/:id route missing
  evidence: backend/src/routes/customers.ts has the route and customerController.ts has deleteCustomer handler
  timestamp: 2026-04-25

- hypothesis: customers:delete permission blocks the button at UI level
  evidence: Delete button is not wrapped in a permission check in CustomerDetail.tsx
  timestamp: 2026-04-25

## Evidence

- timestamp: 2026-04-25
  checked: frontend/src/hooks/useConfirm.ts + frontend/src/App.tsx + frontend/src/components/layout/MainLayout.tsx
  found: ConfirmDialog component exists and is correctly implemented, but was never rendered anywhere in the component tree
  implication: useConfirm().confirm() calls openConfirm() which returns a Promise stored in Zustand; since ConfirmDialog never mounts, nothing ever calls closeConfirm(), so the Promise hangs forever — handleDelete stalls before deleteCustomer.mutateAsync is ever called

- timestamp: 2026-04-25
  checked: frontend/src/pages/orders/OrderListPage.tsx STATUS_TABS constant
  found: No Cancelled tab in STATUS_TABS array; DEFAULT_FILTERS has status:'' which cleanParams strips, causing backend to return all orders including CANCELLED
  implication: Cancelled orders appear in the All tab permanently

- timestamp: 2026-04-25
  checked: backend/src/services/orderService.ts getOrders
  found: When status is undefined (empty string stripped by cleanParams), no status filter is applied — all orders including CANCELLED are returned
  implication: Need excludeCancelled flag to filter CANCELLED from the All tab

## Resolution

root_cause: |
  Bug 1: ConfirmDialog component was never rendered in the component tree. The useConfirm() hook
  uses a Zustand store to open a Promise-based dialog, but since <ConfirmDialog /> was missing from
  MainLayout, the dialog never appeared and the Promise returned by confirm() never resolved.
  handleDelete() was stuck awaiting that Promise, so deleteCustomer.mutateAsync() was never called.

  Bug 2: The STATUS_TABS array had no Cancelled entry, and DEFAULT_FILTERS passed status:'' (which
  cleanParams strips to undefined), causing getOrders() to return all statuses including CANCELLED.

fix: |
  Bug 1: Added <ConfirmDialog /> to MainLayout.tsx (with import). The dialog is now always mounted
  and will resolve/reject the confirm Promise when the user clicks Confirm or Cancel.

  Bug 2: Added Cancelled tab to STATUS_TABS. Added excludeCancelled:true to DEFAULT_FILTERS and
  SET_TAB reducer (set true when switching to All, false for any specific status tab). Added
  excludeCancelled param through the full stack: GetOrdersInput type, getOrders service (adds
  status: { not: 'CANCELLED' } when excludeCancelled=true and no status filter), orderController
  (reads query param), OrderListParams type and useOrders hook.

verification: TypeScript noEmit compile — zero errors on both frontend and backend
files_changed:
  - frontend/src/components/layout/MainLayout.tsx
  - frontend/src/pages/orders/OrderListPage.tsx
  - frontend/src/hooks/useOrders.ts
  - backend/src/types/services.ts
  - backend/src/services/orderService.ts
  - backend/src/controllers/orderController.ts
