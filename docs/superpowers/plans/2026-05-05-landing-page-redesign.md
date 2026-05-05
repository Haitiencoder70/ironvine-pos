# Landing Page Visual Redesign -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the light blue landing page with a dark Urban Bold design (near-black background, orange accents, bold type) and complete the page with a closing CTA strip and footer.

**Architecture:** Single file replacement -- `frontend/src/pages/marketing/LandingPage.tsx`. Remove the hero background image, overlay, and embedded workflow strip. Rebuild each section with Tailwind arbitrary value classes using the dark palette. Add two new sections (CTA strip, footer) to fix the abrupt page ending.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS (arbitrary value syntax `bg-[#hex]`), Heroicons, React Router DOM, Clerk

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/pages/marketing/LandingPage.tsx` | Full section-by-section replacement |
| `frontend/public/printflow-logo-horizontal-white.png` | No change -- already correct for dark backgrounds |

No new files. No new dependencies. No Tailwind config changes.

---

### Task 1: Baseline check + update constants

**Files:**
- Modify: `frontend/src/pages/marketing/LandingPage.tsx:1-42`

- [ ] **Step 1: Confirm typecheck passes before touching anything**

```bash
cd "I:/POS Projects/touchscreenpos"
npm run typecheck --prefix frontend
```

Expected: zero errors. If errors exist, stop and fix them before proceeding.

- [ ] **Step 2: Replace imports and constants**

Replace the top of the file (lines 1--42) with:

```tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  DeviceTabletIcon,
} from '@heroicons/react/24/outline';

const WORKFLOW = ['Quote', 'Approve', 'Order materials', 'Print', 'Quality check', 'Ship'] as const;

const FEATURES = [
  {
    title: 'Orders stay connected',
    body: 'Quote details, customer history, line items, due dates, art files, and production status all live in one tenant-scoped workspace.',
    Icon: ClipboardDocumentListIcon,
  },
  {
    title: 'Inventory moves with the job',
    body: 'Receive blank shirts, reserve stock, track low inventory, and connect purchase orders back to the customer order that needs them.',
    Icon: CubeIcon,
  },
  {
    title: 'Built for the counter',
    body: 'Touch-friendly screens, tablet-first layouts, offline-aware queues, and printer-ready workflows keep the shop moving when the line gets busy.',
    Icon: DeviceTabletIcon,
  },
] as const;

const HERO_ORDERS = [
  { id: 'ORD-202605-0182', detail: '50x Black Tee -- DTF Front', status: 'Rush', badge: 'bg-[#ff6b00] text-white' },
  { id: 'ORD-202605-0184', detail: '24x White Hoodie -- Screen Print', status: 'In Production', badge: 'bg-[#1a2a1a] text-[#4caf50]' },
  { id: 'ORD-202605-0188', detail: '12x Navy Polo -- Embroidery', status: 'Ready to Ship', badge: 'bg-[#142a3a] text-[#38bdf8]' },
] as const;

