# API Reference

**Base URL:** `https://api.yourapp.com` (production) · `http://localhost:3001` (development)

All protected endpoints require:
- `Authorization: Bearer <clerk-session-token>` header
- `Host: <subdomain>.yourapp.com` header (for tenant resolution)

Errors always return:
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE", "statusCode": 400 }
```

Common codes: `UNAUTHENTICATED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `PLAN_LIMIT_REACHED` (403) · `VALIDATION_ERROR` (422)

---

## Health

### GET /api/health
Public. Returns server status.

**Response 200:**
```json
{ "status": "ok", "timestamp": "2026-04-18T00:00:00Z" }
```

---

## Authentication

### GET /api/auth/me
Returns the current authenticated user's profile.

**Response 200:**
```json
{
  "data": {
    "id": "clx...",
    "email": "owner@acme.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "OWNER",
    "organizationId": "clx..."
  }
}
```

---

## Orders

### GET /api/orders
List orders for the org. Permission: `orders:view`

**Query params:** `?page=1&limit=20&status=PENDING_APPROVAL&search=ORD-001`

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx...",
      "orderNumber": "ORD-0001",
      "status": "IN_PRODUCTION",
      "total": 125.00,
      "customer": { "firstName": "Jane", "lastName": "Smith" },
      "createdAt": "2026-04-18T00:00:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20
}
```

### POST /api/orders
Create a new order. Permission: `orders:create`. Blocked when plan limit is reached.

**Body:**
```json
{
  "customerId": "clx...",
  "dueDate": "2026-04-25T00:00:00Z",
  "items": [
    { "productId": "clx...", "quantity": 10, "unitPrice": 12.50, "size": "L", "color": "Black" }
  ],
  "subtotal": 125.00,
  "taxAmount": 10.00,
  "discount": 0,
  "total": 135.00,
  "notes": "Rush order — needed by Friday"
}
```

**Response 201:** Created order object.

**Response 403 (limit exceeded):**
```json
{ "error": "Plan limit reached: orders (100/100). Please upgrade your plan.", "code": "PLAN_LIMIT_REACHED" }
```

### GET /api/orders/:id
Single order with items and status history. Permission: `orders:view`

### PATCH /api/orders/:id
Update order fields. Permission: `orders:edit`

### PATCH /api/orders/:id/status
Update order status. Permission: `orders:approve`

**Body:** `{ "status": "IN_PRODUCTION", "note": "Started printing" }`

### DELETE /api/orders/:id
Delete order. Permission: `orders:delete` (OWNER/ADMIN only)

---

## Customers

### GET /api/customers
List customers. Permission: `customers:view`

**Query:** `?search=Jane&page=1&limit=20`

### POST /api/customers
Create customer. Permission: `customers:create`

**Body:** `{ "firstName": "Jane", "lastName": "Smith", "email": "jane@example.com", "phone": "555-1234" }`

**Response 201:** Created customer object.

### GET /api/customers/:id
Customer detail with order history. Permission: `customers:view`

### PATCH /api/customers/:id
Update customer. Permission: `customers:edit`

### DELETE /api/customers/:id
Delete customer. Permission: `customers:delete` (OWNER/ADMIN only)

---

## Products

### GET /api/products
List products with categories and add-ons.

### POST /api/products
Create product.

**Body:**
```json
{
  "name": "Classic Tee",
  "categoryId": "clx...",
  "garmentType": "TSHIRT",
  "printMethod": "DTF",
  "basePrice": 25.00,
  "includedPrintLocations": ["FRONT"],
  "maxPrintLocations": 2,
  "availableBrands": ["Gildan", "Bella+Canvas"]
}
```

### GET /api/products/:id · PATCH /api/products/:id · DELETE /api/products/:id
Standard CRUD. Delete requires `OWNER` or `ADMIN`.

### GET /api/product-categories
List categories for the org.

---

## Inventory

### GET /api/inventory
List inventory items with stock levels.

**Query:** `?search=gildan&lowStock=true`

### POST /api/inventory
Create item. Permission: `inventory:create`

**Body:** `{ "name": "Gildan 5000 Black L", "sku": "G5000-BLK-L", "quantity": 200, "reorderPoint": 20 }`

### PATCH /api/inventory/:id
Update item. Permission: `inventory:edit`

### POST /api/inventory/:id/adjust
Adjust stock quantity. Permission: `inventory:adjust`

**Body:** `{ "delta": -10, "reason": "Used in order ORD-0042" }`

### GET /api/inventory/low-stock
Returns items at or below their reorder point.

---

## Dashboard

### GET /api/dashboard
Summary metrics for the org.

**Response 200:**
```json
{
  "data": {
    "ordersToday": 12,
    "revenueMtd": 4520.00,
    "pendingOrders": 8,
    "lowStockItems": 3,
    "recentOrders": []
  }
}
```

---

## Billing

### GET /api/billing/usage
Current plan, usage counts, and limits. Permission: `billing:view` (OWNER only)

**Response 200:**
```json
{
  "data": {
    "plan": "PRO",
    "usage": {
      "orders":         { "current": 342, "max": 5000 },
      "customers":      { "current": 89,  "max": 2000 },
      "users":          { "current": 3,   "max": 10 },
      "inventoryItems": { "current": 120, "max": 5000 }
    }
  }
}
```

### POST /api/billing/checkout
Create a Stripe Checkout session. Permission: `billing:edit`

**Body:** `{ "priceId": "price_xxx" }`

**Response 200:** `{ "data": { "url": "https://checkout.stripe.com/..." } }`

### POST /api/billing/portal
Create a Stripe customer portal session for managing subscription.

---

## Organization

### GET /api/organization
Current org details.

### PATCH /api/organization
Update org settings (name, logo, tax rate, etc.). Permission: `settings:edit`

### GET /api/organization/team
List team members. Permission: `users:view`

### POST /api/organization/team/invite
Invite a new user. Permission: `users:invite`

**Body:** `{ "email": "staff@acme.com", "role": "STAFF" }`

### DELETE /api/organization/team/:userId
Remove a team member. Permission: `users:remove` (OWNER only)

---

## Reports

### GET /api/reports/sales
Sales summary by date range. Permission: `reports:view`

**Query:** `?from=2026-04-01&to=2026-04-30`

### GET /api/reports/production
Orders by status for a date range. Permission: `reports:view`

---

## Stripe Webhooks

### POST /api/stripe/webhook
Receives Stripe events. Validates the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.

**Do not call this manually.** Stripe sends events here automatically.

Handled events:
- `checkout.session.completed` — activates subscription
- `customer.subscription.updated` — updates plan in DB
- `customer.subscription.deleted` — downgrades org to FREE
- `invoice.payment_succeeded` — records billing history
- `invoice.payment_failed` — flags subscription as past due
