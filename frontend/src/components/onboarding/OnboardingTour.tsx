import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOUR_KEY = 'pos_onboarding_complete';

interface TourStep {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

const STEPS: TourStep[] = [
  {
    title: 'Welcome to your POS!',
    description: 'Let\'s get you set up in 3 quick steps so you can start taking orders.',
  },
  {
    title: 'Add your first product',
    description: 'Set up your T-shirt printing services, sizes, and pricing.',
    action: { label: 'Go to Products', href: '/products/new' },
  },
  {
    title: 'Add a customer',
    description: 'Import or create your first customer to attach to orders.',
    action: { label: 'Add Customer', href: '/customers' },
  },
  {
    title: 'Create your first order',
    description: 'You\'re all set! Head to the POS to ring up your first sale.',
    action: { label: 'Open POS', href: '/pos' },
  },
];

export function OnboardingTour(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) setVisible(true);
  }, []);

  function dismiss(): void {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
  }

  function advance(): void {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  function handleAction(href: string): void {
    advance();
    void navigate(href);
  }

  if (!visible) return null;

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl bg-white shadow-2xl border border-gray-100 p-5"
      role="dialog"
      aria-label="Onboarding tour"
    >
      {/* Progress dots */}
      <div className="flex gap-1.5 mb-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <h3 className="font-semibold text-gray-900 text-base mb-1">{current.title}</h3>
      <p className="text-sm text-gray-600 mb-4">{current.description}</p>

      <div className="flex gap-2">
        {current.action ? (
          <button
            onClick={() => handleAction(current.action!.href)}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {current.action.label}
          </button>
        ) : (
          <button
            onClick={advance}
            className="flex-1 min-h-[44px] rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        )}
        <button
          onClick={dismiss}
          className="min-h-[44px] px-3 rounded-xl text-gray-500 text-sm hover:bg-gray-100 transition-colors"
          aria-label="Dismiss tour"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