const PROD_ORDERS = [
  { id: 'ORD-202605-0182', detail: '50x Black Tee -- DTF Front · Stark Industries', status: 'Rush', badge: 'bg-[#ff6b00] text-white' },
  { id: 'ORD-202605-0184', detail: '24x White Hoodie -- Screen Print · Wayne Ent.', status: 'In Production', badge: 'bg-[#1a2a1a] text-[#4caf50]' },
  { id: 'ORD-202605-0188', detail: '12x Navy Polo -- Embroidery · Acme Corp', status: 'Ready to Ship', badge: 'bg-[#142a3a] text-[#38bdf8]' },
  { id: 'ORD-202605-0190', detail: '100x Grey Tee -- HTV · Daily Planet', status: 'Shipped', badge: 'bg-[#2a1a2a] text-[#a855f7]' },
] as const;
```

Note: `HERO_IMAGE`, `OPERATIONS`, `CheckCircleIcon`, `CloudArrowDownIcon`, `PrinterIcon`, and `TruckIcon` are intentionally removed -- no longer used. The remaining sections still referencing old markup will be replaced in Tasks 2-5, which is why typecheck may show errors mid-plan until Task 5 is complete. Run the full `typecheck` only at the end of each task's own changes -- do not block on errors from sections not yet replaced.

- [ ] **Step 3: Confirm typecheck still passes**

```bash
npm run typecheck --prefix frontend
```

Expected: zero errors (removed imports are no longer referenced).

- [ ] **Step 4: Commit**

```bash
cd "I:/POS Projects/touchscreenpos"
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "refactor(landing): remove hero image constant and update imports"
```

---

### Task 2: Replace component shell, nav, and hero section

**Files:**
- Modify: `frontend/src/pages/marketing/LandingPage.tsx:43-142`

- [ ] **Step 1: Replace the component shell, nav, and hero**

Replace from `export function LandingPage()` through the closing tag of the hero `<section>` with:

```tsx
export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const accountCtaPath = '/signup';

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f5f5f5]">

      {/* NAV */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-[#1a1a1a] bg-[#0f0f0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] rounded-xl px-1"
          >
            <img src="/printflow-logo-horizontal-white.png" alt="PrintFlow POS" className="h-9 w-auto" />
          </button>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="hidden min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#777777] hover:text-[#f5f5f5] sm:inline-flex sm:items-center"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate(isSignedIn ? accountCtaPath : '/sign-in')}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#777777] hover:text-[#f5f5f5]"
            >
              {isSignedIn ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#ff6b00] px-4 text-sm font-semibold text-white hover:bg-[#e55f00]"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-7 inline-flex items-center gap-2 rounded border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[3px] text-[#ff6b00]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b00]" />
              POS built for print shops
            </div>
            <h1 className="text-[42px] font-extrabold leading-none tracking-[-1.5px] text-[#f5f5f5] sm:text-[54px] sm:tracking-[-2px] lg:text-[62px] lg:tracking-[-2.5px]">
              The POS that keeps<br />your shop{' '}
              <span className="text-[#ff6b00]">moving.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[520px] text-[15px] leading-relaxed text-[#777777] sm:text-[18px]">
              From first quote to final shipment -- track every order, manage inventory, and never lose a job again.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate(accountCtaPath)}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-7 text-base font-bold text-white hover:bg-[#e55f00] sm:w-auto"
              >
                {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
                <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#2a2a2a] px-7 text-base font-semibold text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5] sm:w-auto"
              >
                See pricing
              </button>
            </div>
            <p className="mt-4 text-[11px] tracking-wide text-[#444444]">
              No credit card required -- Free 14-day trial
            </p>

            {/* Product signal */}
            <div className="mx-auto mt-12 max-w-lg overflow-hidden rounded-xl border border-[#222222] bg-[#141414]">
              <div className="flex items-center gap-2 border-b border-[#1a1a1a] bg-[#1a1a1a] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                <span className="mx-auto text-[11px] tracking-wide text-[#555555]">Active Orders</span>
              </div>
              {HERO_ORDERS.map(({ id, detail, status, badge }) => (
                <div key={id} className="flex min-h-[52px] items-center justify-between border-b border-[#1a1a1a] px-4 last:border-b-0">
                  <div>
                    <p className="text-[12px] font-bold text-[#cccccc]">{id}</p>
                    <p className="text-[11px] text-[#555555]">{detail}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck --prefix frontend
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "feat(landing): dark nav and hero with product signal"
```

---

### Task 3: Replace workflow and features sections

**Files:**
- Modify: `frontend/src/pages/marketing/LandingPage.tsx` (workflow + features sections)

- [ ] **Step 1: Replace workflow and features sections**

Replace the old workflow and features `<section>` blocks with:

```tsx
        {/* WORKFLOW */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              How it works
            </p>
            <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              From quote to shipped.
            </h2>
            <p className="mb-14 mt-2 text-[15px] text-[#666666]">
              Every step in one place -- no spreadsheets, no sticky notes.
            </p>
            <div className="relative grid grid-cols-3 gap-y-10 sm:grid-cols-6">
              <div className="absolute left-[8%] right-[8%] top-[22px] hidden h-px bg-gradient-to-r from-[#ff6b00] to-[rgba(255,107,0,0.1)] sm:block" />
              {WORKFLOW.map((step, i) => (
                <div key={step} className="relative z-10 flex flex-col items-center gap-3 text-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-[13px] font-extrabold ${
                      i === 0
                        ? 'border-[#ff6b00] bg-[#ff6b00] text-white'
                        : 'border-[#ff6b00] bg-[#0f0f0f] text-[#ff6b00]'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <p className="text-[12px] font-semibold text-[#cccccc]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              Features
            </p>
            <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              Everything your shop needs.
            </h2>
            <p className="mb-14 mt-2 text-[15px] text-[#666666]">
              No bloat. No fluff. Just what print shops actually use.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ title, body, Icon }) => (
                <article
                  key={title}
                  className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-7 transition-colors hover:border-[#ff6b00]"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[9px] border border-[#3d2200] bg-[#1f1204]">
                    <Icon className="h-6 w-6 text-[#ff6b00]" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2.5 text-[17px] font-bold text-[#f5f5f5]">{title}</h3>
                  <p className="text-[13px] leading-relaxed text-[#666666]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck --prefix frontend
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "feat(landing): dark workflow and features sections"
```

---

### Task 4: Replace production control section

**Files:**
- Modify: `frontend/src/pages/marketing/LandingPage.tsx` (production control section)

- [ ] **Step 1: Replace the production control section**

Replace the old production control `<section>` with:

```tsx
        {/* PRODUCTION CONTROL */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
                Production control
              </p>
              <h2 className="text-[26px] font-extrabold leading-tight tracking-[-1px] sm:text-[30px] lg:text-[34px]">
                Your shop floor,{' '}
                <span className="text-[#ff6b00]">under control.</span>
              </h2>
              <p className="mb-8 mt-4 text-[15px] leading-relaxed text-[#666666]">
                See every active job at a glance. Rush orders surface automatically. Nothing falls through the cracks.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { val: '100%', label: 'Offline capable' },
                    { val: 'Auto', label: 'PO generation' },
                    { val: 'Live', label: 'Order tracking' },
                    { val: 'Multi', label: 'Team support' },
                  ] as const
                ).map(({ val, label }) => (
                  <div key={label} className="rounded-[9px] border border-[#1e1e1e] bg-[#141414] p-4">
                    <p className="text-[22px] font-extrabold text-[#ff6b00]">{val}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#555555]">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#222222] bg-[#141414]">
              <div className="flex items-center gap-2 border-b border-[#1a1a1a] bg-[#1a1a1a] px-4 py-2.5">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
                <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                <span className="h-2 w-2 rounded-full bg-[#28c840]" />
                <span className="mx-auto text-[11px] tracking-wide text-[#555555]">Active Orders</span>
              </div>
              {PROD_ORDERS.map(({ id, detail, status, badge }) => (
                <div key={id} className="flex min-h-[60px] items-center justify-between border-b border-[#1a1a1a] px-4 last:border-b-0">
                  <div>
                    <p className="text-[12px] font-bold text-[#cccccc]">{id}</p>
                    <p className="text-[11px] text-[#555555]">{detail}</p>
                  </div>
                  <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge}`}>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck --prefix frontend
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "feat(landing): dark production control section with stats grid"
```

---

### Task 5: Add CTA strip and footer, close component

**Files:**
- Modify: `frontend/src/pages/marketing/LandingPage.tsx` (close `<main>`, add CTA strip and footer, close component)

- [ ] **Step 1: Replace everything after the production control section to end of file**

```tsx
      </main>

      {/* CTA STRIP */}
      <div className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#1e1e1e] bg-[#141414] px-8 py-14 text-center">
          <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
            Ready to run a{' '}
            <span className="text-[#ff6b00]">tighter shop?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#666666]">
            Join print shops already using PrintFlow to stay on top of every job.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-7 text-base font-bold text-white hover:bg-[#e55f00] sm:w-auto"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start free trial'}
              <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border border-[#2a2a2a] px-7 text-base font-semibold text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5] sm:w-auto"
            >
              See pricing
            </button>
          </div>
          <p className="mt-4 text-[11px] tracking-wide text-[#444444]">
            No credit card required -- Cancel anytime
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1a] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <button type="button" onClick={() => navigate('/')} className="min-h-[44px]">
            <img
              src="/printflow-logo-horizontal-white.png"
              alt="PrintFlow POS"
              className="h-7 w-auto opacity-40"
            />
          </button>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {(['Features', 'Pricing', 'Privacy', 'Terms'] as const).map((label) => (
              <button
                key={label}
                type="button"
                className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
              >
                {label}
              </button>
            ))}
          </nav>
          <p className="text-[12px] text-[#444444]">
            &copy; {new Date().getFullYear()} PrintFlow. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck --prefix frontend
```

Expected: zero errors.

- [ ] **Step 3: Run lint**

```bash
npm run lint --prefix frontend
```

Expected: zero errors or warnings.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "feat(landing): add CTA strip and footer, complete page"
```

---

### Task 6: Visual verification

**Files:** None -- verification only.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Frontend runs at `http://localhost:5173` (or whichever port Vite prints).

- [ ] **Step 2: Open `http://localhost:5173` and verify at desktop width (1280px)**

Check:
- Page background is near-black (`#0f0f0f`) -- no white or gray sections
- Nav is sticky dark with orange CTA button
- PrintFlow POS logo renders correctly (white horizontal logo)
- Hero shows badge pill, bold h1 with orange "moving.", two CTAs, product signal order queue
- Workflow shows 6 numbered circles on an orange gradient line; step 1 is filled orange
- Feature cards are dark with orange icons; hover turns border orange
- Production control shows stats grid (orange values) and dark order mockup with colored status badges
- CTA strip is a dark inset card with orange headline accent
- Footer is minimal dark with dimmed logo, nav links, and copyright
- Page does NOT end abruptly

- [ ] **Step 3: Resize browser to 375px width (mobile) and verify**

Check:
- Hero h1 is 42px -- does not overflow or wrap badly
- CTA buttons stack vertically and are full width
- Workflow grid shows 3 columns (not 6) -- wraps cleanly
- Feature cards stack to single column
- Footer stacks to single column
- All tap targets visually appear >= 44px tall

- [ ] **Step 4: Resize browser to 768px width (tablet) and verify**

Check:
- Hero h1 is 54px
- CTA buttons are side-by-side (sm:flex-row)
- Feature cards are 2-column grid
- Production control stacks (single column -- lg breakpoint needed for 2 columns)

- [ ] **Step 5: Confirm all CTAs navigate correctly**

- "Start free trial" / "Go to dashboard" in nav -> navigates to `/signup`
- "Start free trial" in hero -> navigates to `/signup`
- "See pricing" in hero -> navigates to `/pricing`
- "Start free trial" in CTA strip -> navigates to `/signup`
- "See pricing" in CTA strip -> navigates to `/pricing`
- Logo (nav) -> navigates to `/`
- Logo (footer) -> navigates to `/`

- [ ] **Step 6: Final typecheck + lint**

```bash
npm run typecheck --prefix frontend && npm run lint --prefix frontend
```

Expected: both pass with zero errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/marketing/LandingPage.tsx
git commit -m "feat(landing): visual redesign complete -- Urban Bold dark theme"
```
