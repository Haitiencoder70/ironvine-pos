# White-Label Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-serve white-label branding system — logo, favicon, brand colors, custom CSS, email sender identity — gated to PRO and ENTERPRISE plans.

**Architecture:** Four new fields added to the existing `Organization` model (flat, no new tables). A new `brandingService` handles validation, CSS sanitization, and Vercel Blob uploads. A `useBranding` React hook fetches org branding on mount and applies CSS variables to `document.documentElement`, making color changes cascade across the entire app instantly.

**Tech Stack:** Prisma (schema migration), Zod (validation), Multer + `@vercel/blob` (file uploads), React Query (frontend data fetching), CodeMirror via `@uiw/react-codemirror` (CSS editor), native `<input type="color">` (color pickers), CSS custom properties (theming).

---

## File Map

### New Backend Files
- `backend/src/validators/branding.ts` — Zod schemas for saveBranding input
- `backend/src/services/brandingService.ts` — getBranding, saveBranding, uploadAsset
- `backend/src/controllers/brandingController.ts` — HTTP handlers
- `backend/src/routes/branding.ts` — Express router

### Modified Backend Files
- `backend/prisma/schema.prisma` — add 4 fields to Organization
- `backend/src/lib/resend.ts` — add `getFromAddress()` helper
- `backend/src/services/notificationService.ts` — use `getFromAddress()` for all resend calls
- `backend/src/services/inviteService.ts` — use `getFromAddress()` for invite email
- `backend/src/app.ts` — register brandingRouter

### New Frontend Files
- `frontend/src/hooks/useBranding.ts` — fetch branding, apply CSS vars, update favicon/title
- `frontend/src/pages/settings/BrandingSettings.tsx` — full branding settings page

### Modified Frontend Files
- `frontend/tailwind.config.ts` — add `DEFAULT` CSS var to primary colors, add secondary color
- `frontend/src/hooks/usePlanLimits.ts` — add `canUseBranding`, `canUseCustomDomain`
- `frontend/src/App.tsx` — call `useBranding()`, inject `customCSS` style tag
- `frontend/src/pages/settings/Settings.tsx` — add Branding tab

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add 4 new optional fields to the Organization model**

Open `backend/prisma/schema.prisma`. The `Organization` model currently ends with `updatedAt DateTime @updatedAt` before the relations. Add these 4 fields after `secondaryColor String?` (line 31):

```prisma
  faviconUrl         String?
  customCSS          String?
  emailFromName      String?
  emailFromAddress   String?
```

The relevant section of the model should now read:
```prisma
  customDomain            String?
  primaryColor            String?
  secondaryColor          String?
  faviconUrl              String?
  customCSS               String?
  emailFromName           String?
  emailFromAddress        String?
  settings                Json                    @default("{}")
```

- [ ] **Step 2: Generate and run the migration**

```bash
cd backend
npx prisma migrate dev --name add_branding_fields
```

Expected output: `The following migration(s) have been created and applied from new schema changes: migrations/YYYYMMDDHHMMSS_add_branding_fields/migration.sql`

- [ ] **Step 3: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Verify TypeScript sees the new fields**

```bash
npx tsc --noEmit
```

Expected: no errors about the Organization type.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(branding): add faviconUrl, customCSS, emailFromName, emailFromAddress to Organization"
```

---

## Task 2: Backend Validator

**Files:**
- Create: `backend/src/validators/branding.ts`

- [ ] **Step 1: Create the validator file**

```typescript
// backend/src/validators/branding.ts
import { z } from 'zod';

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g. #2563eb)')
  .optional()
  .or(z.literal('').transform(() => undefined));

export const saveBrandingSchema = z.object({
  primaryColor:     hexColorSchema,
  secondaryColor:   hexColorSchema,
  emailFromName:    z.string().max(100).optional().or(z.literal('').transform(() => undefined)),
  emailFromAddress: z.string().email('Must be a valid email address').optional().or(z.literal('').transform(() => undefined)),
  customCSS:        z.string().max(50000, 'Custom CSS cannot exceed 50,000 characters').optional().or(z.literal('').transform(() => undefined)),
  customDomain:     z.string().max(253).optional().or(z.literal('').transform(() => undefined)),
});

