# T-Shirt Graphics POS System - Project Guide

## 🎯 What This System Does

A multi-tenant SaaS POS for T-shirt printing businesses that:

- Takes customer orders for custom t-shirts
- Orders materials (blank shirts, printing supplies) from vendors
- Tracks inventory automatically
- Manages production workflow
- Ships products to customers
- Works fully offline (PWA) on tablets and touchscreens
- Supports multiple businesses (organizations) on a single platform

## 🏗️ Architecture Decisions (Locked In From Day One)

### 1. Multi-Tenancy — Built In From The Start

Every database table includes `organizationId`. Prisma middleware auto-injects and filters by tenant on every query. No retrofitting later.

### 2. Authentication — Clerk

We use Clerk for authentication. It handles:

- Organization (tenant) creation and management
- User invitations and roles (Owner, Manager, Staff)
- JWT session tokens passed to backend
- Subdomain-aware sessions
- Password reset, MFA, social login — all out of the box

**Do NOT build custom auth. Clerk is the auth layer.**

### 3. Subscription Billing — Stripe

Stripe handles all subscription billing from day one:

- Plans: Free (1 user, 100 orders/mo), Pro ($49/mo), Enterprise (custom)
- Stripe Customer Portal for self-serve billing management
- Webhooks update `Organization.subscriptionStatus` in real time
- Usage limits enforced in API middleware

### 4. Offline / PWA — Vite PWA Plugin

The POS must work when internet drops mid-transaction:

- Vite PWA plugin + Workbox service worker
- Read-heavy data (products, customers) cached with stale-while-revalidate
- Mutations queued in IndexedDB when offline, synced on reconnect
- Offline indicator banner shown to staff
- Receipt printing works offline

### 5. Hardware Integration — Web APIs + Adapters

- **Receipt Printers**: ESC/POS protocol via WebUSB or Star Micronics cloud
- **Barcode Scanners**: HID keyboard emulation (works natively in browser)
- **Cash Drawers**: Triggered via receipt printer kick command
- Hardware adapters are isolated in `src/services/hardware/` — easily swappable

## 📊 Database — Core Models

Every model below includes `organizationId String` and a relation to `Organization`.

### Organization (Tenant)
- `id`, `slug`, `name`, `subdomain`
- `plan` (FREE, PRO, ENTERPRISE)
- Stripe: `customerId`, `subscriptionId`, `subscriptionStatus`
- Limits: `maxUsers`, `maxOrders`, `maxInventoryItems`
- `createdAt`, `updatedAt`

### User
- Clerk `userId` (external), `email`, `name`, `avatar`
- Role: `OWNER | MANAGER | STAFF`
- `organizationId` (tenant)
- Active/inactive status

### Customers
- Name, phone, email, company
- Billing address, shipping address
- Order history, lifetime value
- `organizationId`

### Orders
- Order number (ORD-202401-0001)
- `customerId`, `organizationId`
- Status: `Quote → Approved → Materials Ordered → Materials Received → In Production → Quality Check → Ready to Ship → Shipped → Delivered → Completed`
- Priority: `Normal | High | Rush`
- Design details, file URLs
- Pricing: subtotal, tax, discount, total
- Due date, notes

### Order Items
- Product type (T-Shirt, Hoodie, Polo, etc.)
- Size, color, quantity
- Sleeve type: `Short | Long`
- Print method: `DTF | HTV | Screen Print | Embroidery`
- Print locations: `Front | Back | Left Sleeve | Right Sleeve | Full Print`
- Unit price, line total

### Inventory
- Name, SKU
- Category: `Blank Shirts | DTF Transfers | Vinyl | Ink | Packaging | Other`
- Brand, size, color
- `quantityOnHand`, `quantityReserved`, `quantityAvailable` (computed)
- `reorderPoint`, `reorderQuantity`
- `costPrice`, `organizationId`

### Purchase Orders
- PO number, `vendorId`, `organizationId`
- Status: `Draft → Sent → Partially Received → Received → Cancelled`
- Linked `orderId` (just-in-time)
- Line items, total cost

### Vendors
- Company name, contact info
- Categories supplied
- Payment terms, lead time days
- `organizationId`

### Shipments
- Tracking number, carrier (`UPS | FedEx | USPS | DHL`)
- `orderId`, `organizationId`
- Status: `Pending → Label Created → In Transit → Out for Delivery → Delivered → Exception`
- Shipping address, estimated delivery

### Offline Queue (IndexedDB, client-side)
- Queued mutations when offline
- Action type, payload, retryCount, createdAt

