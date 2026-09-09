/**
 * Utility to generate and retrieve consistent, individual unique discount codes
 * for each customer and claimable discount.
 */

export function getCustomerIdentifier(): string {
  if (typeof window === 'undefined') return 'CUST';

  // 1. Check logged in customer mobile or stored mobile
  const storedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone');
  if (storedMobile) {
    const digits = storedMobile.replace(/\D/g, '');
    if (digits.length >= 4) {
      return digits.slice(-4);
    }
  }

  // 2. Persistent customer device UID
  let uid = localStorage.getItem('menukit_customer_uid');
  if (!uid) {
    // Generate a 4-char uppercase alphanumeric token
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    uid = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
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

  // If the backend returned an officially assigned unique code, prioritize it
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

  // Check if we already assigned and cached a unique code for this customer on this device
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

  const custToken = getCustomerIdentifier();
  const discToken = discount.id.replace(/-/g, '').slice(0, 4).toUpperCase();
  const rawTitle = (discount.title || 'OFFER').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = (rawTitle.slice(0, 6) || 'OFFER');

  const uniqueCode = `${prefix}-${discToken}-${custToken}`;

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
