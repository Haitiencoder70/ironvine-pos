import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';
import { runWithTenantContext } from '../utils/tenantContext';
import { cacheService } from '../services/cacheService';

const ORG_CACHE_TTL = 300; // 5 minutes
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'staging', 'mail', 'pos', 'clerk', 'accounts']);

interface ResolvedOrg {
  id: string;
  clerkOrgId: string;
  subdomain: string;
  _count: {
    orders: number;
    customers: number;
    inventoryItems: number;
    products: number;
  };
}

function dataWeight(org: ResolvedOrg): number {
  return org._count.orders + org._count.customers + org._count.inventoryItems + org._count.products;
}

declare module 'express-serve-static-core' {
  interface Request {
    organizationId?: string;    // Clerk org ID (external)
    organizationDbId?: string;  // Prisma row ID (internal)
  }
}

/**
 * Extract the subdomain from the request hostname.
 * e.g. "acme.myapp.com"  → "acme"
 *      "localhost"        → null
 *      "192.168.1.1"      → null
 */
function extractSubdomain(hostname: string): string | null {
  // Strip port if present
  const host = hostname.split(':')[0]!;

  // Skip raw IP addresses
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  // Handle *.localhost for local development (e.g. "ironvine.localhost")
  if (host.endsWith('.localhost')) {
    return host.replace(/\.localhost$/, '') || null;
  }

  // Skip localhost and single-label hosts
  const parts = host.split('.');
  if (parts.length < 3) return null;

  const sub = parts[0]!;

  // Ignore platform/service hostnames as they are not tenant subdomains.
  if (RESERVED_SUBDOMAINS.has(sub)) return null;

  return sub;
}

/**
 * Resolve the Organization from the incoming request.
 *
 * Strategy (in order):
 *  1. Subdomain of the request hostname  → look up by `organization.subdomain`
 *  2. Clerk org_id from the verified JWT → upsert a local DB record on first call
 *
 * Attaches to `req`:
 *  - `organizationId`   – Clerk org ID string  (used for Clerk API calls)
 *  - `organizationDbId` – Prisma row cuid       (used for all DB queries)
 *
 * Also pushes the resolved org into AsyncLocalStorage so Prisma middleware
 * and service helpers can read it without threading `req` everywhere.
 *
 * Must run AFTER `requireAuth` so `authReq.auth` is populated.
 */
