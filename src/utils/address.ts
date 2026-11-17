/**
 * Utility to strip GPS coordinate metadata and markers from address strings
 * for display and form inputs.
 * E.g., strips " [loc=9.8492531,78.0939404]" or "Lat: 9.8492, Lon: 78.0939"
 */
export function cleanAddressDisplay(addr?: string | null): string {
  if (!addr) return '';
  return addr
    .replace(/\s*\[loc=.*?\]/gi, '')
    .replace(/\s*Lat:\s*[-?\d.]+,?\s*Lon:\s*[-?\d.]+/gi, '')
    .trim();
}
