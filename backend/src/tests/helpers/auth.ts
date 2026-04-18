/**
 * Returns an object that mimics what @clerk/express getAuth() returns.
 * Used to configure the mockGetAuth jest.fn() in each test file.
 */
export function makeClerkAuth(overrides: {
  userId: string;
  orgId: string;
  orgRole?: string;
}) {
  return {
    userId:  overrides.userId,
    orgId:   overrides.orgId,
    orgRole: overrides.orgRole ?? 'org:admin',
  };
}
