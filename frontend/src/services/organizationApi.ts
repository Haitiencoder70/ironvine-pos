import { api } from '../lib/api';

export interface OrgCreatePayload {
  name: string;
  slug: string;
  industry: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerEmail?: string;
  plan: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}

export interface SlugAvailability {
  available: boolean;
  suggestions?: string[];
}

export interface OrgUsage {
  plan: string;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  usage: {
    orders:         { current: number; max: number };
    customers:      { current: number; max: number };
    users:          { current: number; max: number };
    inventoryItems: { current: number; max: number };
  };
}

export const organizationApi = {
  checkSlugAvailability: (slug: string) =>
    api.get<SlugAvailability>(`/organizations/slug-check`, { params: { slug } }).then((r) => r.data),

  createOrganization: (data: OrgCreatePayload) =>
    api.post<{ organizationId: string; checkoutUrl?: string }>('/organizations', data).then((r) => r.data),

  getOrganization: () =>
    api.get<{ data: { id: string; name: string; slug: string; plan: string; logoUrl?: string | null } }>('/organization/me').then((r) => r.data.data),

  updateOrganization: (data: Partial<Pick<OrgCreatePayload, 'name' | 'slug' | 'industry'>>) =>
    api.patch('/organization/me', data).then((r) => r.data),

  getUsage: () =>
    api.get<OrgUsage>('/billing/usage').then((r) => r.data),

  inviteUser: (email: string, role: 'ADMIN' | 'MANAGER' | 'STAFF') =>
    api.post('/settings/users/invite', { email, role }).then((r) => r.data),
};
