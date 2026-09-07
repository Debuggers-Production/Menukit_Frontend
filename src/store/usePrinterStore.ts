import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PrinterStation {
  id: string;
  name: string;
  paperWidth: '80mm' | '58mm';
  categoryIds: string[]; // ['all'] or array of category UUIDs
  autoPrintOnAccept: boolean;
  enabled: boolean;
  connectionType?: 'browser' | 'network' | 'usb';
  ipAddress?: string;
  port?: number;
  soundBuzzer?: boolean;
}

export interface BillingPrinter {
  id: string;
  name: string;
  paperWidth: '80mm' | '58mm';
  connectionType: 'browser' | 'network' | 'usb';
  ipAddress: string;
  port: number;
  enabled: boolean;
  isDefault?: boolean;
}

export interface BillingPrinterConfig {
  id?: string;
  name: string;
  paperWidth: '80mm' | '58mm';
  connectionType: 'browser' | 'network' | 'usb';
  ipAddress: string;
  port: number;
  enabled: boolean;
  autoPrintOnPayment?: boolean;
  isDefault?: boolean;
}

export interface PrinterStoreState {
  paperWidth: '80mm' | '58mm';
  autoPrintOnAccept: boolean;
  stations: PrinterStation[];
  billingPrinter: BillingPrinterConfig;
  billingPrinters: BillingPrinter[];
  autoPrintOnPayment: boolean;
  billingPaperWidth: '80mm' | '58mm';
  printedOrders: Record<string, boolean>; // orderId -> true
  setPaperWidth: (width: '80mm' | '58mm') => void;
  setAutoPrintOnAccept: (val: boolean) => void;
  setBillingPrinter: (partial: Partial<BillingPrinterConfig>) => void;
  addStation: (station: Omit<PrinterStation, 'id'>) => void;
  updateStation: (id: string, partial: Partial<PrinterStation>) => void;
  removeStation: (id: string) => void;
  markOrderKotPrinted: (orderId: string) => void;
  isOrderKotPrinted: (orderId: string) => boolean;

  // Multi-Cashier Billing Printer actions
  addBillingPrinter: (printer: Omit<BillingPrinter, 'id'>) => void;
  updateBillingPrinter: (id: string, partial: Partial<BillingPrinter>) => void;
  removeBillingPrinter: (id: string) => void;
  setDefaultBillingPrinter: (id: string) => void;
  setAutoPrintOnPayment: (val: boolean) => void;
  setBillingPaperWidth: (width: '80mm' | '58mm') => void;
}

export const DEFAULT_BILLING_PRINTER: BillingPrinterConfig = {
  id: 'billing-default',
  name: 'Cashier Receipt Printer',
  paperWidth: '80mm',
  connectionType: 'network',
  ipAddress: '127.0.0.1',
  port: 9100,
  enabled: true,
  autoPrintOnPayment: false,
  isDefault: true,
};

export const DEFAULT_BILLING_PRINTERS: BillingPrinter[] = [
  {
    id: 'billing-default',
    name: 'Cashier Receipt Printer',
    paperWidth: '80mm',
    connectionType: 'network',
    ipAddress: '127.0.0.1',
    port: 9100,
    enabled: true,
    isDefault: true,
  },
];

export const DEFAULT_STATIONS: PrinterStation[] = [
  {
    id: 'station-main-kitchen',
    name: 'Main Kitchen Printer',
    paperWidth: '80mm',
    categoryIds: ['all'],
    autoPrintOnAccept: true,
    enabled: true,
    connectionType: 'network',
    ipAddress: '127.0.0.1',
    port: 9100,
    soundBuzzer: true,
  },
];

