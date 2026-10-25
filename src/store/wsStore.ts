import { create } from 'zustand';

export type WsConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

interface WsState {
  status: WsConnectionStatus;
  latencyMs: number | null;
  lastConnectedAt: string | null;
  lastPongAt: number | null;
  reconnectCount: number;
  reconnectRequestedAt: number;
  setStatus: (status: WsConnectionStatus, meta?: Partial<Omit<WsState, 'setStatus' | 'requestReconnect'>>) => void;
  requestReconnect: () => void;
}

export const useWsStore = create<WsState>((set) => ({
  status: 'disconnected',
  latencyMs: null,
  lastConnectedAt: null,
  lastPongAt: null,
  reconnectCount: 0,
  reconnectRequestedAt: 0,

  setStatus: (status, meta = {}) => {
    set((state) => ({
      ...state,
      ...meta,
      status,
    }));
  },

  requestReconnect: () => {
    set({ reconnectRequestedAt: Date.now() });
  },
}));
