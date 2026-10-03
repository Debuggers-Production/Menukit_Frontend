/**
 * Utility to generate and retrieve consistent, individual unique discount codes
 * for each customer and claimable discount.
 */

export function getCustomerIdentifier(): string {
  if (typeof window === 'undefined') return 'CUST';

  // Persistent customer device UID (random alphanumeric token)
  let uid = localStorage.getItem('menukit_customer_uid');
  if (!uid) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    uid = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    try {
      localStorage.setItem('menukit_customer_uid', uid);
    } catch (e) {
      // ignore
    }
  }
  return uid;
}

export function getUniqueCustomerDiscountCode(discount: { id: string; title?: string; code?: string | null }): string {
  if (!discount || !discount.id) return 'OFFER-DISC';

  // 1. If the backend returned an officially assigned unique code, prioritize it
  if (discount.code && discount.code.trim()) {
    const assignedCode = discount.code.trim().toUpperCase();
    if (typeof window !== 'undefined') {
      try {
        const cacheKey = 'menukit_assigned_discount_codes';
        const cachedMap = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        cachedMap[discount.id] = assignedCode;
        localStorage.setItem(cacheKey, JSON.stringify(cachedMap));
      } catch (e) {
        // ignore
      }
    }
    return assignedCode;
  }

  // 2. Check if we already cached a unique code for this discount on this device
  const cacheKey = 'menukit_assigned_discount_codes';
  let cachedMap: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      cachedMap = JSON.parse(localStorage.getItem(cacheKey) || '{}');
      if (cachedMap[discount.id]) {
        return cachedMap[discount.id];
      }
    } catch (e) {
      cachedMap = {};
    }
  }

  // 3. Fallback: generate a completely random, secure alphanumeric code (no phone numbers or predictable patterns)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const rawTitle = (discount.title || 'OFFER').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = (rawTitle.slice(0, 4) || 'MK');

  const uniqueCode = `${prefix}-${part1}-${part2}`;

  // Cache it for consistency
  if (typeof window !== 'undefined') {
    try {
      cachedMap[discount.id] = uniqueCode;
      localStorage.setItem(cacheKey, JSON.stringify(cachedMap));
    } catch (e) {
      // ignore
    }
  }

  return uniqueCode;
}

export function getClaimedDiscountIds(shopId?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    if (shopId) localStorage.removeItem(`menukit_claimed_discounts_${shopId}`);
    localStorage.removeItem('menukit_claimed_discounts');
  } catch {
    // ignore
  }
  return [];
}

export function markDiscountClaimed(_discountId: string, _shopId?: string): void {
  // Discarded: discounts are only removed after actual admin redemption verification in backend
}

export function isDiscountClaimed(_discountId: string, _shopId?: string): boolean {
  return false;
}
