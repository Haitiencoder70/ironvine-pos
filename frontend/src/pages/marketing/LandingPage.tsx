import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ArrowRightIcon,
  CubeIcon,
  DeviceTabletIcon,
  UserGroupIcon,
  TruckIcon,
  SwatchIcon,
  PlayIcon,
  ArrowsPointingOutIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon,
  DocumentCheckIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

const WORKFLOW = ['Quote', 'Approve', 'Order materials', 'Print', 'Quality check', 'Ship'] as const;

const AUDIENCES = [
  'Screen Printing',
  'DTF Transfers',
  'HTV & Vinyl',
  'Embroidery',
  'Sublimation',
  'Home Shops',
  'Growing Production Shops',
] as const;

const BEFORE_ITEMS = [
  'Orders scattered across texts, DMs, and sticky notes',
  "No idea what materials you need until you're already mid-print",
  'Digging through old messages to find reprint details',
  'Tracking shipments in a separate app or spreadsheet',
] as const;

const AFTER_ITEMS = [
  'Every order tracked from quote to shipped in one place',
  'Materials and purchase orders generated straight from the job',
  'Full customer and reprint history one search away',
  'Shipping and tracking updates from the same order screen',
] as const;

const FEATURES = [
  {
    title: 'Quotes that turn into orders',
    body: 'Build a quote with sizes, colors, and print methods, send it, and the moment the customer approves it becomes a tracked order -- no re-entering anything.',
    Icon: DocumentCheckIcon,
  },
  {
    title: 'Customer history and reprints',
    body: 'Pull up past orders, reprint details, and lifetime value the moment a customer calls back. Stop asking "what did we print for you last time?"',
    Icon: UserGroupIcon,
  },
  {
    title: 'A production queue you\'ll actually use',
    body: 'See what\'s in queue, what\'s printing, and what\'s waiting for pickup. Rush jobs surface automatically so nothing ships late.',
    Icon: SwatchIcon,
  },
  {
    title: 'Inventory tied to real jobs',
    body: 'Receive blanks, reserve stock for open orders, and get low-stock alerts before you run out mid-run. Every count reflects what\'s actually reserved for a job.',
    Icon: CubeIcon,
  },
  {
    title: 'Purchase orders that write themselves',
    body: 'When a job needs more blanks or transfers than you have on hand, PrintFlow drafts the purchase order and links it back to the job. Receive it and inventory updates automatically.',
    Icon: ShoppingCartIcon,
  },
  {
    title: 'Shipping without the spreadsheet',
    body: 'Create shipments, add tracking numbers, and update customers -- all from the same order screen. No separate shipping app needed.',
    Icon: TruckIcon,
  },
  {
    title: 'Built for the counter',
    body: 'Touch-friendly screens, tablet-first layouts, Focus Mode for heads-down production, and offline-aware syncing keep the shop moving when the internet drops or the line gets long.',
    Icon: DeviceTabletIcon,
  },
] as const;

const FAQS = [
  {
    q: 'Is this only for apparel decorators?',
    a: 'PrintFlow is purpose-built for custom apparel businesses -- screen printing, DTF, HTV, embroidery, and sublimation shops. If you take custom orders, decorate garments, and ship or hand off finished product, it\'s built for your workflow.',
  },
  {
    q: 'Does it work on tablets?',
    a: 'Yes. Every screen is touch-first with large tap targets, and the counter and production views are designed to run on a tablet at the register or on the shop floor.',
  },
  {
    q: 'Do I need a credit card to start?',
    a: 'No. The 14-day trial starts with just an email -- no credit card required.',
  },
  {
    q: 'Can I track inventory and purchase orders?',
    a: 'Yes. Inventory is tied to real jobs, so you can see what\'s reserved for open orders and what\'s actually available. When a job needs more than you have on hand, PrintFlow can draft the purchase order for you, and receiving it updates stock automatically.',
  },
  {
    q: 'Does each shop get its own subdomain?',
    a: 'Every shop\'s data lives in its own fully isolated workspace, separate from every other business on PrintFlow. Custom per-shop subdomains are on our roadmap -- for now, everyone signs in through the main app with their shop selected automatically.',
  },
  {
    q: 'What happens after the 14-day trial?',
    a: 'You\'ll be prompted to choose a paid plan to keep going. Nothing is deleted -- your orders, customers, and inventory stay exactly where you left them. New orders and purchase orders pause until you pick a plan.',
  },
] as const;

