import { ShipmentCarrier } from '../types';

export const SHIPPING_CARRIERS: Record<ShipmentCarrier, { label: string }> = {
  UPS: { label: 'UPS' },
  FEDEX: { label: 'FedEx' },
  USPS: { label: 'USPS' },
  DHL: { label: 'DHL Express' },
  OTHER: { label: 'Other Courier' },
};

export const SHIPPING_CARRIER_LIST = Object.keys(SHIPPING_CARRIERS) as ShipmentCarrier[];
