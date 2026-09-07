/**
 * Utility for rendering and printing thermal receipt bills (58mm & 80mm POS printers).
 */

import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { buildKotEscPos, buildReceiptEscPos } from './escpos';
import { sendEscPosToDevice } from './webUsbPrinter';
import type { BillingPrinterConfig } from '@/store/usePrinterStore';

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  autoPrint?: boolean;
  customItems?: any[];
  receiptTitle?: string;
  isNewOnly?: boolean;
}

export function formatReceiptDateTime(dateStr: string) {
  if (!dateStr) return { date: '—', time: '—', full: '—' };
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
    full: `${day}/${month}/${year} ${hours}:${minutes}`,
  };
}

/**
 * Checks whether an item was newly added to an order (e.g. running additions, replacement items, or added later).
 */
export function isNewlyAddedItem(item: any, order: any): boolean {
  if (!item || item.is_cancelled) return false;

  // 1. If some items in the order were already completed/served, but this item is unserved
  const hasCompletedItems = order?.items?.some((x: any) => x.is_completed && !x.is_cancelled);
  if (!item.is_completed && hasCompletedItems) return true;

  // 2. If item created_at is significantly later than order created_at (added via Add Items)
  if (item.created_at && order?.created_at) {
    const itemTime = new Date(item.created_at).getTime();
    const orderTime = new Date(order.created_at).getTime();
    if (itemTime - orderTime > 5000) {
      return true;
    }
  }

  // 2b. If item created_at is significantly later than the earliest item in the order
  if (item.created_at && order?.items && order.items.length > 1) {
    const validTimestamps = order.items
      .map((it: any) => it.created_at ? new Date(it.created_at).getTime() : null)
      .filter((t: any): t is number => typeof t === 'number' && !isNaN(t));
    if (validTimestamps.length > 1) {
      const minTime = Math.min(...validTimestamps);
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime - minTime > 5000) {
        return true;
      }
    }
  }

  // 3. If there is a cancelled item in this order whose reason indicates replacement with this item
  const isReplacement = order?.items?.some(
    (x: any) => x.is_cancelled && x.cancellation_reason && x.cancellation_reason.toLowerCase().includes(String(item.name).toLowerCase())
  );
  if (isReplacement) return true;

  return false;
}

