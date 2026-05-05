# Landing Page Visual Redesign — Design Spec

## Goal
Refresh the PrintFlow POS landing page from its current light blue theme to a premium Urban Bold aesthetic — near-black backgrounds, orange accents, bold typography — without changing page structure or copy.

## Scope
**Visual-only refresh.** Same five sections, same copy, same React component structure. No new sections, no copy rewrites, no routing changes.

**Out of scope:** Full marketing site (separate project), copy/messaging changes, new page sections.

---

## Design Language

### Personality
**Confident & Sharp** — bold but approachable. Heavy type, orange heat, professional copy. Has edge without being alienating to first-time visitors.

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
| `text-secondary` | `#777` | Body copy, nav links |
| `text-muted` | `#555–#666` | Subtitles, step sub-labels |
| `text-dimmed` | `#444` | Footer copy, hero note |
| `status-rush` | `#ff6b00` on `#ff6b00` bg | Rush badge |
| `status-production` | `#4caf50` on `#1a2a1a` bg | In Production badge |
| `status-ready` | `#38bdf8` on `#142a3a` bg | Ready to Ship badge |
| `status-shipped` | `#a855f7` on `#2a1a2a` bg | Shipped badge |

### Typography
- **Headlines:** `font-weight: 800`, tight `letter-spacing: -2px` to `-1px`
- **Section labels:** `font-size: 11px`, `letter-spacing: 4px`, uppercase, accent color, left border rule
- **Body:** `font-size: 15–18px`, `color: #777`, `line-height: 1.65`
- **Badges/labels:** uppercase, `letter-spacing: 1–3px`

### Logo
Use `printflow-logo-horizontal.svg` from `frontend/public/`. Adapt inline for dark background:
- PF icon mark: unchanged (blue gradient — works on dark)
- "PrintFlow" text: `#f5f5f5` (white)
- "POS" text: `#ff6b00` (orange accent)
- Footer instance: dimmed (`#555` / `#444`)

---

## Section-by-Section Spec

### 1. Navigation
- Sticky, `background: rgba(15,15,15,0.95)`, `backdrop-filter: blur(10px)`
- Border bottom: `#1a1a1a`
- Logo: inline SVG, dark-adapted (white + orange)
- Nav links: `#777`, hover `#f5f5f5`
- CTA button: `background: #ff6b00`, `border-radius: 7px`, `font-weight: 600`
- Remove blue background; remove hero background image

### 2. Hero (priority section)
Layout: **Type-Led** — centered, no background image.

- Background: `#0f0f0f` (base, no image)
- Badge pill: `background: #1a1a1a`, `border: 1px solid #2a2a2a`, orange text + dot, `letter-spacing: 3px`, uppercase
- `<h1>`: `font-size: 62px`, `font-weight: 800`, `letter-spacing: -2.5px`, white with orange accent on final word ("moving.")
- Subhead: `font-size: 18px`, `color: #777`, max-width 520px centered
- CTAs: primary (`#ff6b00` fill), ghost (`border: 1px solid #2a2a2a`, `color: #888`)
- Footer note: "No credit card required · Free 14-day trial", `color: #444`
- Remove: `HERO_IMAGE`, gradient overlay div, bottom workflow bar strip

### 3. Workflow Section
- Background: `#0f0f0f`
- Section label + title pattern (orange rule, bold heading)
- Step circles: `border: 2px solid #ff6b00`, orange number text; step 1 filled orange
- Connecting line: `linear-gradient(90deg, #ff6b00, rgba(255,107,0,0.2))`
- Step labels: `#ccc`; step sub-labels: `#555`

### 4. Features (3 cards)
- Card: `background: #141414`, `border: 1px solid #1e1e1e`, `border-radius: 12px`
- Hover: `border-color: #ff6b00`
- Icon container: `background: #1f1204`, `border: 1px solid #3d2200`, `border-radius: 9px`
- Keep existing Heroicons; apply orange tint (`text-[#ff6b00]`)
- Card title: `font-weight: 700`; body: `color: #666`

### 5. Production Control Section
- Background: `#0f0f0f`
- Two-column grid: copy left, UI mockup right
- Stats grid (2×2): dark cards with orange value, muted uppercase label
- UI mockup: `background: #141414`, `border: 1px solid #222`, `border-radius: 14px`
- Mockup title bar: traffic-light dots + centered title
- Order rows: ID in `#ccc`, detail in `#555`, status badges per color spec above

### 6. CTA Strip (new — replaces abrupt page end)
- `background: #141414`, `border: 1px solid #1e1e1e`, `border-radius: 16px`, `margin: 0 48px 80px`
- Headline with orange accent word
- Two CTAs matching hero pattern
- "No credit card required · Cancel anytime" note

### 7. Footer (new — replaces missing footer)
- `border-top: 1px solid #1a1a1a`
- Dimmed logo (left), nav links center, copyright right
- All text muted (`#444–#555`)

---

## Component Changes

| File | Change |
|------|--------|
| `frontend/src/pages/marketing/LandingPage.tsx` | Full Tailwind class replacement per spec above; remove `HERO_IMAGE`, remove hero background image + overlay; remove bottom workflow strip from hero; add CTA strip section; add footer |
| `frontend/public/printflow-logo-horizontal.svg` | No change — used as-is via inline SVG with color overrides in TSX |

---

## Constraints
- All touch targets remain ≥ 44px (CLAUDE.md non-negotiable rule)
- No new npm dependencies
- No Tailwind config changes — use Tailwind's arbitrary value syntax for custom colors (e.g. `bg-[#0f0f0f]`, `text-[#ff6b00]`, `border-[#1e1e1e]`)
- Keep all existing TypeScript types and React Router navigation handlers
- Named exports only (`export function LandingPage`)
- No `console.log`

---

## Verification
- `npm run typecheck` passes with zero errors
- `npm run lint` passes with zero errors
- Visual review: open `/` in browser, confirm dark palette renders correctly at 375px, 768px, and 1280px breakpoints
- All CTA buttons navigate correctly (existing handlers unchanged)
