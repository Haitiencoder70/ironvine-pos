# White-Label Branding System — Design Spec

**Date:** 2026-04-17
**Status:** Approved

---

## Overview

Add a white-label branding system to the touchscreenpos SaaS platform. Allows organizations on PRO and ENTERPRISE plans to customize their logo, favicon, brand colors, custom CSS, and email sender identity. Custom domain support is scoped to ENTERPRISE only (UI shell only — no DNS provisioning in this feature).

---

## Plan Gates

| Feature | FREE | STARTER | PRO | ENTERPRISE |
|---|---|---|---|---|
| Logo & Favicon | — | — | ✓ | ✓ |
| Brand Colors | — | — | ✓ | ✓ |
| Custom CSS | — | — | ✓ | ✓ |
| Email From Name/Address | — | — | ✓ | ✓ |
| Custom Domain | — | — | — | ✓ (UI shell only) |

---

## Section 1 — Database & Backend

### Schema Changes

Add 4 fields to the existing `Organization` model (Option A — flat fields, consistent with existing `primaryColor`, `secondaryColor`, `logoUrl`, `customDomain` already on the model):

```prisma
faviconUrl      String?
customCSS       String?
emailFromName   String?
emailFromAddress String?
```

No new tables. A single Prisma migration.

### New Service: `backend/src/services/brandingService.ts`

**`uploadAsset(orgId, file, type: 'logo' | 'favicon')`**
- Validates MIME type: logo accepts PNG/JPG/SVG; favicon accepts PNG/ICO
- Validates file size: logo ≤2MB, favicon ≤512KB
- Uploads to Vercel Blob at path `/{orgId}/{type}/{filename}`
- Updates org record with new URL
- Returns the public URL

**`saveBranding(orgId, data)`**
- Zod validates hex color format (`/^#[0-9A-Fa-f]{6}$/`)
- Sanitizes `customCSS`: strips `url()`, `@import`, `expression()`, `javascript:` patterns
- Saves all branding fields to org record

**`getBranding(orgId)`**
- Returns all branding fields from org record

### New Routes

All routes are tenant-scoped (organizationId from JWT) and plan-gated (PRO+):

| Method | Path | Description |
|---|---|---|
| GET | `/api/branding` | Fetch org branding |
| PUT | `/api/branding` | Save branding fields |
| POST | `/api/branding/upload-logo` | Upload logo to Vercel Blob |
| POST | `/api/branding/upload-favicon` | Upload favicon to Vercel Blob |

### Email Template Updates

- `baseTemplate()` in `backend/src/templates/emails/base.ts` gains optional `primaryColor` and `emailFromName` params
- `FROM_ADDRESS` in `backend/src/lib/resend.ts` becomes a helper function `getFromAddress(org)` that returns the org's `emailFromName`/`emailFromAddress` if set, falling back to the default
- All existing email senders (`notificationService.ts`, `inviteService.ts`, etc.) updated to call `getFromAddress(org)` and pass `primaryColor` to templates

---

## Section 2 — Frontend Data Layer

### `useBranding` Hook (`frontend/src/hooks/useBranding.ts`)

- Fetches from `GET /api/branding` via React Query
- On successful load:
  - Sets `document.documentElement.style.setProperty('--color-primary', primaryColor)`
  - Sets `document.documentElement.style.setProperty('--color-secondary', secondaryColor)`
  - Updates `document.title` to org name
  - Creates/replaces `<link rel="icon">` with `faviconUrl`
- Falls back to default colors (`#2563eb` primary, `#64748b` secondary) if fields are null
- Returns: `{ logo, faviconUrl, primaryColor, secondaryColor, customCSS, emailFromName, emailFromAddress, isLoading }`

### `App.tsx` Changes

- Calls `useBranding()` once at top level on mount
- Injects `customCSS` as a `<style id="org-custom-css">` tag into `<head>` (already sanitized server-side)
- Replaces/removes the tag when branding updates

### Tailwind Config Update (`frontend/tailwind.config.js`)