const SCREENSHOTS = [
  {
    src: '/marketing/screenshot-dashboard.png',
    alt: 'PrintFlow dashboard showing today\'s orders, revenue, and low-stock alerts',
    label: 'Dashboard',
    caption: 'Your day at a glance -- orders due today, revenue, and anything running low before it becomes a problem.',
  },
  {
    src: '/marketing/screenshot-orders.png',
    alt: 'Order list with status filters and search',
    label: 'Orders',
    caption: 'Every order in one list -- filter by status, search by customer, and spot rush jobs instantly.',
  },
  {
    src: '/marketing/screenshot-order-detail.png',
    alt: 'Single order view with status timeline, line items, and materials',
    label: 'Order Detail',
    caption: 'One screen for the whole job -- line items, art files, materials, and a status timeline from quote to shipped.',
  },
  {
    src: '/marketing/screenshot-inventory.png',
    alt: 'Inventory list with stock levels and low-stock highlights',
    label: 'Inventory',
    caption: 'Real stock levels tied to real orders, with low-stock items flagged before you run out mid-print.',
  },
  {
    src: '/marketing/screenshot-production.png',
    alt: 'Production board showing jobs in progress',
    label: 'Production',
    caption: 'What\'s printing, what\'s queued, and what\'s ready for pickup -- rush jobs surface automatically.',
  },
] as const;

const DEMO_VIDEO_SRC = '/marketing/printflow-demo-60s.mp4';

type Screenshot = (typeof SCREENSHOTS)[number];

const PROD_ORDERS = [
  { id: 'ORD-202605-0182', detail: '50x Black Tee -- DTF Front -- Stark Industries', status: 'Rush', badge: 'bg-[#ff6b00] text-white' },
  { id: 'ORD-202605-0184', detail: '24x White Hoodie -- Screen Print -- Wayne Ent.', status: 'In Production', badge: 'bg-[#1a2a1a] text-[#4caf50]' },
  { id: 'ORD-202605-0188', detail: '12x Navy Polo -- Embroidery -- Acme Corp', status: 'Ready to Ship', badge: 'bg-[#142a3a] text-[#38bdf8]' },
  { id: 'ORD-202605-0190', detail: '100x Grey Tee -- HTV -- Daily Planet', status: 'Shipped', badge: 'bg-[#2a1a2a] text-[#a855f7]' },
] as const;

function ScreenshotPlaceholder({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#2a2a2a] bg-[#111111] p-6 sm:min-h-[220px]">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#3d2200] bg-[#1f1204]">
        <SwatchIcon className="h-5 w-5 text-[#ff6b00]" aria-hidden="true" />
      </div>
      <p className="text-[13px] font-semibold text-[#555555]">{label}</p>
      <p className="text-[10px] uppercase tracking-widest text-[#333333]">Screenshot coming soon</p>
    </div>
  );
}

