import { api } from '@/services/api';
import toast from 'react-hot-toast';
import { buildKotEscPos, buildReceiptEscPos } from './escpos';
import { sendEscPosToDevice } from './webUsbPrinter';
import { 
  sendEscPosToBluetooth, 
  requestWebBluetoothPrinter, 
  isBluetoothPrintingSupported,
  getActiveBluetoothPrinter,
  disconnectBluetoothPrinter
} from './webBluetoothPrinter';
import type { BillingPrinterConfig } from '@/store/usePrinterStore';
import { parseDateSafe } from './dateTime';
import { getBusinessCategory } from '@/config/businessCategories';
import { getBillTranslation, formatPaymentMethod } from './billTranslations';

/**
 * Checks the status of the local Menukit Print Bridge (running on the user's laptop/PC at port 9101).
 */
export async function checkLocalPrintBridgeStatus(): Promise<{ online: boolean; ip?: string; printers?: any[] }> {
  const hosts = ['127.0.0.1', 'localhost'];
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`http://${host}:9101/api/bridge/status`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { online: true, ip: data.host_ip || data.ip, printers: data.printers };
      }
    } catch {
      // try next host
    }
  }
  return { online: false };
}

/**
 * Tests connection to a network thermal printer station.
 * Tries the Local Print Bridge (running on user's machine) first so cloud POS can connect
 * to local Wi-Fi / LAN printers directly. Falls back to cloud backend if bridge is not running.
 */
export async function testNetworkPrinterConnection(
  ipAddress: string,
  port: number = 9100,
  stationName: string = 'Kitchen Printer'
): Promise<{ success: boolean; via: 'bridge' | 'backend'; message: string }> {
  const targetIp = (ipAddress && ipAddress.trim()) || '127.0.0.1';
  const targetPort = Number(port) || 9100;

  // 1. Try Local Print Bridge first (local HTTP server on port 9101)
  const bridgeEndpoints = [
    'http://127.0.0.1:9101/api/bridge/test',
  ];

  for (const endpoint of bridgeEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: targetIp,
          port: targetPort,
          station_name: stationName,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          return {
            success: true,
            via: 'bridge',
            message: data.message || `Connected to printer at ${targetIp}:${targetPort} via Local Bridge!`,
          };
        }
      }
    } catch {
      // Continue to next endpoint or fallback
    }
  }

  // 2. Fallback to Cloud Backend API
  try {
    const res = await api.post('/printer/test-lan', {
      ip: targetIp,
      port: targetPort,
      station_name: stationName,
    });
    return {
      success: true,
      via: 'backend',
      message: res.data?.message || `Connected to printer at ${targetIp}:${targetPort}!`,
    };
  } catch (err: any) {
    const isPrivateIp = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.)/.test(targetIp);
    const isCloud = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    let errorDetail = err.response?.data?.detail || err.message || 'Printer unreachable.';
    if (isPrivateIp && isCloud) {
      errorDetail = `Printer at ${targetIp}:${targetPort} did not respond. The cloud server cannot reach your local private Wi-Fi network. Please make sure the Menukit Print Bridge ('python -m virtual_kitchen_printer') is running on your computer to bridge print jobs!`;
    }
    throw new Error(errorDetail);
  }
}

/**
 * Tests connection to a Bluetooth thermal printer by streaming a test slip over Web Bluetooth.
 */