```js
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: 'var(--color-primary)',
        hover: 'color-mix(in srgb, var(--color-primary) 85%, black)',
      },
      secondary: {
        DEFAULT: 'var(--color-secondary)',
      },
    },
  },
}
```

New components use `bg-primary`, `text-primary` etc. Existing hardcoded Tailwind color classes are unaffected.

### Plan Gate

Reuse existing `usePlanLimits` hook — add two derived booleans:
- `canUseBranding`: `plan === 'PRO' || plan === 'ENTERPRISE'`
- `canUseCustomDomain`: `plan === 'ENTERPRISE'`

No new hook needed.

---

## Section 3 — BrandingSettings Page

**File:** `frontend/src/pages/settings/BrandingSettings.tsx`

### Plan Gate Behavior

- FREE or STARTER: renders a locked state with upgrade CTA (no form shown)
- PRO+: renders the full form

### Layout

Two-column layout:
- **Left (60%):** form controls
- **Right (40%):** live mini-preview (mockup of sidebar + topbar using current CSS var values)

### Form Sections

1. **Logo**
   - Drag-and-drop uploader with image preview
   - Shows current logo URL if set
   - "Remove" button clears the field
   - Accepts PNG/JPG/SVG, ≤2MB
   - Uploads immediately on file select via `POST /api/branding/upload-logo`

2. **Favicon**
   - Same uploader pattern
   - Accepts PNG/ICO, ≤512KB
   - 16×16 preview box
   - Uploads immediately via `POST /api/branding/upload-favicon`

3. **Colors**
   - `<input type="color">` picker + hex text input for primary color
   - `<input type="color">` picker + hex text input for secondary color
   - Changes update `--color-primary` / `--color-secondary` on `document.documentElement` immediately (live preview, no save needed)

4. **Email Branding**
   - "From Name" text input (e.g. "Acme Printing")
   - "From Address" text input (e.g. "orders@acmeprinting.com")
   - Note: address must be a verified sender in Resend

5. **Custom CSS** (PRO+ only)
   - CodeMirror editor, CSS language mode
   - Changes are not applied live (applied only after Save)

6. **Custom Domain** (ENTERPRISE only — UI shell)
   - Text input for domain
   - Static DNS instructions panel
   - No backend verification logic in this feature

### Buttons

- **Save Changes** — POSTs all form state to `PUT /api/branding`, shows toast on success/error
- **Restore Defaults** — resets colors to app defaults (`#2563eb`, `#64748b`), clears custom CSS, updates CSS vars immediately, then auto-saves

### Settings.tsx Integration

- Add "Branding" tab with paint-brush icon between Integrations and Billing tabs
- Tab renders `<BrandingSettings />`
- Tab type union extended: `type Tab = ... | 'branding'`

---

## Out of Scope (This Feature)

- DNS verification and SSL provisioning for custom domains (UI shell only)
- Email address verification flow with Resend (just stores the value; user must verify in Resend dashboard)
- Color shade generation (only DEFAULT and hover via color-mix)
- Monaco editor (using CodeMirror instead — lighter bundle)

---

## File Checklist

### New Files
- `backend/src/services/brandingService.ts`
- `backend/src/controllers/brandingController.ts`
- `backend/src/routes/branding.ts`
- `backend/src/validators/branding.ts`
- `frontend/src/hooks/useBranding.ts`
- `frontend/src/pages/settings/BrandingSettings.tsx`

### Modified Files
- `backend/prisma/schema.prisma` — 4 new fields on Organization
- `backend/src/lib/resend.ts` — `getFromAddress()` helper
- `backend/src/templates/emails/base.ts` — `primaryColor`, `emailFromName` params
- `backend/src/services/notificationService.ts` — use `getFromAddress()`
- `backend/src/services/inviteService.ts` — use `getFromAddress()`
- `backend/src/index.ts` — register branding router
- `frontend/src/App.tsx` — call `useBranding()`, inject custom CSS
- `frontend/tailwind.config.js` — CSS variable colors
- `frontend/src/pages/settings/Settings.tsx` — add Branding tab
- `frontend/src/hooks/usePlanLimits.ts` — add `canUseBranding`, `canUseCustomDomain`