export function generateThermalReceiptHtml(
  order: any,
  shop: any,
  options: ThermalPrintOptions = {}
): string {
  const paperWidth = options.paperWidth || '80mm';
  const is58mm = paperWidth === '58mm';
  const baseFontSize = is58mm ? '11px' : '12px';
  const headerFontSize = is58mm ? '14px' : '16px';
  const currencySymbol = (!shop?.settings?.currency || shop?.settings?.currency === '$') ? 'Rs' : shop.settings.currency;

  const { full: formattedDateTime } = formatReceiptDateTime(order?.created_at);
  const billNo = `INV-${new Date(order?.created_at || Date.now()).getFullYear()}-${order?.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}`;
  
  const isNewOnly = Boolean(options.isNewOnly || (options.customItems && options.customItems.length > 0));
  const items = (options.customItems && options.customItems.length > 0)
    ? options.customItems
    : (order?.items || []).filter((it: any) => !it.is_cancelled);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalItems = items.length;

  // Calculate items subtotal from finalized active items (or custom items)
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const totalAmount = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);
  const discountAmount = isNewOnly ? 0 : Math.max(0, subtotal - totalAmount);
  const receiptTitle = options.receiptTitle || (isNewOnly ? 'TAX INVOICE (NEW ITEMS)' : 'TAX INVOICE');

  // GST Compliance Calculation
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isInclusive = Boolean(shop?.settings?.inclusive_tax);

  let taxableValue = subtotal;
  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let finalBillTotal = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      // INCLUSIVE: Tax is already inside item prices
      finalBillTotal = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);
      taxableValue = Math.round((finalBillTotal / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((finalBillTotal - taxableValue) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    } else {
      // EXCLUSIVE: Tax is added on top of food items
      taxableValue = Math.max(0, subtotal - discountAmount);
      cgstAmount = Math.round((taxableValue * (cgstRate / 100)) * 100) / 100;
      sgstAmount = Math.round((taxableValue * (sgstRate / 100)) * 100) / 100;
      totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;

      const orderAmountNum = Number(order?.total_amount || 0);
      if (!isNewOnly && orderAmountNum >= taxableValue + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((taxableValue + totalTax) * 100) / 100;
      }
    }
  }

  const orderTypeLabel = order?.order_type === 'dine_in' 
    ? (order?.table_number ? `Dine-in (Table #${order.table_number})` : 'Dine-in')
    : order?.order_type === 'takeaway' 
      ? 'Takeaway' 
      : 'Online / Delivery';

  const logoHtml = shop?.logo_url ? `
    <div style="text-align: center; margin-bottom: 8px;">
      <img 
        src="${shop.logo_url}" 
        alt="${shop?.name || 'Shop Logo'}" 
        style="max-height: 52px; max-width: 120px; object-fit: contain; filter: grayscale(100%) contrast(140%); -webkit-filter: grayscale(100%) contrast(140%); margin: 0 auto; display: block;" 
      />
    </div>
  ` : '';

  const addressLines = (shop?.address || '')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);

  const itemsHtml = items.map((it: any) => {
    let variantDetails = '';
    if (it.variant_info) {
      try {
        const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
        const parts = Object.entries(v).map(([_, val]) => `${val}`);
        if (parts.length > 0) {
          variantDetails = `<div style="font-size: 10px; color: #444; margin-left: 2px;">(${parts.join(', ')})</div>`;
        }
      } catch {}
    }

    const itemTotal = (Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2);
    const itemUnitPrice = Number(it.price || 0).toFixed(2);

    return `
      <div style="margin-bottom: 6px; page-break-inside: avoid;">
        <div style="font-weight: bold; word-break: break-word;">${it.name || 'Item'}</div>
        ${variantDetails}
        <div style="display: flex; justify-content: space-between; font-size: ${baseFontSize}; margin-top: 1px;">
          <span>${it.quantity || 1} pc x ${itemUnitPrice}</span>
          <span style="font-weight: bold;">${itemTotal}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bill Receipt #${billNo}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '3mm 2mm' : '4mm 3mm'};
      width: ${paperWidth};
      max-width: 100%;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, 'Lucida Console', Monaco, monospace;
      font-size: ${baseFontSize};
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt-container {
      width: 100%;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .dashed-line {
      border-top: 1px dashed #000;
      margin: 6px 0;
      width: 100%;
    }
    .double-line {
      border-top: 2px double #000;
      margin: 6px 0;
      width: 100%;
    }
    .flex-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 2px 0;
    }
    .shop-title {
      font-size: ${headerFontSize};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .invoice-title {
      font-size: ${is58mm ? '12px' : '13px'};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 2px 0;
    }
    .saved-box {
      border: 1px dashed #000;
      padding: 5px;
      text-align: center;
      font-weight: bold;
      margin: 7px 0;
      font-size: ${is58mm ? '11px' : '12px'};
    }
    .grand-total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${is58mm ? '13px' : '15px'};
      font-weight: 900;
      padding: 2px 0;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <!-- Shop Header -->
    ${logoHtml}
    <div class="text-center">
      <div class="shop-title">${shop?.name || 'STORE RECEIPT'}</div>
      ${shop?.description ? `<div style="font-size: 10px; margin-bottom: 2px;">${shop.description}</div>` : ''}
      ${addressLines.map((l: string) => `<div style="font-size: 10px;">${l}</div>`).join('')}
      ${shop?.phone ? `<div style="font-size: 10px;">Ph: ${shop.phone}</div>` : ''}
      ${shop?.whatsapp && shop?.whatsapp !== shop?.phone ? `<div style="font-size: 10px;">WhatsApp: ${shop.whatsapp}</div>` : ''}
      ${shop?.settings?.gstin || shop?.gstin ? `<div style="font-size: 10px; font-weight: bold;">GSTIN: ${shop?.settings?.gstin || shop?.gstin}</div>` : ''}
      ${shop?.settings?.fssai_license ? `<div style="font-size: 10px; font-weight: bold;">FSSAI Lic: ${shop.settings.fssai_license}</div>` : ''}
      ${shop?.settings?.legal_name ? `<div style="font-size: 9px; color: #444;">Legal: ${shop.settings.legal_name}</div>` : ''}
    </div>

    <!-- Invoice Header -->
    <div class="dashed-line"></div>
    <div class="text-center invoice-title">${receiptTitle}</div>
    ${isNewOnly ? '<div style="text-align: center; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; margin-top: -2px; margin-bottom: 2px;">* RUNNING ADDITIONS ONLY *</div>' : ''}
    <div class="dashed-line"></div>

    <!-- Meta Details -->
    <div class="flex-row">
      <span>Bill No</span>
      <span class="bold">${billNo}</span>
    </div>
    <div class="flex-row">
      <span>Date</span>
      <span>${formattedDateTime}</span>
    </div>
    <div class="flex-row">
      <span>Customer</span>
      <span class="bold">${order?.customer_name || 'Walk-in'}</span>
    </div>
    ${order?.customer_phone ? `
    <div class="flex-row">
      <span>Mobile</span>
      <span class="bold">${order.customer_phone}</span>
    </div>
    ` : ''}
    <div class="flex-row">
      <span>Type</span>
      <span>${orderTypeLabel}</span>
    </div>
    ${order?.delivery_address ? `
    <div style="margin: 2px 0; font-size: 10px;">
      <span style="display: block;">Delivery Address:</span>
      <span class="bold" style="word-break: break-word;">${order.delivery_address.replace(/\s*\[loc=.*?\]/, '')}</span>
    </div>
    ` : ''}

    <!-- Table Header -->
    <div class="dashed-line"></div>
    <div class="flex-row bold" style="font-size: ${baseFontSize};">
      <span>ITEM</span>
      <span>AMOUNT</span>
    </div>
    <div class="dashed-line"></div>

    <!-- Items List -->
    <div>
      ${itemsHtml}
    </div>

    <!-- Units and Items Summary -->
    <div class="dashed-line"></div>
    <div class="flex-row">
      <span>Items: ${totalItems}</span>
      <span>Units: ${totalUnits}</span>
    </div>
    <div class="dashed-line"></div>

    <!-- Subtotal & Taxes -->
    <div class="flex-row">
      <span>Subtotal</span>
      <span>${subtotal.toFixed(2)}</span>
    </div>
    ${discountAmount > 0 ? `
    <div class="flex-row">
      <span>Discount</span>
      <span>-${discountAmount.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isGstEnabled && totalTaxRate > 0 ? `
    <div class="dashed-line"></div>
    <div class="flex-row" style="font-size: 11px;">
      <span>Taxable Value</span>
      <span>${taxableValue.toFixed(2)}</span>
    </div>
    <div class="flex-row" style="font-size: 11px;">
      <span>CGST (${cgstRate}%)</span>
      <span>${cgstAmount.toFixed(2)}</span>
    </div>
    <div class="flex-row" style="font-size: 11px;">
      <span>SGST (${sgstRate}%)</span>
      <span>${isInclusive ? '' : '+'}${sgstAmount.toFixed(2)}</span>
    </div>
    ${isInclusive ? '<div style="font-size: 9px; text-align: right; color: #555;">(Prices inclusive of GST)</div>' : '<div style="font-size: 9px; text-align: right; color: #555;">(Exclusive: Tax added on items)</div>'}
    ` : ''}

    <!-- Total -->
    <div class="dashed-line"></div>
    <div class="grand-total-row">
      <span>TOTAL</span>
      <span>${currencySymbol} ${finalBillTotal.toFixed(2)}</span>
    </div>
    <div class="dashed-line"></div>

    <!-- Payment Status -->
    <div class="flex-row" style="font-size: ${baseFontSize};">
      <span style="text-transform: uppercase;">${order?.payment_method || 'CASH'}</span>
      <span class="bold" style="text-transform: uppercase;">${(order?.payment_status || 'PENDING') === 'paid' ? 'PAID' : (order?.payment_status || 'PENDING')}</span>
    </div>

    <!-- Savings Callout if applicable -->
    ${discountAmount > 0 ? `
    <div class="saved-box">
      SAVED ${currencySymbol} ${discountAmount.toFixed(2)} ON THIS BILL
    </div>
    ` : ''}

    <!-- Footer Notes -->
    <div class="dashed-line" style="margin-top: 8px;"></div>
    <div class="text-center" style="font-size: 10px; margin-top: 6px; line-height: 1.4;">
      <div>Thank you for ordering with us!</div>
      ${shop?.settings?.tax_invoice_notes ? `<div style="font-size: 9px; margin-top: 3px; color: #444;">${shop.settings.tax_invoice_notes}</div>` : ''}
      <div style="font-size: 9px; margin-top: 2px;">Goods once sold are not returnable without this receipt.</div>
      <div style="margin-top: 6px; font-weight: bold; font-size: 11px;">*** Visit again ***</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Direct thermal printer trigger via a hidden iframe.
 */
export function printThermalReceipt(
  order: any,
  shop: any,
  options: ThermalPrintOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateThermalReceiptHtml(order, shop, options);

      // Create a hidden iframe with non-zero geometry for reliable cross-browser printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '100px';
      iframe.style.height = '100px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Unable to access print frame document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      let hasTriggered = false;
      const triggerPrint = () => {
        if (hasTriggered) return;
        hasTriggered = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('Print execution error:', e);
          resolve(false);
        } finally {
          const cleanup = () => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          };
          try {
            iframe.contentWindow?.addEventListener('afterprint', cleanup);
          } catch {}
          setTimeout(cleanup, 60000);
        }
      };

      // Ensure images are loaded before printing
      const images = iframeDoc.getElementsByTagName('img');
      if (images.length > 0) {
        let loadedCount = 0;
        const totalImages = images.length;
        const checkDone = () => {
          loadedCount++;
          if (loadedCount >= totalImages) {
            setTimeout(triggerPrint, 150);
          }
        };

        for (let i = 0; i < totalImages; i++) {
          const img = images[i];
          if (img.complete) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        }
        // Fallback timeout in case image loading hangs
        setTimeout(triggerPrint, 800);
      } else {
        setTimeout(triggerPrint, 150);
      }
    } catch (err) {
      console.error('Thermal receipt print failed:', err);
      resolve(false);
    }
  });
}

