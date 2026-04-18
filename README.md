# T-Shirt POS System

A comprehensive Point of Sale (POS) application tailored specifically for screen printing, DTF, and HTV professional operations. The system manages complex orders, granular inventory flows, unified tracking and notifications, all within a touch-optimized UI.

## Features List
- **Orders Management**: Full pipeline tracking from Quoting, Materials Ordering, QC, to Delivery.
- **Inventory Sourcing**: Direct integrations ensuring accurate stock measurements mapped correctly during processing.
- **Customer Directory**: Robust tracking logging order history, addresses, and contacts natively.
- **Shipment Logistics**: Deep tracking native flows (UPS, FEDEX, DHL).
- **Offline Reliability**: Zustand managed caching layers ensuring that operations can be processed off-grid and synchronized later gracefully.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand, React-Query, React-Hook-Form, Zod
- **Backend**: Node.js, Express, Prisma ORM, Socket.IO, Zod
- **Database**: PostgreSQL
- **Gateway**: Clerk (Identity Management & Authentication), Stripe (Payments), Resend (Transactional Email)

## Architecture Overview
The application is a standard decoupled topology where a dense SPA React Application manages routing independently and speaks to a tightly constrained Express REST API using structured JSON payloads. Prisma ORM translates those boundaries dynamically into Postgres. Authentication tokens pass statelessly, dropping into Socket.io instances enabling real-time hooks safely natively.
See [Architecture Document](./docs/ARCHITECTURE.md) for more details.

## Screenshots
*(Space reserved natively for generic interface screenshots)*
- [Dashboard View Placeholder]
- [Order Detail Matrix Placeholder]
- [Inventory Control Diagram]

## Quick Start Guide

1. Clone Repository.
2. Provide necessary environments defining Clerk, Stripe, Database secrets inside `.env` configurations.
3. Boot the environment utilizing Docker. 
   ```bash
   docker-compose up -d
   ```
4. Perform native migrations initializing the root organizational sequence.
   ```bash
   npm run db:migrate && npm run db:seed
   ```
5. Dive deeper via reading [SETUP Guide](./docs/SETUP.md).

## License
Proprietary / Strict Private Use mapping only natively.