export type SaveBrandingInput = z.infer<typeof saveBrandingSchema>;
```

- [ ] **Step 2: Verify types compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/validators/branding.ts
git commit -m "feat(branding): add Zod validator for branding save input"
```

---

## Task 3: Backend Branding Service

**Files:**
- Create: `backend/src/services/brandingService.ts`

- [ ] **Step 1: Create the service**

```typescript
// backend/src/services/brandingService.ts
import { put } from '@vercel/blob';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { SaveBrandingInput } from '../validators/branding';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const FAVICON_MIME_TYPES = new Set(['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;    // 2 MB
const FAVICON_MAX_BYTES = 512 * 1024;       // 512 KB

// ─── CSS Sanitizer ────────────────────────────────────────────────────────────

const CSS_DANGEROUS_PATTERNS = [
  /url\s*\(/gi,
  /@import/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /-moz-binding/gi,
  /behavior\s*:/gi,
];

function sanitizeCSS(raw: string): string {
  let css = raw;
  for (const pattern of CSS_DANGEROUS_PATTERNS) {
    css = css.replace(pattern, '/* removed */');
  }
  return css;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getBranding(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      logoUrl:          true,
      faviconUrl:       true,
      primaryColor:     true,
      secondaryColor:   true,
      customCSS:        true,
      emailFromName:    true,
      emailFromAddress: true,
      customDomain:     true,
      name:             true,
      plan:             true,
    },
  });
  return org;
}

export async function saveBranding(orgId: string, input: SaveBrandingInput) {
  const sanitized = {
    ...input,
    customCSS: input.customCSS ? sanitizeCSS(input.customCSS) : input.customCSS,
  };

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: sanitized,
    select: {
      logoUrl:          true,
      faviconUrl:       true,
      primaryColor:     true,
      secondaryColor:   true,
      customCSS:        true,
      emailFromName:    true,
      emailFromAddress: true,
      customDomain:     true,
      name:             true,
      plan:             true,
    },
  });
  return org;
}

export async function uploadBrandingAsset(
  orgId: string,
  file: Express.Multer.File,
  type: 'logo' | 'favicon',
): Promise<string> {
  const allowedTypes = type === 'logo' ? LOGO_MIME_TYPES : FAVICON_MIME_TYPES;
  const maxBytes = type === 'logo' ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES;

  if (!allowedTypes.has(file.mimetype)) {
    throw new AppError(
      400,
      `Invalid file type for ${type}. Allowed: ${[...allowedTypes].join(', ')}`,
      'INVALID_FILE_TYPE',
    );
  }

  if (file.size > maxBytes) {
    throw new AppError(
      400,
      `File too large. Maximum size for ${type}: ${Math.round(maxBytes / 1024)}KB`,
      'FILE_TOO_LARGE',
    );
  }

  const ext = file.originalname.split('.').pop() ?? (type === 'favicon' ? 'ico' : 'png');
  const path = `branding/${orgId}/${type}.${ext}`;

  const blob = await put(path, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    addRandomSuffix: false,
  });

  // Persist the URL on the org record
  const field = type === 'logo' ? 'logoUrl' : 'faviconUrl';
  await prisma.organization.update({
    where: { id: orgId },
    data: { [field]: blob.url },
  });

  return blob.url;
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/brandingService.ts
git commit -m "feat(branding): add brandingService with getBranding, saveBranding, uploadBrandingAsset"
```

---

## Task 4: Backend Controller + Routes

**Files:**
- Create: `backend/src/controllers/brandingController.ts`
- Create: `backend/src/routes/branding.ts`

- [ ] **Step 1: Create the controller**