function ScreenshotCard({
  src,
  alt,
  label,
  caption,
  onOpen,
}: Screenshot & { onOpen: () => void }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  if (failed) {
    return <ScreenshotPlaceholder label={label} />;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full overflow-hidden rounded-xl border border-[#222222] bg-[#141414] text-left transition-colors hover:border-[#ff6b00] focus:outline-none focus:ring-2 focus:ring-[#ff6b00] focus:ring-offset-2 focus:ring-offset-[#0f0f0f]"
        aria-label={`Open ${label} screenshot full screen`}
      >
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] bg-[#1a1a1a] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto text-[10px] tracking-wide text-[#555555]">{label}</span>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-[#ff6b00]">
            <ArrowsPointingOutIcon className="h-3 w-3" aria-hidden="true" />
            Enlarge
          </span>
        </div>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={handleError}
          className="block w-full transition-transform duration-300 group-hover:scale-[1.015]"
        />
      </button>
      <p className="mt-3 text-[13px] leading-relaxed text-[#666666]">{caption}</p>
    </div>
  );
}

function ScreenshotLightbox({
  screenshot,
  onClose,
}: {
  screenshot: Screenshot | null;
  onClose: () => void;
}): React.JSX.Element | null {
  useEffect(() => {
    if (!screenshot) return undefined;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, screenshot]);

  if (!screenshot) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-3 py-4 backdrop-blur-sm sm:px-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${screenshot.label} screenshot preview`}
      onClick={onClose}
    >
      <div
        className="relative max-h-full w-full max-w-7xl overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#101010] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-[52px] items-center gap-2 border-b border-[#1a1a1a] bg-[#171717] px-4">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
          <span className="ml-3 text-sm font-semibold text-[#dddddd]">{screenshot.label}</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#999999] hover:bg-[#222222] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
            aria-label="Close screenshot preview"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-92px)] overflow-auto bg-[#070707]">
          <img
            src={screenshot.src}
            alt={screenshot.alt}
            className="mx-auto block h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

function DemoVideo(): React.JSX.Element | null {
  const [available, setAvailable] = useState(true);
  const handleError = useCallback(() => setAvailable(false), []);

  if (!available) return null;

  return (
    <div className="mt-14">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-[#222222] bg-[#141414]">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] bg-[#1a1a1a] px-3 py-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f57]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto flex items-center gap-1.5 text-[10px] tracking-wide text-[#555555]">
            <PlayIcon className="h-3 w-3" aria-hidden="true" />
            60-Second Demo
          </span>
        </div>
        <video
          src={DEMO_VIDEO_SRC}
          controls
          preload="metadata"
          onError={handleError}
          className="block w-full"
          poster="/marketing/demo-poster.png"
        />
      </div>
    </div>
  );
}

function HeroPreview(): React.JSX.Element {
  const [selected, setSelected] = useState<Screenshot | null>(null);
  const featured = SCREENSHOTS[2];

  return (
    <div className="mx-auto mt-14 max-w-4xl">
      <ScreenshotCard {...featured} onOpen={() => setSelected(featured)} />
      <ScreenshotLightbox screenshot={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProductShowcase(): React.JSX.Element {
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const featured = SCREENSHOTS[0];
  const rest = SCREENSHOTS.slice(1);
  const closeScreenshot = useCallback(() => setSelectedScreenshot(null), []);

  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
          See it in action
        </p>
        <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
          Built for how you{' '}
          <span className="text-[#ff6b00]">actually work.</span>
        </h2>
        <p className="mb-14 mt-2 text-[15px] text-[#666666]">
          Real screens from PrintFlow -- not a mockup deck. Click any screenshot to view it full size.
        </p>

        {/* Featured screenshot (dashboard) */}
        <div className="mx-auto max-w-4xl">
          <ScreenshotCard {...featured} onOpen={() => setSelectedScreenshot(featured)} />
        </div>

        {/* Secondary screenshots grid */}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {rest.map((screenshot) => (
            <ScreenshotCard
              key={screenshot.src}
              {...screenshot}
              onOpen={() => setSelectedScreenshot(screenshot)}
            />
          ))}
        </div>

        {/* Optional demo video -- renders nothing if file is missing */}
        <DemoVideo />
      </div>
      <ScreenshotLightbox screenshot={selectedScreenshot} onClose={closeScreenshot} />
    </section>
  );
}

export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const accountCtaPath = isSignedIn ? '/dashboard' : '/signup';

  const scrollToSection = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
              onClick={() => navigate(isSignedIn ? '/dashboard' : '/sign-in')}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-[#777777] hover:text-[#f5f5f5]"
            >
              {isSignedIn ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#ff6b00] px-4 text-sm font-semibold text-white hover:bg-[#e55f00]"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start 14-day trial'}
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
              Built for custom apparel shops
            </div>
            <h1 className="text-[42px] font-extrabold leading-none tracking-[-1.5px] text-[#f5f5f5] sm:text-[54px] sm:tracking-[-2px] lg:text-[62px] lg:tracking-[-2.5px]">
              Run every custom apparel order<br />
              <span className="text-[#ff6b00]">from quote to shipped.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-[600px] text-[15px] leading-relaxed text-[#777777] sm:text-[18px]">
              Screen printers, DTF and HTV shops, embroiderers, and sublimation decorators run every job -- quotes, materials, production, and shipping -- in one place instead of spreadsheets, sticky notes, and scattered text threads.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => navigate(accountCtaPath)}
                className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-7 text-base font-bold text-white hover:bg-[#e55f00] sm:w-auto"
              >
                {isSignedIn ? 'Go to dashboard' : 'Start 14-day trial'}
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
              No credit card required -- 14-day free trial
            </p>
          </div>

          {/* Larger real product preview instead of a small mockup */}
          <HeroPreview />
        </section>

        {/* AUDIENCE STRIP */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[3px] text-[#555555]">
              Built for every way you decorate
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {AUDIENCES.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#2a2a2a] bg-[#161616] px-4 py-2 text-[12px] font-semibold text-[#bbbbbb]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <div className="border-t border-[#1a1a1a]" />
        <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              How it works
            </p>
            <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              From quote to shipped.
            </h2>
            <p className="mb-14 mt-2 text-[15px] text-[#666666]">
              Every step in one place -- no spreadsheets, no sticky notes, no group-chat chaos.
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

        {/* BEFORE / AFTER */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              Why shops switch
            </p>
            <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              From scattered chaos to{' '}
              <span className="text-[#ff6b00]">one connected workflow.</span>
            </h2>
            <p className="mb-14 mt-2 text-[15px] text-[#666666]">
              The same jobs, without the spreadsheets, sticky notes, and group-chat guesswork.
            </p>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-[#2a1a1a] bg-[#161111] p-7">
                <h3 className="mb-5 text-[13px] font-bold uppercase tracking-wide text-[#a86b5c]">
                  Before PrintFlow
                </h3>
                <ul className="space-y-4">
                  {BEFORE_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <XCircleIcon className="mt-0.5 h-5 w-5 flex-none text-[#7a4a42]" aria-hidden="true" />
                      <span className="text-[14px] leading-relaxed text-[#999999]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#3d2200] bg-[#171310] p-7">
                <h3 className="mb-5 text-[13px] font-bold uppercase tracking-wide text-[#ff6b00]">
                  With PrintFlow
                </h3>
                <ul className="space-y-4">
                  {AFTER_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-none text-[#ff6b00]" aria-hidden="true" />
                      <span className="text-[14px] leading-relaxed text-[#e5e5e5]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT SHOWCASE */}
        <div className="border-t border-[#1a1a1a]" />
        <ProductShowcase />

        {/* FEATURES */}
        <div className="border-t border-[#1a1a1a]" />
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              Features
            </p>
            <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              No bloated ERP. No generic retail POS.
            </h2>
            <p className="mb-14 mt-2 text-[15px] text-[#666666]">
              Just the workflow apparel decorators actually use -- orders, customers, production, inventory, and shipping.
            </p>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                See every active job at a glance -- what&apos;s printing, what&apos;s waiting on materials, and what ships today. Rush orders surface automatically so nothing falls through the cracks.
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

        {/* FAQ */}
        <div className="border-t border-[#1a1a1a]" />
        <section id="faq" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="mb-3 border-l-2 border-[#ff6b00] pl-3 text-[11px] font-semibold uppercase tracking-[4px] text-[#ff6b00]">
              FAQ
            </p>
            <h2 className="mb-10 text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
              Questions shop owners ask.
            </h2>
            <div className="divide-y divide-[#1a1a1a] border-y border-[#1a1a1a]">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex min-h-[44px] w-full cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#f5f5f5] [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDownIcon
                      className="h-5 w-5 flex-none text-[#777777] transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#888888]">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* CTA STRIP */}
      <div className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-[#1e1e1e] bg-[#141414] px-8 py-14 text-center">
          <h2 className="text-[26px] font-extrabold tracking-[-1px] sm:text-[30px] lg:text-[34px]">
            Simple enough for a home shop.{' '}
            <span className="text-[#ff6b00]">Organized enough to grow.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#666666]">
            Whether you&apos;re printing out of your garage or running a full production floor, PrintFlow keeps every job on track.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b00] px-7 text-base font-bold text-white hover:bg-[#e55f00] sm:w-auto"
            >
              {isSignedIn ? 'Go to dashboard' : 'Start 14-day trial'}
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
            No credit card required -- 14-day trial
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
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="min-h-[44px] text-[13px] text-[#555555] hover:text-[#f5f5f5]"
            >
              Pricing
            </button>
            {(['Privacy', 'Terms'] as const).map((label) => (
              <span key={label} className="flex min-h-[44px] items-center text-[13px] text-[#555555]">
                {label}
              </span>
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
