# Backend API Service

The data access layer powering the T-Shirt POS ecosystem. It features robust typing leveraging Zod to Prisma end-to-end integration, event-driven webhooks mapping to third-party services (Clerk, Stripe, Resend) and Socket.IO for real-time mutation broad-casting.

## Execution Requirements

- Node.js >= 22
- PostgreSQL runtime

## Essential Commands

- `npm run dev`: Launch the server utilizing hot-reload `tsx`.
- `npm run build`: Compile via TS down to standard JS into the `dist/` block.
- `npm run start`: Boot up the unified standard server from `dist/` explicitly enforcing the production topology.
- `npm run lint` & `npm run typecheck`: Standard checks.
- `npm run db:push`: Pushes db changes without generating full migration blocks (only use locally if experimenting).
- `npm run db:migrate`: For formally merging migrations on staging/prod.
- `npm run db:seed`: Load critical default structures mapping organizational defaults to Clerk boundaries.

## Production Flags

When deployed, this server spins up:
- `compression` logic reducing outgoing sizes mapping to JSON APIs.
- Strict Rate-limiting against abusive endpoints.
- `helmet` ensuring CSP and cross-origin standards hold strong context boundaries.
- Graceful shutdown workflows blocking SIGTERM processes until background processes empty their connection pooling effectively.
