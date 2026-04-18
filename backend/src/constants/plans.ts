export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    stripePriceId: null as string | null,
    limits: {
      users: 1,
      ordersPerMonth: 50,
      inventoryItems: 200,
      customers: 100,
      storage: 500 * 1024 * 1024, // 500MB
    },
    features: [
      'Basic order management',
      'Inventory tracking',
      'Customer management',
      'Email support',
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
      storage: 5 * 1024 * 1024 * 1024, // 5GB
    },
    features: [
      'Everything in Free',
      'Custom branding',
      'Advanced reports',
      'Priority email support',
      '14-day free trial',
    ],
  },
  PROFESSIONAL: {
    name: 'Professional',
    price: 79,
    stripePriceId: process.env.STRIPE_PRICE_PRO as string | undefined,
    popular: true,
    limits: {
      users: 10,
      ordersPerMonth: -1, // unlimited
      inventoryItems: -1,
      customers: -1,
      storage: 50 * 1024 * 1024 * 1024, // 50GB
    },
    features: [
      'Everything in Starter',
      'Unlimited orders',
      'API access',
      'Bulk operations',
      'Email automation',
      'Phone support',
      '14-day free trial',
    ],
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE as string | undefined,
    limits: {
      users: -1,
      ordersPerMonth: -1,
      inventoryItems: -1,
      customers: -1,
      storage: 500 * 1024 * 1024 * 1024, // 500GB
    },
    features: [
      'Everything in Professional',
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
