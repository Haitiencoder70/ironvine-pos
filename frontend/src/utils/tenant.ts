const APP_DOMAIN = (import.meta.env['VITE_APP_DOMAIN'] as string | undefined) ?? 'yourapp.com';
const VITE_API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';
const TENANT_SUBDOMAINS_ENABLED = import.meta.env['VITE_ENABLE_TENANT_SUBDOMAINS'] === 'true';

/**
 * Extract the subdomain from the current hostname.
 * - "acme.yourapp.com"   → "acme"
 * - "yourapp.com"        → null  (main domain)
 * - "localhost"          → value of VITE_DEV_SUBDOMAIN env var, or null
 * - "acme.localhost"     → "acme"
 */
export function getCurrentSubdomain(): string | null {
  // If a forced subdomain is provided via env (useful for Railway/single-tenant testing), use it globally
  const forcedSubdomain = import.meta.env['VITE_DEV_SUBDOMAIN'] as string | undefined;
  if (forcedSubdomain) {
    return forcedSubdomain;
  }

  const hostname = window.location.hostname;

  // localhost family — support "acme.localhost" for local dev
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return null;
  }

  if (hostname.endsWith('.localhost')) {
    return hostname.replace(/\.localhost$/, '') || null;
  }

  // Production / staging — strip the root domain
  if (hostname.endsWith(`.${APP_DOMAIN}`)) {
    const sub = hostname.slice(0, hostname.length - APP_DOMAIN.length - 1);
    // Reject known non-org subdomains (incl. 'pos' which is the app's own deployment subdomain)
    if (['www', 'app', 'api', 'staging', 'mail', 'pos'].includes(sub)) return null;
    return sub || null;
  }

  // Custom domain — treat whole hostname as the tenant identifier (future use)
  return null;
}

/**
 * True when on the root marketing / auth domain (no org subdomain).
 */
export function isMainDomain(): boolean {
  return getCurrentSubdomain() === null;
}

/**
 * True when the current host is the central app host used before wildcard
 * tenant domains are enabled.
 */
export function isCentralAppDomain(): boolean {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return hostname === `pos.${APP_DOMAIN}`;
}

/**
 * Build the full URL for an org's subdomain.
 * In development uses the "acme.localhost:5173" pattern.
 */
export function getAppUrl(subdomain: string): string {
  const { protocol, port } = window.location;
  const portSuffix = port ? `:${port}` : '';

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${protocol}//${subdomain}.localhost${portSuffix}`;
  }

  if (!TENANT_SUBDOMAINS_ENABLED) {
    return window.location.origin;
  }

  return `${protocol}//${subdomain}.${APP_DOMAIN}`;
}

/**
 * Build the API base URL. The backend always lives at one origin;
 * the subdomain header carries tenant context.
 */
export function getApiBaseUrl(): string {
  return VITE_API_URL;
}
