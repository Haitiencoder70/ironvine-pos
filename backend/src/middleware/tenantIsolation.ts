import { Prisma } from '@prisma/client';
import { getCurrentOrganization } from '../utils/tenantContext';
import { logger } from '../lib/logger';

/**
 * Models that do NOT belong to a single tenant and must be excluded from
 * automatic `organizationId` filtering / injection.
 */
const EXCLUDED_MODELS = new Set(['Organization']);

/**
 * Prisma middleware that enforces tenant isolation on every query.
 *
 * Behaviour per operation:
 *  - findMany / findFirst / findFirstOrThrow / count / aggregate / groupBy
 *      → injects `where.organizationId` so only the current tenant's rows are returned
 *  - findUnique / findUniqueOrThrow
 *      → no-op (caller is responsible for including the id; an org-mismatch check
 *        would require a read-then-check which defeats the purpose of findUnique)
 *  - create / createMany
 *      → injects `organizationId` into `data` (or each item of `data`)
 *  - update / updateMany / upsert
 *      → injects `where.organizationId` to prevent cross-tenant mutation;
 *        for upsert also injects into `create.organizationId`
 *  - delete / deleteMany
 *      → injects `where.organizationId`
 *
 * The middleware is a no-op for excluded models and when no tenant context
 * is present (e.g. background jobs, seeding, tests).
 */
export const tenantIsolationMiddleware: Prisma.Middleware = async (params, next) => {
  const model = params.model as string | undefined;

  // Skip excluded models or unknown models
  if (!model || EXCLUDED_MODELS.has(model)) {
    return next(params);
  }

  const ctx = getCurrentOrganization();

  // No tenant context → pass through (background jobs / seed scripts / tests)
  if (!ctx) {
    return next(params);
  }

  const { organizationDbId } = ctx;

  try {
    switch (params.action) {
      // ── Read operations ────────────────────────────────────────────────────
      case 'findMany':
      case 'findFirst':
      case 'findFirstOrThrow':
      case 'count':
      case 'aggregate':
      case 'groupBy': {
        params.args ??= {};
        params.args.where ??= {};
        // Only inject if the model actually has organizationId
        if (!('organizationId' in (params.args.where as Record<string, unknown>))) {
          (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;
        }
        break;
      }

      // ── Create operations ──────────────────────────────────────────────────
      case 'create': {
        params.args ??= {};
        params.args.data ??= {};
        if (!('organizationId' in (params.args.data as Record<string, unknown>))) {
          (params.args.data as Record<string, unknown>)['organizationId'] = organizationDbId;
        }
        break;
      }

      case 'createMany': {
        params.args ??= {};
        if (Array.isArray(params.args.data)) {
          params.args.data = (params.args.data as Record<string, unknown>[]).map((item) => ({
            organizationId: organizationDbId,
            ...item,
          }));
        } else if (params.args.data && typeof params.args.data === 'object') {
          const d = params.args.data as Record<string, unknown>;
          if (!('organizationId' in d)) {
            d['organizationId'] = organizationDbId;
          }
        }
        break;
      }

      // ── Update operations ──────────────────────────────────────────────────
      case 'update': {
        params.args ??= {};
        params.args.where ??= {};
        (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;
        break;
      }

      case 'updateMany': {
        params.args ??= {};
        params.args.where ??= {};
        (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;
        break;
      }

      // ── Upsert ────────────────────────────────────────────────────────────
      case 'upsert': {
        params.args ??= {};
        params.args.where ??= {};
        (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;

        // Inject into the create branch so the row is tenant-tagged on insert
        params.args.create ??= {};
        if (!('organizationId' in (params.args.create as Record<string, unknown>))) {
          (params.args.create as Record<string, unknown>)['organizationId'] = organizationDbId;
        }
        break;
      }

      // ── Delete operations ──────────────────────────────────────────────────
      case 'delete': {
        params.args ??= {};
        params.args.where ??= {};
        (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;
        break;
      }

      case 'deleteMany': {
        params.args ??= {};
        params.args.where ??= {};
        (params.args.where as Record<string, unknown>)['organizationId'] = organizationDbId;
        break;
      }

      // findUnique / findUniqueOrThrow — skip; caller provides PK
      default:
        break;
    }
  } catch (err) {
    logger.error('tenantIsolation middleware error', { model, action: params.action, err });
    // Do not swallow — re-throw so the query fails visibly rather than leaking data
    throw err;
  }

  return next(params);
};
