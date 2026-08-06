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

  useEffect(() => {
    if (!shop?.id) return;

    // Build WS URL based on current environment
    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000'; // Fallback to 8000 for local dev if not running through vite proxy
    const apiBase = APP_CONFIG.API_URL ? `${APP_CONFIG.API_URL}/api/v1` : `${protocol}//${host}/api/v1`;
    
    // Replace http(s) with ws(s)
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/notifications/ws/${shop.id}`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to notification stream');
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string' && (event.data === 'ping' || event.data === 'pong')) {
          return;
        }
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'UNREAD_HISTORY') {
            // Bulk unread notifications loaded on connect
            setNotifications(message.data);
          } else if (message.type === 'NEW_NOTIFICATION') {
            const notif = message.data;
            addNotification(notif);
            
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
          }
        } catch (e) {
          console.error("Failed to parse websocket message", e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 5s...');
        setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent auto-reconnect on unmount
        wsRef.current.close();
      }
    };
  }, [shop?.id, addNotification, setNotifications]);
}
