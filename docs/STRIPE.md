# Stripe Setup Guide

## 1. Create Stripe Account

Sign up at stripe.com. Use **Test Mode** (toggle in the top-left of the dashboard) during development.

## 2. Create Products and Prices

In Stripe dashboard → **Products** → **Add product**:

Create one product per paid plan:

| Product Name | Price | Interval | Env var |
|---|---|---|---|
| Starter Plan | $29.00 | Monthly | `STRIPE_STARTER_PRICE_ID` |
| Pro Plan | $79.00 | Monthly | `STRIPE_PRO_PRICE_ID` |

After creating each price, copy the **Price ID** (starts with `price_`) and add it to `backend/.env`.

## 3. Set Environment Variables

```env
STRIPE_SECRET_KEY       = sk_test_...
STRIPE_WEBHOOK_SECRET   = whsec_...   # set after webhook setup below
STRIPE_STARTER_PRICE_ID = price_...
STRIPE_PRO_PRICE_ID     = price_...
```

## 4. Configure Webhook — Local Development

**Install the Stripe CLI:**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Windows (direct download)
# https://github.com/stripe/stripe-cli/releases
```

**Log in:**
```bash
stripe login
```

**Forward events to your local backend:**
```bash
stripe listen --forward-to http://localhost:3001/api/stripe/webhook
```

Copy the webhook signing secret it prints (`whsec_test_...`) → set as `STRIPE_WEBHOOK_SECRET` in `backend/.env`.

**Keep this terminal open** while developing — it must be running for subscription changes to work locally.

## 5. Configure Webhook — Production

In Stripe dashboard → **Developers** → **Webhooks** → **Add endpoint**:

- **URL:** `https://api.yourapp.com/api/stripe/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

Copy the signing secret from the webhook detail page → set as `STRIPE_WEBHOOK_SECRET` in your production environment.

## 6. Test Cards

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Card declined |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 0002` | Charge blocked (fraud) |

Use any future expiry date (e.g. `12/28`) and any 3-digit CVC.

## 7. Testing the Full Webhook Flow Locally

1. Start backend: `cd backend && npm run dev`
2. Start Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
3. Trigger a test event in a third terminal:
   ```bash
   stripe trigger customer.subscription.updated
   ```
4. Check backend logs — you should see the event processed and the org plan updated in the database.

## 8. Going Live

1. In Stripe dashboard, switch from **Test Mode** to **Live Mode**
2. Recreate the same products and prices in live mode (price IDs will be different)
3. Copy live keys (`sk_live_...`) to your production environment variables
4. Create a new production webhook endpoint and copy its signing secret
5. Update `STRIPE_WEBHOOK_SECRET` in your production environment with the live secret