export async function testBluetoothPrinterConnection(
  printerName: string = 'Bluetooth Thermal Printer',
  paperWidth: '80mm' | '58mm' = '80mm'
): Promise<{ success: boolean; message: string }> {
  try {
    const is58 = paperWidth === '58mm';
    const sepLine = is58 ? '--------------------------------' : '------------------------------------------------';
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    let slipText = `\x1b\x40\x1b\x61\x01\x1b\x21\x30MENUKIT POS\x1b\x21\x00\n\x1b\x21\x08BLUETOOTH PRINTER TEST\x1b\x21\x00\n\x1b\x61\x00${sepLine}\nDevice   : ${printerName}\nInterface: Web Bluetooth (GATT Direct)\nWidth    : ${paperWidth}\nStatus   : PAIRED & READY\nTimestamp: ${now}\n${sepLine}\n\x1b\x61\x01[TEST PRINT SUCCESSFUL]\nESC/POS Wireless Direct Link Active\n\n\n\x1d\x56\x41\x03\x1b\x70\x00\x19\xfa`;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(slipText);
    await sendEscPosToBluetooth(data);
    return { 
      success: true, 
      message: `Test slip successfully printed to "${printerName}" over Bluetooth!` 
    };
  } catch (err: any) {
    throw new Error(err.message || 'Bluetooth test print failed. Please ensure the printer is turned on and paired.');
  }
}

/**
 * Sends RAW ESC/POS data to a network thermal printer.
 * Uses Local Print Bridge if available; otherwise falls back to backend API.
 */
export async function sendEscPosToNetworkPrinter(
  ipAddress: string,
  port: number = 9100,
  base64Data: string,
  options: {
    cutPaper?: boolean;
    soundBuzzer?: boolean;
    stationName?: string;
  } = {}
): Promise<{ success: boolean; via: 'bridge' | 'backend' }> {
  const targetIp = (ipAddress && ipAddress.trim()) || '127.0.0.1';
  const targetPort = Number(port) || 9100;
  const cutPaper = options.cutPaper ?? true;
  const soundBuzzer = options.soundBuzzer ?? false;

  // 1. Try Local Print Bridge
  const bridgeEndpoints = [
    'http://127.0.0.1:9101/api/bridge/print',
  ];

  for (const endpoint of bridgeEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: targetIp,
          port: targetPort,
          raw_base64: base64Data,
          cut_paper: cutPaper,
          sound_buzzer: soundBuzzer,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          return { success: true, via: 'bridge' };
        }
      }
    } catch {
      // Continue to next or fallback
    }
  }

  // 2. Fallback to Cloud Backend API
  await api.post('/printer/print-escpos', {
    ip: targetIp,
    port: targetPort,
    raw_base64: base64Data,
    cut_paper: cutPaper,
    sound_buzzer: soundBuzzer,
  });

  return { success: true, via: 'backend' };
}

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  autoPrint?: boolean;
  customItems?: any[];
  receiptTitle?: string;
  isNewOnly?: boolean;
  autoCut?: boolean;
  bottomText?: string;
  language?: string;
  translatedDescription?: string;
  translatedAddress?: string;
}

