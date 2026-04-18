interface PlanFeature {
  text: string;
}

interface PlanCardProps {
  name: string;
  price: number | 'Custom';
  features: readonly string[];
  popular?: boolean;
  selected?: boolean;
  billingCycle?: 'monthly' | 'yearly';
  ctaLabel: string;
  ctaVariant?: 'primary' | 'outline' | 'disabled';
  onSelect: () => void;
}

export function PlanCard({
  name,
  price,
  features,
  popular,
  selected,
  billingCycle = 'monthly',
  ctaLabel,
  ctaVariant = 'primary',
  onSelect,
}: PlanCardProps): React.JSX.Element {
  const displayPrice =
    price === 'Custom'
      ? 'Custom'
      : billingCycle === 'yearly'
      ? `$${Math.round((price as number) * 0.8)}/mo`
      : price === 0
      ? 'Free'
      : `$${price}/mo`;

  const yearlySavings =
    typeof price === 'number' && price > 0 && billingCycle === 'yearly'
      ? Math.round((price as number) * 12 * 0.2)
      : null;

  return (
    <div
      className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50/30'
          : popular
          ? 'border-purple-400 shadow-md'
          : 'border-gray-200 bg-white'
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
          Most Popular
        </span>
      )}

      <div>
        <h3 className="text-base font-semibold text-gray-900">{name}</h3>
        <p className="text-3xl font-bold text-gray-900 mt-1">{displayPrice}</p>
        {yearlySavings && (
          <p className="text-xs text-green-600 mt-0.5">Save ${yearlySavings}/year</p>
        )}
      </div>

      <ul className="flex-1 space-y-2 text-sm text-gray-600">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5 shrink-0">✓</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={ctaVariant === 'disabled'}
        className={`min-h-[44px] w-full rounded-xl text-sm font-medium transition-colors ${
          ctaVariant === 'primary'
            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
            : ctaVariant === 'outline'
            ? 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
