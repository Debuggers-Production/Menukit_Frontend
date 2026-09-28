/**
 * Utility functions for checking and formatting shop operating hours and open/closed status.
 */

export interface ShopTimingData {
  is_active?: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
}

export interface ShopOpenStatus {
  isOpen: boolean;
  isSet: boolean;
  message: string;
  badgeText: string;
  openingFormatted: string;
  closingFormatted: string;
  currentTimeFormatted: string;
}

/**
 * Format 24h "HH:MM" or similar time string to readable 12h "hh:mm AM/PM"
 */
export function formatTime12h(timeStr?: string | null): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (clean.toUpperCase().includes('AM') || clean.toUpperCase().includes('PM')) {
    return clean;
  }
  const parts = clean.split(':');
  if (parts.length < 2) return clean;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return clean;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const displayM = m.toString().padStart(2, '0');
  return `${displayH}:${displayM} ${period}`;
}

/**
 * Parse time string to minutes from start of day (0 to 1439)
 */
export function parseMinutesFromTimeString(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const numOnly = clean.replace(/[^\d:]/g, '');
  const parts = numOnly.split(':');
  if (parts.length < 2) return null;
  let h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Check whether a restaurant/shop is currently open based on active status and operating hours.
 */
export function checkShopOpenStatus(shop?: ShopTimingData | null): ShopOpenStatus {
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const period = currentHours >= 12 ? 'PM' : 'AM';
  const displayH = currentHours % 12 === 0 ? 12 : currentHours % 12;
  const displayM = currentMinutes.toString().padStart(2, '0');
  const currentTimeFormatted = `${displayH}:${displayM} ${period}`;

  if (!shop) {
    return {
      isOpen: true,
      isSet: false,
      message: '',
      badgeText: 'Open',
      openingFormatted: '',
      closingFormatted: '',
      currentTimeFormatted,
    };
  }

  // If shop is deactivated by owner or admin
  if (shop.is_active === false) {
    return {
      isOpen: false,
      isSet: true,
      message: 'Restaurant is currently unavailable.',
      badgeText: 'Closed',
      openingFormatted: '',
      closingFormatted: '',
      currentTimeFormatted,
    };
  }

  const openMin = parseMinutesFromTimeString(shop.opening_time);
  const closeMin = parseMinutesFromTimeString(shop.closing_time);
  const openingFormatted = formatTime12h(shop.opening_time);
  const closingFormatted = formatTime12h(shop.closing_time);

  // If operating hours are not configured, treat shop as open by default
  if (openMin === null || closeMin === null) {
    return {
      isOpen: true,
      isSet: false,
      message: 'Open',
      badgeText: 'Open',
      openingFormatted,
      closingFormatted,
      currentTimeFormatted,
    };
  }

  // 24 Hours Open (e.g. 00:00 to 00:00, 12:00 AM to 12:00 AM, or same time set)
  if (openMin === closeMin) {
    return {
      isOpen: true,
      isSet: true,
      message: 'Open 24 Hours',
      badgeText: 'Open 24/7',
      openingFormatted: openingFormatted || '12:00 AM',
      closingFormatted: closingFormatted || '12:00 AM',
      currentTimeFormatted,
    };
  }

  const currentMin = currentHours * 60 + currentMinutes;

  let isOpen = false;
  if (closeMin > openMin) {
    // Regular daytime operating hours (e.g. 09:00 AM to 10:00 PM)
    isOpen = currentMin >= openMin && currentMin < closeMin;
  } else {
    // Overnight or midnight-closing operating hours
    // e.g. 06:00 PM to 02:00 AM next day, or 10:00 AM to 12:00 AM (midnight)
    if (closeMin === 0) {
      // 12:00 AM midnight closing means open from openMin until end of day
      isOpen = currentMin >= openMin;
    } else {
      isOpen = currentMin >= openMin || currentMin < closeMin;
    }
  }

  const message = isOpen
    ? `Open now • Closes at ${closingFormatted}`
    : `Closed • Opens at ${openingFormatted} (Local time: ${currentTimeFormatted})`;

  const badgeText = isOpen ? 'Open Now' : 'Closed';

  return {
    isOpen,
    isSet: true,
    message,
    badgeText,
    openingFormatted,
    closingFormatted,
    currentTimeFormatted,
  };
}
