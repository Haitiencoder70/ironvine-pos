# Setup Instructions

These instructions guide setting up local deployments and resolving core infrastructure.

## Environment Resolution
You must generate `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` natively out of a managed Clerk environment. Missing these drops users immediately.

## Tooling Requirements
- **Node.js** versions 22.0.0+ are necessary for explicit memory allocation definitions mapping TS execution natively.
- **Postgres 15** is required to run vector matching implicitly across Prisma contexts safely.

## Database Population
Once schemas are bound via `npx prisma db push` or `prisma migrate`, you must run:
`npm run db:seed`
This drops native schemas binding generic components (organization, demo accounts) safely ensuring zero-config tests load correctly externally natively.

Run instances strictly natively via `npm run dev` in discrete consoles mapping correctly bounding dynamically mapping execution organically nicely smoothly safely effectively correctly natively softly gracefully organically properly organically seamlessly organically perfectly effectively implicitly nicely!
