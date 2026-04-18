# Launch Checklist

## Infrastructure
- [ ] Production database configured (Neon/Supabase)
- [ ] Redis configured (Upstash recommended for serverless)
- [ ] CDN configured (Cloudflare)
- [ ] Backup system tested
- [ ] Monitoring configured (Sentry DSN set)
- [ ] Health checks passing at /health and /api/health
- [ ] Environment variables set in production
- [ ] SSL certificate configured

## Stripe
- [ ] Live mode enabled in Stripe dashboard
- [ ] Products created (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- [ ] Prices configured and Stripe Price IDs set in env
- [ ] Webhooks configured (stripe listen → /api/billing/webhook)
- [ ] Webhook secret set in STRIPE_WEBHOOK_SECRET
- [ ] Test checkout flow end-to-end
- [ ] Test subscription upgrade/downgrade

## Email
- [ ] Resend API key configured (RESEND_API_KEY)
- [ ] Email templates tested (invite, order confirmation)
- [ ] SPF/DKIM/DMARC records configured
- [ ] From address verified in Resend dashboard

## Security
- [ ] All environment variables set (no placeholder values)
- [ ] Secrets rotated from development values
- [ ] SSL certificate valid and auto-renewing
- [ ] Security headers verified (helmet CSP, HSTS)
- [ ] Rate limiting tested
- [ ] Clerk production keys active (not test keys)
- [ ] CORS origins set to production domains only

## Legal
- [ ] Privacy policy published at /privacy
- [ ] Terms of service published at /terms
- [ ] Cookie consent banner implemented
- [ ] GDPR compliance verified (data export, deletion)
- [ ] CCPA compliance verified

## Testing
- [ ] All unit tests passing
- [ ] E2E tests passing against staging
- [ ] Load testing completed (target: 100 concurrent users)
- [ ] Security audit completed
- [ ] Mobile/tablet layout verified
- [ ] Offline mode tested

## Marketing
- [ ] Landing page live and accurate
- [ ] Pricing page accurate (matches Stripe products)
- [ ] Documentation complete
- [ ] Status page live at /status
- [ ] Social media accounts created
- [ ] Analytics configured (Plausible / GA4)

## Launch
- [ ] Soft launch with 5-10 beta users
- [ ] Monitor Sentry for 48 hours
- [ ] Monitor slow-query log
- [ ] Fix critical bugs before public launch
- [ ] Public launch announcement
- [ ] Submit to directories (Product Hunt, Capterra, G2)
