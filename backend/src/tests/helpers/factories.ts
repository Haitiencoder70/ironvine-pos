import { testPrisma } from './db';
import type { Organization, User } from '@prisma/client';
const { faker } = require('@faker-js/faker') as {
  faker: {
    internet: { domainWord(): string; email(): string };
    string: { alphanumeric(n: number): string };
    company: { name(): string };
    person: { firstName(): string; lastName(): string };
    phone: { number(): string };
    commerce: { department(): string; productName(): string; price(opts: { min: number; max: number }): string };
  }
};

export async function createOrg(overrides: Partial<{
  name: string;
  slug: string;
  subdomain: string;
  clerkOrgId: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
}> = {}): Promise<Organization> {
  const slug = overrides.slug ?? faker.internet.domainWord();
  const plan = overrides.plan ?? 'FREE';
  return testPrisma.organization.create({
    data: {
      clerkOrgId:        overrides.clerkOrgId ?? `org_${faker.string.alphanumeric(20)}`,
      slug,
      name:              overrides.name ?? faker.company.name(),
      subdomain:         overrides.subdomain ?? slug,
      plan,
      maxOrders:         plan === 'PRO' ? 5000 : 100,
      maxCustomers:      plan === 'PRO' ? 2000 : 100,
      maxInventoryItems: plan === 'PRO' ? 5000 : 500,
      maxUsers:          plan === 'PRO' ? 10 : 1,
    },
  });
}

export async function createUser(
  org: Organization,
  role: 'OWNER' | 'MANAGER' | 'STAFF' = 'OWNER',
  overrides: Partial<{ clerkUserId: string; email: string }> = {},
): Promise<User> {
  return testPrisma.user.create({
    data: {
      clerkUserId:    overrides.clerkUserId ?? `user_${faker.string.alphanumeric(20)}`,
      email:          overrides.email ?? faker.internet.email(),
      firstName:      faker.person.firstName(),
      lastName:       faker.person.lastName(),
      role,
      organizationId: org.id,
      isActive:       true,
    },
  });
}

export async function createProductCategory(org: Organization) {
  return testPrisma.productCategory.create({
    data: {
      name:           faker.commerce.department(),
      organizationId: org.id,
    },
  });
}

export async function createProduct(org: Organization) {
  const category = await createProductCategory(org);
  return testPrisma.product.create({
    data: {
      name:                    faker.commerce.productName(),
      categoryId:              category.id,
      organizationId:          org.id,
      garmentType:             'TSHIRT',
      printMethod:             'DTF',
      basePrice:               parseFloat(faker.commerce.price({ min: 10, max: 100 })),
      includedPrintLocations:  [],
      maxPrintLocations:       1,
      availableBrands:         [],
    },
  });
}

export async function createCustomer(org: Organization) {
  return testPrisma.customer.create({
    data: {
      firstName:      faker.person.firstName(),
      lastName:       faker.person.lastName(),
      email:          faker.internet.email(),
      phone:          faker.phone.number(),
      organizationId: org.id,
    },
  });
}

export async function createOrder(org: Organization, customer: { id: string }) {
  return testPrisma.order.create({
    data: {
      orderNumber:    `ORD-${faker.string.alphanumeric(6).toUpperCase()}`,
      status:         'PENDING_APPROVAL',
      customerId:     customer.id,
      organizationId: org.id,
      subtotal:       parseFloat(faker.commerce.price({ min: 50, max: 500 })),
      total:          parseFloat(faker.commerce.price({ min: 50, max: 500 })),
    },
  });
}