## 🔄 How the Workflow Works

### Complete Order Process

```
Customer calls → Create Quote → Customer approves → Order Approved →
Order materials → Materials Ordered → Receive materials → Materials Received →
Start printing → In Production → Quality Check → Package → Ready to Ship →
Create shipment → Shipped → Customer receives → Delivered → Completed
```

### Just-in-Time Material Ordering

1. Customer orders 50 black t-shirts with custom design
2. System calculates needed materials (50 blanks + 50 DTF transfers)
3. Creates Purchase Order to vendor
4. Vendor ships → Receive materials → Auto-adds to inventory
5. Use in production → Auto-deducts from inventory

## 🎨 Design System

### Colors (Tailwind)
- **Primary**: `blue-600` (main), `blue-700` (hover), `blue-50` (light bg)
- **Success**: `green-600`, `green-50`
- **Warning**: `amber-500`, `amber-50`
- **Danger**: `red-600`, `red-50`
- **Neutral**: `gray-900` (text), `gray-600` (muted), `gray-100` (bg), white

### Typography
- `h1`: `text-2xl font-bold` (24px)
- `h2`: `text-xl font-bold` (20px)
- `h3`: `text-lg font-semibold` (18px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)
- Muted: `text-gray-500`

### Sizes (Touch-Optimized — No Exceptions)
- All touch targets: minimum **44×44px**
- Buttons `sm`: `min-h-[44px] px-4`
- Buttons `md`: `min-h-[44px] px-6` (default)
- Buttons `lg`: `min-h-[52px] px-8`
- Buttons `xl`: `min-h-[60px] px-10`
- Input fields: `min-h-[44px]`

### Border Radius
- Cards: `rounded-xl` (12px)
- Buttons: `rounded-xl`
- Inputs: `rounded-xl`
- Badges: `rounded-full`
- Modals: `rounded-2xl` (16px)

### Shadows
- Cards: `shadow-sm`
- Elevated cards: `shadow-lg`
- Modals: `shadow-2xl`

### Screen Sizes
- Mobile (<640px): Single column, bottom navigation
- Tablet (640–1024px): Two columns, collapsible sidebar — **primary target**
- Desktop (>1024px): Multi-column, permanent sidebar

## 📱 Key Pages

### Dashboard
- Orders today, in production, ready to ship, revenue
- Recent orders list, low stock alerts
- Quick actions: New Order, Receive Stock, etc.
- Offline status indicator

### Orders
- List with filters (status, priority, date range)
- Search by order number or customer name
- Create new order button (prominent, touch-friendly)

### Order Detail
- Full order info with visual status timeline
- Items, materials, PO links, shipment tracking
- Smart action buttons based on current status

### New Order (3-Step Wizard)
1. Select or create customer
2. Add items (product, size, color, quantity, print method, locations)
3. Review totals → confirm → create

### Inventory
- Stock levels with low-stock highlights
- Search, filter by category
- Manual stock adjustments
- Movement history

### Purchase Orders
- List, create, receive
- Auto-link to customer orders

### Customers
- List, add/edit
- Order history, lifetime value

### Shipments
- All outgoing shipments
- Add tracking, update status

### Settings (per Organization)
- Business info, logo
- Tax rates, order number prefix
- Receipt printer setup
- Billing / subscription (Stripe portal link)
- User management (invite, roles)

## 🔌 API Design

### Auth Flow
1. Clerk issues session token (JWT)
2. Every request: `Authorization: Bearer <token>`
3. Backend Clerk middleware extracts `userId` + `organizationId`
4. Prisma middleware auto-filters all queries by `organizationId`

### Key Endpoints

```
POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id/status
POST   /api/orders/:id/use-materials

GET    /api/inventory
POST   /api/inventory
PATCH  /api/inventory/:id/adjust

POST   /api/purchase-orders
PATCH  /api/purchase-orders/:id/receive

GET    /api/customers
POST   /api/customers

GET    /api/vendors
POST   /api/vendors

POST   /api/shipments
PATCH  /api/shipments/:id

GET    /api/dashboard/stats

POST   /api/billing/portal       (Stripe portal session)
POST   /api/billing/webhook      (Stripe webhook handler)
```

### Offline Sync Endpoint

```
POST   /api/sync/mutations       (replay queued offline mutations)
```

## 🎯 Special Features

### Real-Time Updates (Socket.IO)
- Rooms scoped per `organizationId` — tenants never see each other's data
- Events: `order:created`, `order:status-changed`, `inventory:low-stock`, `po:received`

