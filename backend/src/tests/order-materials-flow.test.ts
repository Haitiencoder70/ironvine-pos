import { testPrisma } from './helpers/db';
import { truncateAll } from './helpers/truncate';
import { createCustomer, createOrg, createUser } from './helpers/factories';
import { runWithTenantContext } from '../utils/tenantContext';
import { createOrder, updateOrderStatus, useMaterials } from '../services/orderService';
import { createPOForOrder, receivePOItems, sendToVendor } from '../services/purchaseOrderService';
import { getProfitStats } from '../services/dashboardService';

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

  it('dashboard profit stats reflect material costs after PO receive and usage', async () => {
    const org = await createOrg({ slug: 'profit-costs', subdomain: 'profit-costs', plan: 'PRO' });
    const owner = await createUser(org, 'OWNER');
    const customer = await createCustomer(org);
    const vendor = await testPrisma.vendor.create({
      data: { name: 'Cost Vendor', categories: ['BLANK_SHIRTS'], organizationId: org.id },
    });

    await runWithTenantContext({ organizationId: org.clerkOrgId, organizationDbId: org.id }, async () => {
      const order = await createOrder({
        organizationId: org.id,
        customerId: customer.id,
        priority: 'NORMAL',
        items: [
          {
            productType: 'TSHIRT',
            quantity: 10,
            unitPrice: 20,
            printMethod: 'DTF',
            printLocations: ['FRONT'],
            description: '10 tees',
            requiredMaterials: [
              {
                description: '10x White T-Shirt Blanks',
                quantityRequired: 10,
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
        items: [{ description: '10x White T-Shirt Blanks', quantity: 10, unitCost: 5.0 }],
        performedBy: owner.clerkUserId,
      });

      await sendToVendor({ organizationId: org.id, poId: po.id, performedBy: owner.clerkUserId });

      await receivePOItems({
        organizationId: org.id,
        purchaseOrderId: po.id,
        receivedBy: owner.clerkUserId,
        items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 10 }],
      });

      // Verify costPrice was set from PO unitCost
      const rm = await testPrisma.requiredMaterial.findFirstOrThrow({
        where: { organizationId: org.id, description: '10x White T-Shirt Blanks' },
      });
      const invItem = await testPrisma.inventoryItem.findUniqueOrThrow({
        where: { id: rm.inventoryItemId! },
      });
      expect(Number(invItem.costPrice)).toBe(5.0);

      await updateOrderStatus({
        organizationId: org.id,
        orderId: order.id,
        newStatus: 'IN_PRODUCTION',
        performedBy: owner.clerkUserId,
      });

      await useMaterials({
        organizationId: org.id,
        orderId: order.id,
        materials: [{ inventoryItemId: rm.inventoryItemId!, quantityUsed: 10 }],
        performedBy: owner.clerkUserId,
      });

      const start = new Date(order.createdAt);
      start.setHours(0, 0, 0, 0);
      const end = new Date(order.createdAt);
      end.setHours(23, 59, 59, 999);

      const stats = await getProfitStats(org.id, start, end);
      // 10 units * $5.00 cost = $50.00 total material cost
      expect(stats.costs).toBeGreaterThan(0);
      expect(stats.costs).toBeCloseTo(50, 1);
    });
  });

  it('cancels draft and sent linked POs when the order is cancelled', async () => {
    const org = await createOrg({ slug: 'cancel-cascade', subdomain: 'cancel-cascade', plan: 'PRO' });
    const owner = await createUser(org, 'OWNER');
    const customer = await createCustomer(org);
    const vendor = await testPrisma.vendor.create({
      data: {
        name: 'Cancel Vendor',
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
            quantity: 6,
            unitPrice: 20,
            printMethod: 'DTF',
            printLocations: ['FRONT'],
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

      const sentPO = await createPOForOrder({
        organizationId: org.id,
        vendorId: vendor.id,
        linkedOrderId: order.id,
        items: [{ description: '6x Black T-Shirt Blanks', quantity: 6, unitCost: 4 }],
        performedBy: owner.clerkUserId,
      });
      await sendToVendor({
        organizationId: org.id,
        poId: sentPO.id,
        performedBy: owner.clerkUserId,
      });

      const draftPO = await createPOForOrder({
        organizationId: org.id,
        vendorId: vendor.id,
        linkedOrderId: order.id,
        items: [{ description: '6x DTF Transfers', quantity: 1, unitCost: 30 }],
        performedBy: owner.clerkUserId,
      });

      await updateOrderStatus({
        organizationId: org.id,
        orderId: order.id,
        newStatus: 'CANCELLED',
        performedBy: owner.clerkUserId,
      });

      const linkedPOs = await testPrisma.purchaseOrder.findMany({
        where: { organizationId: org.id, linkedOrderId: order.id },
        orderBy: { poNumber: 'asc' },
      });

      expect(linkedPOs).toHaveLength(2);
      expect(linkedPOs.map((po) => po.id).sort()).toEqual([draftPO.id, sentPO.id].sort());
      expect(linkedPOs.every((po) => po.status === 'CANCELLED')).toBe(true);
    });
  });
});
