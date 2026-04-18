import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usePlanLimits } from '@/hooks/usePlanLimits';

// Mock useBillingUsage to return controlled data without hitting the API
vi.mock('@/hooks/useBilling', () => ({
  useBillingUsage: vi.fn(),
}));

import { useBillingUsage } from '@/hooks/useBilling';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mockBilling(plan: string, orderCurrent: number, orderMax: number) {
  (useBillingUsage as ReturnType<typeof vi.fn>).mockReturnValue({
    data: {
      plan,
      usage: {
        orders:         { current: orderCurrent, max: orderMax },
        customers:      { current: 0, max: 100 },
        users:          { current: 1, max: 1 },
        inventoryItems: { current: 0, max: 500 },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('canCreateOrder', () => {
  it('returns allowed=false when at FREE plan order limit', () => {
    mockBilling('FREE', 100, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canCreateOrder(false).allowed).toBe(false);
  });

  it('returns allowed=true when under the limit', () => {
    mockBilling('FREE', 50, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canCreateOrder(false).allowed).toBe(true);
  });

  it('returns allowed=true on ENTERPRISE (max = -1, unlimited)', () => {
    mockBilling('ENTERPRISE', 99999, -1);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canCreateOrder(false).allowed).toBe(true);
  });

  it('message contains limit count and upgrade hint when blocked', () => {
    mockBilling('FREE', 100, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    const check = result.current.canCreateOrder(false);
    expect(check.message).toContain('100');
    expect(check.message.toLowerCase()).toContain('upgrade');
  });

  it('returns allowed=true when billing data is not yet loaded', () => {
    (useBillingUsage as ReturnType<typeof vi.fn>).mockReturnValue({ data: undefined });
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canCreateOrder(false).allowed).toBe(true);
  });
});

describe('canUseBranding', () => {
  it('is false on FREE plan', () => {
    mockBilling('FREE', 0, 100);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canUseBranding).toBe(false);
  });

  it('is true on PRO plan', () => {
    mockBilling('PRO', 0, 5000);
    const { result } = renderHook(() => usePlanLimits(), { wrapper: makeWrapper() });
    expect(result.current.canUseBranding).toBe(true);
  });
});
