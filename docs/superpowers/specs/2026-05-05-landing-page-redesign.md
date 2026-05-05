# Landing Page Visual Redesign -- Design Spec

## Goal
Refresh the PrintFlow POS landing page from its current light blue theme to a premium Urban Bold aesthetic -- near-black backgrounds, orange accents, bold typography -- while completing the page with a CTA strip and footer that were missing.

## Scope
**Visual refresh plus lightweight page completion.** Keep existing content structure and copy. Remove the hero workflow strip (redundant with the standalone workflow section). Add a closing CTA strip and footer -- the page currently ends abruptly, which was a real QA gap.

**Out of scope:** Full marketing site (separate project), copy rewrites, new feature sections, routing changes.

---

## Design Language

### Personality
**Confident and Sharp** -- bold but approachable. Heavy type, orange heat, professional copy. Has edge without being alienating to first-time visitors.

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `bg-base` | `#0f0f0f` | Page background |
| `bg-surface` | `#141414` | Cards, mockup containers |
| `bg-elevated` | `#1a1a1a` | Nav, inner card elements |
| `border-subtle` | `#1e1e1e` | Card borders |
| `border-mid` | `#2a2a2a` | Hero badge, ghost button |
| `accent` | `#ff6b00` | Primary CTA, headline accent word, icons, badge text, section labels |
| `text-primary` | `#f5f5f5` | Headlines, nav logo |
| `text-secondary` | `#777777` | Body copy, nav links |
| `text-muted` | `#666666` | Subtitles, step sub-labels |
| `text-dimmed` | `#444444` | Footer copy, hero note |
| `status-rush` | `#ff6b00` text on `#ff6b00` bg | Rush badge |
| `status-production` | `#4caf50` text on `#1a2a1a` bg | In Production badge |
| `status-ready` | `#38bdf8` text on `#142a3a` bg | Ready to Ship badge |
| `status-shipped` | `#a855f7` text on `#2a1a2a` bg | Shipped badge |

### Typography

| Element | Mobile | Tablet (sm) | Desktop (lg) | Weight | Letter spacing |
|---------|--------|-------------|--------------|--------|----------------|
| Hero h1 | 42px | 54px | 62px | 800 | -1.5px / -2px / -2.5px |
| Section title | 26px | 30px | 34px | 800 | -1px |
| Card title | 17px | 17px | 17px | 700 | 0 |
| Body | 15px | 16px | 18px | 400 | 0 |
| Section label | 11px | 11px | 11px | 600 | 4px, uppercase |
| Badge/note | 11px | 11px | 11px | 600 | 1px-3px, uppercase |

### Logo
Prefer rendering via `<img src="/printflow-logo-horizontal-white.png" alt="PrintFlow POS" className="h-9 w-auto" />` -- this is already in the nav and works correctly on dark backgrounds.

If a light/dark adaptive logo is needed in a future iteration, create a `<Logo />` component that renders the PF icon mark (from the SVG `<rect>` and `<path>` elements) plus "PrintFlow" and "POS" as HTML text nodes -- this avoids fragile inline SVG color overrides.

Do not attempt to recolor the SVG file or embed it with overridden fill attributes for this iteration.

---

## Section-by-Section Spec

### 1. Navigation
- Sticky, `background: rgba(15,15,15,0.95)`, `backdrop-filter: blur(10px)`
- Border bottom: `1px solid #1a1a1a`
- Logo: `<img src="/printflow-logo-horizontal-white.png" />` -- already correct, keep as-is
- Nav links: `color: #777`, hover `color: #f5f5f5`
- CTA button: `background: #ff6b00`, `border-radius: 7px`, `font-weight: 600`
- No changes needed to nav markup -- it already uses the dark nav style

### 2. Hero (priority section)
Layout: **Type-Led** -- centered, no background image, with a product signal below the CTAs.

