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

export function useActiveOrders(shopId: string | undefined) {
  const [activeOrders, setActiveOrders] = useState<ActiveOrderInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  useEffect(() => {
    if (!shopId) return;
    fetchActiveOrders();

    window.addEventListener('menukit-realtime-update', fetchActiveOrders);
    const interval = setInterval(fetchActiveOrders, 60000); // 60s fallback

    return () => {
      window.removeEventListener('menukit-realtime-update', fetchActiveOrders);
      clearInterval(interval);
    };
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    const mobile = localStorage.getItem('customer_mobile');
    if (!mobile) return;

    const userId = getCustomerUserId(mobile);
    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000';
    const wsUrl = (APP_CONFIG.API_URL ? APP_CONFIG.API_URL.replace(/^http/, 'ws') : `${protocol}//${host}`) + `/api/v1/public/shop/${shopId}/ws/customer/${userId}`;

    let socket: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Customer WebSocket connected for user ID:', userId);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'order_update') {
            console.log('Real-time order update received:', data);
            fetchActiveOrders();
          }
        } catch (err) {
          console.error('Failed to parse customer websocket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('Customer WebSocket disconnected. Reconnecting...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('Customer websocket error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
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
