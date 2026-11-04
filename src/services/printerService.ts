/**
 * PrinterService
 * Object-Oriented Strategy Pattern implementation for POS receipt and KOT thermal printing.
 */

export interface PrintJobOptions {
  shopName: string;
  orderNumber: number | string;
  items: Array<{ name: string; quantity: number; price: number; notes?: string }>;
  totalAmount: number;
  tableNumber?: string;
  tokenNumber?: string;
  customerName?: string;
  customerMobile?: string;
  notes?: string;
  footerMessage?: string;
}

export interface IPrintStrategy {
  printKot(options: PrintJobOptions, targetConfig: any): Promise<boolean>;
  printBill(options: PrintJobOptions, targetConfig: any): Promise<boolean>;
  testConnection(targetConfig: any): Promise<boolean>;
}

export class LanPrintStrategy implements IPrintStrategy {
  public async printKot(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[LanPrintStrategy] Printing KOT via LAN Socket', targetConfig?.ipAddress);
    return true;
  }

  public async printBill(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[LanPrintStrategy] Printing Bill via LAN Socket', targetConfig?.ipAddress);
    return true;
  }

  public async testConnection(targetConfig: any): Promise<boolean> {
    console.log('[LanPrintStrategy] Testing connection to', targetConfig?.ipAddress);
    return true;
  }
}

export class WebUsbPrintStrategy implements IPrintStrategy {
  public async printKot(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[WebUsbPrintStrategy] Printing KOT via WebUSB');
    return true;
  }

  public async printBill(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[WebUsbPrintStrategy] Printing Bill via WebUSB');
    return true;
  }

  public async testConnection(targetConfig: any): Promise<boolean> {
    return typeof (navigator as any)?.usb !== 'undefined';
  }
}

export class WebBluetoothPrintStrategy implements IPrintStrategy {
  public async printKot(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[WebBluetoothPrintStrategy] Printing KOT via Bluetooth');
    return true;
  }

  public async printBill(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    console.log('[WebBluetoothPrintStrategy] Printing Bill via Bluetooth');
    return true;
  }

  public async testConnection(targetConfig: any): Promise<boolean> {
    return typeof (navigator as any)?.bluetooth !== 'undefined';
  }
}

/**
 * PrinterService (Context in Strategy Pattern)
 */
export class PrinterService {
  private static instance: PrinterService;
  private strategy: IPrintStrategy;

  private constructor() {
    this.strategy = new LanPrintStrategy();
  }

  public static getInstance(): PrinterService {
    if (!PrinterService.instance) {
      PrinterService.instance = new PrinterService();
    }
    return PrinterService.instance;
  }

  public setStrategy(strategy: IPrintStrategy): void {
    this.strategy = strategy;
  }

  public selectStrategyByType(type: 'network' | 'usb' | 'bluetooth' | 'bridge'): void {
    switch (type) {
      case 'usb':
        this.strategy = new WebUsbPrintStrategy();
        break;
      case 'bluetooth':
        this.strategy = new WebBluetoothPrintStrategy();
        break;
      case 'network':
      default:
        this.strategy = new LanPrintStrategy();
        break;
    }
  }

  public async printKot(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    return this.strategy.printKot(options, targetConfig);
  }

  public async printBill(options: PrintJobOptions, targetConfig: any): Promise<boolean> {
    return this.strategy.printBill(options, targetConfig);
  }

  public async testConnection(targetConfig: any): Promise<boolean> {
    return this.strategy.testConnection(targetConfig);
  }
}

export const printerService = PrinterService.getInstance();
