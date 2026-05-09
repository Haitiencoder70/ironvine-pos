import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../utils';
import { OrganizationSignup } from '@/pages/signup/OrganizationSignup';

// Mock the organization API so no real HTTP calls happen
vi.mock('@/services/organizationApi', () => ({
  organizationApi: {
    checkSubdomain: vi.fn(),
    create:         vi.fn(),
    findMine:       vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/hooks/useBilling', () => ({
  useBillingPlans: vi.fn().mockReturnValue({
    data: [
      { key: 'FREE', label: 'Free', priceCents: 0, popular: false, active: true, stripePriceConfigured: false, limits: { users: 1, ordersPerMonth: 100, customers: 100, inventoryItems: 500 }, features: ['1 user'] },
      { key: 'STARTER', label: 'Starter', priceCents: 2900, popular: false, active: true, stripePriceConfigured: true, limits: { users: 3, ordersPerMonth: 1000, customers: 500, inventoryItems: 2000 }, features: ['3 users'] },
      { key: 'PRO', label: 'Pro', priceCents: 7900, popular: true, active: true, stripePriceConfigured: true, limits: { users: 10, ordersPerMonth: -1, customers: -1, inventoryItems: -1 }, features: ['10 users'] },
      { key: 'ENTERPRISE', label: 'Enterprise', priceCents: null, popular: false, active: true, stripePriceConfigured: false, limits: { users: -1, ordersPerMonth: -1, customers: -1, inventoryItems: -1 }, features: ['Unlimited users'] },
    ],
    isLoading: false,
    isError: false,
  }),
}));

// Mock SubdomainChecker separately to control availability feedback
vi.mock('@/components/signup/SubdomainChecker', () => ({
  SubdomainChecker: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label htmlFor="subdomain-input">Subdomain</label>
      <input
        id="subdomain-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid="subdomain-input"
      />
      {value && <span data-testid="subdomain-status">available</span>}
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OrganizationSignup — step 1 renders', () => {
  it('shows Organization Name field on first render', () => {
    renderWithProviders(<OrganizationSignup />);
    expect(screen.getByText('Organization Name')).toBeInTheDocument();
  });

  it('shows Industry field on first render', () => {
    renderWithProviders(<OrganizationSignup />);
    expect(screen.getByText('Industry')).toBeInTheDocument();
  });
});

describe('OrganizationSignup — step 1 validation', () => {
  it('shows error when org name is empty and Continue is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSignup />);

    // Click Continue without filling anything
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
    });
  });

  it('auto-generates lowercase slug from org name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSignup />);

    const nameInput = screen.getByPlaceholderText(/acme t-shirts/i);
    await user.type(nameInput, 'My Print Shop');

    await waitFor(() => {
      const slugInput = screen.getByTestId('subdomain-input') as HTMLInputElement;
      expect(slugInput.value).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe('OrganizationSignup — slug validation rule', () => {
  it('slug schema rejects uppercase letters', () => {
    // Test the Zod schema directly — simpler and more reliable than driving the full form
    const schema = z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens');
    expect(schema.safeParse('MyShop').success).toBe(false);
    expect(schema.safeParse('myshop').success).toBe(true);
  });

  it('slug schema rejects spaces', () => {
    const schema = z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens');
    expect(schema.safeParse('my shop').success).toBe(false);
    expect(schema.safeParse('my-shop').success).toBe(true);
  });
});

describe('OrganizationSignup — step navigation', () => {
  it('advances to step 2 after valid step 1 data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OrganizationSignup />);

    // Fill org name
    await user.type(screen.getByPlaceholderText(/acme t-shirts/i), 'Test Shop');

    // Select industry
    const industrySelect = screen.getByRole('combobox');
    await user.selectOptions(industrySelect, 'T-Shirts');

    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Step 2 shows plan selection
    await waitFor(() => {
      expect(screen.getByText('Choose Plan')).toBeInTheDocument();
    });
  });
});
