import { useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { useAuthStore } from '../../store/authStore';
import { User, Organization } from '../../types';

export function AuthSync(): null {
  const { user: clerkUser } = useUser();
  const { organization: clerkOrg } = useOrganization();
  const setUser = useAuthStore((s) => s.setUser);
  const setOrganization = useAuthStore((s) => s.setOrganization);

  useEffect(() => {
    if (!clerkUser) {
      setUser(null);
      return;
    }

    const membership = clerkUser.organizationMemberships?.[0];
    const role = (
      membership?.role === 'org:admin' ? 'OWNER'
      : membership?.role === 'org:manager' ? 'MANAGER'
      : 'STAFF'
    ) as User['role'];

    setUser({
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? '',
      firstName: clerkUser.firstName ?? '',
      lastName: clerkUser.lastName ?? '',
      imageUrl: clerkUser.imageUrl,
      organizationId: membership?.organization.id ?? '',
      role,
      isActive: true,
    });
  }, [clerkUser, setUser]);

  useEffect(() => {
    if (!clerkOrg) {
      setOrganization(null);
      return;
    }

    setOrganization({
      id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug ?? '',
      plan: (clerkOrg.publicMetadata?.['plan'] as Organization['plan']) ?? 'FREE',
      subscriptionStatus: (clerkOrg.publicMetadata?.['subscriptionStatus'] as string) ?? null,
    });
  }, [clerkOrg, setOrganization]);

  return null;
}
