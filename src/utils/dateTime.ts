/**
 * Utility functions for robust, timezone-aware date and time formatting.
 * Ensures timestamps (ISO, UTC, naive SQL datetime, timestamps) are always
 * correctly converted and displayed in the user's local timezone.
 */

/**
 * Safely parses any date/time string, timestamp, or Date object into a valid local Date.
 * Properly handles UTC naive strings (e.g., "2026-10-03 07:44:00" or "Oct 03, 2026 07:44 AM")
 * so they are interpreted as UTC and converted to the client's local timezone.
 */
export function parseDateSafe(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  let str = String(input).trim();
  if (!str) return null;

  // Format: "2026-10-03 07:44:00" or "2026-10-03 07:44:00.123456"
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(str)) {
    str = str.replace(' ', 'T') + 'Z';
  } 
  // Format: "2026-10-03T07:44:00" (ISO missing 'Z' or timezone offset)
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(str)) {
    str = str + 'Z';
  } 
  // Format: "Oct 03, 2026 07:44 AM" or "Oct 3, 2026 7:44 PM" (Backend strftime UTC legacy output)
  else if (/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(str)) {
    const d = new Date(str + ' UTC');
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a date string into a local Date & Time string.
 * Example: "Oct 03, 2026 01:14 PM" (adjusted to the user's local timezone)
 */
export function formatLocalDateTime(
  input: string | number | Date | null | undefined,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) return fallback;
  const datePart = d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} ${timePart}`;
}

/**
 * Formats a date string into local Date only.
 * Example: "Oct 03, 2026"
 */
export function formatLocalDate(
  input: string | number | Date | null | undefined,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a date string into local Time only.
 * Example: "01:14 PM"
 */
export function formatLocalTime(
  input: string | number | Date | null | undefined,
  fallback: string = '—'
): string {
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
