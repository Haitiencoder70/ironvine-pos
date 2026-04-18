interface UsageProgressBarProps {
  label: string;
  current: number;
  max: number;
  unit?: string;
  onUpgrade?: () => void;
}

function formatValue(n: number, unit?: string): string {
  if (unit === 'bytes') {
    if (n >= 1024 * 1024 * 1024) return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    return `${(n / 1024).toFixed(1)} KB`;
  }
  return n.toLocaleString();
}

export function UsageProgressBar({ label, current, max, unit, onUpgrade }: UsageProgressBarProps): React.JSX.Element {
  const unlimited = max === -1;
  const pct = unlimited ? 0 : Math.min((current / max) * 100, 100);
  const isAtLimit  = !unlimited && pct >= 100;
  const isWarning  = !unlimited && pct >= 80 && pct < 100;

  const barColor = isAtLimit ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-blue-500';
  const textColor = isAtLimit ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${textColor}`}>
            {unlimited
              ? `${formatValue(current, unit)} / ∞`
              : `${formatValue(current, unit)} / ${formatValue(max, unit)}`}
          </span>
          {!unlimited && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              isAtLimit  ? 'bg-red-100 text-red-700' :
              isWarning  ? 'bg-amber-100 text-amber-700' :
                           'bg-gray-100 text-gray-500'
            }`}>
              {Math.round(pct)}%
            </span>
          )}
        </div>
      </div>

      {!unlimited && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {isAtLimit && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs text-red-600 font-medium hover:underline"
        >
          Limit reached — upgrade to continue →
        </button>
      )}
      {isWarning && onUpgrade && (
        <button
          onClick={onUpgrade}
          className="text-xs text-amber-600 font-medium hover:underline"
        >
          Approaching limit — consider upgrading →
        </button>
      )}
    </div>
  );
}
