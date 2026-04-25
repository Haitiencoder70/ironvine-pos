import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function TrialBanner(): React.JSX.Element | null {
  const navigate = useNavigate();
  const organization = useAuthStore((s) => s.organization);

  if (!organization || organization.plan !== 'FREE' || !organization.trialEndsAt) return null;

  const msLeft = new Date(organization.trialEndsAt).getTime() - Date.now();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const expired = daysLeft <= 0;

  if (!expired && daysLeft > 7) return null; // only show when ≤7 days left or expired

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 text-sm flex-wrap ${
        expired
          ? 'bg-red-600 text-white'
          : 'bg-amber-50 text-amber-900 border-b border-amber-200'
      }`}
    >
      <span className="flex-shrink-0 text-base">{expired ? '🚫' : '⏳'}</span>

      <span className="flex-1 min-w-0">
        {expired
          ? 'Your 14-day free trial has expired. Upgrade to keep creating orders, customers, and inventory.'
          : `Your free trial expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Upgrade to keep full access.`}
      </span>

      <button
        onClick={() => navigate('/settings/billing')}
        className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
          expired
            ? 'bg-white text-red-600 hover:bg-red-50'
            : 'bg-amber-600 text-white hover:bg-amber-700'
        }`}
      >
        Upgrade now
      </button>
    </div>
  );
}
