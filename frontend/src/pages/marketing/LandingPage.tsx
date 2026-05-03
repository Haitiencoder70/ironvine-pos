import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  CloudArrowDownIcon,
  CubeIcon,
  DeviceTabletIcon,
  PrinterIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=2200&q=85';

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

const OPERATIONS = [
  { label: 'Offline PWA queue', Icon: CloudArrowDownIcon },
  { label: 'Receipt printing path', Icon: PrinterIcon },
  { label: 'Shipment tracking', Icon: TruckIcon },
] as const;

export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const accountCtaLabel = isSignedIn ? 'Go to dashboard' : 'Start free';
  const accountCtaPath = isSignedIn ? '/signup' : '/signup';

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/20 bg-gray-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="min-h-[44px] rounded-xl px-1 text-left text-lg font-bold text-white"
          >
            PrintFlow POS
          </button>
          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="hidden min-h-[44px] rounded-xl px-4 text-sm font-medium text-gray-200 hover:bg-white/10 sm:inline-flex sm:items-center"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate(isSignedIn ? accountCtaPath : '/sign-in')}
              className="min-h-[44px] rounded-xl px-4 text-sm font-medium text-gray-200 hover:bg-white/10"
            >
              {isSignedIn ? 'Dashboard' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => navigate(accountCtaPath)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {accountCtaLabel}
              <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden bg-gray-950">
          <img
            src={HERO_IMAGE}
            alt="Custom printed shirts stacked in a production workspace"
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.95),rgba(17,24,39,0.76),rgba(17,24,39,0.2))]" />

          <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 pb-28 pt-28 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">
                T-shirt graphics point of sale
              </p>
              <h1 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                PrintFlow POS
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-100">
                Run custom apparel orders from quote to delivery with customer records, production status,
                inventory, purchase orders, and tablet-ready shop workflows in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate(accountCtaPath)}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-base font-semibold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-700"
                >
                  {isSignedIn ? 'Go to dashboard' : 'Create workspace'}
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-white/45 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  View pricing
                </button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 border-t border-white/15 bg-gray-950/72 backdrop-blur">
              <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-4 sm:grid-cols-4 sm:px-6 lg:grid-cols-6 lg:px-8">
                {WORKFLOW.map((step) => (
                  <div key={step} className="min-h-[56px] px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">Workflow</p>
                    <p className="mt-1 text-sm font-semibold text-white">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-200 bg-gray-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
            {FEATURES.map(({ title, body, Icon }) => (
              <article key={title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <Icon className="h-8 w-8 text-blue-600" aria-hidden="true" />
                <h2 className="mt-5 text-lg font-semibold text-gray-900">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-gray-600">{body}</p>
              </article>
            ))}
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
