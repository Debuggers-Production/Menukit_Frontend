import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { APP_CONFIG } from '@/config';

export interface OrderItemInfo {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ActiveOrderInfo {
  id: string;
  order_status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
  order_type: string;
  total_amount: number;
  daily_order_number?: number;
  items: OrderItemInfo[];
  created_at: string;
}

export function getCustomerUserId(phone: string): string {
  const clean = phone.replace(/\D/g, '').slice(-10);
  let hash1 = 5381;
  let hash2 = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    hash1 = ((hash1 * 33) ^ code) >>> 0;
    hash2 = (((hash2 << 5) - hash2) + code) >>> 0;
  }
  const h1 = hash1.toString(16).padStart(8, '0');
  const h2 = hash2.toString(16).padStart(8, '0');
  return `usr_${h1}${h2}`;
}

function getCustomerMobile(): string | null {
  const stored = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone');
  if (stored) return stored;
  const token = localStorage.getItem('customer_token');
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.mobile_number || payload.phone || payload.sub || null;
      }
    } catch {}
  }
  return null;
}

export function useActiveOrders(shopId: string | undefined) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrderInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMobile, setCurrentMobile] = useState<string | null>(() => getCustomerMobile());

  const fetchActiveOrders = async () => {
    if (!shopId) return;
    const token = localStorage.getItem('customer_token');
    if (!token) {
      setActiveOrders([]);
      return;
    }
    try {
      const res = await api.get(`/public/shop/${shopId}/my-orders`, {
        params: { token }
      });
      const orders = res.data || [];
      const active = orders.filter((o: any) => 
        (o.order_status === 'pending' || o.order_status === 'accepted') &&
        o.order_status !== 'payment_pending' &&
        !(o.payment_method === 'online' && o.payment_status !== 'paid')
      );
      setActiveOrders(active);
    } catch (err) {
      console.error('Failed to fetch active orders:', err);
    }
  };

  // Initial load only & local event trigger (e.g. order placed, customer changed)
  useEffect(() => {
    if (!shopId) return;
    fetchActiveOrders();

    const handleRealtimeLocalEvent = () => {
      fetchActiveOrders();
    };

    const handleCustomerChange = (e: any) => {
      const newMobile = e?.detail?.mobile ?? getCustomerMobile();
      setCurrentMobile(newMobile);
      fetchActiveOrders();
    };

    window.addEventListener('menukit-realtime-update', handleRealtimeLocalEvent);
    window.addEventListener('menukit-customer-changed', handleCustomerChange);
    window.addEventListener('storage', handleCustomerChange);

    return () => {
      window.removeEventListener('menukit-realtime-update', handleRealtimeLocalEvent);
      window.removeEventListener('menukit-customer-changed', handleCustomerChange);
      window.removeEventListener('storage', handleCustomerChange);
    };
  }, [shopId]);

  // Pure WebSocket real-time connection without API polling
  useEffect(() => {
    if (!shopId) return;
    const mobile = currentMobile || getCustomerMobile();
    if (!mobile) {
      setActiveOrders([]);
      return;
    }

    const userId = getCustomerUserId(mobile);
    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000';
    const wsUrl = (APP_CONFIG.API_URL ? APP_CONFIG.API_URL.replace(/^http/, 'ws') : `${protocol}//${host}`) + `/api/v1/public/shop/${shopId}/ws/customer/${userId}`;

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pingInterval: any = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              try {
                socket.send('ping');
              } catch {}
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== 'string') return;
          const trimmed = event.data.trim();
          if (trimmed === 'ping' || trimmed === 'pong' || !trimmed.startsWith('{')) return;
          try {
            const data = JSON.parse(trimmed);
            if (data.type === 'order_update' || data.event === 'order_update') {
              fetchActiveOrders();
            }
          } catch (err) {
            console.error('[ActiveOrders WS] Failed to parse message:', err);
          }
        };

        socket.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (!isDisposed) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        socket.onerror = () => {
          try { socket?.close(); } catch {}
        };
      } catch (err) {
        if (!isDisposed) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 4000);
        }
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close();
        socket = null;
      }
    };
  }, [shopId]);

  // Cycle current active order index every 3 seconds
  useEffect(() => {
    if (activeOrders.length <= 1) {
      setCurrentIndex(0);
      return;
    }

    const cycleInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeOrders.length);
    }, 3000);

    return () => clearInterval(cycleInterval);
  }, [activeOrders.length]);

  const currentOrder = activeOrders[currentIndex] || null;

  return {
    activeOrders,
    currentOrder,
    totalActiveCount: activeOrders.length,
    currentIndex
  };
}
