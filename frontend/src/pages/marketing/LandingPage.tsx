import { useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🖨️',
    title: 'Built for Print Shops',
    desc: 'Order workflows, production stages, and garment tracking designed specifically for T-shirt and embroidery businesses.',
  },
  {
    icon: '📦',
    title: 'Inventory & Stock Control',
    desc: 'Track blanks, threads, and consumables. Get low-stock alerts before you run out mid-job.',
  },
  {
    icon: '👥',
    title: 'Customer CRM',
    desc: 'Store customer details, order history, and custom pricing — everything in one place.',
  },
  {
    icon: '📊',
    title: 'Real-Time Reports',
    desc: 'Sales, profit, and production reports updated live so you always know where your business stands.',
  },
  {
    icon: '📱',
    title: 'Touch-Optimized POS',
    desc: 'Designed for touchscreens and tablets on the shop floor — not a desktop-first afterthought.',
  },
  {
    icon: '🔒',
    title: 'Multi-Location Ready',
    desc: 'Manage multiple shops under one account with per-location inventory and staff access controls.',
  },
];

export function LandingPage(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-40">
        <span className="text-xl font-bold text-gray-900">YourApp</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pricing')}
            className="min-h-[44px] px-4 text-sm text-gray-600 hover:text-gray-900"
          >
            Pricing
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            className="min-h-[44px] px-4 text-sm text-gray-600 hover:text-gray-900"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="min-h-[44px] px-5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
          >
            Start Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block mb-4 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wide">
          Built for Print & Embroidery Shops
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
          The POS built for<br />
          <span className="text-blue-600">T-shirt businesses</span>
        </h1>
        <p className="mt-5 text-xl text-gray-500 max-w-2xl mx-auto">
          Manage orders, inventory, customers, and production — all from a single touch-optimized platform designed for the shop floor.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={() => navigate('/signup')}
            className="min-h-[52px] px-8 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
          >
            Start Free — No Card Required
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="min-h-[52px] px-8 border border-gray-300 text-gray-700 text-base font-medium rounded-xl hover:bg-gray-50"
          >
            See Pricing
          </button>
        </div>
        <p className="mt-4 text-sm text-gray-400">Free forever · Paid plans from $29/mo · 14-day trial</p>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Everything your shop needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Simple pricing, no surprises</h2>
        <p className="mt-3 text-gray-500">Start free. Upgrade as you grow. Cancel anytime.</p>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          {[
            { plan: 'Free', price: '$0', highlight: false },
            { plan: 'Starter', price: '$29/mo', highlight: false },
            { plan: 'Pro', price: '$79/mo', highlight: true },
            { plan: 'Enterprise', price: 'Custom', highlight: false },
          ].map(({ plan, price, highlight }) => (
            <div
              key={plan}
              className={`rounded-2xl border p-4 ${highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <p className="text-sm font-semibold text-gray-900">{plan}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{price}</p>
              {highlight && (
                <span className="mt-2 inline-block text-xs text-blue-600 font-medium">Most Popular</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/pricing')}
          className="mt-8 min-h-[48px] px-8 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
        >
          Compare all plans →
        </button>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-white">Ready to grow your shop?</h2>
        <p className="mt-3 text-blue-100">Join hundreds of print shops already using YourApp.</p>
        <button
          onClick={() => navigate('/signup')}
          className="mt-8 min-h-[52px] px-10 bg-white text-blue-600 text-base font-semibold rounded-xl hover:bg-blue-50 shadow-lg"
        >
          Get Started Free
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} YourApp. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-6">
          <a href="mailto:support@yourapp.com" className="hover:text-gray-600">Support</a>
          <a href="mailto:sales@yourapp.com" className="hover:text-gray-600">Sales</a>
          <button onClick={() => navigate('/pricing')} className="hover:text-gray-600">Pricing</button>
        </div>
      </footer>
    </div>
  );
}