/**
 * Spools Customer Tax Invoice / Bill to the registered Customer Billing Printer.
 * Supports:
 *  - Network LAN (ESC/POS Raw Socket TCP to configured IP:Port, e.g. 127.0.0.1:9100) -> Direct silent printing without dialogs
 *  - Direct USB (WebUSB ESC/POS)
 *  - System Default (Browser print dialog)
 */
export async function printBillToPrinter(
  order: any,
  shop: any,
  config?: Partial<BillingPrinterConfig> & { 
    paperWidth?: '80mm' | '58mm';
    customItems?: any[];
    receiptTitle?: string;
    isNewOnly?: boolean;
  }
): Promise<boolean> {
  const printerName = config?.name || 'Cashier Receipt Printer';
  const connectionType = config?.connectionType || 'network';
  const paperWidth = config?.paperWidth || '80mm';
  const ipAddress = (config?.ipAddress && config.ipAddress.trim()) || '127.0.0.1';
  const port = config?.port || 9100;
  const customItems = config?.customItems;
  const receiptTitle = config?.receiptTitle;
  const isNewOnly = config?.isNewOnly;

  if (connectionType === 'network') {
    const toastId = toast.loading(`Sending bill to ${printerName} (${ipAddress}:${port})...`);
    try {
      const escPosBytes = buildReceiptEscPos(order, shop, { 
        paperWidth, 
        cutPaper: true, 
        customItems, 
        receiptTitle, 
        isNewOnly 
      });
      let binary = '';
      for (let i = 0; i < escPosBytes.length; i++) {
        binary += String.fromCharCode(escPosBytes[i]);
      }
      const base64Data = window.btoa(binary);
      await api.post('/printer/print-escpos', {
        ip: ipAddress,
        port: Number(port) || 9100,
        raw_base64: base64Data,
        cut_paper: true,
        sound_buzzer: false,
      });
      toast.success(`Bill printed to ${printerName}!`, { id: toastId });
      return true;
    } catch (err: any) {
      console.warn(`Network bill print failed for ${printerName} (${ipAddress}:${port}):`, err);
      toast.error(`Printer (${ipAddress}:${port}) unreachable. Opening browser print dialog...`, { id: toastId, duration: 4000 });
      // Clean fallback so cashier can always print
      return await printThermalReceipt(order, shop, { 
        paperWidth, 
        customItems, 
        receiptTitle, 
        isNewOnly 
      });
    }
  } else if (connectionType === 'usb') {
    const toastId = toast.loading('Sending bill to USB printer...');
    try {
      const escPosBytes = buildReceiptEscPos(order, shop, { 
        paperWidth, 
        cutPaper: true, 
        customItems, 
        receiptTitle, 
        isNewOnly 
      });
      const sent = await sendEscPosToDevice(escPosBytes);
      if (sent) {
        toast.success(`Bill printed to USB printer!`, { id: toastId });
        return true;
      } else {
        toast.error('USB printer not connected. Opening browser print dialog...', { id: toastId, duration: 4000 });
        return await printThermalReceipt(order, shop, { 
          paperWidth, 
          customItems, 
          receiptTitle, 
          isNewOnly 
        });
      }
    } catch (usbErr) {
      console.warn('USB bill print failed:', usbErr);
      toast.error('Failed to send bill to USB printer. Opening browser print dialog...', { id: toastId, duration: 4000 });
      return await printThermalReceipt(order, shop, { 
        paperWidth, 
        customItems, 
        receiptTitle, 
        isNewOnly 
      });
    }
  } else {
    // Browser print fallback
    return await printThermalReceipt(order, shop, { 
      paperWidth, 
      customItems, 
      receiptTitle, 
      isNewOnly 
    });
  }
}