```typescript
// backend/src/controllers/brandingController.ts
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';
import { saveBrandingSchema } from '../validators/branding';
import {
  getBranding,
  saveBranding,
  uploadBrandingAsset,
} from '../services/brandingService';

// ─── Plan gate helper ─────────────────────────────────────────────────────────

import { prisma } from '../lib/prisma';

async function requireBrandingPlan(orgId: string): Promise<void> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: { plan: true },
  });
  if (org.plan !== 'PRO' && org.plan !== 'ENTERPRISE') {
    throw new AppError(403, 'Branding features require a PRO or ENTERPRISE plan.', 'PLAN_REQUIRED');
  }
}

// ─── Multer setup ─────────────────────────────────────────────────────────────

export const brandingUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB hard cap at multer level
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    const data = await getBranding(organizationDbId!);
    res.json({ data });
  } catch (err) { next(err); }
};

export const saveBrandingHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await requireBrandingPlan(organizationDbId!);

    const parsed = saveBrandingSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.errors[0]?.message ?? 'Validation error', 'VALIDATION_ERROR');
    }

    const data = await saveBranding(organizationDbId!, parsed.data);
    res.json({ data });
  } catch (err) { next(err); }
};

export const uploadLogoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await requireBrandingPlan(organizationDbId!);

    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = await uploadBrandingAsset(organizationDbId!, req.file, 'logo');
    res.json({ data: { url } });
  } catch (err) { next(err); }
};

export const uploadFaviconHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { organizationDbId } = req as AuthenticatedRequest;
    await requireBrandingPlan(organizationDbId!);

    if (!req.file) throw new AppError(400, 'No file uploaded', 'NO_FILE');
    const url = await uploadBrandingAsset(organizationDbId!, req.file, 'favicon');
    res.json({ data: { url } });
  } catch (err) { next(err); }
};
```

- [ ] **Step 2: Create the router**

```typescript
// backend/src/routes/branding.ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { injectTenant } from '../middleware/tenant';
import {
  getBrandingHandler,
  saveBrandingHandler,
  uploadLogoHandler,
  uploadFaviconHandler,
  brandingUpload,
} from '../controllers/brandingController';

export const brandingRouter = Router();

brandingRouter.use(requireAuth, injectTenant);

brandingRouter.get('/',                    getBrandingHandler);
brandingRouter.put('/',                    saveBrandingHandler);
brandingRouter.post('/upload-logo',        brandingUpload.single('file'), uploadLogoHandler);
brandingRouter.post('/upload-favicon',     brandingUpload.single('file'), uploadFaviconHandler);
```

- [ ] **Step 3: Verify types compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/controllers/brandingController.ts backend/src/routes/branding.ts
git commit -m "feat(branding): add brandingController and brandingRouter"
```

---

## Task 5: Register Branding Router in app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Add the import**

In `backend/src/app.ts`, find the block of router imports (around line 16–34). Add after the `analyticsRouter` import:

```typescript
import { brandingRouter } from './routes/branding';
```

- [ ] **Step 2: Register the route**

In `app.ts`, find where routes are mounted (the `app.use('/api/...')` lines). Add after the analytics route registration:

```typescript
app.use('/api/branding', brandingRouter);
```

- [ ] **Step 3: Verify the server starts**

```bash
cd backend && npm run dev
```

Expected: `Server running on port 3001` with no errors.

- [ ] **Step 4: Smoke test the endpoint**

In a separate terminal (with the server running and a valid JWT from the browser's localStorage):

```bash
curl -s http://localhost:3001/api/branding \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "x-org-subdomain: YOUR_SUBDOMAIN" | jq .
```

Expected: `{ "data": { "logoUrl": null, "faviconUrl": null, ... } }`

- [ ] **Step 5: Commit**

```bash
git add backend/src/app.ts
git commit -m "feat(branding): register brandingRouter at /api/branding"
```

---

## Task 6: Dynamic From-Address for Emails

**Files:**
- Modify: `backend/src/lib/resend.ts`
- Modify: `backend/src/services/notificationService.ts`
- Modify: `backend/src/services/inviteService.ts`

- [ ] **Step 1: Add `getFromAddress` helper to resend.ts**

Replace the entire contents of `backend/src/lib/resend.ts` with:

```typescript
import { Resend } from 'resend';
import { env } from '../config/env';

export const resend = new Resend(env.RESEND_API_KEY ?? '');

