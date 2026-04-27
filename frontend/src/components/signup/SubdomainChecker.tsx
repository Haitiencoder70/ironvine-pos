import { useEffect, useState, useRef } from 'react';
import { organizationApi } from '../../services/organizationApi';

const APP_DOMAIN = (import.meta.env['VITE_APP_DOMAIN'] as string | undefined) ?? 'printflowpos.com';

interface SubdomainCheckerProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

type Status = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function SubdomainChecker({ value, onChange, error }: SubdomainCheckerProps): React.JSX.Element {
  const [status, setStatus] = useState<Status>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const slug = value.trim().toLowerCase();

    if (!slug) {
      setStatus('idle');
      return;
    }

    if (!/^[a-z0-9-]{3,}$/.test(slug)) {
      setStatus('invalid');
      return;
    }

    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await organizationApi.checkSlugAvailability(slug);
        setStatus(result.available ? 'available' : 'taken');
        setSuggestions(result.suggestions ?? []);
      } catch {
        setStatus('idle');
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const statusIcon: Record<Status, React.ReactNode> = {
    idle:      null,
    checking:  <span className="text-gray-400 text-sm animate-pulse">Checking…</span>,
    available: <span className="text-green-600 text-sm font-medium">✓ Available</span>,
    taken:     <span className="text-red-500 text-sm font-medium">✗ Taken</span>,
    invalid:   <span className="text-amber-500 text-sm">Min 3 chars, letters/numbers/hyphens only</span>,
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        Organization URL
      </label>
      <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="my-company"
          className="flex-1 min-h-[44px] px-3 text-sm outline-none bg-transparent"
        />
        <span className="px-3 text-sm text-gray-400 bg-gray-50 border-l border-gray-300 h-full flex items-center whitespace-nowrap">
          .{APP_DOMAIN}
        </span>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div>{statusIcon[status]}</div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
      </div>
      {status === 'taken' && suggestions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mt-1">
          <span className="text-xs text-gray-500">Try:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="text-xs text-blue-600 underline hover:text-blue-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
