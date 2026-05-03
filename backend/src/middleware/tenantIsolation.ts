import { getCurrentOrganization } from '../utils/tenantContext';
import { logger } from '../lib/logger';

/**
 * Models that do NOT belong to a single tenant and must be excluded from
 * automatic `organizationId` filtering / injection.
 */
const EXCLUDED_MODELS = new Set(['Organization', 'GarmentImage']);

/**
 * Applies tenant isolation to a single Prisma operation's args.
 *
 * Behaviour per operation:
 *  - findMany / findFirst / findFirstOrThrow / count / aggregate / groupBy
 *      → injects `where.organizationId` so only the current tenant's rows are returned
 *  - create / createMany
 *      → injects `organizationId` into `data` (or each item of `data`)
 *  - update / updateMany / upsert / delete / deleteMany
 *      → injects `where.organizationId` to prevent cross-tenant mutation
 *  - findUnique / findUniqueOrThrow
 *      → no-op (caller provides PK)
 */
function applyTenantIsolation(
  _model: string,
  operation: string,
  args: Record<string, unknown>,
  organizationDbId: string,
): Record<string, unknown> {
  const a = { ...args };

  switch (operation) {
    case 'findMany':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findUnique':
    case 'findUniqueOrThrow':
    case 'count':
    case 'aggregate':
    case 'groupBy': {
      a['where'] ??= {};
      const where = a['where'] as Record<string, unknown>;
      if (!('organizationId' in where)) {
        where['organizationId'] = organizationDbId;
      }
      break;
    }

    case 'create': {
      a['data'] ??= {};
      const data = a['data'] as Record<string, unknown>;
      if (!('organizationId' in data)) {
        data['organizationId'] = organizationDbId;
      }
      break;
    }

    case 'createMany': {
      if (Array.isArray(a['data'])) {
        a['data'] = (a['data'] as Record<string, unknown>[]).map((item) => ({
          organizationId: organizationDbId,
          ...item,
        }));
      } else if (a['data'] && typeof a['data'] === 'object') {
        const d = a['data'] as Record<string, unknown>;
        if (!('organizationId' in d)) {
          d['organizationId'] = organizationDbId;
        }
      }
      break;
    }

    case 'update':
    case 'updateMany':
    case 'delete':
    case 'deleteMany': {
      a['where'] ??= {};
      (a['where'] as Record<string, unknown>)['organizationId'] = organizationDbId;
      break;
    }

    case 'upsert': {
      a['where'] ??= {};
      (a['where'] as Record<string, unknown>)['organizationId'] = organizationDbId;
      a['create'] ??= {};
      const create = a['create'] as Record<string, unknown>;
      if (!('organizationId' in create)) {
        create['organizationId'] = organizationDbId;
      }
      break;
    }

    // findUnique / findUniqueOrThrow — skip; caller provides PK
    default:
      break;
  }

  return a;
}

/**
 * Prisma `$extends` query extension that enforces multi-tenant isolation on
 * every operation. Replaces the removed `$use` / `Prisma.Middleware` API.
 *
 * Returns the extension object to be spread into `$extends({ query: ... })`.
 */
export const tenantIsolationExtension = {
  $allModels: {
    async $allOperations({
      model,
      operation,
      args,
      query,
    }: {
      model: string;
      operation: string;
      args: Record<string, unknown>;
      query: (args: Record<string, unknown>) => Promise<unknown>;
    }): Promise<unknown> {
      if (EXCLUDED_MODELS.has(model)) {
        return query(args);
      }

      const ctx = getCurrentOrganization();
      if (!ctx) {
        // No tenant context → background job / seed / test — pass through
        return query(args);
      }

      const { organizationDbId } = ctx;

      try {
        const isolatedArgs = applyTenantIsolation(model, operation, args, organizationDbId);
        return query(isolatedArgs);
      } catch (err) {
        logger.error('tenantIsolation extension error', { model, operation, err });
        throw err;
      }
    },
  },
};