/**
 * Spools Customer Tax Invoice / Bill to ALL registered & enabled cashier printers configured in Settings.
 */
export async function printBillToAllPrinters(
  order: any,
  shop: any,
  printers: any[],
  options?: {
    paperWidth?: '80mm' | '58mm';
    customItems?: any[];
    receiptTitle?: string;
    isNewOnly?: boolean;
  }
): Promise<boolean> {
  const activePrinters = (printers || []).filter((p: any) => p && p.enabled !== false);

  if (activePrinters.length === 0) {
    return await printThermalReceipt(order, shop, options);
  }

  // Separate hardware printers (network LAN, USB) from browser system print
  const hardwarePrinters = activePrinters.filter(p => p.connectionType === 'network' || p.connectionType === 'usb');
  const hasBrowserPrinter = activePrinters.some(p => p.connectionType === 'browser');

  let anyHardwareSuccess = false;

  if (hardwarePrinters.length > 0) {
    const results = await Promise.allSettled(
      hardwarePrinters.map(async (printer) => {
        const printerPaperWidth = printer.paperWidth || options?.paperWidth || '80mm';
        return await printBillToPrinter(order, shop, {
          ...printer,
          paperWidth: printerPaperWidth,
          customItems: options?.customItems,
          receiptTitle: options?.receiptTitle,
          isNewOnly: options?.isNewOnly,
        });
      })
    );
    anyHardwareSuccess = results.some(r => r.status === 'fulfilled' && r.value === true);
  }

  // If there is explicitly a browser printer configured, OR if all hardware printers failed, open browser print dialog
  if (hasBrowserPrinter || (!anyHardwareSuccess && hardwarePrinters.length > 0)) {
    const fallbackPaperWidth = activePrinters[0]?.paperWidth || options?.paperWidth || '80mm';
    return await printThermalReceipt(order, shop, {
      ...options,
      paperWidth: fallbackPaperWidth,
    });
  }

  return anyHardwareSuccess;
}


