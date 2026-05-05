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

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Production control</p>
              <h2 className="mt-3 text-3xl font-bold text-gray-900">Know what is waiting, moving, and ready.</h2>
              <p className="mt-4 text-base leading-7 text-gray-600">
                PrintFlow POS is shaped for apparel decorators who need clean handoffs between sales,
                purchasing, production, and shipping without losing the customer promise.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {OPERATIONS.map(({ label, Icon }) => (
                  <div key={label} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-gray-200 px-4">
                    <Icon className="h-6 w-6 shrink-0 text-blue-600" aria-hidden="true" />
                    <span className="text-sm font-semibold text-gray-800">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-950 p-4 shadow-lg">
              <div className="rounded-lg bg-white p-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Today</p>
                    <p className="text-lg font-bold text-gray-900">Rush order queue</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    4 due soon
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ['ORD-202605-0182', 'Materials received', '50 black tees'],
                    ['ORD-202605-0184', 'In production', '24 hoodies'],
                    ['ORD-202605-0188', 'Ready to ship', '12 polos'],
                  ].map(([order, status, detail]) => (
                    <div key={order} className="flex min-h-[60px] items-center justify-between rounded-lg border border-gray-200 px-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order}</p>
                        <p className="text-xs text-gray-500">{detail}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                        <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