export const DEFAULT_FROM_ADDRESS = 'YourApp <noreply@yourapp.com>';
export const SUPPORT_EMAIL = 'support@yourapp.com';
export const APP_URL = env.FRONTEND_URL;

/**
 * Returns a Resend-compatible "From" string for the given org.
 * Falls back to the platform default if the org hasn't configured custom branding.
 */
export function getFromAddress(org: {
  emailFromName?: string | null;
  emailFromAddress?: string | null;
}): string {
  if (org.emailFromName && org.emailFromAddress) {
    return `${org.emailFromName} <${org.emailFromAddress}>`;
  }
  return DEFAULT_FROM_ADDRESS;
}
```

- [ ] **Step 2: Update notificationService.ts to use getFromAddress**

In `backend/src/services/notificationService.ts`, find the `resend.emails.send(...)` calls. Each one has a `from:` field hardcoded. 

For each email send call in notificationService, change the pattern from:

```typescript
// Before — find calls like this:
await resend.emails.send({
  from: 'YourApp <noreply@yourapp.com>',
  ...
});
```

To fetch the org branding and use `getFromAddress`:

```typescript
// At top of notificationService.ts, add import:
import { resend, getFromAddress, APP_URL } from '../lib/resend';

// For each send call, add org lookup before it and use getFromAddress:
const orgForEmail = await prisma.organization.findUnique({
  where: { id: organizationId },
  select: { name: true, logoUrl: true, primaryColor: true, emailFromName: true, emailFromAddress: true },
});

await resend.emails.send({
  from: getFromAddress(orgForEmail ?? {}),
  ...
});
```

Note: `notificationService.ts` already looks up `org` for notification settings in some functions — where it already has org data, reuse it. Don't add a second lookup if one already exists in the function.

- [ ] **Step 3: Update inviteService.ts to use getFromAddress**

In `backend/src/services/inviteService.ts`, find the `resend.emails.send(...)` call. It currently uses a hardcoded from address. Update it:

```typescript
// Add import at top of inviteService.ts:
import { getFromAddress } from '../lib/resend';

// In the sendInviteEmail function, fetch org branding before the send call:
const orgForEmail = await prisma.organization.findUnique({
  where: { id: organizationId },
  select: { name: true, emailFromName: true, emailFromAddress: true },
});

// Update the send call:
await resend.emails.send({
  from: getFromAddress(orgForEmail ?? {}),
  to: [email],
  subject: `You've been invited to join ${orgName}`,
  html: inviteEmailHtml(orgName, inviterName, role, inviteLink),
});
```

- [ ] **Step 4: Verify types compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/resend.ts backend/src/services/notificationService.ts backend/src/services/inviteService.ts
git commit -m "feat(branding): dynamic from-address for emails using org emailFromName/emailFromAddress"
```

---

## Task 7: Install CodeMirror in Frontend

**Files:**
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 1: Install the package**

```bash
cd frontend && npm install @uiw/react-codemirror @codemirror/lang-css
```

Expected: packages added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Verify the frontend still builds**

```bash
npm run build
```

Expected: build succeeds with no errors. (Warnings about chunk size are OK.)

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): install @uiw/react-codemirror and @codemirror/lang-css"
```

---

## Task 8: useBranding Hook

**Files:**
- Create: `frontend/src/hooks/useBranding.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/hooks/useBranding.ts
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

const DEFAULT_PRIMARY   = '#2563eb';
const DEFAULT_SECONDARY = '#64748b';

export interface OrgBranding {
  logoUrl:          string | null;
  faviconUrl:       string | null;
  primaryColor:     string | null;
  secondaryColor:   string | null;
  customCSS:        string | null;
  emailFromName:    string | null;
  emailFromAddress: string | null;
  customDomain:     string | null;
  name:             string;
  plan:             'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
}

function applyFavicon(url: string | null): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url ?? '/favicon.ico';
}

