import { MenuItem } from '@/types';

/**
 * Returns the quantity multiplier / minimum step for a menu item or variant.
 * If multiplier is 5, item must be ordered in multiples of 5 (5, 10, 15...).
 */
export function getItemMultiplier(item?: MenuItem | null, variantIdx: number = 0): number {
  if (!item) return 1;
  const v = item.variants?.[variantIdx];
  if (v && v.multiplier && Number(v.multiplier) > 1) {
    return Math.max(1, Math.floor(Number(v.multiplier)));
  }
  if (item.multiplier && Number(item.multiplier) > 1) {
    return Math.max(1, Math.floor(Number(item.multiplier)));
  }
  return 1;
}
