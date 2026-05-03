import { useCallback } from 'react';
import { useBillingUsage } from './useBilling';
import { getLimitStatus, formatCount } from '../utils/formatUsage';

// The upgrade modal handler is registered in App.tsx via setUpgradeModalHandler.
// We trigger it here by posting a custom event that App.tsx listens for, so this
// hook stays decoupled from React context.
function triggerUpgradeModal(message: string) {
  window.dispatchEvent(new CustomEvent('plan:limit', { detail: { message } }));
}

export type LimitType = 'orders' | 'customers' | 'users' | 'inventoryItems';

export interface LimitCheck {
  /** True when the action is allowed (under limit or unlimited). */
  allowed: boolean;
  /** Human-readable message explaining the result. */
  message: string;
}

export function usePlanLimits() {
  const { data: billing } = useBillingUsage();

  /** Generic check: is a given limit type at capacity? */
  const isAtLimit = useCallback((type: LimitType): boolean => {
    if (!billing) return false;
    const { current, max } = billing.usage[type];
    if (max === -1) return false;
    return current >= max;
  }, [billing]);

  /** Show the upgrade modal with an optional message. */
  const showUpgradeModal = useCallback((message?: string) => {
    triggerUpgradeModal(message ?? "You've reached a limit on your current plan.");
  }, []);

  /** Build a LimitCheck and optionally fire the upgrade modal if blocked. */
  const check = useCallback((
    type: LimitType,
    label: string,
    fireModal = true,
  ): LimitCheck => {
    if (!billing) return { allowed: true, message: '' };
    const { current, max } = billing.usage[type];
    if (max === -1) return { allowed: true, message: `${label}: unlimited` };

    const at = current >= max;
    const msg = at
      ? `You've reached your plan limit of ${max.toLocaleString()} ${label.toLowerCase()}. Upgrade to add more.`
      : `${formatCount(current, max)} ${label.toLowerCase()} used.`;

    if (at && fireModal) showUpgradeModal(msg);
    return { allowed: !at, message: msg };
  }, [billing, showUpgradeModal]);

  const canCreateOrder    = useCallback((fireModal = true) => check('orders',         'Orders',           fireModal), [check]);
  const canAddCustomer    = useCallback((fireModal = true) => check('customers',      'Customers',        fireModal), [check]);
  const canAddUser        = useCallback((fireModal = true) => check('users',          'Team Members',     fireModal), [check]);
  const canAddInventory   = useCallback((fireModal = true) => check('inventoryItems', 'Inventory Items',  fireModal), [check]);

  /** Check a file upload against a hypothetical storage limit (future). */
  const canUploadFile = useCallback((): LimitCheck => {
    // Storage tracking is not yet in the billing usage API — always allow for now
    return { allowed: true, message: 'Storage: unlimited' };
  }, []);

  const canUseBranding = billing
    ? billing.plan === 'PRO' || billing.plan === 'ENTERPRISE'
    : false;

  const canUseCustomDomain = billing
    ? billing.plan === 'ENTERPRISE'
    : false;

  /** Returns the status of all limits so banners know what to show. */
  const limitStatuses = billing
    ? {
        orders:         getLimitStatus(billing.usage.orders.current,         billing.usage.orders.max),
        customers:      getLimitStatus(billing.usage.customers.current,      billing.usage.customers.max),
        users:          getLimitStatus(billing.usage.users.current,          billing.usage.users.max),
        inventoryItems: getLimitStatus(billing.usage.inventoryItems.current, billing.usage.inventoryItems.max),
      }
    : null;

  return {
    billing,
    isAtLimit,
    canCreateOrder,
    canAddCustomer,
    canAddUser,
    canAddInventory,
    canUploadFile,
    showUpgradeModal,
    limitStatuses,
    canUseBranding,
    canUseCustomDomain,
  };
}
