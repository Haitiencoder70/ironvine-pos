---
date: "2026-04-20 17:33"
promoted: false
---

## Session Context: Production Auth Setup

### Problem Solved
- Clerk Development instances only work on localhost — was causing "Publishable key not valid" 500 error in Railway production.
- Fixed by creating a Clerk Production instance.

### Current State (2026-04-20)
- Created Clerk Production instance using domain: adequatemedia.net (temporary homelab domain)
- Clerk DNS: Verified ✅, SSL: Issued ✅
- Railway custom domain added: pos.adequatemedia.net (pointing to akdok1o4.up.railway.app)
- Railway env vars updated: CLERK_PUBLISHABLE_KEY (pk_live_*), VITE_CLERK_PUBLISHABLE_KEY (pk_live_*), CLERK_SECRET_KEY (sk_live_*), FRONTEND_URL=https://pos.adequatemedia.net, CORS_ORIGINS=https://pos.adequatemedia.net,http://localhost:5173
- Code updated and pushed: CORS defaults, CSP Helmet config updated for *.clerk.com production domains

### Remaining Issue
- Cloudflare CNAME for `pos` is set to Proxied (orange cloud) — needs to be DNS only (gray cloud) to fix SSL conflict with Railway.
- App loads but Chrome shows SSL frame error from chrome-error://chromewebdata/
- Server IS running correctly on port 8080 in Railway logs — no Clerk errors.

### Next Step
- Set Cloudflare `pos` CNAME to DNS only (gray cloud)
- Test https://pos.adequatemedia.net — should work fully
- Long-term: buy dedicated domain for ironvine POS (ironvinepos.com etc.) and switch Clerk to that

### Key Files Changed This Session
- Dockerfile.railway: ARG CLERK_PUBLISHABLE_KEY (maps to VITE_CLERK_PUBLISHABLE_KEY for Vite build)
- backend/src/config/env.ts: Updated CORS_ORIGINS default
- backend/src/app.ts: Added *.clerk.com to CSP scriptSrc, frameSrc, connectSrc

### Local Dev
- Local .env still uses pk_test_* dev keys — DO NOT replace with live keys for local work
- Local frontend runs on http://localhost:5173
