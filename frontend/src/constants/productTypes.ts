import { InventoryCategory } from '../types';

export const INVENTORY_CATEGORIES: Record<InventoryCategory, { label: string }> = {
  BLANK_SHIRTS: { label: 'Blank Shirts' },
  DTF_TRANSFERS: { label: 'DTF Transfers' },
  VINYL: { label: 'Vinyl / HTV' },
  INK: { label: 'Ink / Toner' },
  PACKAGING: { label: 'Packaging Supplies' },
  EMBROIDERY_THREAD: { label: 'Embroidery Thread' },
  OTHER: { label: 'Other' },
};

export const INVENTORY_CATEGORY_LIST = Object.keys(INVENTORY_CATEGORIES) as InventoryCategory[];
