# Architecture & Data Models

## Multi-Tenancy
Every database table includes `organizationId`. Prisma middleware auto-injects and filters by tenant on every query.

## Core Models (All include organizationId)

### Organization (Tenant)
- id, slug, name, subdomain
- plan (FREE, PRO, ENTERPRISE)
- Stripe: customerId, subscriptionId, subscriptionStatus
- Limits: maxUsers, maxOrders, maxInventoryItems

### User
- Clerk userId (external), email, name, avatar
- Role: OWNER | MANAGER | STAFF

### Customers
- Name, phone, email, company, Billing/Shipping addresses

### Orders
- Order number (ORD-YYYYMM-####)
- Status: Quote → Approved → Materials Ordered → Materials Received → In Production → Quality Check → Ready to Ship → Shipped → Delivered → Completed
- Priority: Normal | High | Rush

### Order Items
- Product type, Size, color, quantity
- Sleeve type: Short | Long
- Print method: DTF | HTV | Screen Print | Embroidery
- Print locations: Front | Back | Left Sleeve | Right Sleeve | Full Print

### Inventory
- Name, SKU, Category, Brand, size, color
- quantityOnHand, quantityReserved, quantityAvailable (computed)
- reorderPoint, reorderQuantity, costPrice

### Purchase Orders
- PO number, vendorId
- Status: Draft → Sent → Partially Received → Received → Cancelled

### Vendors
- Company name, contact info, categories supplied, lead time days

### Shipments
- Tracking number, carrier, status (Pending → Delivered)

### Offline Queue (IndexedDB)
- Queued mutations: Action type, payload, retryCount