export const usePrinterStore = create<PrinterStoreState>()(
  persist(
    (set, get) => ({
      paperWidth: '80mm',
      autoPrintOnAccept: true,
      stations: DEFAULT_STATIONS,
      billingPrinter: DEFAULT_BILLING_PRINTER,
      billingPrinters: DEFAULT_BILLING_PRINTERS,
      autoPrintOnPayment: false,
      billingPaperWidth: '80mm',
      printedOrders: {},

      setPaperWidth: (paperWidth) => set({ paperWidth }),
      setAutoPrintOnAccept: (autoPrintOnAccept) => set({ autoPrintOnAccept }),
      setBillingPrinter: (partial) =>
        set((state) => {
          const updatedBillingPrinter = { ...state.billingPrinter, ...partial };
          const updatedPrinters = state.billingPrinters.map((p) =>
            p.id === updatedBillingPrinter.id || p.isDefault
              ? { ...p, ...partial }
              : p
          );
          return {
            billingPrinter: updatedBillingPrinter,
            billingPrinters: updatedPrinters,
            autoPrintOnPayment:
              partial.autoPrintOnPayment !== undefined
                ? partial.autoPrintOnPayment
                : state.autoPrintOnPayment,
            billingPaperWidth:
              partial.paperWidth !== undefined
                ? partial.paperWidth
                : state.billingPaperWidth,
          };
        }),

      addStation: (stationData) =>
        set((state) => ({
          stations: [
            ...state.stations,
            { 
              connectionType: 'network',
              ipAddress: '127.0.0.1',
              port: 9100,
              soundBuzzer: true,
              ...stationData, 
              id: `station-${Date.now()}` 
            },
          ],
        })),

      updateStation: (id, partial) =>
        set((state) => ({
          stations: state.stations.map((st) =>
            st.id === id ? { ...st, ...partial } : st
          ),
        })),

      removeStation: (id) =>
        set((state) => ({
          stations: state.stations.filter((st) => st.id !== id),
        })),

      addBillingPrinter: (printerData) =>
        set((state) => {
          const newId = `billing-${Date.now()}`;
          const isFirst = state.billingPrinters.length === 0;
          const makeDefault = isFirst || Boolean(printerData.isDefault);

          let updatedList = state.billingPrinters;
          if (makeDefault) {
            updatedList = updatedList.map((p) => ({ ...p, isDefault: false }));
          }

          const newPrinter: BillingPrinter = {
            id: newId,
            name: printerData.name || 'Cashier Receipt Printer',
            paperWidth: printerData.paperWidth || state.billingPaperWidth || '80mm',
            connectionType: printerData.connectionType || 'network',
            ipAddress: printerData.ipAddress || '127.0.0.1',
            port: printerData.port || 9100,
            enabled: printerData.enabled !== false,
            isDefault: makeDefault,
          };

          const nextPrinters = [...updatedList, newPrinter];
          const defaultPrinter = nextPrinters.find((p) => p.isDefault) || nextPrinters[0];

          return {
            billingPrinters: nextPrinters,
            billingPrinter: {
              ...defaultPrinter,
              autoPrintOnPayment: state.autoPrintOnPayment,
            },
          };
        }),

      updateBillingPrinter: (id, partial) =>
        set((state) => {
          let updatedList = state.billingPrinters.map((p) =>
            p.id === id ? { ...p, ...partial } : p
          );

          if (partial.isDefault) {
            updatedList = updatedList.map((p) =>
              p.id === id ? { ...p, isDefault: true } : { ...p, isDefault: false }
            );
          }

          const defaultPrinter =
            updatedList.find((p) => p.isDefault) ||
            updatedList.find((p) => p.enabled) ||
            updatedList[0] ||
            DEFAULT_BILLING_PRINTER;

          return {
            billingPrinters: updatedList,
            billingPrinter: {
              ...defaultPrinter,
              autoPrintOnPayment: state.autoPrintOnPayment,
            },
          };
        }),

      removeBillingPrinter: (id) =>
        set((state) => {
          const remaining = state.billingPrinters.filter((p) => p.id !== id);
          if (remaining.length > 0 && !remaining.some((p) => p.isDefault)) {
            remaining[0].isDefault = true;
          }
          const defaultPrinter = remaining.find((p) => p.isDefault) || remaining[0] || DEFAULT_BILLING_PRINTER;
          return {
            billingPrinters: remaining,
            billingPrinter: {
              ...defaultPrinter,
              autoPrintOnPayment: state.autoPrintOnPayment,
            },
          };
        }),

      setDefaultBillingPrinter: (id) =>
        set((state) => {
          const updatedList = state.billingPrinters.map((p) => ({
            ...p,
            isDefault: p.id === id,
          }));
          const defaultPrinter = updatedList.find((p) => p.id === id) || updatedList[0] || DEFAULT_BILLING_PRINTER;
          return {
            billingPrinters: updatedList,
            billingPrinter: {
              ...defaultPrinter,
              autoPrintOnPayment: state.autoPrintOnPayment,
            },
          };
        }),

      setAutoPrintOnPayment: (val) =>
        set((state) => ({
          autoPrintOnPayment: val,
          billingPrinter: {
            ...state.billingPrinter,
            autoPrintOnPayment: val,
          },
        })),

      setBillingPaperWidth: (width) =>
        set((state) => ({
          billingPaperWidth: width,
          billingPrinter: {
            ...state.billingPrinter,
            paperWidth: width,
          },
        })),

      markOrderKotPrinted: (orderId) =>
        set((state) => ({
          printedOrders: {
            ...state.printedOrders,
            [orderId]: true,
          },
        })),

      isOrderKotPrinted: (orderId) => {
        return Boolean(get().printedOrders[orderId]);
      },
    }),
    {
      name: 'menukit-kitchen-printers-config',
      version: 4,
      migrate: (persistedState: any) => {
        if (persistedState) {
          if (Array.isArray(persistedState.stations)) {
            persistedState.stations = persistedState.stations.map((st: any) => ({
              ...st,
              connectionType: st.connectionType || 'network',
              ipAddress: st.ipAddress || '127.0.0.1',
              port: st.port || 9100,
            }));
          }
          if (!Array.isArray(persistedState.billingPrinters) || persistedState.billingPrinters.length === 0) {
            const existing = persistedState.billingPrinter || DEFAULT_BILLING_PRINTER;
            persistedState.billingPrinters = [
              {
                id: existing.id || 'billing-default',
                name: existing.name || 'Cashier Receipt Printer',
                paperWidth: existing.paperWidth || '80mm',
                connectionType: existing.connectionType || 'network',
                ipAddress: existing.ipAddress || '127.0.0.1',
                port: existing.port || 9100,
                enabled: existing.enabled !== false,
                isDefault: true,
              },
            ];
          }
          if (!persistedState.billingPrinter) {
            persistedState.billingPrinter = persistedState.billingPrinters[0];
          }
          if (persistedState.autoPrintOnPayment === undefined) {
            persistedState.autoPrintOnPayment = persistedState.billingPrinter?.autoPrintOnPayment || false;
          }
          if (persistedState.billingPaperWidth === undefined) {
            persistedState.billingPaperWidth = persistedState.billingPrinter?.paperWidth || '80mm';
          }
        }
        return persistedState;
      },
    }
  )
);