export interface ThermalKotOptions {
  paperWidth?: '80mm' | '58mm';
  invocationMode?: 'full' | 'new_only' | 'cancelled';
  kotTitle?: string;
  reason?: string;
  kotNumber?: string;
  serverName?: string;
  stationName?: string;
  customItems?: any[];
}

/**
 * Filter items according to the requested KOT invocation mode.
 */
export function getKotInvocationItems(order: any, mode: 'full' | 'new_only' | 'cancelled' = 'full'): any[] {
  const allItems = order?.items || [];
  if (mode === 'cancelled') {
    return allItems.filter((it: any) => Boolean(it.is_cancelled));
  }
  if (mode === 'new_only') {
    // 1. Strictly prioritize items that are newly added via isNewlyAddedItem
    const newlyAdded = allItems.filter((it: any) => isNewlyAddedItem(it, order));
    if (newlyAdded.length > 0) return newlyAdded;
    // 2. Fallback: unserved and not cancelled
    return allItems.filter((it: any) => !it.is_completed && !it.is_cancelled);
  }
  // Full mode: all active non-cancelled items (or all items if all cancelled)
  const active = allItems.filter((it: any) => !it.is_cancelled);
  return active.length > 0 ? active : allItems;
}

/**
 * Generates thermal HTML strictly styled for kitchen staff and thermal KOT printers.
 */
