import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { getCurrentSubdomain } from '../utils/tenant';

const DEFAULT_PRIMARY   = '#2563eb';
const DEFAULT_SECONDARY = '#64748b';

export interface OrgBranding {
  logoUrl:          string | null;
  faviconUrl:       string | null;
  primaryColor:     string | null;
  secondaryColor:   string | null;
  customCSS:        string | null;
  emailFromName:    string | null;
  emailFromAddress: string | null;
  customDomain:     string | null;
  name:             string;
  plan:             'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
}

function applyFavicon(url: string | null): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url ?? '/favicon.ico';
}

function applyCustomCSS(css: string | null): void {
  const STYLE_ID = 'org-custom-css';
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;

  if (!css) {
    style?.remove();
    return;
  }

  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = css;
}

export function useBranding() {
  const isSubdomain = !!getCurrentSubdomain();

  const query = useQuery<OrgBranding>({
    queryKey: ['branding'],
    queryFn: async () => {
      const res = await api.get<{ data: OrgBranding }>('/branding');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isSubdomain,
  });

  const branding = query.data;

  useEffect(() => {
    const primary   = branding?.primaryColor   ?? DEFAULT_PRIMARY;
    const secondary = branding?.secondaryColor ?? DEFAULT_SECONDARY;
    document.documentElement.style.setProperty('--color-primary',   primary);
    document.documentElement.style.setProperty('--color-secondary', secondary);
  }, [branding?.primaryColor, branding?.secondaryColor]);

  useEffect(() => {
    if (branding?.name) {
      document.title = branding.name;
    }
  }, [branding?.name]);

  useEffect(() => {
    applyFavicon(branding?.faviconUrl ?? null);
  }, [branding?.faviconUrl]);

  useEffect(() => {
    applyCustomCSS(branding?.customCSS ?? null);
  }, [branding?.customCSS]);

  return {
    logo:             branding?.logoUrl          ?? null,
    faviconUrl:       branding?.faviconUrl       ?? null,
    primaryColor:     branding?.primaryColor     ?? DEFAULT_PRIMARY,
    secondaryColor:   branding?.secondaryColor   ?? DEFAULT_SECONDARY,
    customCSS:        branding?.customCSS        ?? null,
    emailFromName:    branding?.emailFromName    ?? null,
    emailFromAddress: branding?.emailFromAddress ?? null,
    plan:             branding?.plan             ?? 'FREE' as const,
    isLoading:        query.isLoading,
  };
}
