# Deployment Guide

## Stack

| Layer | Service |
|---|---|
| Frontend | Vercel |
| Backend | Vercel (serverless) or Railway |
| Database | Neon (PostgreSQL) |
| Auth | Clerk |
| Payments | Stripe |
| Email | Resend |

## 1. Database (Neon)

1. Create account at neon.tech
2. Create project → select region closest to your users
3. Copy the **pooled connection string** (contains `?pgbouncer=true`)
4. Run migrations against it:
   ```bash
   DATABASE_URL=<pooled-url> npx prisma migrate deploy
   ```

## 2. Clerk (Auth)

1. Create account at clerk.com
2. Create application → enable **Organizations**
3. In **API Keys**, copy `Publishable Key` and `Secret Key`
4. In **Domains**, add your production domain (e.g. `yourapp.com`)
5. Add wildcard support: also add `*.yourapp.com` as an allowed domain

## 3. Stripe (Billing)

See [STRIPE.md](STRIPE.md) for full product/price setup.

After setup, copy:
- Secret Key (`sk_live_...`)
- Webhook signing secret (`whsec_...`)
- Price IDs for each plan

## 4. Backend Deployment (Vercel)

```bash
cd backend
vercel --prod
```

**Required environment variables in Vercel dashboard:**

```
DATABASE_URL            = <Neon pooled URL>
CLERK_SECRET_KEY        = sk_live_...
CLERK_PUBLISHABLE_KEY   = pk_live_...
STRIPE_SECRET_KEY       = sk_live_...
STRIPE_WEBHOOK_SECRET   = whsec_...
STRIPE_PRO_PRICE_ID     = price_...
STRIPE_STARTER_PRICE_ID = price_...
FRONTEND_URL            = https://yourapp.com
CORS_ORIGINS            = https://yourapp.com,https://*.yourapp.com
NODE_ENV                = production
```

## 5. Frontend Deployment (Vercel)

```bash
cd frontend
vercel --prod
```

**Required environment variables:**

```
VITE_CLERK_PUBLISHABLE_KEY = pk_live_...
VITE_API_URL               = https://api.yourapp.com
VITE_APP_DOMAIN            = yourapp.com
```

## 6. DNS & Wildcard Subdomains

In your DNS provider (Cloudflare recommended):

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `*` | `cname.vercel-dns.com` |

The wildcard `*` record routes all tenant subdomains (`acme.yourapp.com`) to your frontend.

In Vercel → your frontend project → **Domains**: add `*.yourapp.com`.

## 7. Stripe Webhook

In Stripe dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- URL: `https://api.yourapp.com/api/stripe/webhook`
- Events to listen for:
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `checkout.session.completed`

Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`.

## 8. Post-deployment checklist

- [ ] `GET https://api.yourapp.com/api/health` returns `200`
- [ ] Signup flow works end-to-end on production domain
- [ ] Stripe test payment succeeds and upgrades plan
- [ ] Wildcard subdomain resolves (`acme.yourapp.com` loads the app)
- [ ] Clerk session persists after page reload
- [ ] Webhook events show as delivered in Stripe dashboard