export function generateThermalKotHtml(
  order: any,
  shop: any,
  options: ThermalKotOptions = {}
): string {
  const paperWidth = options.paperWidth || '80mm';
  const is58mm = paperWidth === '58mm';
  const mode = options.invocationMode || 'full';
  const baseFontSize = is58mm ? '11px' : '13px';
  const itemFontSize = is58mm ? '13px' : '15px';
  const titleFontSize = is58mm ? '16px' : '20px';

  const { full: formattedDateTime } = formatReceiptDateTime(order?.created_at);
  const rawId = order?.id ? order.id.slice(0, 8).toUpperCase() : '00000000';
  const kotNo = options.kotNumber || `KOT-${new Date(order?.created_at || Date.now()).getFullYear()}-${rawId}`;

  const items = options.customItems || getKotInvocationItems(order, mode);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `TABLE: ${order.table_number}` : 'DINE-IN')
    : order?.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  let bannerText = '*** KITCHEN ORDER TICKET (KOT) ***';
  let bannerBg = '#000';
  let bannerColor = '#fff';

  if (mode === 'cancelled') {
    bannerText = '*** KOT: VOID / CANCELLED ***';
    bannerBg = '#d32f2f';
    bannerColor = '#fff';
  } else if (mode === 'new_only') {
    bannerText = '*** KOT: RUNNING (NEW ITEMS) ***';
    bannerBg = '#2e7d32';
    bannerColor = '#fff';
  }

  const itemsHtml = items.map((it: any) => {
    let variantDetails = '';
    if (it.variant_info) {
      try {
        const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
        const parts = Object.entries(v).map(([_, val]) => `${val}`);
        if (parts.length > 0) {
          variantDetails = `<div style="font-size: 11px; font-weight: bold; margin-left: 28px; color: #111;">[ ${parts.join(' | ')} ]</div>`;
        }
      } catch {}
    }

    let addonsList: string[] = [];
    if (it.addons_info?.length) {
      try {
        addonsList = it.addons_info.map((a: any) => typeof a === 'string' ? a : (a.name ?? ''));
      } catch {}
    }
    const addonsHtml = addonsList.length > 0
      ? `<div style="font-size: 10px; font-style: italic; margin-left: 28px; color: #333;">+ ${addonsList.join(', ')}</div>`
      : '';

    const cancelReasonHtml = it.cancellation_reason
      ? `<div style="font-size: 11px; color: #b71c1c; font-weight: 800; margin-left: 28px;">REASON: ${it.cancellation_reason}</div>`
      : '';

    const isVoid = Boolean(it.is_cancelled);

    return `
      <div style="margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #ccc; page-break-inside: avoid;">
        <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: baseline; gap: 8px;">
            <span style="display: inline-block; font-size: ${itemFontSize}; font-weight: 900; background: ${isVoid ? '#d32f2f' : '#000'}; color: #fff; padding: 2px 6px; border-radius: 4px; min-width: 24px; text-align: center;">
              ${it.quantity || 1}
            </span>
            <span style="font-size: ${itemFontSize}; font-weight: 900; ${isVoid ? 'text-decoration: line-through; color: #777;' : 'color: #000;'}">
              ${it.name || 'Item'}
            </span>
          </div>
          ${isVoid ? '<span style="font-size: 10px; font-weight: 900; color: #d32f2f; border: 1px solid #d32f2f; padding: 1px 4px; border-radius: 3px;">VOID</span>' : ''}
        </div>
        ${variantDetails}
        ${addonsHtml}
        ${cancelReasonHtml}
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>KOT #${kotNo}</title>
  <style>
    @page {
      size: ${paperWidth} auto;
      margin: 0mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: ${is58mm ? '2mm 1mm' : '3mm 2mm'};
      width: ${paperWidth};
      max-width: 100%;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, Monaco, monospace;
      font-size: ${baseFontSize};
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .bold { font-weight: 900; }
    .divider {
      border-top: 1px solid #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px dashed #000;
      margin: 6px 0;
    }
    .table-banner {
      background: #000;
      color: #fff;
      font-size: ${is58mm ? '15px' : '18px'};
      font-weight: 900;
      padding: 4px 6px;
      text-align: center;
      margin: 4px 0;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background: ${bannerBg}; color: ${bannerColor}; text-align: center; padding: 3px; font-weight: 900; font-size: ${is58mm ? '11px' : '13px'}; border-radius: 4px;">
    ${bannerText}
  </div>

  <div class="text-center" style="margin-top: 5px;">
    <div style="font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900;">${shop?.name || 'KITCHEN'}</div>
    ${options.stationName ? `<div style="font-size: 11px; font-weight: 800; color: #333; margin-top: 1px;">[ STATION: ${options.stationName.toUpperCase()} ]</div>` : ''}
  </div>

  <!-- Big Emphasized Table / Order Type -->
  <div class="table-banner">
    ${orderTypeLabel}
  </div>

  <!-- Metadata Grid -->
  <div style="font-size: ${baseFontSize}; margin: 4px 0;">
    <div style="display: flex; justify-content: space-between;">
      <span><strong>KOT No:</strong> ${kotNo}</span>
      <span><strong>Inv:</strong> #${rawId}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span><strong>Date:</strong> ${formattedDateTime}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span><strong>Guest:</strong> ${order?.customer_name || 'Walk-in'}</span>
      ${order?.table_number ? `<span><strong>Table:</strong> ${order.table_number}</span>` : ''}
    </div>
  </div>

  <div class="double-divider"></div>

  <!-- Items Table Header -->
  <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: ${baseFontSize}; padding-bottom: 2px;">
    <span>[QTY] ITEM DESCRIPTION</span>
    <span>STATUS</span>
  </div>
  <div class="divider"></div>

  <!-- Items List -->
  <div style="margin: 6px 0;">
    ${items.length > 0 ? itemsHtml : '<div style="text-align:center; padding: 10px; font-style:italic;">No items for this ticket</div>'}
  </div>

  <div class="double-divider"></div>

  <!-- Summary Footer -->
  <div style="display: flex; justify-content: space-between; font-size: ${baseFontSize}; font-weight: 900;">
    <span>TOTAL ITEMS: ${items.length}</span>
    <span>TOTAL UNITS: ${totalUnits}</span>
  </div>

  ${mode === 'cancelled' ? `
    <div style="background: #ffebee; border: 1px solid #d32f2f; color: #b71c1c; padding: 6px; font-size: 11px; font-weight: 900; text-align: center; margin-top: 8px; border-radius: 4px;">
      ⚠️ STOP PREPARATION FOR CANCELLED ITEMS!
    </div>
  ` : ''}

  <div style="text-align: center; font-size: 10px; margin-top: 8px; color: #444;">
    *** END OF KOT ***
  </div>
</body>
</html>
  `;
}

/**
 * Generate formatted plain text KOT for clipboard or file saving.
 */
export function generateKotText(
  order: any,
  shop: any,
  options: ThermalKotOptions = {}
): string {
  const mode = options.invocationMode || 'full';
  const { full: formattedDateTime } = formatReceiptDateTime(order?.created_at);
  const rawId = order?.id ? order.id.slice(0, 8).toUpperCase() : '00000000';
  const kotNo = options.kotNumber || `KOT-${new Date(order?.created_at || Date.now()).getFullYear()}-${rawId}`;
  const items = options.customItems || getKotInvocationItems(order, mode);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `TABLE: ${order.table_number}` : 'DINE-IN')
    : order?.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  let title = '*** KITCHEN ORDER TICKET (KOT) ***';
  if (mode === 'cancelled') title = '*** KOT: VOID / CANCELLED ***';
  if (mode === 'new_only') title = '*** KOT: RUNNING (NEW ITEMS) ***';

  const itemsLines = items.map((it: any) => {
    let line = `${String(it.quantity || 1).padStart(2, ' ')}x ${it.name}`;
    if (it.variant_info) {
      try {
        const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
        line += ` (${Object.values(v).join(', ')})`;
      } catch {}
    }
    if (it.is_cancelled) {
      line += ` [CANCELLED: ${it.cancellation_reason || 'Staff action'}]`;
    }
    return line;
  }).join('\n');

  return (
    `========================================\n` +
    `         ${(shop?.name || 'KITCHEN').toUpperCase()}\n` +
    (options.stationName ? `       [ STATION: ${options.stationName.toUpperCase()} ]\n` : '') +
    `   ${title}\n` +
    `========================================\n` +
    `KOT No   : ${kotNo}\n` +
    `Date     : ${formattedDateTime}\n` +
    `Type     : ${orderTypeLabel}\n` +
    `Order    : #${rawId}\n` +
    `Customer : ${order?.customer_name || 'Walk-in'}\n` +
    `----------------------------------------\n` +
    `Qty  Item Description\n` +
    `----------------------------------------\n` +
    `${itemsLines}\n` +
    `----------------------------------------\n` +
    `Total Items: ${items.length}          Total Qty: ${totalUnits}\n` +
    `========================================\n` +
    `         *** END OF KOT ***\n`
  );
}

