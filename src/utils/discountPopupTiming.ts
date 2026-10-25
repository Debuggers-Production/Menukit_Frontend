/**
 * Utility to manage the timing and intervals for the discount unlock popup.
 *
 * Rules:
 * - First time visit OR on every page refresh: shows after INITIAL_DELAY_MS (10 seconds) if customer is not unlocked.
 * - When customer clicks "Maybe Later" (or closes):
 *     Waits 1:30 mins (90 seconds) before re-prompting on the same page.
 * - When customer unlocks / registers / becomes member:
 *     Popup is permanently disabled and cleared.
 */

const INITIAL_DELAY_MS = 10 * 1000; // 10 seconds on first visit or page refresh
const MAYBE_LATER_INTERVAL_MS = 90 * 1000; // 1 min 30 seconds (90s)

// Per-page-load memory tracking so every refresh resets to the 10-second timer
const inMemoryNextShowTimes: Record<string, number> = {};

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
    const nextShow = inMemoryNextShowTimes[shopId];
    if (nextShow) {
      const remaining = nextShow - Date.now();
      // If the 90 seconds haven't elapsed yet, wait the remaining time (or min 500ms)
      if (remaining > 0) {
        return Math.max(500, remaining);
      }
      // If 90 seconds have already passed, show immediately
      return 500;
    }
  } catch (e) {
    // Ignore error and fall back
  }

  // On first visit or on every refresh, always wait 10 seconds
  return INITIAL_DELAY_MS;
}

/**
 * Records a dismissal when user clicks "Maybe Later" or closes the popup.
 * Schedules the next appearance after 1:30 mins (90 seconds).
 */
export function recordPopupDismissal(shopId: string): number {
  if (!shopId) return MAYBE_LATER_INTERVAL_MS;

  const nextShowTime = Date.now() + MAYBE_LATER_INTERVAL_MS;
  inMemoryNextShowTimes[shopId] = nextShowTime;

  window.dispatchEvent(
    new CustomEvent('menukit-discount-dismissed', {
      detail: { shopId, delayMs: MAYBE_LATER_INTERVAL_MS }
    })
  );

  return MAYBE_LATER_INTERVAL_MS;
}

/**
 * Clears popup timing and counters when customer unlocks or registers.
 */
export function clearPopupTiming(shopId: string): void {
  if (!shopId) return;
  delete inMemoryNextShowTimes[shopId];
  try {
    sessionStorage.removeItem(`discount_popup_dismiss_count_${shopId}`);
    sessionStorage.removeItem(`discount_popup_next_show_${shopId}`);
  } catch (e) {}
}
