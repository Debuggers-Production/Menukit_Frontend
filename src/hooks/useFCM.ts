import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  isFirebaseConfigured,
  requestFCMToken,
  setupFCMForegroundListener,
  testPushNotification,
  getDeviceInfo,
} from '../services/fcm';

export function useFCM(shopId?: string) {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default';
  });
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('menukit_fcm_token') : null;
  });
  const [loading, setLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const isConfigured = isFirebaseConfigured();
  const deviceInfo = getDeviceInfo();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);

      const checkPermissionOnFocus = () => {
        if ('Notification' in window) {
          const current = Notification.permission;
          setPermission(current);
          if (current === 'granted' && shopId && !token) {
            requestFCMToken(shopId).then(res => {
              if (res.success && res.token) setToken(res.token);
            });
          }
        }
      };

      window.addEventListener('focus', checkPermissionOnFocus);
      return () => window.removeEventListener('focus', checkPermissionOnFocus);
    }
  }, [shopId, token]);

  // Listen for foreground push messages
  useEffect(() => {
    if (!isConfigured) return;

    const unsubscribe = setupFCMForegroundListener(() => {
      // Foreground push handled natively by browser notification and audio chime
    });

    return () => {
      unsubscribe();
    };
  }, [isConfigured]);

  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported on this browser.');
      return false;
    }

    setLoading(true);
    try {
      const res = await requestFCMToken(shopId);
      if (res.success && res.token) {
        setToken(res.token);
        setPermission('granted');
        toast.success('Push notifications enabled successfully!');
        return true;
      } else {
        toast.error(res.error || 'Failed to enable push notifications');
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setPermission(Notification.permission);
        }
        return false;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error requesting notification permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, shopId]);

  const sendTest = useCallback(async () => {
    setLoading(true);
    try {
      const res = await testPushNotification(shopId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      return res.success;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send test notification');
      return false;
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  return {
    isSupported,
    isConfigured,
    permission,
    token,
    loading,
    deviceInfo,
    enableNotifications,
    sendTestNotification: sendTest,
  };
}