function applyCustomCSS(css: string | null): void {
  const STYLE_ID = 'org-custom-css';
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!css) {
    style?.remove();
    return;
  }

  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function useBranding() {
  const query = useQuery<OrgBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const res = await api.get<{ data: OrgBranding }>('/api/branding');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const branding = query.data;

  useEffect(() => {
    const primary   = branding?.primaryColor   ?? DEFAULT_PRIMARY;
    const secondary = branding?.secondaryColor ?? DEFAULT_SECONDARY;

    document.documentElement.style.setProperty('--color-primary',   primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
  }, [branding?.primaryColor, branding?.secondaryColor]);

  useEffect(() => {
    if (branding?.name) {
      document.title = branding.name;
    }
  }, [branding?.name]);

  useEffect(() => {
    applyFavicon(branding?.faviconUrl ?? null);
  }, [branding?.faviconUrl]);

  useEffect(() => {
    applyCustomCSS(branding?.customCSS ?? null);
  }, [branding?.customCSS]);

  return {
    logo:             branding?.logoUrl          ?? null,
    faviconUrl:       branding?.faviconUrl       ?? null,
    primaryColor:     branding?.primaryColor     ?? DEFAULT_PRIMARY,
    secondaryColor:   branding?.secondaryColor   ?? DEFAULT_SECONDARY,
    customCSS:        branding?.customCSS        ?? null,
    emailFromName:    branding?.emailFromName     ?? null,
    emailFromAddress: branding?.emailFromAddress ?? null,
    plan:             branding?.plan             ?? 'FREE',
    isLoading:        query.isLoading,
  };
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useBranding.ts
git commit -m "feat(branding): add useBranding hook — fetches org branding and applies CSS vars/favicon/title"
```

---

## Task 9: Update App.tsx to Use useBranding

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add useBranding to the app component**

In `frontend/src/App.tsx`, find the `AppRouter` component (or the top-level component inside the `TenantProvider` that wraps the app routes). Add the `useBranding` call inside it.

Find the existing component that renders inside `TenantProvider` — it currently renders `<UpgradeModal>` and `<RouterProvider>`. Add the hook there:

```typescript
// Add import at the top of App.tsx:
import { useBranding } from '@/hooks/useBranding';

// Add a new inner component that calls the hook:
function BrandingLoader(): null {
  useBranding();
  return null;
}
```

Then in the JSX that renders the app router (the part wrapped by `TenantProvider`), add `<BrandingLoader />` as a sibling to the existing children:

```tsx
// Inside the TenantProvider-wrapped section, add:
<BrandingLoader />
```

The `BrandingLoader` component renders nothing — it just runs the hook effects. Place it inside `TenantProvider` so it has auth/tenant context when it fetches.

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(branding): load org branding on app mount via BrandingLoader"
```

---

## Task 10: Update Tailwind Config

**Files:**
- Modify: `frontend/tailwind.config.ts`

- [ ] **Step 1: Add CSS variable as DEFAULT for primary, add secondary color**

In `frontend/tailwind.config.ts`, update the `colors` section. The current `primary` object has hardcoded blue shades. Add `DEFAULT` and also add a `secondary` entry:

```typescript
colors: {
  obsidian: '#0a0a0b',
  primary: {
    DEFAULT: 'var(--color-primary)',  // ← add this line
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  secondary: {
    DEFAULT: 'var(--color-secondary)',  // ← add this
  },
},
```

Note: Remove the duplicate `50: '#eff6ff'` entry that currently appears twice on lines 10–11.

- [ ] **Step 2: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.ts
git commit -m "feat(branding): add CSS variable DEFAULT for primary/secondary in Tailwind config"
```

---

## Task 11: Update usePlanLimits

**Files:**
- Modify: `frontend/src/hooks/usePlanLimits.ts`

- [ ] **Step 1: Add canUseBranding and canUseCustomDomain**

In `frontend/src/hooks/usePlanLimits.ts`, after the `canUploadFile` callback and before the `limitStatuses` block, add:

```typescript
const canUseBranding = billing
  ? billing.plan === 'PRO' || billing.plan === 'ENTERPRISE'
  : false;

const canUseCustomDomain = billing
  ? billing.plan === 'ENTERPRISE'
  : false;
```

Then add both to the return object:

```typescript
return {
  billing,
  isAtLimit,
  canCreateOrder,
  canAddCustomer,
  canAddUser,
  canAddInventory,
  canUploadFile,
  showUpgradeModal,
  limitStatuses,
  canUseBranding,       // ← add
  canUseCustomDomain,   // ← add
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/usePlanLimits.ts
git commit -m "feat(branding): add canUseBranding and canUseCustomDomain to usePlanLimits"
```

---

## Task 12: BrandingSettings Page

**Files:**
- Create: `frontend/src/pages/settings/BrandingSettings.tsx`

- [ ] **Step 1: Create the page**

```typescript
// frontend/src/pages/settings/BrandingSettings.tsx
import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { css } from '@codemirror/lang-css';
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  LockClosedIcon,
  PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { api } from '../../lib/api';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import type { OrgBranding } from '../../hooks/useBranding';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BrandingFormState {
  primaryColor:     string;
  secondaryColor:   string;
  emailFromName:    string;
  emailFromAddress: string;
  customCSS:        string;
  customDomain:     string;
}

const DEFAULTS: BrandingFormState = {
  primaryColor:     '#2563eb',
  secondaryColor:   '#64748b',
  emailFromName:    '',
  emailFromAddress: '',
  customCSS:        '',
  customDomain:     '',
};

// ─── Uploader sub-component ───────────────────────────────────────────────────

function AssetUploader({
  label,
  currentUrl,
  accept,
  uploadEndpoint,
  onUploaded,
  previewSize = 48,
}: {
  label: string;
  currentUrl: string | null;
  accept: string;
  uploadEndpoint: string;
  onUploaded: (url: string) => void;
  previewSize?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post<{ data: { url: string } }>(uploadEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploaded(res.data.data.url);
      toast.success(`${label} uploaded`);
    } catch {
      toast.error(`Failed to upload ${label.toLowerCase()}`);
    } finally {
      setUploading(false);
    }
  }, [uploadEndpoint, label, onUploaded]);

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <div
        className="flex-shrink-0 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden"
        style={{ width: previewSize * 2, height: previewSize }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="max-h-full max-w-full object-contain p-1" />
        ) : (
          <PhotoIcon className="h-6 w-6 text-gray-300" />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
          {uploading ? 'Uploading…' : `Upload ${label}`}
        </button>
        {currentUrl && (
          <button
            type="button"
            onClick={() => onUploaded('')}
            className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Upgrade gate ─────────────────────────────────────────────────────────────

function BrandingUpgradeGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-blue-50 p-4 mb-4">
        <LockClosedIcon className="h-8 w-8 text-blue-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">White-Label Branding</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        Customize your logo, colors, favicon, and email branding. Available on PRO and ENTERPRISE plans.
      </p>
      <a
        href="/settings?tab=billing"
        className="inline-flex items-center gap-2 min-h-[44px] px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Upgrade to PRO
      </a>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandingSettings() {
  const queryClient = useQueryClient();
  const { canUseBranding, canUseCustomDomain } = usePlanLimits();

  const { data: branding, isLoading } = useQuery<OrgBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const res = await api.get<{ data: OrgBranding }>('/api/branding');
      return res.data.data;
    },
  });

  const [form, setForm] = useState<BrandingFormState>(() => ({
    primaryColor:     branding?.primaryColor     ?? DEFAULTS.primaryColor,
    secondaryColor:   branding?.secondaryColor   ?? DEFAULTS.secondaryColor,
    emailFromName:    branding?.emailFromName     ?? '',
    emailFromAddress: branding?.emailFromAddress ?? '',
    customCSS:        branding?.customCSS        ?? '',
    customDomain:     branding?.customDomain     ?? '',
  }));

  // Sync form when branding loads
  const [synced, setSynced] = useState(false);
  if (branding && !synced) {
    setForm({
      primaryColor:     branding.primaryColor     ?? DEFAULTS.primaryColor,
      secondaryColor:   branding.secondaryColor   ?? DEFAULTS.secondaryColor,
      emailFromName:    branding.emailFromName     ?? '',
      emailFromAddress: branding.emailFromAddress ?? '',
      customCSS:        branding.customCSS        ?? '',
      customDomain:     branding.customDomain     ?? '',
    });
    setSynced(true);
  }

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  if (branding && logoUrl === null) setLogoUrl(branding.logoUrl);
  if (branding && faviconUrl === null) setFaviconUrl(branding.faviconUrl);

  const saveMutation = useMutation({
    mutationFn: async (data: BrandingFormState) => {
      await api.put('/api/branding', data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['branding'] });
      toast.success('Branding saved');
    },
    onError: () => {
      toast.error('Failed to save branding');
    },
  });

  // Live-preview color changes immediately
  const handleColorChange = (field: 'primaryColor' | 'secondaryColor', value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    const cssVar = field === 'primaryColor' ? '--color-primary' : '--color-secondary';
    document.documentElement.style.setProperty(cssVar, value);
  };

  const handleRestoreDefaults = () => {
    setForm((f) => ({ ...f, primaryColor: DEFAULTS.primaryColor, secondaryColor: DEFAULTS.secondaryColor, customCSS: '' }));
    document.documentElement.style.setProperty('--color-primary',   DEFAULTS.primaryColor);
    document.documentElement.style.setProperty('--color-secondary', DEFAULTS.secondaryColor);
    void saveMutation.mutateAsync({ ...form, primaryColor: DEFAULTS.primaryColor, secondaryColor: DEFAULTS.secondaryColor, customCSS: '' });
  };

  if (!canUseBranding) return <BrandingUpgradeGate />;
  if (isLoading) return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <PaintBrushIcon className="h-6 w-6 text-gray-400" />
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Branding</h2>
          <p className="text-sm text-gray-500">Customize how your POS looks and feels.</p>
        </div>
      </div>

      {/* Logo */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Logo</h3>
        <AssetUploader
          label="Logo"
          currentUrl={logoUrl}
          accept="image/png,image/jpeg,image/svg+xml"
          uploadEndpoint="/api/branding/upload-logo"
          onUploaded={(url) => {
            setLogoUrl(url || null);
            void queryClient.invalidateQueries({ queryKey: ['branding'] });
          }}
          previewSize={48}
        />
        <p className="text-xs text-gray-400">PNG, JPG, or SVG. Max 2 MB. Recommended: 200×60px.</p>
      </section>

      {/* Favicon */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Favicon</h3>
        <AssetUploader
          label="Favicon"
          currentUrl={faviconUrl}
          accept="image/png,image/x-icon"
          uploadEndpoint="/api/branding/upload-favicon"
          onUploaded={(url) => {
            setFaviconUrl(url || null);
            void queryClient.invalidateQueries({ queryKey: ['branding'] });
          }}
          previewSize={32}
        />
        <p className="text-xs text-gray-400">PNG or ICO. Max 512 KB. Recommended: 32×32px.</p>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Brand Colors</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Primary */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Primary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                className="h-11 w-11 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.primaryColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                    handleColorChange('primaryColor', e.target.value);
                  }
                }}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                placeholder="#2563eb"
              />
            </div>
          </div>

          {/* Secondary */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Secondary Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                className="h-11 w-11 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.secondaryColor}
                onChange={(e) => {
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                    handleColorChange('secondaryColor', e.target.value);
                  }
                }}
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                placeholder="#64748b"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Email Branding */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Email Branding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">From Name</label>
            <input
              type="text"
              value={form.emailFromName}
              onChange={(e) => setForm((f) => ({ ...f, emailFromName: e.target.value }))}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              placeholder="Acme Printing"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">From Address</label>
            <input
              type="email"
              value={form.emailFromAddress}
              onChange={(e) => setForm((f) => ({ ...f, emailFromAddress: e.target.value }))}
              className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
              placeholder="orders@acmeprinting.com"
            />
            <p className="text-xs text-gray-400">Must be a verified sender in your Resend dashboard.</p>
          </div>
        </div>
      </section>

      {/* Custom CSS */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom CSS</h3>
        <p className="text-xs text-gray-400">Advanced: inject CSS into the app. Changes apply after Save.</p>
        <div className="rounded-lg border border-gray-300 overflow-hidden">
          <CodeMirror
            value={form.customCSS}
            height="200px"
            extensions={[css()]}
            onChange={(value) => setForm((f) => ({ ...f, customCSS: value }))}
            theme="light"
          />
        </div>
      </section>

      {/* Custom Domain (ENTERPRISE only) */}
      {canUseCustomDomain && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Custom Domain</h3>
          <input
            type="text"
            value={form.customDomain}
            onChange={(e) => setForm((f) => ({ ...f, customDomain: e.target.value }))}
            className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
            placeholder="pos.acmeprinting.com"
          />
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">DNS Setup Instructions</p>
            <p>Add a CNAME record pointing your domain to your app subdomain, then contact support to provision SSL.</p>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={() => void saveMutation.mutateAsync(form)}
          disabled={saveMutation.isPending}
          className="min-h-[44px] px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleRestoreDefaults}
          disabled={saveMutation.isPending}
          className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Restore Defaults
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/settings/BrandingSettings.tsx
git commit -m "feat(branding): add BrandingSettings page with logo/favicon upload, color pickers, CSS editor"
```

---

## Task 13: Add Branding Tab to Settings.tsx

**Files:**
- Modify: `frontend/src/pages/settings/Settings.tsx`

- [ ] **Step 1: Add the import**

At the top of `frontend/src/pages/settings/Settings.tsx`, add after the existing imports:

```typescript
import { BrandingSettings } from './BrandingSettings';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
```

- [ ] **Step 2: Add 'branding' to the Tab type and TABS array**

Find the `type Tab = ...` line and add `'branding'`:

```typescript
type Tab = 'general' | 'users' | 'tax' | 'notifications' | 'integrations' | 'branding' | 'billing' | 'modules';
```

Add to the `TABS` array after the integrations entry and before the billing entry:

```typescript
{ id: 'branding', label: 'Branding', icon: <PaintBrushIcon className="h-5 w-5" /> },
```

- [ ] **Step 3: Add the render case**

Find the section where tabs render their content (look for `activeTab === 'billing'` or similar). Add a case for branding:

```tsx
{activeTab === 'branding' && <BrandingSettings />}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Verify frontend builds**

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/settings/Settings.tsx
git commit -m "feat(branding): add Branding tab to Settings page"
```

---

## Self-Review

### Spec Coverage Check
| Spec Requirement | Task |
|---|---|
| 4 new Organization fields | Task 1 |
| Zod validation (hex colors, email) | Task 2 |
| uploadLogo / uploadFavicon (Vercel Blob) | Tasks 3, 4 |
| validateCustomCSS (sanitize url/import/expression) | Task 3 |
| GET/PUT /api/branding routes | Tasks 4, 5 |
| Plan gate (PRO+) on all branding endpoints | Task 4 |
| Dynamic email from-address | Task 6 |
| useBranding hook + CSS vars + favicon + title | Task 8 |
| App.tsx — load branding on mount | Task 9 |
| Tailwind CSS variable colors | Task 10 |
| canUseBranding / canUseCustomDomain | Task 11 |
| BrandingSettings page | Task 12 |
| Logo/favicon uploader with preview | Task 12 |
| Color pickers with live preview | Task 12 |
| CodeMirror CSS editor | Tasks 7, 12 |
| Restore Defaults button | Task 12 |
| Plan gate UI (upgrade CTA for FREE/STARTER) | Task 12 |
| Custom domain UI shell (ENTERPRISE only) | Task 12 |
| Branding tab in Settings.tsx | Task 13 |

All spec requirements covered. ✓

### Type Consistency Check
- `OrgBranding` interface defined in `useBranding.ts` (Task 8) and imported in `BrandingSettings.tsx` (Task 12) ✓
- `SaveBrandingInput` defined in `validators/branding.ts` (Task 2), used in `brandingService.ts` (Task 3) and `brandingController.ts` (Task 4) ✓
- `uploadBrandingAsset` signature in Task 3 matches usage in Task 4 ✓
- `getFromAddress` returns `string`, used as `from:` in Resend calls ✓
