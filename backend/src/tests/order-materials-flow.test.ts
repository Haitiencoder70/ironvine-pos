import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createCustomer, createOrg, createUser } from './helpers/factories';
import { runWithTenantContext } from '../utils/tenantContext';
import { createOrder, updateOrderStatus, useMaterials } from '../services/orderService';
import { createPOForOrder, receivePOItems, sendToVendor } from '../services/purchaseOrderService';

describe('order to materials workflow', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it('links received PO inventory back to required materials so usage can deduct stock', async () => {
    const org = await createOrg({ slug: 'materials-flow', subdomain: 'materials-flow', plan: 'PRO' });
    const owner = await createUser(org, 'OWNER');
    const customer = await createCustomer(org);
    const vendor = await testPrisma.vendor.create({
      data: {
        name: 'Blank Shirts Co',
        categories: ['BLANK_SHIRTS'],
        organizationId: org.id,
      },
    });

    await runWithTenantContext({ organizationId: org.clerkOrgId, organizationDbId: org.id }, async () => {
      const order = await createOrder({
        organizationId: org.id,
        customerId: customer.id,
        priority: 'NORMAL',
        items: [
          {
            productType: 'TSHIRT',
            quantity: 24,
            unitPrice: 18,
            printMethod: 'DTF',
            printLocations: ['FRONT'],
            description: '24 black tees with front print',
            requiredMaterials: [
              {
                description: '24x Black T-Shirt Blanks',
                quantityRequired: 24,
                quantityUnit: 'units',
                materialCategory: 'BLANK_SHIRTS',
              },
            ],
          },
        ],
        performedBy: owner.clerkUserId,
      });

      await updateOrderStatus({
        organizationId: org.id,
        orderId: order.id,
        newStatus: 'APPROVED',
        performedBy: owner.clerkUserId,
      });

      const po = await createPOForOrder({
        organizationId: org.id,
        vendorId: vendor.id,
        linkedOrderId: order.id,
        items: [
          {
            description: '24x Black T-Shirt Blanks',
            quantity: 24,
            unitCost: 4.25,
          },
        ],
        performedBy: owner.clerkUserId,
      });

      await sendToVendor({
        organizationId: org.id,
        poId: po.id,
        performedBy: owner.clerkUserId,
      });

      const received = await receivePOItems({
        organizationId: org.id,
        purchaseOrderId: po.id,
        receivedBy: owner.clerkUserId,
        items: [
          {
            purchaseOrderItemId: po.items[0].id,
            quantityReceived: 24,
          },
        ],
      });

      expect(received.orderStatusUpdated).toBe(true);

      const requiredMaterial = await testPrisma.requiredMaterial.findFirstOrThrow({
        where: { organizationId: org.id, description: '24x Black T-Shirt Blanks' },
      });
      expect(requiredMaterial.inventoryItemId).toBeTruthy();
      expect(requiredMaterial.isFulfilled).toBe(true);

      const receivedInventory = await testPrisma.inventoryItem.findUniqueOrThrow({
        where: { id: requiredMaterial.inventoryItemId! },
      });
      expect(receivedInventory.quantityOnHand).toBe(24);

      const receivedOrder = await testPrisma.order.findUniqueOrThrow({ where: { id: order.id } });
      expect(receivedOrder.status).toBe('MATERIALS_RECEIVED');

      await updateOrderStatus({
        organizationId: org.id,
        orderId: order.id,
        newStatus: 'IN_PRODUCTION',
        performedBy: owner.clerkUserId,
      });

      await useMaterials({
        organizationId: org.id,
        orderId: order.id,
        materials: [
          {
            inventoryItemId: requiredMaterial.inventoryItemId!,
            quantityUsed: 24,
          },
        ],
        performedBy: owner.clerkUserId,
      });

      const usedInventory = await testPrisma.inventoryItem.findUniqueOrThrow({
        where: { id: requiredMaterial.inventoryItemId! },
      });
      expect(usedInventory.quantityOnHand).toBe(0);

      const movements = await testPrisma.stockMovement.findMany({
        where: { organizationId: org.id, orderId: order.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(movements.map((movement) => movement.type)).toEqual(['IN', 'OUT']);
    });
  });

  it('rejects receiving a draft PO before it is sent to the vendor', async () => {
    const org = await createOrg({ slug: 'draft-receive', subdomain: 'draft-receive', plan: 'PRO' });
    const owner = await createUser(org, 'OWNER');
    const customer = await createCustomer(org);
    const vendor = await testPrisma.vendor.create({
      data: {
        name: 'Draft Vendor',
        categories: ['BLANK_SHIRTS'],
        organizationId: org.id,
      },
    });

    await runWithTenantContext({ organizationId: org.clerkOrgId, organizationDbId: org.id }, async () => {
      const order = await createOrder({
        organizationId: org.id,
        customerId: customer.id,
        items: [
          {
            productType: 'TSHIRT',
            quantity: 1,
            unitPrice: 20,
            printMethod: 'DTF',
            printLocations: ['FRONT'],
          },
        ],
        performedBy: owner.clerkUserId,
      });

      const po = await createPOForOrder({
        organizationId: org.id,
        vendorId: vendor.id,
        linkedOrderId: order.id,
        items: [{ description: '1x Black T-Shirt Blank', quantity: 1, unitCost: 4 }],
        performedBy: owner.clerkUserId,
      });

      await expect(
        receivePOItems({
          organizationId: org.id,
          purchaseOrderId: po.id,
          receivedBy: owner.clerkUserId,
          items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 1 }],
        }),
      ).rejects.toMatchObject({ code: 'INVALID_PO_STATUS' });
    });
  });
});
