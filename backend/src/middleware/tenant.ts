import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';
import { setTenantContext } from '../utils/tenantContext';
import { cacheService } from '../services/cacheService';

const ORG_CACHE_TTL = 300; // 5 minutes

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

  // Ignore "www" as it's not a tenant subdomain
  if (sub === 'www') return null;

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
    // Also accept X-Organization-Slug header as a subdomain hint (used in local
    // dev where the frontend runs on localhost without a real subdomain).
    const headerSlug = req.headers['x-organization-slug'] as string | undefined;
    const subdomain = extractSubdomain(req.hostname) ?? (headerSlug || null);
    logger.debug('injectTenant', { hostname: req.hostname, headerSlug, subdomain, path: req.path });

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
        logger.warn('Tenant not found for subdomain', { subdomain, hostname: req.hostname });
        return next(
          new AppError(
            404,
            `No organisation found for subdomain "${subdomain}". ` +
              'Please check the URL or contact support.',
            'TENANT_NOT_FOUND',
          ),
        );
      }

      // Optional: verify the authenticated user's Clerk org matches
      if (authReq.auth?.orgId && org.clerkOrgId !== authReq.auth.orgId) {
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

      // Upsert: create the local DB row on first call if it doesn't exist yet.
      // Clerk is the source of truth; we just need a row to hang tenant data from.
      const org = await prisma.organization.upsert({
        where:  { clerkOrgId: authReq.auth.orgId },
        update: {},
        create: {
          clerkOrgId: authReq.auth.orgId,
          name:       authReq.auth.orgId,   // placeholder; overwritten on Settings page
          slug:       authReq.auth.orgId,
          subdomain:  authReq.auth.orgId,
          plan:       'FREE',
        },
        select: { id: true },
      });

      req.organizationId   = authReq.auth.orgId;
      req.organizationDbId = org.id;
    }

    // Push into AsyncLocalStorage so services can call getCurrentOrganizationId()
    setTenantContext({ organizationId: req.organizationId!, organizationDbId: req.organizationDbId! });

    next();
  } catch (error) {
    logger.error('Failed to resolve tenant', { error, hostname: req.hostname });
    next(new AppError(500, 'Failed to resolve organisation.', 'TENANT_ERROR'));
  }
}
