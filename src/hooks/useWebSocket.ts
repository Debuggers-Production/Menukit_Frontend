import { useEffect, useRef } from 'react';
import { APP_CONFIG } from '@/config';
import { useShopStore } from '@/store/shopStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useWsStore } from '@/store/wsStore';
import { toast } from 'react-hot-toast';

// Shared AudioContext with unlock support for mobile browsers
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    console.debug('Failed to initialize AudioContext:', e);
    return null;
  }
};

// Global user interaction listener to unlock AudioContext on first tap
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

export const playChimeNotificationSound = () => {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

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
    console.error('Failed to play notification sound', e);
  }
};

export function useWebSocket() {
  const { shop } = useShopStore();
  const { addNotification, setNotifications, fetchHistory } = useNotificationStore();
  const { setStatus, reconnectRequestedAt } = useWsStore();

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const watchdogTimeoutRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingSentAtRef = useRef<number>(0);
  const isUnmountedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const lastHiddenTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!shop?.id) {
      setStatus('disconnected');
      return;
    }
    isUnmountedRef.current = false;

    // Build WS URL based on current environment
    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000';
    const apiBase = APP_CONFIG.API_URL ? `${APP_CONFIG.API_URL}/api/v1` : `${protocol}//${host}/api/v1`;
    const wsUrl = apiBase.replace(/^http/, 'ws') + `/notifications/ws/${shop.id}`;

    const cleanupSocket = (wsToClean?: WebSocket | null) => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (watchdogTimeoutRef.current) {
        clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = null;
      }
      const target = wsToClean || wsRef.current;
      if (target) {
        try {
          target.onopen = null;
          target.onclose = null;
          target.onerror = null;
          target.onmessage = null;
          if (target.readyState === WebSocket.OPEN || target.readyState === WebSocket.CONNECTING) {
            target.close();
          }
        } catch {}
      }
    };

    const sendPing = () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      try {
        pingSentAtRef.current = Date.now();
        ws.send('ping');

        // Watchdog: If no message/pong is received back within 5s, the socket is dead
        if (watchdogTimeoutRef.current) clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = setTimeout(() => {
          console.warn('[Merchant WS] Heartbeat watchdog timeout (no pong in 5s). Forcing reconnect...');
          cleanupSocket();
          connect(true);
        }, 5000);
      } catch (err) {
        console.error('[Merchant WS] Failed to send ping:', err);
        cleanupSocket();
        connect(true);
      }
    };

    const connect = (isForce: boolean = false) => {
      if (isUnmountedRef.current) return;

      // If socket is already open and not a forced reconnect, no action needed
      if (!isForce && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setStatus('connected');
        return;
      }

      cleanupSocket();
      setStatus(reconnectAttemptsRef.current === 0 ? 'connecting' : 'reconnecting');

      try {
        console.log(`[Merchant WS] Connecting (attempt ${reconnectAttemptsRef.current + 1})...`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmountedRef.current || wsRef.current !== ws) {
            ws.close();
            return;
          }

          console.log('[Merchant WS] Connected to live notification stream with instant 0-delay tracking');
          reconnectAttemptsRef.current = 0;
          setStatus('connected', {
            lastConnectedAt: new Date().toISOString(),
            reconnectCount: 0,
          });

          // Resume audio context on connection if suspended
          getAudioContext();

          // Sync unread history and trigger order view refresh
          fetchHistory().catch(() => {});
          window.dispatchEvent(new CustomEvent('menukit-realtime-update', { detail: { type: 'RECONNECT_SYNC' } }));

          // Regular keep-alive ping every 12 seconds
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(sendPing, 12000);

          // Send an immediate first ping to measure latency
          sendPing();
        };

        ws.onmessage = (event) => {
          if (typeof event.data !== 'string') return;
          const trimmed = event.data.trim();

          // Clear watchdog on any incoming traffic
          if (watchdogTimeoutRef.current) {
            clearTimeout(watchdogTimeoutRef.current);
            watchdogTimeoutRef.current = null;
          }

          // Handle Pong response
          if (trimmed === 'pong') {
            const now = Date.now();
            const latency = pingSentAtRef.current > 0 ? now - pingSentAtRef.current : null;
            setStatus('connected', {
              latencyMs: latency,
              lastPongAt: now,
            });
            return;
          }

          if (trimmed === 'ping') {
            try { ws.send('pong'); } catch {}
            return;
          }

          if (!trimmed.startsWith('{')) return;

          try {
            const message = JSON.parse(trimmed);

            if (message.type === 'UNREAD_HISTORY') {
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
                icon: notif.type === 'NEW_ORDER' ? '🛍️' : notif.type === 'ORDER_STATUS' ? '🍳' : notif.type === 'NEW_CUSTOMER' ? '👋' : notif.type === 'NEW_SCHEME_ENROLLMENT' ? '🪙' : '⭐',
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
              message.event === 'ORDER_UPDATED' ||
              message.type === 'ITEMS_ADDED' ||
              message.event === 'ITEMS_ADDED'
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
              } else if (message.type === 'ITEMS_ADDED' || message.event === 'ITEMS_ADDED') {
                playChimeNotificationSound();
                toast.success(`New items added to #${orderData?.daily_order_number || String(orderData?.id || '').slice(0, 8).toUpperCase()}`);
              }
            }
          } catch (e) {
            console.error('[Merchant WS] Failed to parse message:', e);
          }
        };

        ws.onclose = () => {
          cleanupSocket(ws);
          if (!isUnmountedRef.current) {
            reconnectAttemptsRef.current += 1;
            // Backoff: 1s, 2s, max 4s
            const delay = Math.min(4000, 1000 + (reconnectAttemptsRef.current * 800));
            setStatus('reconnecting', { reconnectCount: reconnectAttemptsRef.current });
            console.log(`[Merchant WS] Disconnected. Reconnecting in ${(delay / 1000).toFixed(1)}s...`);
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => connect(true), delay);
          }
        };

        ws.onerror = (error) => {
          console.debug('[Merchant WS] Connection notice/error:', error);
          try { ws.close(); } catch {}
        };
      } catch (e) {
        console.error('[Merchant WS] Connection exception:', e);
        if (!isUnmountedRef.current) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(5000, 1500 * reconnectAttemptsRef.current);
          setStatus('reconnecting', { reconnectCount: reconnectAttemptsRef.current });
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => connect(true), delay);
        }
      }
    };

    // Initial connect
    connect();

    // ----------------------------------------------------
    // SCREEN WAKEUP / VISIBILITY / FOCUS / ONLINE WATCHDOG
    // ----------------------------------------------------
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        lastHiddenTimeRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - (lastHiddenTimeRef.current || 0);
        console.log(`[Merchant WS] Screen awakened (was asleep/hidden for ${(hiddenDuration / 1000).toFixed(1)}s)`);

        // If screen was off or hidden for more than 3 seconds:
        // Mobile OS networks almost certainly killed the underlying TCP pipe without sending FIN.
        // The existing DOM WebSocket cannot be trusted. Force a clean, fresh connection immediately!
        if (hiddenDuration > 3000 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connect(true);
        } else {
          // Quick probe ping to confirm alive
          sendPing();
        }
      }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      // Fires when waking up from bfcache on mobile Safari / Chrome
      console.log('[Merchant WS] pageshow event triggered (persisted:', e.persisted, ')');
      connect(true);
    };

    const handleFocus = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect(true);
      } else {
        sendPing();
      }
    };

    const handleOnline = () => {
      console.log('[Merchant WS] Network online event detected. Immediate reconnect...');
      connect(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      isUnmountedRef.current = true;
      cleanupSocket();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      setStatus('disconnected');
    };
  }, [shop?.id, addNotification, setNotifications, fetchHistory, setStatus]);

  // Handle manual reconnect requested via useWsStore.requestReconnect()
  useEffect(() => {
    if (reconnectRequestedAt > 0 && shop?.id) {
      console.log('[Merchant WS] Manual reconnect requested from UI');
      const isProd = import.meta.env.MODE === 'production';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = isProd ? window.location.host : 'localhost:8000';
      const apiBase = APP_CONFIG.API_URL ? `${APP_CONFIG.API_URL}/api/v1` : `${protocol}//${host}/api/v1`;
      const wsUrl = apiBase.replace(/^http/, 'ws') + `/notifications/ws/${shop.id}`;

      try {
        if (wsRef.current) {
          wsRef.current.close();
        }
      } catch {}

      // Reconnect immediately
      setStatus('connecting');
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
      } catch {}
    }
  }, [reconnectRequestedAt, shop?.id, setStatus]);
}
