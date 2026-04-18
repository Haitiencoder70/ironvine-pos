# IronVine — Obsidian Cinema Design System

A standalone dark-mode design system built on Tailwind CSS.  
Drop it into any Vite + React + Tailwind project in 4 steps.

---

## Stack Requirements

| Dependency | Version | Purpose |
|---|---|---|
| `tailwindcss` | v3 or v4 | Utility classes + `@layer` |
| `framer-motion` | any | Entrance animations |
| `clsx` + `tailwind-merge` | any | Class composition in components |
| Google Fonts — Plus Jakarta Sans | — | Display font |

---

## Step 1 — Add the font to your HTML

In your `index.html` `<head>`, replace whatever font link is there with:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet" />
```

---

## Step 2 — Update tailwind.config.ts

Add the font family and any custom tokens you want to reference in Tailwind classes:

```ts
import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
        display: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: {
        'xl':  '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## Step 3 — Replace your index.css

Paste the entire block below as your `src/index.css` (keep the three
`@tailwind` directives at the top):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Plus Jakarta Sans loaded in index.html ──────────────────────────── */

@layer base {
  :root {
    /* ── Core palette ────────────────────────────────────────────────── */
    --bg-base:           #030308;
    --bg-surface:        #08080f;
    --bg-elevated:       #0e0e18;

    /* ── Glass surfaces ──────────────────────────────────────────────── */
    --glass-bg:          rgba(10, 10, 20, 0.68);
    --glass-bg-heavy:    rgba(6, 6, 14, 0.82);
    --glass-border:      rgba(255, 255, 255, 0.08);
    --glass-border-mid:  rgba(255, 255, 255, 0.13);
    --glass-highlight:   rgba(255, 255, 255, 0.06);
    --glass-sheen:       rgba(255, 255, 255, 0.04);

    /* ── Electric blue accent ────────────────────────────────────────── */
    --blue-glow:         rgba(59, 130, 246, 0.28);
    --blue-glow-strong:  rgba(59, 130, 246, 0.5);
    --blue-dim:          rgba(59, 130, 246, 0.10);
    --blue-electric:     #60a5fa;
    --urban-blue-glow:   rgba(59, 130, 246, 0.18);
    --urban-blue-strong: rgba(59, 130, 246, 0.35);

    /* ── Amber warmth accent ─────────────────────────────────────────── */
    --amber-glow:        rgba(251, 191, 36, 0.2);
    --amber-dim:         rgba(251, 191, 36, 0.08);

    /* ── Violet depth accent ─────────────────────────────────────────── */
    --violet-glow:       rgba(139, 92, 246, 0.18);
    --violet-dim:        rgba(139, 92, 246, 0.08);

    /* ── Ambient orbs + vignette ─────────────────────────────────────── */
    --orb-1:    radial-gradient(ellipse 65% 55% at 85% 0%,   rgba(29, 58, 168, 0.35)  0%, transparent 65%);
    --orb-2:    radial-gradient(ellipse 50% 45% at 10% 95%,  rgba(17, 24, 100, 0.40)  0%, transparent 60%);
    --orb-3:    radial-gradient(ellipse 40% 35% at 98% 60%,  rgba(109, 40, 217, 0.12) 0%, transparent 55%);
    --vignette: radial-gradient(ellipse 110% 90% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.55) 100%);
  }

  /* ── Keyframes ───────────────────────────────────────────────────────── */

  @keyframes backgroundDrift {
    0%   { background-position: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%; }
    100% { background-position: 8% 12%, -8% 6%, 5% -8%, 0% 0%, 0% 0%, 0% 0%; }
  }

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes glowPulse {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }

  @keyframes floatUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Base reset ──────────────────────────────────────────────────────── */

  * { -webkit-tap-highlight-color: transparent; }

  *, *::before, *::after { box-sizing: border-box; }

  *:focus-visible {
    outline: 2px solid rgba(96, 165, 250, 0.7);
    outline-offset: 2px;
    border-radius: 6px;
  }

  html {
    -webkit-text-size-adjust: 100%;
    font-feature-settings: 'ss01', 'cv11', 'liga';
    letter-spacing: -0.015em;
  }

  /* ── Cinematic obsidian canvas ───────────────────────────────────────── */

  body {
    margin: 0;
    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    background-color: var(--bg-base);
    color: #dde1ea;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overscroll-behavior: none;
    min-height: 100dvh;

    background-image:
      var(--vignette),
      var(--orb-1),
      var(--orb-2),
      var(--orb-3),
      /* crosshatch grid */
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0v40M0 0h40' stroke='rgba(255,255,255,0.018)' stroke-width='0.5'/%3E%3C/svg%3E"),
      /* film grain noise */
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E");
    background-attachment: fixed;
    background-size: cover, cover, cover, cover, 40px 40px, 300px 300px;
    animation: backgroundDrift 25s ease-in-out infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    body { animation: none; }
  }

  /* ── Custom scrollbar ────────────────────────────────────────────────── */

  ::-webkit-scrollbar       { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 99px;
  }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.15); }
}

