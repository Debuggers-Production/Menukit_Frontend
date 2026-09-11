import { useAuthStore } from '@/store/authStore';

/**
 * Resolves the display message for the chalkboard according to specification:
 * Priority:
 *   1. Admin custom message (if provided and non-empty)
 *   2. "Hi, {USER_NAME}!" (if logged in user name is available)
 *   3. "Hi!" (default fallback)
 */
export function resolveChalkboardMessage(
  adminMessage?: string | null,
  userName?: string | null
): string {
  if (adminMessage && typeof adminMessage === 'string' && adminMessage.trim().length > 0) {
    return adminMessage.trim();
  }

  const resolvedName = userName || getLoggedInUserName();
  if (resolvedName && resolvedName.trim().length > 0) {
    return `Hi, ${resolvedName.trim()}!`;
  }

  return 'Hi!';
}

/**
 * Gets the current logged-in customer or user display name from existing session stores.
 * Checks customer session first (customer_name in localStorage), then authStore user.
 */
export function getLoggedInUserName(): string | null {
  try {
    // 1. Check customer name stored in localStorage (from membership verification / profile / orders)
    const customerName = localStorage.getItem('customer_name');
    if (customerName && customerName.trim() && customerName !== 'Guest Customer' && customerName !== 'Customer') {
      return customerName.trim();
    }

    // 2. Check authStore user (owner/admin/staff)
    const authUser = useAuthStore.getState().user;
    if (authUser) {
      if ((authUser as any).name && typeof (authUser as any).name === 'string') {
        return (authUser as any).name.trim();
      }
      if (authUser.email) {
        const emailPrefix = authUser.email.split('@')[0];
        if (emailPrefix) {
          return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading logged in user name for chalkboard:', err);
  }

  return null;
}
