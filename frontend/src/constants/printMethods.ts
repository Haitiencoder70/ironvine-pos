import { PrintMethod } from '../types';

export const PRINT_METHODS: Record<PrintMethod, { label: string; description: string }> = {
  DTF: { label: 'DTF Transfer', description: 'Direct to Film' },
  HTV: { label: 'HTV Vinyl', description: 'Heat Transfer Vinyl' },
  SCREEN_PRINT: { label: 'Screen Print', description: 'Traditional Screen Printing' },
  EMBROIDERY: { label: 'Embroidery', description: 'Stitched Thread' },
  SUBLIMATION: { label: 'Sublimation', description: 'Dye Sublimation' },
  DTG: { label: 'DTG', description: 'Direct to Garment' },
};

export const PRINT_METHOD_LIST = Object.keys(PRINT_METHODS) as PrintMethod[];