/**
 * Triggers thermal print dialog specifically formatted for KOT tickets.
 */
export async function printThermalKot(
  order: any,
  shop: any,
  options: ThermalKotOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateThermalKotHtml(order, shop, options);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '100px';
      iframe.style.height = '100px';
      iframe.style.border = '0';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Unable to access print frame document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      let hasTriggered = false;
      const triggerPrint = () => {
        if (hasTriggered) return;
        hasTriggered = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('KOT print execution error:', e);
          resolve(false);
        } finally {
          const cleanup = () => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          };
          try {
            iframe.contentWindow?.addEventListener('afterprint', cleanup);
          } catch {}
          setTimeout(cleanup, 60000);
        }
      };

      setTimeout(triggerPrint, 150);
    } catch (err) {
      console.error('Thermal KOT print failed:', err);
      resolve(false);
    }
  });
}

/**
 * Spools KOT prints across all registered kitchen printer stations with category routing.
 */
export async function printOrderToStations(
  order: any,
  shop: any,
  menuItems: any[],
  stations: any[],
  defaultPaperWidth: '80mm' | '58mm' = '80mm',
  invocationMode: 'full' | 'new_only' | 'cancelled' = 'full',
  options?: {
    customItems?: any[];
    reason?: string;
    kotTitle?: string;
    kotNumber?: string;
  }
): Promise<boolean> {
  const activeStations = (stations || []).filter((s: any) => s.enabled !== false);
  const baseItems = (options?.customItems && options.customItems.length > 0)
    ? options.customItems
    : getKotInvocationItems(order, invocationMode);

  // If there are no items to print for this action, avoid printing anything
  if (!baseItems || baseItems.length === 0) {
    return true;
  }
  
  // If no stations configured, attempt direct network LAN socket to local port 9100
  if (activeStations.length === 0) {
    try {
      const escPosBytes = buildKotEscPos(order, shop, {
        paperWidth: defaultPaperWidth,
        stationName: 'Kitchen Printer',
        soundBuzzer: true,
        invocationMode,
        customItems: baseItems,
        kotTitle: options?.kotTitle,
        reason: options?.reason,
        kotNumber: options?.kotNumber,
      });
      let binary = '';
      for (let i = 0; i < escPosBytes.length; i++) {
        binary += String.fromCharCode(escPosBytes[i]);
      }
      const base64Data = window.btoa(binary);
      await api.post('/printer/print-escpos', {
        ip: '127.0.0.1',
        port: 9100,
        raw_base64: base64Data,
        cut_paper: true,
        sound_buzzer: true,
      });
      return true;
    } catch (err) {
      console.warn('Direct 127.0.0.1:9100 attempt without stations failed:', err);
      toast.error('No printer stations configured. Please configure your kitchen printer in Settings.');
      return false;
    }
  }

  let overallSuccess = true;

  for (const station of activeStations) {
    const paperWidth = station.paperWidth || defaultPaperWidth;
    let stationItems = baseItems;

    const isUniversal = !station.categoryIds || station.categoryIds.includes('all') || station.categoryIds.length === 0;
    if (!isUniversal) {
      const allowedCategories = new Set(station.categoryIds);
      stationItems = baseItems.filter((it: any) => {
        const menuItem = (menuItems || []).find((m: any) => m.id === it.menu_item_id);
        const itemCatId = it.category_id || menuItem?.category_id;
        return itemCatId && allowedCategories.has(itemCatId);
      });
    }

    // ONLY print to this station if there are actually items assigned to it!
    if (stationItems.length > 0) {
      const connectionType = station.connectionType || 'network';
      const ipAddress = (station.ipAddress && station.ipAddress.trim()) || '127.0.0.1';
      const port = station.port || 9100;

      if (connectionType === 'network') {
        // Direct Network LAN Socket via backend port 9100
        try {
          const escPosBytes = buildKotEscPos(order, shop, {
            paperWidth,
            stationName: station.name,
            customItems: stationItems,
            soundBuzzer: station.soundBuzzer !== false,
            invocationMode,
            kotTitle: options?.kotTitle,
            reason: options?.reason,
            kotNumber: options?.kotNumber,
          });
          let binary = '';
          for (let i = 0; i < escPosBytes.length; i++) {
            binary += String.fromCharCode(escPosBytes[i]);
          }
          const base64Data = window.btoa(binary);
          await api.post('/printer/print-escpos', {
            ip: ipAddress,
            port: port,
            raw_base64: base64Data,
            cut_paper: true,
            sound_buzzer: station.soundBuzzer !== false,
          });
        } catch (netErr: any) {
          console.error(`Network LAN print failed for ${station.name} (${ipAddress}:${port}):`, netErr);
          toast.error(`Printer "${station.name}" (${ipAddress}:${port}) offline or unreachable`);
          overallSuccess = false;
        }
      } else if (connectionType === 'usb') {
        // Direct WebUSB / WebSerial
        try {
          const escPosBytes = buildKotEscPos(order, shop, {
            paperWidth,
            stationName: station.name,
            customItems: stationItems,
            soundBuzzer: station.soundBuzzer !== false,
            invocationMode,
            kotTitle: options?.kotTitle,
            reason: options?.reason,
            kotNumber: options?.kotNumber,
          });
          const sent = await sendEscPosToDevice(escPosBytes);
          if (!sent) {
            toast.error(`USB printer "${station.name}" not connected or ready`);
            overallSuccess = false;
          }
        } catch (usbErr) {
          console.error(`Direct USB print failed for ${station.name}:`, usbErr);
          toast.error(`Direct USB print failed for "${station.name}"`);
          overallSuccess = false;
        }
      } else {
        // Explicit Standard Browser / Kiosk Silent Printing
        const res = await printThermalKot(order, shop, {
          paperWidth,
          invocationMode,
          stationName: station.name,
          customItems: stationItems,
          kotTitle: options?.kotTitle,
          reason: options?.reason,
          kotNumber: options?.kotNumber,
        });
        if (!res) overallSuccess = false;
      }
    }
  }

  return overallSuccess;
}
