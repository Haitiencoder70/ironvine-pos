import { format, isValid } from 'date-fns';

/**
 * Format a number to currency string (e.g. $1,234.56)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parse a localized currency string back to a number
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove formatting characters (commas, dollar signs, spaces)
  const clean = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Common phone format (E.164 / US) regex used for client-side matching.
 * Kept in sync with backend schema.
 */
export const phoneRegex = /^\+?[\d\s().\-]{7,30}$/;

/**
 * Format string as US phone number: (555) 123-4567
 * Useful for visual display or auto-formatting physical inputs.
 */
export function formatPhone(value: string): string {
  if (!value) return value;
  
  // Strip all non-digits
  const cleaned = ('' + value).replace(/\D/g, '');
  
  // Normal 10 digit US number
  if (cleaned.length === 10) {
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  
  // Hand back what they gave us ideally if it doesn't fit standard formatting
  return value;
}

/**
 * Format standard Date object or ISO string to relative / readable dates.
 */
export function formatDate(date: Date | string | number | undefined | null, formatStr: string = 'MMM d, yyyy'): string {
  if (!date) return '';
  const d = new Date(date);
  if (!isValid(d)) return '';
  return format(d, formatStr);
}

/**
 * Display a short readable version avoiding verbose statuses from DB
 */
export function formatStatusLabel(status: string): string {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