- Remove: `HERO_IMAGE` constant, `<img>` background element, gradient overlay `<div>`, bottom workflow bar strip
- Background: `#0f0f0f` (page base -- no explicit bg needed once image is removed)
- Badge pill: `background: #1a1a1a`, `border: 1px solid #2a2a2a`, `color: #ff6b00`, `letter-spacing: 3px`, uppercase, with a 6px orange dot
- `<h1>`: responsive per typography table, `font-weight: 800`, white base with `<span className="text-[#ff6b00]">` wrapping the final accent word ("moving.")
- Subhead: 18px body, `color: #777`, max-width 520px centered
- CTAs: primary (`bg-[#ff6b00]` fill, white text), ghost (`border border-[#2a2a2a] text-[#888888]`)
- Hero note: "No credit card required -- Free 14-day trial", `color: #444`
- **Product signal below CTAs:** A compact dark order-queue preview -- same style as the Production Control mockup (dark card, 3 order rows with status badges). This anchors the hero to the actual product and prevents a generic SaaS feel.

### 3. Workflow Section
- Background: `#0f0f0f`
- Section label: orange `#ff6b00`, uppercase, `letter-spacing: 4px`, `border-left: 2px solid #ff6b00`, `padding-left: 10px`
- Step circles: `border: 2px solid #ff6b00`, orange number text; step 1 filled `bg-[#ff6b00]` with white number
- Connecting line: pseudo-element or `<div>` with `linear-gradient(90deg, #ff6b00, rgba(255,107,0,0.2))`
- Step labels: `#cccccc`; step sub-labels: `#555555`

### 4. Features (3 cards)
- Card: `background: #141414`, `border: 1px solid #1e1e1e`, `border-radius: 12px`
- Hover state: `hover:border-[#ff6b00]`
- Icon container: `background: #1f1204`, `border: 1px solid #3d2200`, `border-radius: 9px`
- Heroicons: keep existing icons, apply `text-[#ff6b00]`
- Card title: `font-weight: 700`; body: `color: #666`

### 5. Production Control Section
- Background: `#0f0f0f`
- Two-column grid: copy left, UI mockup right
- Stats grid (2 columns x 2 rows): dark surface cards with orange stat value, muted uppercase label
- UI mockup: `background: #141414`, `border: 1px solid #222`, `border-radius: 14px`
- Mockup title bar: three traffic-light dots + centered "Active Orders" label
- Order rows: ID in `#cccccc`, detail in `#555555`, status badges per color spec above

### 6. CTA Strip (new -- completes page)
- Container: `background: #141414`, `border: 1px solid #1e1e1e`, `border-radius: 16px`, `margin: 0 48px 80px`; responsive margin on mobile: `mx-4`
- Headline with orange accent span
- Two CTAs matching hero button styles
- Note: "No credit card required -- Cancel anytime", `color: #444`

### 7. Footer (new -- QA gap fix)
- `border-top: 1px solid #1a1a1a`, `padding: 32px 48px`
- Left: `<img src="/printflow-logo-horizontal-white.png" height="28" />`
- Center: nav links (Features, Pricing, Privacy, Terms) in `color: #555`
- Right: "(c) 2026 PrintFlow" in `color: #444`
- Responsive: stack to single column on mobile

---

## Component Changes

| File | Change |
|------|--------|
| `frontend/src/pages/marketing/LandingPage.tsx` | Replace all Tailwind classes per spec; remove `HERO_IMAGE`, background image, overlay, and hero workflow strip; add hero product signal; add CTA strip; add footer |
| `frontend/public/printflow-logo-horizontal-white.png` | No change -- already correct for dark backgrounds |
| `frontend/public/printflow-logo-horizontal.svg` | No change |

---

## Constraints
- All touch targets remain >= 44px (CLAUDE.md non-negotiable rule)
- No new npm dependencies
- No Tailwind config changes -- use Tailwind arbitrary value syntax for custom colors (e.g. `bg-[#0f0f0f]`, `text-[#ff6b00]`, `border-[#1e1e1e]`)
- Keep all existing TypeScript types and React Router navigation handlers unchanged
- Named exports only (`export function LandingPage`)
- No `console.log`

---

## Verification
- `npm run typecheck` passes with zero errors
- `npm run lint` passes with zero errors
- Visual review: open `/` in browser, confirm dark palette renders correctly at 375px (mobile), 768px (tablet), and 1280px (desktop)
- Hero h1 font size is responsive -- does not overflow at 375px
- All CTA buttons navigate correctly (existing handlers unchanged)
- Page no longer ends abruptly -- CTA strip and footer visible at bottom
