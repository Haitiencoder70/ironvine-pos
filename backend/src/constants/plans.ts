export const PLANS = {
  FREE: {
    name: '14-Day Trial',
    price: 0,
    stripePriceId: null as string | null,
    limits: {
      users: 1,
      ordersPerMonth: 50,
      inventoryItems: 200,
      customers: 100,
      storage: 500 * 1024 * 1024,
    },
    features: [
      'Full POS access for 14 days',
      'Order management',
      'Inventory tracking',
      'Customer management',
    ],
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_STARTER as string | undefined,
    limits: {
      users: 3,
      ordersPerMonth: 500,
      inventoryItems: 2000,
      customers: 1000,
      storage: 5 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Trial, plus:',
      'Custom branding',
      'Advanced reports',
      'Priority email support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO as string | undefined,
    popular: true,
    limits: {
      users: 10,
      ordersPerMonth: -1,
      inventoryItems: -1,
      customers: -1,
      storage: 50 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Starter',
      'Unlimited orders',
      'API access',
      'Bulk operations',
      'Email automation',
      'Phone support',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE as string | undefined,
    limits: {
      users: -1,
      ordersPerMonth: -1,
      inventoryItems: -1,
      customers: -1,
      storage: 500 * 1024 * 1024 * 1024,
    },
    features: [
      'Everything in Pro',
      'White-label',
      'Custom domain',
      'Dedicated database',
      '24/7 priority support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** DB-column-compatible limits derived from the canonical plan catalog. */
export function getPlanDbLimits(plan: PlanKey): {
  maxUsers: number;
  maxOrders: number;
  maxInventoryItems: number;
  maxCustomers: number;
  storageLimit: number;
} {
  const p = PLANS[plan];
  return {
    maxUsers:         p.limits.users,
    maxOrders:        p.limits.ordersPerMonth,
    maxInventoryItems: p.limits.inventoryItems,
    maxCustomers:     p.limits.customers,
    storageLimit:     p.limits.storage,
  };
}
