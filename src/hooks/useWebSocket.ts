import { useEffect, useRef } from 'react';
import { APP_CONFIG } from '@/config';
import { useShopStore } from '@/store/shopStore';
import { useNotificationStore } from '@/store/notificationStore';
import { toast } from 'react-hot-toast';

export const playChimeNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    playNote(659.25, now, 0.25);
    playNote(880.00, now + 0.12, 0.35);
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
};

export function useWebSocket() {
  const { shop } = useShopStore();
  const { addNotification, setNotifications } = useNotificationStore();
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const isUnmountedRef = useRef(false);

  useEffect(() => {
    if (!shop?.id) return;
    isUnmountedRef.current = false;

    // Build WS URL based on current environment
    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000';
    const apiBase = APP_CONFIG.API_URL ? `${APP_CONFIG.API_URL}/api/v1` : `${protocol}//${host}/api/v1`;
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/notifications/ws/${shop.id}`;

    const connect = () => {
      if (isUnmountedRef.current) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Merchant WS] Connected to notification stream with 0-delay');
          
          // Clear any previous ping interval
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          
          // Send keep-alive ping every 25 seconds
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send('ping');
              } catch (e) {
                console.error('[Merchant WS] Ping failed:', e);
              }
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (typeof event.data !== 'string') return;
          const trimmed = event.data.trim();
          if (trimmed === 'ping' || trimmed === 'pong' || !trimmed.startsWith('{')) {
            return;
          }
          try {
            const message = JSON.parse(trimmed);
            
            if (message.type === 'UNREAD_HISTORY') {
              // Bulk unread notifications loaded on connect
              setNotifications(message.data);
            } else if (message.type === 'NEW_NOTIFICATION') {
              const notif = message.data;
              if (notif && !notif.metadata && notif.metadata_json) {
                try {
                  notif.metadata = typeof notif.metadata_json === 'string' ? JSON.parse(notif.metadata_json) : notif.metadata_json;
                } catch {}
              }
              addNotification(notif);
              
              // Broadcast real-time update event so pages refresh instantly without HTTP polling
              window.dispatchEvent(new CustomEvent('menukit-realtime-update', { detail: notif }));
              
              // Play notification chime sound
              playChimeNotificationSound();

              // Show toast popup
              toast(notif.title + '\n' + notif.message, {
                icon: notif.type === 'NEW_ORDER' ? '🛍️' : notif.type === 'ORDER_STATUS' ? '🍳' : notif.type === 'NEW_CUSTOMER' ? '👋' : '⭐',
                style: {
                  borderRadius: '10px',
                  background: '#333',
                  color: '#fff',
                },
              });
            } else if (
              message.type === 'NEW_ORDER' ||
              message.event === 'NEW_ORDER' ||
              message.type === 'ORDER_STATUS' ||
              message.event === 'ORDER_STATUS' ||
              message.type === 'ORDER_UPDATED' ||
              message.event === 'ORDER_UPDATED'
            ) {
              const orderData = message.data || message.order;
              window.dispatchEvent(new CustomEvent('menukit-realtime-update', { 
                detail: { 
                  type: message.type || message.event, 
                  order: orderData, 
                  metadata: { order_id: orderData?.id || message.order_id } 
                } 
              }));
              
              if (message.type === 'NEW_ORDER' || message.event === 'NEW_ORDER') {
                playChimeNotificationSound();
                toast.success(`New order received! #${orderData?.daily_order_number || String(orderData?.id || '').slice(0, 8).toUpperCase()}`);
              }
            }
          } catch (e) {
            console.error("[Merchant WS] Failed to parse message:", e);
          }
        };

        ws.onclose = () => {
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          if (!isUnmountedRef.current) {
            console.log('[Merchant WS] Disconnected. Reconnecting in 1.5s...');
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(connect, 1500);
          }
        };

        ws.onerror = (error) => {
          console.error('[Merchant WS] Error:', error);
          try { ws.close(); } catch {}
        };
      } catch (e) {
        console.error('[Merchant WS] Connection exception:', e);
        if (!isUnmountedRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
      }
    };

    connect();

    // Reconnect immediately when device comes back online or tab is foregrounded
    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);
    window.addEventListener('focus', handleVisibilityOrOnline);

    return () => {
      isUnmountedRef.current = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      window.removeEventListener('focus', handleVisibilityOrOnline);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [shop?.id, addNotification, setNotifications]);
}
