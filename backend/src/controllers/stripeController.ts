/**
 * stripeController — thin re-export of billing handlers.
 * Named per the stripe* convention used in stripeRoutes.
 */
export {
  checkoutHandler as createCheckout,
  portalHandler as createPortal,
  webhookHandler as webhook,
  usageHandler as usage,
} from './billingController';
