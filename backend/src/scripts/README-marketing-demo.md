# Marketing Demo Seed Script

Seeds polished fictional data into one target organization for capturing
clean landing-page screenshots. All data is fictional -- no real PII.

## Prerequisites

1. The target organization must already exist in the app (created via Clerk signup).
2. You need the org's **slug** (visible in the URL or Settings page).
3. The database must be accessible from your machine (local `.env` or Neon connection string).

## How to Run

```bash
cd backend

# Local / staging
MARKETING_DEMO_ORG_SLUG=your-org-slug npm run seed:marketing-demo

# Or with npx directly
MARKETING_DEMO_ORG_SLUG=your-org-slug npx tsx src/scripts/seed-marketing-demo.ts
```

**Windows (PowerShell):**
```powershell
$env:MARKETING_DEMO_ORG_SLUG="your-org-slug"; npm run seed:marketing-demo
```

## What Gets Seeded

| Entity                    | Count | Markers                               |
| ------------------------- | ----- | ------------------------------------- |
| Vendors                   | 3     | `[MARKETING DEMO]` in notes           |
| Customers                 | 7     | `demo+*@printflowpos.com` emails      |
| Inventory items           | 15    | SKUs prefixed `DEMO-`                 |
| Product categories        | 7     | Upserted by name (shared, not deleted) |
| Products                  | 10    | SKUs prefixed `DEMO-PROD-`            |
| Product material templates| 18    | Cascaded from demo products           |
| Orders                    | 11    | Order numbers prefixed `DEMO-ORD-`    |
| Purchase orders           | 3     | PO numbers prefixed `DEMO-PO-`        |
| Shipments                 | 2     | Tracking numbers prefixed `DEMO`      |
| Stock movements           | 8     | Linked to demo inventory/orders       |

### Products & Pricing

10 products across 7 categories with realistic pricing tiers, size upcharges, and material templates:

| Product                        | Method       | Base Price | Featured |
| ------------------------------ | ------------ | ---------- | -------- |
| Classic DTF T-Shirt            | DTF          | $15        | ✓        |
| Premium Screen Print Hoodie    | Screen Print | $38        | ✓        |
| Embroidered Polo               | Embroidery   | $28        |          |
| HTV Staff Tee                  | HTV          | $14        |          |
| Youth Team Shirt               | DTF          | $12        |          |
| Direct-to-Garment Retail Tee   | DTG          | $22        |          |
| Sublimated Performance Shirt   | Sublimation  | $25        |          |
| Custom Tote Bag                | HTV          | $12        | ✓        |
| Long Sleeve Event Shirt        | DTF          | $20        |          |
| Screen Print Tank Top          | Screen Print | $16        |          |

Material templates are linked to seeded demo inventory items where SKUs match.

### Order Statuses Covered

QUOTE, APPROVED, MATERIALS_ORDERED, MATERIALS_RECEIVED, IN_PRODUCTION,
QUALITY_CHECK, READY_TO_SHIP, SHIPPED, DELIVERED, COMPLETED

### Inventory Highlights

- 6 low-stock or out-of-stock items (triggers dashboard alerts)
- Mix of blanks, DTF transfers, HTV vinyl, embroidery thread, packaging

## Idempotency

The script is safe to re-run. It deletes only records tagged with
`DEMO-` prefixes, `demo+` emails, or `[MARKETING DEMO]` notes **in the
target org only**, then re-creates them fresh.

## Safety Guarantees

- **Tenant-scoped**: only touches the org you specify by slug
- **No global deletes**: cleanup queries always filter by `organizationId`
- **No org creation**: if the org doesn't exist, the script exits with an error
- **No Clerk changes**: does not create users or auth sessions
- **No secrets**: all emails are `@printflowpos.com`, all data is fictional
- **No production risk**: does not run unless you explicitly provide the slug

## Screenshots to Capture

After seeding, log into the demo org and capture:

| Screenshot                         | Page                   | What to show                                      |
| ---------------------------------- | ---------------------- | ------------------------------------------------- |
| `screenshot-dashboard.png`         | `/dashboard`           | Stats cards, recent orders, low-stock alerts       |
| `screenshot-orders.png`            | `/orders`              | Order list with mixed statuses, search visible     |
| `screenshot-order-detail.png`      | `/orders/<DEMO-ORD-001>` | Rush order detail with timeline, items, materials |
| `screenshot-inventory.png`         | `/inventory`           | Stock table with low-stock rows highlighted        |
| `screenshot-production.png`        | `/orders` (filtered)   | Filter to IN_PRODUCTION + QUALITY_CHECK statuses   |

Save screenshots to `frontend/public/marketing/`. See `frontend/public/marketing/README.md`
for browser setup and capture instructions.

## Cleanup

To remove all demo data without re-seeding, just run the script once and
interrupt it after the cleanup phase, or delete records matching the markers above.
