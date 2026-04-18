const SERVICES = [
  { name: 'API',          description: 'Backend REST API' },
  { name: 'Database',     description: 'PostgreSQL (Neon)' },
  { name: 'Auth',         description: 'Clerk authentication' },
  { name: 'Payments',     description: 'Stripe billing' },
  { name: 'File Storage', description: 'Vercel Blob' },
  { name: 'Email',        description: 'Resend transactional email' },
];

export function StatusPage(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 mb-4">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-800">All systems operational</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden mb-8">
          {SERVICES.map((service, i) => (
            <div
              key={service.name}
              className={`flex items-center justify-between px-5 py-4 ${
                i < SERVICES.length - 1 ? 'border-b border-gray-50' : ''
              }`}
            >
              <div>
                <p className="font-medium text-gray-900 text-sm">{service.name}</p>
                <p className="text-xs text-gray-400">{service.description}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-700 font-medium">Operational</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Recent Incidents</h2>
          <p className="text-sm text-gray-500">No incidents reported in the last 90 days.</p>
        </div>
      </div>
    </div>
  );
}
