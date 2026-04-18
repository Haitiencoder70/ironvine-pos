export type LimitStatus = 'good' | 'warning' | 'critical' | 'unlimited';

/**
 * Format a byte count as a human-readable storage string.
 * e.g. 1_288_490_189 → "1.2 GB"
 */
export function formatStorage(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Format a storage range: "1.2 GB of 5 GB"
 */
export function formatStorageOf(current: number, max: number): string {
  if (max === -1) return `${formatStorage(current)} (Unlimited)`;
  return `${formatStorage(current)} of ${formatStorage(max)}`;
}

/**
 * Format a count range: "45 of 500" or "45 (Unlimited)"
 */
export function formatCount(current: number, max: number): string {
  if (max === -1) return `${current.toLocaleString()} (Unlimited)`;
  return `${current.toLocaleString()} of ${max.toLocaleString()}`;
}

/**
 * Return a 0–100 percentage. Returns 0 for unlimited limits.
 */
export function getPercentage(current: number, max: number): number {
  if (max === -1 || max === 0) return 0;
  return Math.min(Math.round((current / max) * 100), 100);
}

/**
 * Classify a usage ratio into a status level.
 * - unlimited → 'unlimited'
 * - < 80%     → 'good'
 * - 80–99%    → 'warning'
 * - 100%+     → 'critical'
 */
export function getLimitStatus(current: number, max: number): LimitStatus {
  if (max === -1) return 'unlimited';
  const pct = getPercentage(current, max);
  if (pct >= 100) return 'critical';
  if (pct >= 80)  return 'warning';
  return 'good';
}
