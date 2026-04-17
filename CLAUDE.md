# T-Shirt Graphics POS System - Core Guide

## 🎯 Product Vision
A multi-tenant SaaS POS for T-shirt printing businesses. Key requirements:
- Multi-tenant isolation (`organizationId` on every table/query)
- Offline-first PWA (Vite PWA + IndexedDB sync)
- Touch-optimized UI (Targets ≥ 44px)
- Clerk Auth & Stripe Billing

## 🏗️ Core Architecture
- **Auth**: Clerk (Managed Orgs/Users)
- **Billing**: Stripe (Subscription-based)
- **Database**: PostgreSQL (Prisma)
- **Hardware**: WebUSB/HID adapters in `src/services/hardware/`
- **Real-time**: Socket.IO (Tenant-scoped rooms)

## 📝 Non-Negotiable Rules
- **Tenant Isolation**: Every model and query MUST include `organizationId`.
- **Touch-First**: All touch targets must be ≥ 44x44px.
- **Offline-Aware**: All mutations must check online status and queue if offline.
- **Named Exports**: Use named exports only; no default exports.
- **Zod Validation**: Validate all inputs on both client and server.
- **Complete Code**: No `// TODO` or partial implementations.

## 📚 Project References
- [Architecture & Models](ARCHITECTURE.md)
- [Design System](DESIGN_SYSTEM.md)
- [API Specification](API_SPEC.md)
- [Deployment Roadmap](DEPLOYMENT.md)