export async function injectTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  try {
    // Also accept X-Organization-Slug header as a subdomain hint.
    // VITE_DEV_SUBDOMAIN is only honoured outside production to prevent silent
    // tenant collapse if the variable is accidentally set on a production host.
    if (process.env.VITE_DEV_SUBDOMAIN && process.env.NODE_ENV === 'production') {
      logger.error('VITE_DEV_SUBDOMAIN is set in production — ignoring to prevent tenant collapse');
    }
    const forcedSubdomain =
      process.env.NODE_ENV !== 'production' ? process.env.VITE_DEV_SUBDOMAIN : undefined;
    const headerSlug = req.headers['x-organization-slug'] as string | undefined;
    
    // Priority: 1. Forced Env Var -> 2. Explicit Header from Frontend -> 3. Hostname Extraction
    const subdomain = forcedSubdomain || headerSlug || extractSubdomain(req.hostname);
    
    logger.debug('injectTenant', { hostname: req.hostname, headerSlug, forcedSubdomain, subdomain, path: req.path });

    if (subdomain) {
      // ── Path 1: subdomain-based lookup (cache-first) ────────────────────────
      const cacheKey = `org:subdomain:${subdomain}`;
      let org = await cacheService.get<{ id: string; clerkOrgId: string }>(cacheKey);

      if (!org) {
        org = await prisma.organization.findUnique({
          where: { subdomain },
          select: { id: true, clerkOrgId: true },
        });
        if (org) {
          await cacheService.set(cacheKey, org, ORG_CACHE_TTL);
        }
      }

      if (!org) {
        // Subdomain not matched — fall back to Clerk orgId and stamp the
        // subdomain onto the org so future requests resolve via Path 1.
        if (!authReq.auth?.orgId) {
          logger.warn('Tenant not found for subdomain and no Clerk orgId', { subdomain, hostname: req.hostname });
          return next(
            new AppError(
              404,
              `No organisation found for subdomain "${subdomain}". ` +
                'Please check the URL or contact support.',
              'TENANT_NOT_FOUND',
            ),
          );
        }

        const fallbackOrg = await prisma.organization.upsert({
          where:  { clerkOrgId: authReq.auth.orgId },
          update: { subdomain },
          create: {
            clerkOrgId: authReq.auth.orgId,
            name:       authReq.auth.orgId,
            slug:       authReq.auth.orgId,
            subdomain,
            plan:       'FREE',
          },
          select: { id: true, clerkOrgId: true },
        });

        logger.info('Stamped subdomain onto org via Clerk fallback', {
          subdomain,
          orgId: fallbackOrg.id,
          clerkOrgId: authReq.auth.orgId,
        });

        req.organizationId   = fallbackOrg.clerkOrgId ?? authReq.auth.orgId;
        req.organizationDbId = fallbackOrg.id;
        return runWithTenantContext(
          { organizationId: req.organizationId!, organizationDbId: req.organizationDbId! },
          next,
        );
      }

      // Only enforce the Clerk org cross-check when the DB org has an explicit
      // clerkOrgId set. If it's null (e.g. migrated from another Clerk instance
      // or single-tenant mode), subdomain-based routing is sufficient.
      if (authReq.auth?.orgId && org.clerkOrgId && org.clerkOrgId !== authReq.auth.orgId) {
        const localMembership = authReq.auth.userId
          ? await prisma.user.findFirst({
            where: { clerkUserId: authReq.auth.userId, organizationId: org.id, isActive: true },
            select: { id: true },
          })
          : null;

        if (localMembership) {
          logger.warn('Allowing subdomain access through local membership despite Clerk org mismatch', {
            subdomain,
            dbClerkOrgId: org.clerkOrgId,
            tokenOrgId: authReq.auth.orgId,
            userId: authReq.auth.userId,
          });
          req.organizationId = authReq.auth.orgId;
          req.organizationDbId = org.id;
          return runWithTenantContext(
            { organizationId: req.organizationId, organizationDbId: req.organizationDbId },
            next,
          );
        }

        logger.warn('Clerk org mismatch for subdomain', {
          subdomain,
          dbClerkOrgId: org.clerkOrgId,
          tokenOrgId: authReq.auth.orgId,
        });
        return next(
          new AppError(403, 'Organisation mismatch – access denied.', 'ORG_MISMATCH'),
        );
      }

      req.organizationId   = org.clerkOrgId;
      req.organizationDbId = org.id;
    } else {
      // ── Path 2: Clerk orgId fallback (local / API clients) ──────────────────
      if (!authReq.auth?.orgId) {
        return next(new AppError(403, 'Organisation context required.', 'NO_ORG_CONTEXT'));
      }

      const exactClerkOrg = await prisma.organization.findUnique({
        where: { clerkOrgId: authReq.auth.orgId },
        select: {
          id: true,
          clerkOrgId: true,
          subdomain: true,
          _count: {
            select: { orders: true, customers: true, inventoryItems: true, products: true },
          },
        },
      });

      const localMemberships = authReq.auth.userId
        ? await prisma.user.findMany({
          where: { clerkUserId: authReq.auth.userId, isActive: true },
          select: {
            organization: {
              select: {
                id: true,
                clerkOrgId: true,
                subdomain: true,
                _count: {
                  select: { orders: true, customers: true, inventoryItems: true, products: true },
                },
              },
            },
          },
        })
        : [];

      const bestLocalOrg = localMemberships
        .map((membership) => membership.organization)
        .sort((a, b) => dataWeight(b) - dataWeight(a))[0];

      const org =
        bestLocalOrg && (!exactClerkOrg || dataWeight(bestLocalOrg) > dataWeight(exactClerkOrg))
          ? bestLocalOrg
          : exactClerkOrg;

      if (org) {
        if (org.clerkOrgId !== authReq.auth.orgId) {
          logger.warn('Resolved central-domain request to existing local workspace with different Clerk org id', {
            orgId: org.id,
            subdomain: org.subdomain,
            dbClerkOrgId: org.clerkOrgId,
            tokenOrgId: authReq.auth.orgId,
            userId: authReq.auth.userId,
          });
        }

        req.organizationId = authReq.auth.orgId;
        req.organizationDbId = org.id;
      } else {
        // Signup provisioning should normally create the local row first. This
        // fallback exists for legacy Clerk orgs that reach the app before setup.
        const created = await prisma.organization.create({
          data: {
            clerkOrgId: authReq.auth.orgId,
            name:       authReq.auth.orgId,
            slug:       authReq.auth.orgId,
            subdomain:  authReq.auth.orgId,
            plan:       'FREE',
          },
          select: { id: true },
        });

        req.organizationId = authReq.auth.orgId;
        req.organizationDbId = created.id;
      }
    }

    // Push into AsyncLocalStorage so services can call getCurrentOrganizationId()
    runWithTenantContext(
      { organizationId: req.organizationId!, organizationDbId: req.organizationDbId! },
      next,
    );
  } catch (error) {
    logger.error('Failed to resolve tenant', { error, hostname: req.hostname });
    next(new AppError(500, 'Failed to resolve organisation.', 'TENANT_ERROR'));
  }
}