/* ── Design system utilities ─────────────────────────────────────────────── */

@layer utilities {

  /* ── Touch target minimum ────────────────────────────────────────────── */
  .touch-target { min-height: 44px; min-width: 44px; }

  /* ────────────────────────────────────────────────────────────────────── */
  /* GLASS TIERS                                                            */
  /*                                                                        */
  /* .glass                  Whisper — toolbar separators, inline chips     */
  /* .glass-panel            Standard — list rows, filter bars              */
  /* .glass-panel-weighted   Heavy — stat cards, sidebar, elevated panels   */
  /* .glass-panel-weighted-heavy  Extra — modals, drawers                   */
  /* .glass-blue             CTA variant — highlighted / active surfaces    */
  /* .card-cinema            Cinematic — main content panels                */
  /* ────────────────────────────────────────────────────────────────────── */

  .glass {
    backdrop-filter: blur(14px) saturate(1.5);
    -webkit-backdrop-filter: blur(14px) saturate(1.5);
    background-color: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
  }

  .glass-panel {
    backdrop-filter: blur(20px) saturate(1.7);
    -webkit-backdrop-filter: blur(20px) saturate(1.7);
    background-color: var(--glass-bg);
    border: 1px solid var(--glass-border-mid);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.06),
      inset 0 -1px 0 rgba(0, 0, 0, 0.2),
      0 4px 20px rgba(0, 0, 0, 0.45);
    will-change: transform, backdrop-filter;
  }

  .glass-panel-weighted {
    backdrop-filter: blur(28px) saturate(1.9);
    -webkit-backdrop-filter: blur(28px) saturate(1.9);
    background-color: var(--glass-bg-heavy);
    border: 1px solid var(--glass-border-mid);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.09),
      inset 0 -1px 0 rgba(0, 0, 0, 0.35),
      0 1px 0 rgba(255, 255, 255, 0.03),
      0 8px 32px rgba(0, 0, 0, 0.6),
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 0 0 0.5px rgba(255, 255, 255, 0.05);
    will-change: transform, backdrop-filter;
  }

  .glass-panel-weighted-heavy {
    backdrop-filter: blur(40px) saturate(2.1);
    -webkit-backdrop-filter: blur(40px) saturate(2.1);
    background-color: rgba(4, 4, 12, 0.92);
    border: 1px solid var(--glass-border-mid);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.11),
      inset 0 -1px 0 rgba(0, 0, 0, 0.4),
      0 24px 64px rgba(0, 0, 0, 0.7);
    will-change: transform, backdrop-filter;
  }

  .glass-blue {
    backdrop-filter: blur(20px) saturate(1.7);
    -webkit-backdrop-filter: blur(20px) saturate(1.7);
    background-color: var(--blue-dim);
    border: 1px solid rgba(59, 130, 246, 0.28);
    box-shadow:
      inset 0 1px 0 rgba(59, 130, 246, 0.18),
      0 4px 20px var(--blue-glow),
      0 0 0 1px rgba(59, 130, 246, 0.06);
  }

  .card-cinema {
    backdrop-filter: blur(24px) saturate(1.8);
    -webkit-backdrop-filter: blur(24px) saturate(1.8);
    background: linear-gradient(
      160deg,
      rgba(16, 16, 30, 0.80) 0%,
      rgba(8, 8, 18, 0.88) 100%
    );
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-top-color: rgba(255, 255, 255, 0.15);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      inset 0 -1px 0 rgba(0, 0, 0, 0.3),
      0 8px 40px rgba(0, 0, 0, 0.65),
      0 2px 8px rgba(0, 0, 0, 0.4),
      0 0 0 0.5px rgba(255, 255, 255, 0.04);
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* GLOW EFFECTS                                                           */
  /* Add to any element to cast a colored ambient shadow                   */
  /* ────────────────────────────────────────────────────────────────────── */

  .glow-blue         { box-shadow: 0 0 24px var(--blue-glow),               0 0 48px rgba(59, 130, 246, 0.08); }
  .glow-urban-blue   { box-shadow: 0 0 18px var(--urban-blue-glow),          0 0 36px rgba(59, 130, 246, 0.04); }
  .glow-blue-strong  { box-shadow: 0 0 20px var(--blue-glow-strong),         0 4px 40px rgba(59, 130, 246, 0.22); }
  .glow-amber        { box-shadow: 0 0 24px rgba(251, 191, 36,  0.22),       0 0 48px rgba(251, 191, 36,  0.08); }
  .glow-emerald      { box-shadow: 0 0 24px rgba(16,  185, 129, 0.22),       0 0 48px rgba(16,  185, 129, 0.08); }
  .glow-violet       { box-shadow: 0 0 24px rgba(139, 92,  246, 0.22),       0 0 48px rgba(139, 92,  246, 0.08); }
  .glow-orange       { box-shadow: 0 0 24px rgba(249, 115, 22,  0.22),       0 0 48px rgba(249, 115, 22,  0.08); }

  /* ────────────────────────────────────────────────────────────────────── */
  /* GRADIENT TEXT                                                          */
  /* Usage: <h1 className="text-gradient-blue">Title</h1>                  */
  /* ────────────────────────────────────────────────────────────────────── */

  .text-gradient-blue {
    background: linear-gradient(135deg, #93c5fd 0%, #60a5fa 40%, #818cf8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .text-gradient-white {
    background: linear-gradient(160deg, #ffffff 0%, #c7cdd9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .text-gradient-amber {
    background: linear-gradient(135deg, #fde68a 0%, #fbbf24 60%, #f59e0b 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* TYPOGRAPHY UTILITIES                                                   */
  /* ────────────────────────────────────────────────────────────────────── */

  /* Large numeric displays — dashboards, stats */
  .stat-number {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.04em;
    font-feature-settings: 'tnum';  /* tabular numbers — keeps widths stable */
  }

  /* All-caps micro label — nav group headers, section dividers */
  .section-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.2);
  }

  .text-muted     { color: rgb(107, 114, 128); }  /* gray-500 */
  .text-secondary { color: rgb(156, 163, 175); }  /* gray-400 */

  /* ────────────────────────────────────────────────────────────────────── */
  /* SHIMMER / SKELETON                                                     */
  /* ────────────────────────────────────────────────────────────────────── */

  .shimmer {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.0)  0%,
      rgba(255,255,255,0.06) 50%,
      rgba(255,255,255,0.0)  100%
    );
    background-size: 200% 100%;
    animation: shimmer 2.4s ease infinite;
  }

  .skeleton {
    border-radius: 0.5rem;
    animation: pulse 2s cubic-bezier(0.4,0,0.6,1) infinite;
    background-color: rgba(255, 255, 255, 0.05);
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* SIDEBAR NAV                                                            */
  /* Usage: className={clsx('nav-item', isActive && 'nav-item-active')}    */
  /* ────────────────────────────────────────────────────────────────────── */

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0.75rem;
    min-height: 48px;
    position: relative;
    font-weight: 500;
    font-size: 0.875rem;
    color: rgba(160, 168, 185, 0.75);
    transition: color 120ms ease, background-color 120ms ease;
    border: 1px solid transparent;
  }

  .nav-item:hover {
    color: rgba(220, 228, 245, 0.95);
    background-color: rgba(255, 255, 255, 0.04);
  }

  .nav-item-active {
    color: #93c5fd;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.14) 0%, rgba(59, 130, 246, 0.06) 100%);
    border-color: rgba(59, 130, 246, 0.22);
    box-shadow:
      inset 0 1px 0 rgba(59, 130, 246, 0.12),
      0 0 16px rgba(59, 130, 246, 0.08);
  }

  /* Luminous left bar — the signature active indicator */
  .nav-item-active::before {
    content: '';
    position: absolute;
    left: -1px;
    top: 20%;
    height: 60%;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, #93c5fd 0%, #3b82f6 60%, #6366f1 100%);
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.7), 0 0 20px rgba(59, 130, 246, 0.3);
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* ANIMATIONS                                                             */
  /* ────────────────────────────────────────────────────────────────────── */

  .animate-float-up {
    animation: floatUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .animate-glow-pulse {
    animation: glowPulse 2.5s ease-in-out infinite;
  }

  /* ────────────────────────────────────────────────────────────────────── */
  /* MISC UTILITIES                                                         */
  /* ────────────────────────────────────────────────────────────────────── */

  .divider             { border-color: rgba(255, 255, 255, 0.06); }
  .safe-area-bottom    { padding-bottom: env(safe-area-inset-bottom); }
  .pb-safe             { padding-bottom: calc(4rem + env(safe-area-inset-bottom)); }
  .overscroll-contain  { overscroll-behavior: contain; }
  .will-change-transform { will-change: transform; }
  .tap-highlight-none  { -webkit-tap-highlight-color: transparent; }
  .touch-pan-y         { touch-action: pan-y; }
  .touch-none          { touch-action: none; }
}
```

---

## Step 4 — Inline style snippets for components

Some effects can't be expressed as Tailwind classes because they use
multi-stop gradients or dynamic values. Copy-paste these into your
component `style` props as needed.

### Sidebar shell
```tsx
style={{
  background: 'linear-gradient(180deg, rgba(6,6,16,0.96) 0%, rgba(4,4,12,0.98) 100%)',
  backdropFilter: 'blur(32px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
  boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.04), 4px 0 32px rgba(0,0,0,0.5)',
}}
```

### TopBar / header shell
```tsx
style={{
  background: 'linear-gradient(180deg, rgba(8,8,18,0.92) 0%, rgba(5,5,14,0.95) 100%)',
  backdropFilter: 'blur(20px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
  boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
}}
```

### Primary CTA button (blue gradient)
```tsx
style={{
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 60%, #1d4ed8 100%)',
  boxShadow: '0 0 20px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.2)',
  border: '1px solid rgba(59,130,246,0.5)',
}}
```

### Stat card (swap the RGB values for each accent color)
```tsx
style={{
  background: 'linear-gradient(160deg, rgba(14,14,26,0.85) 0%, rgba(8,8,18,0.92) 100%)',
  border: '1px solid rgba(59,130,246,0.18)',   // swap accent color
  borderTopColor: 'rgba(255,255,255,0.10)',
  backdropFilter: 'blur(28px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.9)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.55), 0 0 24px rgba(59,130,246,0.12)',
}}
```

### Stat card accent colors (swap into the border + glow above)
| Color | Border rgba | Glow rgba |
|---|---|---|
| Blue   | `rgba(59,130,246,0.18)` | `rgba(59,130,246,0.12)` |
| Orange | `rgba(249,115,22,0.18)`  | `rgba(249,115,22,0.10)` |
| Green  | `rgba(16,185,129,0.18)`  | `rgba(16,185,129,0.10)` |
| Violet | `rgba(139,92,246,0.18)`  | `rgba(139,92,246,0.10)` |
| Amber  | `rgba(251,191,36,0.18)`  | `rgba(251,191,36,0.10)` |

### Modal / drawer backdrop
```tsx
style={{
  background: 'rgba(4,4,12,0.95)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
}}
```

### IronVine logo mark
```tsx
style={{
  background: 'linear-gradient(145deg, #2563eb 0%, #1d4ed8 50%, #3730a3 100%)',
  boxShadow: '0 0 20px rgba(59,130,246,0.45), 0 0 40px rgba(59,130,246,0.15), inset 0 1px 0 rgba(255,255,255,0.25)',
}}
```

---

## Quick-reference class cheatsheet

```
Background canvas   → automatic on <body> (obsidian + orbs + grain + vignette)

