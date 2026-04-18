import { useState } from 'react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: { type: 'new' | 'improved' | 'fixed'; text: string }[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-04-18',
    changes: [
      { type: 'new', text: 'Multi-tenant POS system launch' },
      { type: 'new', text: 'Order management with status tracking' },
      { type: 'new', text: 'Inventory management with low-stock alerts' },
      { type: 'new', text: 'Customer database with purchase history' },
      { type: 'new', text: 'Stripe subscription billing' },
      { type: 'new', text: 'Shipment tracking integration' },
      { type: 'new', text: 'Purchase orders and vendor management' },
      { type: 'new', text: 'Reports and analytics dashboard' },
      { type: 'new', text: 'Offline-capable PWA with sync queue' },
    ],
  },
];

const TYPE_STYLES: Record<string, string> = {
  new:      'bg-blue-50 text-blue-700',
  improved: 'bg-green-50 text-green-700',
  fixed:    'bg-orange-50 text-orange-700',
};

const TYPE_LABELS: Record<string, string> = {
  new:      'New',
  improved: 'Improved',
  fixed:    'Fixed',
};

export function ChangelogPage(): React.JSX.Element {
  const [expanded, setExpanded] = useState<string>(CHANGELOG[0]?.version ?? '');

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Changelog</h1>
      <p className="text-sm text-gray-500 mb-8">Recent updates and improvements</p>

      <div className="space-y-4">
        {CHANGELOG.map((entry) => (
          <div
            key={entry.version}
            className="rounded-2xl border border-gray-100 bg-white overflow-hidden"
          >
            <button
              onClick={() =>
                setExpanded((v) => (v === entry.version ? '' : entry.version))
              }
              className="w-full flex items-center justify-between p-5 min-h-[44px] text-left hover:bg-gray-50 transition-colors"
            >
              <div>
                <span className="font-semibold text-gray-900">v{entry.version}</span>
                <span className="ml-3 text-sm text-gray-500">{entry.date}</span>
              </div>
              <span className="text-gray-400 text-lg">
                {expanded === entry.version ? '−' : '+'}
              </span>
            </button>

            {expanded === entry.version && (
              <ul className="px-5 pb-5 space-y-2">
                {entry.changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium ${
                        TYPE_STYLES[c.type] ?? ''
                      }`}
                    >
                      {TYPE_LABELS[c.type]}
                    </span>
                    <span className="text-gray-700">{c.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
