import { SubscriptionPlan } from '@prisma/client';

const FEATURE_PLANS: Record<string, SubscriptionPlan[]> = {
  API_ACCESS:       ['PROFESSIONAL', 'ENTERPRISE'],
  WHITE_LABEL:      ['PROFESSIONAL', 'ENTERPRISE'],
  CUSTOM_DOMAIN:    ['ENTERPRISE'],
  ADVANCED_REPORTS: ['PROFESSIONAL', 'ENTERPRISE'],
  BULK_OPERATIONS:  ['PROFESSIONAL', 'ENTERPRISE'],
  CUSTOM_CSS:       ['ENTERPRISE'],
  PRIORITY_SUPPORT: ['ENTERPRISE'],
};

export type FeatureKey = keyof typeof FEATURE_PLANS;

export function hasFeature(plan: SubscriptionPlan, feature: FeatureKey): boolean {
  return FEATURE_PLANS[feature]?.includes(plan) ?? false;
}

export function getEnabledFeatures(plan: SubscriptionPlan): FeatureKey[] {
  return (Object.keys(FEATURE_PLANS) as FeatureKey[]).filter((f) => hasFeature(plan, f));
}