export function formatReceiptDateTime(input?: string | number | Date | null) {
  const d = parseDateSafe(input) || new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const fullYear = String(d.getFullYear());

  let hours12 = d.getHours() % 12;
  if (hours12 === 0) hours12 = 12;
  const hours12Str = String(hours12).padStart(2, '0');
  const minutesStr = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  const time12 = `${hours12Str}:${minutesStr} ${ampm}`;

  const hours24 = String(d.getHours()).padStart(2, '0');
  const time24 = `${hours24}:${minutesStr}`;

  const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });

  return {
    date: `${day}/${month}/${year}`,
    time: time12,
    time24,
    dateWithMonth: `${day} ${shortMonth}`,
    full: `${day}/${month}/${year} ${time12}`,
    full24: `${day}/${month}/${year} ${time24}`,
    kotTimeStr: `${time12} (${day} ${shortMonth})`,
    d,
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
  const billNo = `INV-${new Date(order?.created_at || Date.now()).getFullYear()}-${order?.id ? String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase() : '00000000'}`;
  
  const isNewOnly = Boolean(options.isNewOnly);
  const items = (options.customItems && options.customItems.length > 0)
    ? options.customItems
    : (order?.items || []).filter((it: any) => !it.is_cancelled);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalItems = items.length;

  // Calculate items subtotal from finalized active items (or custom items)
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const totalAmount = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);

  let explicitDiscount = 0;
  if (Array.isArray(order?.applied_discount_codes)) {
    for (const code of order.applied_discount_codes) {
      const match = typeof code === 'string' && code.match(/₹\s*([\d.]+)/);
      if (match && match[1]) {
        explicitDiscount += parseFloat(match[1]) || 0;
      }
    }
  }
  if (explicitDiscount === 0 && Number(order?.discount_amount || 0) > 0) {
    explicitDiscount = Number(order.discount_amount);
  }

  const targetLang = (options.language && options.language !== 'store')
    ? options.language
    : (shop?.settings?.language || 'en');
  const t = getBillTranslation(targetLang);

  const discountAmount = isNewOnly ? 0 : (explicitDiscount > 0 ? explicitDiscount : Math.max(0, subtotal - totalAmount));
  const receiptTitle = options.receiptTitle || (isNewOnly ? t.taxInvoiceNew : t.taxInvoice);

  // GST Compliance Calculation
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isInclusive = Boolean(shop?.settings?.inclusive_tax);

  // Separate taxable vs non-taxable item subtotals
  const taxableItems = items.filter((it: any) => it.is_taxable !== false);
  const nonTaxableItems = items.filter((it: any) => it.is_taxable === false);

  const taxableItemsSubtotal = taxableItems.reduce(
    (sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
    0
  );
  const nonTaxableItemsSubtotal = nonTaxableItems.reduce(
    (sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)),
    0
  );

  const taxableShare = subtotal > 0 ? (taxableItemsSubtotal / subtotal) : 1;
  const taxableDiscount = discountAmount * taxableShare;
  const nonTaxableDiscount = discountAmount - taxableDiscount;

  const effTaxableAmount = Math.max(0, taxableItemsSubtotal - taxableDiscount);
  const effNonTaxableAmount = Math.max(0, nonTaxableItemsSubtotal - nonTaxableDiscount);

  let taxableValue = effTaxableAmount;
  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let finalBillTotal = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      finalBillTotal = isNewOnly ? subtotal : Number(order?.total_amount ?? subtotal);
      taxableValue = Math.round((effTaxableAmount / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((effTaxableAmount - taxableValue) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    } else {
      // EXCLUSIVE: Tax is added only on taxable items
      taxableValue = effTaxableAmount;
      totalTax = Math.round((taxableValue * (totalTaxRate / 100)) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;

      const orderAmountNum = Number(order?.total_amount || 0);
      if (!isNewOnly && orderAmountNum >= effTaxableAmount + effNonTaxableAmount + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((effTaxableAmount + effNonTaxableAmount + totalTax) * 100) / 100;
      }
    }
  }

  const orderTypeLabel = order?.order_type === 'dine_in' 
    ? (order?.table_number ? `${t.dineIn} (${t.table} #${order.table_number})` : t.dineIn)
    : order?.order_type === 'takeaway' 
      ? t.takeaway 
      : t.delivery;

  const logoHtml = shop?.logo_url ? `
    <div style="text-align: center; margin-bottom: 8px;">
      <img 
        src="${shop.logo_url}" 
        alt="${shop?.name || 'Shop Logo'}" 
        style="max-height: 52px; max-width: 120px; object-fit: contain; filter: grayscale(100%) contrast(140%); -webkit-filter: grayscale(100%) contrast(140%); margin: 0 auto; display: block;" 
      />
    </div>
  ` : '';

  const shopDescription = options.translatedDescription ?? shop?.description;
  const shopAddress = options.translatedAddress ?? shop?.address;
  const addressLines = (shopAddress || '')
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
        <div style="font-weight: bold; word-break: break-word;">${it.name || 'Item'}${it.is_taxable === false ? ' <span style="font-size: 9px; font-weight: normal; background: #eee; padding: 1px 4px; border-radius: 2px;">(0% Tax)</span>' : ''}</div>
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
      ${shopDescription ? `<div style="font-size: 10px; margin-bottom: 2px;">${shopDescription}</div>` : ''}
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
      <span>${t.billNo}</span>
      <span class="bold">${billNo}</span>
    </div>
    <div class="flex-row">
      <span>${t.date}</span>
      <span>${formattedDateTime}</span>
    </div>
    ${Boolean(order?.customer_name) && !['walk-in', 'walk-in customer', 'walk in', 'walk in customer', 'walkin', 'walkin customer'].includes(order.customer_name.trim().toLowerCase()) ? `
    <div class="flex-row">
      <span>${t.customer}</span>
      <span class="bold">${order.customer_name}</span>
    </div>
    ${order?.customer_phone ? `
    <div class="flex-row">
      <span>${t.mobile}</span>
      <span class="bold">${order.customer_phone}</span>
    </div>
    ` : ''}
    ` : ''}
    <div class="flex-row">
      <span>${t.type}</span>
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
      <span>${t.item}</span>
      <span>${t.amount}</span>
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
      <span>${t.subtotal}</span>
      <span>${subtotal.toFixed(2)}</span>
    </div>
    ${discountAmount > 0 ? `
    <div class="flex-row">
      <span>${t.discount}</span>
      <span>-${discountAmount.toFixed(2)}</span>
    </div>
    ` : ''}
    ${isGstEnabled && totalTaxRate > 0 ? `
    <div class="dashed-line"></div>
    <div class="flex-row" style="font-size: 11px;">
      <span>Taxable Value</span>
      <span>${taxableValue.toFixed(2)}</span>
    </div>
    ${effNonTaxableAmount > 0 ? `
    <div class="flex-row" style="font-size: 11px;">
      <span>Exempt / Non-Taxable</span>
      <span>${effNonTaxableAmount.toFixed(2)}</span>
    </div>` : ''}
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
      <span>${t.netPayable}</span>
      <span>${currencySymbol} ${finalBillTotal.toFixed(2)}</span>
    </div>
    <div class="dashed-line"></div>

    <!-- Payment Status / Split Payments Breakdown -->
    ${(() => {
      let splitList: any[] = [];
      if (Array.isArray(order?.split_payments)) {
        splitList = order.split_payments;
      } else if (typeof order?.split_payments === 'string') {
        try {
          const parsed = JSON.parse(order.split_payments);
          if (Array.isArray(parsed)) splitList = parsed;
        } catch {}
      }
      const activeSplits = splitList.filter((sp: any) => Number(sp?.amount) > 0);
      const isPaid = (order?.payment_status || 'PENDING').toLowerCase() === 'paid';
      const statusPrefix = isPaid ? t.paid : t.due;

      if (activeSplits.length > 0) {
        return activeSplits.map((sp: any) => `
          <div class="flex-row" style="font-size: ${baseFontSize};">
            <span style="text-transform: uppercase;">${statusPrefix} ${formatPaymentMethod(sp.method, t)}</span>
            <span class="bold">${currencySymbol} ${Number(sp.amount || 0).toFixed(2)}</span>
          </div>
        `).join('');
      }

      return `
        <div class="flex-row" style="font-size: ${baseFontSize};">
          <span style="text-transform: uppercase;">${formatPaymentMethod(order?.payment_method, t)}</span>
          <span class="bold" style="text-transform: uppercase;">${isPaid ? t.paid : (order?.payment_status || t.due)}</span>
        </div>
      `;
    })()}

    <!-- Savings Callout if applicable -->
    ${discountAmount > 0 ? `
    <div class="saved-box">
      ${t.saved} ${currencySymbol} ${discountAmount.toFixed(2)}
    </div>
    ` : ''}

    <!-- Footer Notes -->
    <div class="dashed-line" style="margin-top: 8px;"></div>
    <div class="text-center" style="font-size: 10px; margin-top: 6px; line-height: 1.4;">
      <div>${t.thankYou}</div>
      ${shop?.settings?.tax_invoice_notes ? `<div style="font-size: 9px; margin-top: 3px; color: #444;">${shop.settings.tax_invoice_notes}</div>` : ''}
      ${options.bottomText ? `<div style="font-size: 10px; margin-top: 4px; font-weight: 700; color: #222;">${options.bottomText}</div>` : ''}
      <div style="font-size: 9px; margin-top: 2px;">${t.returnPolicy}</div>
      <div style="margin-top: 6px; font-weight: bold; font-size: 11px;">${t.visitAgain}</div>
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
    autoCut?: boolean;
    bottomText?: string;
    language?: string;
    translatedDescription?: string;
    translatedAddress?: string;
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
  const autoCut = config?.autoCut !== false;
  const bottomText = config?.bottomText;
  const language = config?.language;

  if (connectionType === 'network') {
    const toastId = toast.loading(`Sending bill to ${printerName} (${ipAddress}:${port})...`);
    try {
      const escPosBytes = buildReceiptEscPos(order, shop, { 
        paperWidth, 
        cutPaper: autoCut,
        autoCut,
        bottomText, 
        customItems, 
        receiptTitle, 
        isNewOnly,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
      });
      let binary = '';
      for (let i = 0; i < escPosBytes.length; i++) {
        binary += String.fromCharCode(escPosBytes[i]);
      }
      const base64Data = window.btoa(binary);
      const printResult = await sendEscPosToNetworkPrinter(ipAddress, Number(port) || 9100, base64Data, {
        cutPaper: autoCut,
        soundBuzzer: false,
        stationName: printerName,
      });
      toast.success(`Bill printed to ${printerName}${printResult.via === 'bridge' ? ' (via Local Bridge)' : ''}!`, { id: toastId });
      return true;
    } catch (err: any) {
      console.warn(`Network bill print failed for ${printerName} (${ipAddress}:${port}):`, err);
      const errorDetail = err.response?.data?.detail || err.message || 'Printer unreachable';
      toast.error(`Printer (${ipAddress}:${port}) error: ${errorDetail}. Opening browser print dialog...`, { id: toastId, duration: 5000 });
      // Clean fallback so cashier can always print
      return await printThermalReceipt(order, shop, { 
        paperWidth, 
        customItems, 
        receiptTitle, 
        isNewOnly,
        autoCut,
        bottomText,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
      });
    }
  } else if (connectionType === 'bluetooth') {
    const toastId = toast.loading(`Sending bill to Bluetooth printer (${printerName})...`);
    try {
      const escPosBytes = buildReceiptEscPos(order, shop, { 
        paperWidth, 
        cutPaper: autoCut,
        autoCut,
        bottomText, 
        customItems, 
        receiptTitle, 
        isNewOnly,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
      });
      await sendEscPosToBluetooth(escPosBytes);
      toast.success(`Bill printed to Bluetooth printer (${printerName})!`, { id: toastId });
      return true;
    } catch (btErr: any) {
      console.warn('Bluetooth bill print failed:', btErr);
      toast.error(`Bluetooth print failed: ${btErr.message || 'Device disconnected'}. Opening browser print dialog...`, { id: toastId, duration: 4000 });
      return await printThermalReceipt(order, shop, { 
        paperWidth, 
        customItems, 
        receiptTitle, 
        isNewOnly,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
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
        isNewOnly,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
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
          isNewOnly,
          language,
          translatedDescription: config?.translatedDescription,
          translatedAddress: config?.translatedAddress,
        });
      }
    } catch (usbErr) {
      console.warn('USB bill print failed:', usbErr);
      toast.error('Failed to send bill to USB printer. Opening browser print dialog...', { id: toastId, duration: 4000 });
      return await printThermalReceipt(order, shop, { 
        paperWidth, 
        customItems, 
        receiptTitle, 
        isNewOnly,
        language,
        translatedDescription: config?.translatedDescription,
        translatedAddress: config?.translatedAddress,
      });
    }
  } else {
    // Browser print fallback
    return await printThermalReceipt(order, shop, { 
      paperWidth, 
      customItems, 
      receiptTitle, 
      isNewOnly,
      language,
      translatedDescription: config?.translatedDescription,
      translatedAddress: config?.translatedAddress,
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
    language?: string;
    translatedDescription?: string;
    translatedAddress?: string;
  }
): Promise<boolean> {
  const activePrinters = (printers || []).filter((p: any) => p && p.enabled !== false);

  if (activePrinters.length === 0) {
    return await printThermalReceipt(order, shop, options);
  }

  // Separate hardware printers (network LAN, USB, Bluetooth) from browser system print
  const hardwarePrinters = activePrinters.filter(p => p.connectionType === 'network' || p.connectionType === 'usb' || p.connectionType === 'bluetooth');
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
          // Explicitly requested bill language from options takes precedence over default printer language
          language: options?.language || printer.language,
          translatedDescription: options?.translatedDescription,
          translatedAddress: options?.translatedAddress,
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
      autoCut: activePrinters[0]?.autoCut,
      bottomText: activePrinters[0]?.bottomText,
      paperWidth: fallbackPaperWidth,
      // Explicitly requested bill language takes precedence
      language: options?.language || activePrinters[0]?.language,
    });
  }

  return anyHardwareSuccess;
}


export interface ThermalKotOptions {
  paperWidth?: '80mm' | '58mm';
  invocationMode?: 'full' | 'new_only' | 'cancelled';
  kotTitle?: string;
  kotShort?: string;
  reason?: string;
  kotNumber?: string;
  serverName?: string;
  stationName?: string;
  customItems?: any[];
  autoCut?: boolean;
  bottomText?: string;
  silent?: boolean;
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
  const rawId = order?.id ? String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase() : '00000000';
  
  const bCat = getBusinessCategory(shop?.category);
  const defaultSlipTitle = bCat.kotSlipTitle || 'KITCHEN ORDER TICKET';
  const customSlipTitle = shop?.settings?.kot_slip_title || shop?.settings?.kot_title || options.kotTitle;
  const slipTitle = (customSlipTitle || defaultSlipTitle).toUpperCase();
  const shortCode = (shop?.settings?.kot_short || options.kotShort || bCat.kotShort || 'KOT').toUpperCase();

  const kotNo = options.kotNumber || `${shortCode}-${new Date(order?.created_at || Date.now()).getFullYear()}-${rawId}`;

  const items = options.customItems || getKotInvocationItems(order, mode);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `TABLE: ${order.table_number}` : 'DINE-IN')
    : order?.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  let bannerText = `*** ${slipTitle} ***`;
  let bannerBg = '#000';
  let bannerColor = '#fff';

  if (mode === 'cancelled') {
    bannerText = `*** ${shortCode}: VOID / CANCELLED ***`;
    bannerBg = '#d32f2f';
    bannerColor = '#fff';
  } else if (mode === 'new_only') {
    bannerText = `*** ${shortCode}: RUNNING (NEW ITEMS) ***`;
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

  const rawCustomer = (order?.customer_name || '').trim();
  const isCustWalkIn = !rawCustomer || 
    ['walk-in', 'walk-in customer', 'walk in', 'walk in customer', 'walkin', 'walkin customer', 'guest', 'customer'].includes(
      rawCustomer.toLowerCase()
    );
  const customerPhone = order?.customer_phone ? ` (${order.customer_phone})` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${shortCode} #${kotNo}</title>
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
    <div style="font-size: ${is58mm ? '13px' : '15px'}; font-weight: 900;">${(shop?.name || 'ORDER DISPATCH').toUpperCase()}</div>
    ${options.stationName ? `<div style="font-size: 11px; font-weight: 800; color: #333; margin-top: 1px;">[ STATION: ${options.stationName.toUpperCase()} ]</div>` : ''}
  </div>

  <!-- Big Emphasized Table / Order Type -->
  <div class="table-banner">
    ${orderTypeLabel}
  </div>

  <!-- Metadata Grid -->
  <div style="font-size: ${baseFontSize}; margin: 4px 0;">
    <div style="display: flex; justify-content: space-between;">
      <span><strong>${shortCode} No:</strong> ${kotNo}</span>
      <span><strong>Inv:</strong> #${rawId}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span><strong>Time:</strong> ${formatReceiptDateTime(order?.created_at).kotTimeStr}</span>
    </div>
    ${!isCustWalkIn ? `
    <div style="display: flex; justify-content: space-between; word-break: break-word;">
      <span><strong>Customer:</strong> ${rawCustomer}${customerPhone}</span>
      ${order?.table_number ? `<span><strong>Table:</strong> ${order.table_number}</span>` : ''}
    </div>
    ` : (order?.table_number ? `
    <div style="display: flex; justify-content: space-between;">
      <span><strong>Table:</strong> ${order.table_number}</span>
    </div>
    ` : '')}
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

  ${options.bottomText ? `
    <div style="text-align: center; font-size: 11px; margin-top: 6px; font-weight: 700; color: #333; word-break: break-word;">
      ${options.bottomText}
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
  const rawId = order?.id ? String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase() : '00000000';

  const bCat = getBusinessCategory(shop?.category);
  const defaultSlipTitle = bCat.kotSlipTitle || 'KITCHEN ORDER TICKET';
  const customSlipTitle = shop?.settings?.kot_slip_title || shop?.settings?.kot_title || options.kotTitle;
  const slipTitle = (customSlipTitle || defaultSlipTitle).toUpperCase();
  const shortCode = (shop?.settings?.kot_short || options.kotShort || bCat.kotShort || 'KOT').toUpperCase();

  const kotNo = options.kotNumber || `${shortCode}-${new Date(order?.created_at || Date.now()).getFullYear()}-${rawId}`;
  const items = options.customItems || getKotInvocationItems(order, mode);
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `TABLE: ${order.table_number}` : 'DINE-IN')
    : order?.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  let title = `*** ${slipTitle} ***`;
  if (mode === 'cancelled') title = `*** ${shortCode}: VOID / CANCELLED ***`;
  if (mode === 'new_only') title = `*** ${shortCode}: RUNNING (NEW ITEMS) ***`;

  const rawCustomer = (order?.customer_name || '').trim();
  const isCustWalkIn = !rawCustomer || 
    ['walk-in', 'walk-in customer', 'walk in', 'walk in customer', 'walkin', 'walkin customer', 'guest', 'customer'].includes(
      rawCustomer.toLowerCase()
    );

  const customerLine = !isCustWalkIn
    ? `Customer : ${rawCustomer}${order?.customer_phone ? ` (${order.customer_phone})` : ''}\n`
    : '';

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
    `         ${(shop?.name || 'STORE').toUpperCase()}\n` +
    (options.stationName ? `       [ STATION: ${options.stationName.toUpperCase()} ]\n` : '') +
    `   ${title}\n` +
    `========================================\n` +
    `${shortCode} No   : ${kotNo}\n` +
    `Time     : ${formatReceiptDateTime(order?.created_at).kotTimeStr}\n` +
    `Type     : ${orderTypeLabel}\n` +
    `Order    : #${rawId}\n` +
    customerLine +
    `----------------------------------------\n` +
    `Qty  Item Description\n` +
    `----------------------------------------\n` +
    `${itemsLines}\n` +
    `----------------------------------------\n` +
    `Total Items: ${items.length}          Total Qty: ${totalUnits}\n` +
    (options.bottomText ? `----------------------------------------\n${options.bottomText}\n` : '') +
    `========================================\n` +
    `         *** END OF ${shortCode} ***\n`
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
    kotShort?: string;
    kotNumber?: string;
    silent?: boolean;
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

  const effectiveKotTitle = options?.kotTitle || shop?.settings?.kot_slip_title || shop?.settings?.kot_title;
  const effectiveKotShort = options?.kotShort || shop?.settings?.kot_short;
  
  // If no stations configured, attempt direct network LAN socket to local port 9100
  if (activeStations.length === 0) {
    try {
      const escPosBytes = buildKotEscPos(order, shop, {
        paperWidth: defaultPaperWidth,
        stationName: 'Order Printer',
        soundBuzzer: true,
        invocationMode,
        customItems: baseItems,
        kotTitle: effectiveKotTitle,
        kotShort: effectiveKotShort,
        reason: options?.reason,
        kotNumber: options?.kotNumber,
      });
      let binary = '';
      for (let i = 0; i < escPosBytes.length; i++) {
        binary += String.fromCharCode(escPosBytes[i]);
      }
      const base64Data = window.btoa(binary);
      await sendEscPosToNetworkPrinter('127.0.0.1', 9100, base64Data, {
        cutPaper: true,
        soundBuzzer: true,
        stationName: 'Direct Printer',
      });
      return true;
    } catch (err) {
      console.warn('Direct 127.0.0.1:9100 attempt without stations failed:', err);
      if (!options?.silent) {
        toast.error('No printer stations configured. Please configure your kitchen printer in Settings.', {
          id: 'no-printer-stations-err',
        });
      }
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
        // Direct Network LAN Socket via Local Bridge or backend port
        try {
          const escPosBytes = buildKotEscPos(order, shop, {
            paperWidth,
            stationName: station.name,
            customItems: stationItems,
            soundBuzzer: station.soundBuzzer !== false,
            cutPaper: station.autoCut !== false,
            autoCut: station.autoCut !== false,
            bottomText: station.bottomText,
            invocationMode,
            kotTitle: effectiveKotTitle,
            kotShort: effectiveKotShort,
            reason: options?.reason,
            kotNumber: options?.kotNumber,
          });
          let binary = '';
          for (let i = 0; i < escPosBytes.length; i++) {
            binary += String.fromCharCode(escPosBytes[i]);
          }
          const base64Data = window.btoa(binary);
          await sendEscPosToNetworkPrinter(ipAddress, port, base64Data, {
            cutPaper: station.autoCut !== false,
            soundBuzzer: station.soundBuzzer !== false,
            stationName: station.name,
          });
        } catch (netErr: any) {
          console.error(`Network LAN print failed for ${station.name} (${ipAddress}:${port}):`, netErr);
          if (!options?.silent) {
            toast.error(`Printer "${station.name}" (${ipAddress}:${port}) offline or unreachable`, {
              id: `printer-offline-${station.name}`,
            });
          }
          overallSuccess = false;
        }
      } else if (connectionType === 'bluetooth') {
        // Direct Web Bluetooth
        try {
          const escPosBytes = buildKotEscPos(order, shop, {
            paperWidth,
            stationName: station.name,
            customItems: stationItems,
            soundBuzzer: station.soundBuzzer !== false,
            cutPaper: station.autoCut !== false,
            autoCut: station.autoCut !== false,
            bottomText: station.bottomText,
            invocationMode,
            kotTitle: effectiveKotTitle,
            kotShort: effectiveKotShort,
            reason: options?.reason,
            kotNumber: options?.kotNumber,
          });
          await sendEscPosToBluetooth(escPosBytes);
          if (!options?.silent) {
            toast.success(`Ticket sent to Bluetooth station "${station.name}"!`);
          }
        } catch (btErr: any) {
          console.error(`Direct Bluetooth print failed for ${station.name}:`, btErr);
          if (!options?.silent) {
            toast.error(`Bluetooth print failed for "${station.name}": ${btErr.message || 'Offline'}`, {
              id: `printer-offline-bt-${station.name}`,
            });
          }
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
            cutPaper: station.autoCut !== false,
            autoCut: station.autoCut !== false,
            bottomText: station.bottomText,
            invocationMode,
            kotTitle: effectiveKotTitle,
            kotShort: effectiveKotShort,
            reason: options?.reason,
            kotNumber: options?.kotNumber,
          });
          const sent = await sendEscPosToDevice(escPosBytes);
          if (!sent) {
            if (!options?.silent) {
              toast.error(`USB printer "${station.name}" not connected or ready`, {
                id: `printer-offline-usb-${station.name}`,
              });
            }
            overallSuccess = false;
          }
        } catch (usbErr) {
          console.error(`Direct USB print failed for ${station.name}:`, usbErr);
          if (!options?.silent) {
            toast.error(`Direct USB print failed for "${station.name}"`, {
              id: `printer-offline-usb-${station.name}`,
            });
          }
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
