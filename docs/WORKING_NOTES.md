# PrintFlow POS Working Notes

Use this file as a short handoff for Codex/Claude sessions so the full chat history does not need to be repeated.

## Current Deployment

- Production app: `https://pos.printflowpos.com`
- Render service target: `ironvine-pos-1.onrender.com`
- Current production mode: central app domain only, because Render wildcard custom domains require a paid plan.
- Tenant subdomains are reserved in the app database, but redirects should stay on `pos.printflowpos.com` until wildcard domains are enabled in Render.

## Important Signup State

- Public pages are branded as PrintFlow POS.
- Clerk signup returns to `/signup`.
- New users complete the PrintFlow organization wizard after Clerk account creation.
- Backend handles Clerk instances where organization slugs are disabled by retrying Clerk org creation without a Clerk slug.
- Until Render wildcard custom domains are enabled, successful signup should redirect to:
  `https://pos.printflowpos.com/dashboard`

## Later Wildcard Switch

When Render is upgraded and `*.printflowpos.com` is added as a verified custom domain:

1. Keep Cloudflare wildcard DNS as DNS-only:
   `*.printflowpos.com -> ironvine-pos-1.onrender.com`
2. Add/verify `*.printflowpos.com` in Render.
3. Set frontend env:
   `VITE_ENABLE_TENANT_SUBDOMAINS=true`
4. Redeploy and retest a tenant URL like:
   `https://mytshirt.printflowpos.com/dashboard`

## Current Collaboration Pattern

- Use Codex for scoped code patches and verification.
- Use Claude for visual QA screenshots and route testing when helpful.
- Do not paste full project rules repeatedly; use the loaded `AGENTS.md`, `.clinerules`, and `CLAUDE.md`.
- Prefer narrow task prompts:
  `Goal`, `Current error`, `Expected behavior`, `Scope`.

## Local Noise To Ignore

The repo ignores local QA artifacts:

- `.playwright-mcp/`
- root screenshots such as `homepage*.png`, `pricing*.png`, `signin*.png`, `signup*.png`, `retest*.png`

These files are useful during testing but should not be committed.