### Automatic Inventory
- Receive PO → inventory auto-increments
- Use materials → inventory auto-decrements
- Below reorder point → triggers low-stock alert + optional auto-PO

### Smart Status Actions
- Approved → "Order Materials"
- Materials Received → "Start Production"
- Quality Check → "Mark Ready to Ship"
- Ready to Ship → "Create Shipment"

### PWA / Offline Mode
- App installs on tablet home screen like a native app
- Works fully offline for order viewing and creation
- Mutations queued, synced on reconnect
- Receipt printing works offline via local printer

### Hardware Integration
- Receipt printer: WebUSB (Star/Epson ESC/POS) or cloud print
- Barcode scanner: plug-and-play (HID keyboard)
- Cash drawer: triggered via printer

## 🚀 For Claude Code — Build Order

1. Backend foundation: Database schema with `organizationId` everywhere, Prisma setup, Clerk middleware, tenant-scoped queries
2. Core API: Orders, Inventory, Customers, Vendors, POs, Shipments
3. Billing: Stripe webhook handler, subscription enforcement middleware
4. Frontend foundation: Vite + React + Tailwind + Clerk provider + React Query + Zustand + PWA plugin
5. UI Components: Design system components (Button, Input, Card, Modal, Badge, etc.)
6. Pages: Dashboard → Orders → Inventory → Customers → POs → Shipments → Settings
7. Real-time: Socket.IO rooms scoped to organization
8. Offline: Service worker, IndexedDB queue, sync engine
9. Hardware: Receipt printer adapter, barcode scanner listener
10. Polish: Loading skeletons, empty states, error boundaries, animations

## 📝 Non-Negotiable Rules

- **TypeScript strict mode**: No `any`. No shortcuts.
- **`organizationId` on everything**: Every model, every query, every response.
- **Clerk for auth**: No custom auth code.
- **Stripe for billing**: No custom payment logic.
- **Touch targets ≥ 44px**: No exceptions, ever.
- **Offline-aware**: All mutations check online status, queue if offline.
- **No `console.log`**: Use Winston (backend) or a logger service (frontend).
- **Zod everywhere**: Validate all inputs on both sides.
- **Named exports only**: No default exports.
- **Complete code**: No `// TODO`, no placeholders, no partial implementations.

## 🎓 Business Terms

- **SKU**: Stock Keeping Unit (unique inventory ID)
- **PO**: Purchase Order (order to a vendor)
- **DTF**: Direct to Film (printing method)
- **HTV**: Heat Transfer Vinyl (printing method)
- **Just-in-Time**: Order materials only when a customer order is confirmed
- **ESC/POS**: Printer command protocol for receipt printers
- **Tenant**: One business/organization using the SaaS platform

## 🚀 Deployment

### Current Production Stack
- **Frontend + Backend**: Render Monolith (single Docker container)
- **Database**: Neon PostgreSQL (with PgBouncer pooling)
- **DNS/CDN**: Cloudflare (CNAME `pos` → `onrender.com`, DNS-only)
- **Auth**: Clerk (with Organizations)
- **Billing**: Stripe
- **Email**: Resend
- **Storage**: Cloudflare R2 (S3-compatible, uses `@aws-sdk/client-s3`)
- **Domain**: `pos.printflowpos.com`

### Phase 1 — MVP (completed)
- Frontend + Backend: Render
- Database: Neon PostgreSQL
- Auth: Clerk
- Billing: Stripe
- Cost: ~$0

### Phase 2 — Growth
- Neon Scale or Supabase Pro ($25/mo)
- Clerk Pro
- Stripe live mode (2.9% + 30¢ per transaction)
- Resend for transactional email
- PostHog for analytics
- Sentry for error tracking
- Cost: ~$100–200/mo

### Phase 3 — Scale (100+ tenants)
- Dedicated PostgreSQL (Railway or AWS RDS)
- Cloudflare Pro (CDN + DDoS)
- Vercel Enterprise
- Cost: $500+/mo

---

## ⚡ Current Priority Order

1. Fix active POS workflow bugs
2. Wrap PO / order / inventory writes in `prisma.$transaction()`
3. Add one golden-path E2E smoke test (create order → approve → PO → receive → ship)
4. Add root quality scripts (`npm run typecheck`, `npm run lint`, `npm run check-ready`)
5. Add Prettier
6. Add coverage reporting
7. Add Husky / lint-staged (lightweight, last)

**Before every Render deploy:** `npm run check-ready` — typecheck + lint + smoke test.

---

**This is a professional SaaS product. Every line of code should be production-ready, tenant-isolated, offline-capable, and touch-optimized.**
