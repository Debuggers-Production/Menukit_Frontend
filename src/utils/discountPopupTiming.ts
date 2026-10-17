/**
 * Utility to manage the timing and backoff intervals for the discount unlock popup.
 *
 * Rules:
 * - Initial arrival: shows after INITIAL_DELAY_MS (10s) if user is not unlocked.
 * - When user clicks "Maybe Later" (or dismisses):
 *     1st dismiss: waits 1:30 mins (90 seconds)
 *     2nd dismiss: waits 3:00 mins (180 seconds)
 *     3rd dismiss: waits 4:30 mins (270 seconds)
 *     ... increases by 1:30 mins (90s) each time
 * - When user unlocks / registers: timers and counters are cleared completely.
 */

const INITIAL_DELAY_MS = 90 * 1000; // 1 min 30 seconds (90s) on first page visit
const BASE_DISMISS_INTERVAL_MS = 90 * 1000; // 1 min 30 seconds (90s)
const MAX_DISMISS_INTERVAL_MS = 15 * 60 * 1000; // 15 mins cap

const getDismissCountKey = (shopId: string) => `discount_popup_dismiss_count_${shopId}`;
const getNextShowKey = (shopId: string) => `discount_popup_next_show_${shopId}`;

/**
 * Returns the delay in milliseconds until the popup should show next,
 * or null if the user has already unlocked discounts.
 */
export function getRemainingPopupDelayMs(shopId: string): number | null {
  if (!shopId) return null;

  // Check if user is already unlocked / member
  const isShopUnlocked = Boolean(
    sessionStorage.getItem(`member_status_${shopId}`) ||
    localStorage.getItem('customer_token')
  );
  if (isShopUnlocked) return null;

  try {
    const nextShowRaw = sessionStorage.getItem(getNextShowKey(shopId));
    if (nextShowRaw) {
      const nextShowTime = Number(nextShowRaw);
      if (!isNaN(nextShowTime)) {
        const remaining = nextShowTime - Date.now();
        // Return remaining time or at least 500ms so the UI can settle
        return Math.max(500, remaining);
      }
    }

    const dismissCountRaw = sessionStorage.getItem(getDismissCountKey(shopId));
    const dismissCount = parseInt(dismissCountRaw || '0', 10) || 0;
    if (dismissCount > 0) {
      // Has been dismissed before but nextShow was not set: use the interval for current dismiss count
      return Math.min(dismissCount * BASE_DISMISS_INTERVAL_MS, MAX_DISMISS_INTERVAL_MS);
    }
  } catch (e) {
    // Ignore storage errors and fall back
  }

  // Initial delay for first-time visitors
  return INITIAL_DELAY_MS;
}

/**
 * Records a dismissal (e.g. when user clicks "Maybe Later" or closes the popup).
 * Increments the dismiss count and sets the next timestamp.
 */
export function recordPopupDismissal(shopId: string): number {
  if (!shopId) return BASE_DISMISS_INTERVAL_MS;

  try {
    const currentCount = parseInt(sessionStorage.getItem(getDismissCountKey(shopId)) || '0', 10) || 0;
    const newCount = currentCount + 1;
    const delayMs = Math.min(newCount * BASE_DISMISS_INTERVAL_MS, MAX_DISMISS_INTERVAL_MS);
    const nextShowTime = Date.now() + delayMs;

    sessionStorage.setItem(getDismissCountKey(shopId), newCount.toString());
    sessionStorage.setItem(getNextShowKey(shopId), nextShowTime.toString());

    window.dispatchEvent(new CustomEvent('menukit-discount-dismissed', { detail: { shopId, delayMs, count: newCount } }));
    return delayMs;
  } catch (e) {
    return BASE_DISMISS_INTERVAL_MS;
  }
}

/**
 * Clears popup timing and counters when customer unlocks or registers.
 */
export function clearPopupTiming(shopId: string): void {
  if (!shopId) return;
  try {
    sessionStorage.removeItem(getDismissCountKey(shopId));
    sessionStorage.removeItem(getNextShowKey(shopId));
  } catch (e) {}
}
