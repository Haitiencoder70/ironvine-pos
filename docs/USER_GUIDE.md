# User Guide

This guide explains how to use the T-Shirt POS system as a shop owner or staff member.

## Getting Started

After signing up, you'll land on your shop's dashboard at `yourshop.yourapp.com`. Bookmark this URL — it's unique to your shop.

---

## Dashboard

The dashboard gives you a real-time snapshot of your shop:

- **Orders today** — how many orders have come in today
- **Revenue this month** — total sales for the current calendar month
- **Pending orders** — orders that still need attention
- **Low stock alerts** — inventory items running below their reorder point

Click any number to jump to the relevant section.

---

## Orders

### Creating an order

1. Click **Orders** in the sidebar
2. Click **New Order**
3. Search for or select a customer
4. Click **Add Item** and choose a product
5. Set quantity, size, color, and any custom pricing
6. Add production notes (e.g. "Rush job", "Logo on left chest only")
7. Set a due date
8. Click **Create Order**

### Order statuses

| Status | Meaning |
|---|---|
| Quote | Draft — not yet confirmed |
| Pending Approval | Waiting for customer sign-off |
| Approved | Ready to go into production |
| Materials Ordered | Waiting on blank garments |
| Materials Received | Blanks in stock, ready to print |
| In Production | Being printed or embroidered |
| Quality Check | Finished — being reviewed |
| Ready to Ship | Packed and waiting for pickup or shipping |
| Shipped | On its way to the customer |
| Delivered | Complete |
| Cancelled | Order cancelled |

**To update status:** Open the order → click the status badge → select the new status.

### Design approval

For orders that require customer sign-off on artwork, use the **Request Approval** button to send an approval link. The order moves to *Pending Approval* until the customer confirms.

---

## Customers

Store your customers' contact details and see their full order history.

**To add a customer:**
1. Click **Customers** → **New Customer**
2. Enter name, email, phone, and billing/shipping address as needed
3. Click **Save**

**To view a customer's history:** Click the customer's name to see all past orders, total spend, and contact information.

---

## Inventory

Track your blanks, threads, ink, and other materials.

**To add an inventory item:**
1. Click **Inventory** → **New Item**
2. Enter name, SKU, current quantity, and reorder point
3. Click **Save**

**Low stock alerts:** When an item falls below its reorder point it appears in the dashboard's low-stock section and is highlighted in red in the inventory list.

**To adjust stock:**
Open an item → click **Adjust Stock** → enter the change amount (positive to add, negative to remove) and a reason. All adjustments are logged.

---

## Products

Set up your product catalog with pricing and print options.

**To add a product:**
1. Click **Products** → **New Product**
2. Enter name, category, garment type, and print method
3. Set your base price
4. Add available brands, sizes, and any size upcharges
5. Add optional add-ons (e.g. "Extra print location +$5")
6. Click **Save**

Products appear as quick-select options when creating orders.

---

## POS (Point of Sale)

The POS screen is designed for fast counter transactions on a touchscreen or tablet.

1. Click **POS** in the sidebar
2. Tap products to add them to the cart
3. Adjust quantities with the **+** / **−** buttons
4. Tap **Checkout**
5. Select payment method and complete the transaction

---

## Reports

**Sales Report:** Revenue, order count, and average order value for any date range.

**Production Report:** Orders grouped by status — see what's in progress and what's been completed.

**To run a report:**
1. Click **Reports**
2. Choose the report type
3. Set the date range
4. Click **Run**

Reports can be exported to CSV using the **Export** button.

---

## Settings

### General
Set your shop name, tax rate, currency, and timezone.

### Users & Roles
Invite team members and assign roles:

| Role | What they can do |
|---|---|
| **Owner** | Full access including billing and user management |
| **Admin** | All features except removing other owners |
| **Manager** | Orders, customers, inventory, reports — no billing |
| **Staff** | View and create orders and customers — no admin |
| **Viewer** | Read-only access |

**To invite someone:** Settings → Users → **Invite User** → enter their email and role.

### Billing
View your current plan, usage against limits, and upgrade options. Card details are processed by Stripe — they are never stored on our servers.

### Branding *(PRO and above)*
Upload your logo, set brand colors, add a custom favicon, and write custom CSS to make the app match your shop's identity.

---

## FAQs

**Q: Can I use the POS on a tablet?**
Yes. The interface is touch-optimized. Use Chrome or Edge on Android tablets or iPad.

**Q: What happens if I go offline?**
The app detects the loss of connection and shows an offline banner. Changes made while offline are queued and sync automatically when your connection is restored.

**Q: Can I have multiple locations?**
Yes — each location can be set up as a separate organization under your account, each with its own subdomain, inventory, and team.

**Q: How do I cancel my subscription?**
Go to **Settings** → **Billing** → **Manage Subscription**. You'll keep access until the end of your current billing period.

**Q: I forgot my password — what do I do?**
Click **Sign In** on the login page, then **Forgot password?** and enter your email. You'll receive a reset link.

**Q: I can't log in — the page just flickers.**
Make sure you're visiting your shop's subdomain (e.g. `myshop.yourapp.com`), not the main marketing site at `yourapp.com`. If problems persist, try clearing your browser cache.
