/**
 * Haptic Vibration Utility for mobile touch feedback.
 * Triggers tactile vibration patterns during popup animations, discount balloon clicks, and celebratory unlocks.
 */
export const triggerHaptic = (pattern: number | number[] = 25) => {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Browser safety fallback (e.g. if device lacks vibration motor or requires initial user tap)
    }
  }
};

export const HAPTIC_PATTERNS = {
  tap: 15,
  balloonClick: [25, 30, 25],
  popupOpen: [30, 40, 30],
  successUnlock: [40, 60, 80],
};