Glass surfaces      → .glass
                      .glass-panel
                      .glass-panel-weighted       ← stat cards, sidebar
                      .glass-panel-weighted-heavy ← modals
                      .glass-blue                 ← CTA / active panels
                      .card-cinema                ← content panels

Glow shadows        → .glow-blue  .glow-urban-blue  .glow-blue-strong
                      .glow-amber .glow-emerald .glow-violet .glow-orange

Gradient text       → .text-gradient-blue
                      .text-gradient-white
                      .text-gradient-amber

Typography          → .stat-number   (dashboard metrics)
                      .section-label (nav group headers)
                      .text-muted    .text-secondary

Sidebar nav         → .nav-item  +  .nav-item-active

Animations          → .animate-float-up     (entrance)
                      .animate-glow-pulse   (pulsing glow)
                      .shimmer              (loading sweep)
                      .skeleton             (placeholder blocks)

Utilities           → .touch-target  .divider  .tap-highlight-none
                      .safe-area-bottom  .pb-safe
```

---

## Framer Motion entrance pattern (staggered sections)

```tsx
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const item = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

// Wrap your page:
<motion.div variants={container} initial="hidden" animate="visible">
  <motion.div variants={item}> <StatsGrid /> </motion.div>
  <motion.div variants={item}> <RecentOrders /> </motion.div>
  <motion.div variants={item}> <QuickActions /> </motion.div>
</motion.div>
```

## Framer Motion card hover / tap

```tsx
<motion.div
  whileHover={{ y: -2, transition: { duration: 0.2 } }}
  whileTap={{ scale: 0.97 }}
  className="card-cinema rounded-2xl p-5"
>
```
