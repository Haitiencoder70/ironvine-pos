# API Specification

## Auth Flow
- Clerk issues JWT $\rightarrow$ `Authorization: Bearer <token>`
- Backend extracts `userId` + `organizationId` via middleware.

## Key Endpoints

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Order detail
- `PATCH /api/orders/:id/status` - Update status
- `POST /api/orders/:id/use-materials` - Deduct inventory

### Inventory
- `GET /api/inventory` - List stock
- `POST /api/inventory` - Add item
- `PATCH /api/inventory/:id/adjust` - Manual adjustment

### Purchase Orders
- `POST /api/purchase-orders` - Create PO
- `PATCH /api/purchase-orders/:id/receive` - Mark received

### Customers & Vendors
- `GET/POST /api/customers`
- `GET/POST /api/vendors`

### Shipments
- `POST /api/shipments`
- `PATCH /api/shipments/:id`

### Dashboard & Billing
- `GET /api/dashboard/stats`
- `POST /api/billing/portal` - Stripe portal session
- `POST /api/billing/webhook` - Stripe webhook handler

### Sync
- `POST /api/sync/mutations` - Replay offline queue
