import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  /** Clerk org ID (external identifier, used for Clerk API calls) */
  organizationId: string;
  /** Prisma row cuid (internal, used for all DB queries) */
  organizationDbId: string;
}

const storage = new AsyncLocalStorage<TenantContext>();

/**
 * Set the tenant context for the current async execution tree.
 * Call this inside the tenant middleware after resolving the org,
 * then invoke `next()` inside the `storage.run()` callback so the
 * entire request handler chain shares the same store.
 *
 * Usage in middleware:
 *   storage.run(ctx, () => next());
 *
 * Because Express middleware chains are async, we expose a simpler
 * `setTenantContext` that wraps `next` for callers that cannot easily
 * restructure their middleware into the `run()` pattern.
 */
export function setTenantContext(ctx: TenantContext, callback?: () => void): void {
  if (callback) {
    storage.run(ctx, callback);
  } else {
    // When no callback is provided, store in the current context (best-effort).
    // The recommended approach is to pass the `next` function as the callback.
    const existing = storage.getStore();
    if (existing) {
      existing.organizationId    = ctx.organizationId;
      existing.organizationDbId  = ctx.organizationDbId;
    }
    // If there is no existing store (first call), the caller MUST use the
    // callback form or restructure to use runWithTenantContext.
  }
}

/**
 * Run a callback inside a tenant context.
 * Preferred over `setTenantContext` when you control the execution entry-point
 * (e.g. wrapping an Express next() call).
 *
 * @example
 * runWithTenantContext({ organizationId, organizationDbId }, next);
 */
export function runWithTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/**
 * Retrieve the full tenant context for the current async scope.
 * Returns `undefined` outside of a tenant-aware request.
 */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/**
 * Retrieve the Clerk org ID for the current request.
 * Throws if called outside of a tenant-aware request context.
 */
export function getCurrentOrganizationId(): string {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'getCurrentOrganizationId() called outside of a tenant context. ' +
        'Ensure the tenant middleware has run before calling this helper.',
    );
  }
  return ctx.organizationId;
}

/**
 * Retrieve the Prisma-row cuid for the current request.
 * Throws if called outside of a tenant-aware request context.
 */
export function getCurrentOrganizationDbId(): string {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'getCurrentOrganizationDbId() called outside of a tenant context. ' +
        'Ensure the tenant middleware has run before calling this helper.',
    );
  }
  return ctx.organizationDbId;
}

/**
 * Safe (non-throwing) variant — returns null instead of throwing.
 * Useful in code paths that might run outside of a request (e.g. cron jobs).
 */
export function getCurrentOrganization(): TenantContext | null {
  return storage.getStore() ?? null;
}
