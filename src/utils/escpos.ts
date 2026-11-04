/**
 * ESC/POS Binary Command Encoder for Hardware Thermal Receipt & KOT Printers.
 * Compatible with Epson, TVS, Star, Xprinter, MUNBYN, POS-58, and POS-80 machines.
 */

import { getBusinessCategory } from '../config/businessCategories';
import { formatReceiptDateTime, isNewlyAddedItem } from './thermalPrinter';
import { getBillTranslation, formatPaymentMethod } from './billTranslations';

export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  stationName?: string;
  soundBuzzer?: boolean;
  cutPaper?: boolean;
  autoCut?: boolean;
  bottomText?: string;
  invocationMode?: 'full' | 'new_only' | 'cancelled';
  kotNumber?: string;
  customItems?: any[];
  kotTitle?: string;
  kotShort?: string;
  reason?: string;
}

export function wrapText(str: string, maxWidth: number): string[] {
  if (!str) return [];
  const words = str.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      if (word.length > maxWidth) {
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
      } else {
        currentLine = word;
      }
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      if (word.length > maxWidth) {
        for (let i = 0; i < word.length; i += maxWidth) {
          const chunk = word.slice(i, i + maxWidth);
          if (i + maxWidth >= word.length) {
            currentLine = chunk;
          } else {
            lines.push(chunk);
          }
        }
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

export class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init(): this {
    this.buffer.push(0x1B, 0x40); // ESC @
    return this;
  }

  alignCenter(): this {
    this.buffer.push(0x1B, 0x61, 0x01); // ESC a 1
    return this;
  }

  alignLeft(): this {
    this.buffer.push(0x1B, 0x61, 0x00); // ESC a 0
    return this;
  }

  alignRight(): this {
    this.buffer.push(0x1B, 0x61, 0x02); // ESC a 2
    return this;
  }

  bold(on: boolean = true): this {
    this.buffer.push(0x1B, 0x45, on ? 0x01 : 0x00); // ESC E n
    return this;
  }

  doubleSize(): this {
    this.buffer.push(0x1D, 0x21, 0x11); // GS ! 0x11 (double width + double height)
    return this;
  }

  normalSize(): this {
    this.buffer.push(0x1D, 0x21, 0x00); // GS ! 0x00
    return this;
  }

  underline(on: boolean = true): this {
    this.buffer.push(0x1B, 0x2D, on ? 0x01 : 0x00); // ESC - n
    return this;
  }

  buzzer(beeps: number = 2): this {
    this.buffer.push(0x1B, 0x42, beeps, 0x02); // ESC B n t
    return this;
  }

  feed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.buffer.push(0x0A); // LF
    }
    return this;
  }

  cut(full: boolean = true): this {
    this.feed(3);
    this.buffer.push(0x1D, 0x56, full ? 0x41 : 0x42, 0x00); // GS V m n
    return this;
  }

  text(str: string): this {
    // Normalize Rupee symbol ₹ or unicode rupees to 'Rs' so thermal printers don't print '?'
    const normalized = str
      .replace(/₹/g, 'Rs')
      .replace(/\u20B9/g, 'Rs');

    // Multi-language UTF-8 support for modern ESC/POS thermal printers
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(normalized);
      for (let i = 0; i < bytes.length; i++) {
        this.buffer.push(bytes[i]);
      }
    } else {
      for (let i = 0; i < normalized.length; i++) {
        this.buffer.push(normalized.charCodeAt(i) & 0xFF);
      }
    }
    return this;
  }

  /**
   * Appends an ESC/POS raster bit image command (GS v 0).
   * Supported by all 58mm and 80mm thermal receipt printers.
   * Prints any script (Tamil, Hindi, Arabic, Chinese) with pixel-perfection.
   */
  rasterImage(imageData: ImageData): this {
    const width = imageData.width;
    const height = imageData.height;
    const widthBytes = Math.ceil(width / 8);
    const data = imageData.data;

    // Standard ESC/POS printers and emulators accept slice heights up to 240-256 dots.
    // Slicing prevents buffer overflows and socket drops on network/virtual thermal printers.
    const SLICE_HEIGHT = 240;

    for (let startY = 0; startY < height; startY += SLICE_HEIGHT) {
      const sliceH = Math.min(SLICE_HEIGHT, height - startY);

      // GS v 0 m xL xH yL yH
      this.buffer.push(
        0x1D, 0x76, 0x30, 0x00,
        widthBytes & 0xFF,
        (widthBytes >> 8) & 0xFF,
        sliceH & 0xFF,
        (sliceH >> 8) & 0xFF
      );

      for (let y = startY; y < startY + sliceH; y++) {
        for (let xByte = 0; xByte < widthBytes; xByte++) {
          let byteVal = 0;
          for (let b = 0; b < 8; b++) {
            const x = xByte * 8 + b;
            if (x < width) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const bVal = data[idx + 2];
              const a = data[idx + 3];
              const lum = 0.299 * r + 0.587 * g + 0.114 * bVal;
              if (a > 128 && lum < 160) {
                byteVal |= (1 << (7 - b));
              }
            }
          }
          this.buffer.push(byteVal);
        }
      }
    }
    return this;
  }

  textLine(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0A);
    return this;
  }

  centerLine(str: string, width: number = 42): this {
    this.alignLeft();
    const rawLines = str.split('\n');
    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        this.feed(1);
        continue;
      }
      const lines = wrapText(trimmed, width);
      for (const line of lines) {
        const pad = Math.max(0, Math.floor((width - line.length) / 2));
        this.textLine(' '.repeat(pad) + line);
      }
    }
    return this;
  }

  separator(char: string = '-', width: number = 42): this {
    this.textLine(char.repeat(width));
    return this;
  }

  twoColumn(left: string, right: string, width: number = 42): this {
    const spaceCount = Math.max(1, width - left.length - right.length);
    this.textLine(left + ' '.repeat(spaceCount) + right);
    return this;
  }

  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  toBase64(): string {
    const bytes = this.build();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

/**
 * Builds a complete binary ESC/POS payload for a Production Order Ticket (KOT / BOT / POT / Pick Slip).
 * Automatically adapts title and prefix based on shop category or customized shop settings.
 */
export function buildKotEscPos(order: any, shop: any, options: EscPosOptions = {}): Uint8Array {
  const is58mm = options.paperWidth === '58mm';
  const colWidth = is58mm ? 32 : 42;
  const builder = new EscPosBuilder();

  // 1. Alert Buzzer
  if (options.soundBuzzer !== false) {
    builder.buzzer(2);
  }

  // Determine category & customized ticket title
  const bCat = getBusinessCategory(shop?.category);
  const defaultSlipTitle = bCat.kotSlipTitle || 'KITCHEN ORDER TICKET';
  const customSlipTitle = shop?.settings?.kot_slip_title || shop?.settings?.kot_title || options.kotTitle;
  const slipTitle = (customSlipTitle || defaultSlipTitle).toUpperCase();

  const defaultShort = bCat.kotShort || 'KOT';
  const customShort = shop?.settings?.kot_short || options.kotShort;
  const shortCode = (customShort || defaultShort).toUpperCase();

  // 2. Header (Software-centered with column width padding)
  builder.alignLeft();
  builder.bold(true);
  const shopName = (shop?.name || 'STORE ORDER').toUpperCase();
  builder.centerLine(shopName, colWidth);
  builder.bold(false);

  builder.doubleSize().bold(true);
  const invocationLabel = options.invocationMode === 'new_only'
    ? `${shortCode} - NEW ADDITIONS`
    : options.invocationMode === 'cancelled'
      ? `VOID ${shortCode} - CANCELLED`
      : slipTitle;
  builder.centerLine(invocationLabel, Math.floor(colWidth / 2));
  builder.normalSize().bold(false);

  if (options.stationName) {
    builder.bold(true).centerLine(`[ STATION: ${options.stationName.toUpperCase()} ]`, colWidth).bold(false);
  }

  builder.separator('=', colWidth);

  // 3. Metadata Row
  builder.alignLeft();
  const rawId = order?.id ? String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase() : '00000000';
  const kotNo = options.kotNumber || `${shortCode}-${rawId}`;

  const orderType = order?.order_type === 'dine_in'
    ? (order.table_number ? `TABLE ${order.table_number}` : 'DINE IN')
    : order?.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  builder.bold(true);
  builder.twoColumn(`TICKET: ${kotNo}`, orderType, colWidth);
  builder.bold(false);

  const { kotTimeStr } = formatReceiptDateTime(order?.created_at);
  builder.textLine(`TIME: ${kotTimeStr}`);

  // Customer Name: avoid being chopped or cut off; do not show for walk-in
  const rawCustomer = (order?.customer_name || '').trim();
  const isCustWalkIn = !rawCustomer || 
    ['walk-in', 'walk-in customer', 'walk in', 'walk in customer', 'walkin', 'walkin customer', 'guest', 'customer'].includes(
      rawCustomer.toLowerCase()
    );

  if (!isCustWalkIn) {
    const phoneStr = order?.customer_phone ? ` (${order.customer_phone})` : '';
    builder.bold(true);
    const custLines = wrapText(`CUSTOMER: ${rawCustomer}${phoneStr}`, colWidth);
    for (const cLine of custLines) {
      builder.textLine(cLine);
    }
    builder.bold(false);
  }

  builder.separator('-', colWidth);

  // 4. Table Header
  builder.bold(true);
  if (is58mm) {
    builder.twoColumn('QTY  ITEM', 'NOTES', colWidth);
  } else {
    builder.twoColumn('QTY  ITEM NAME', 'INSTRUCTIONS', colWidth);
  }
  builder.bold(false);
  builder.separator('-', colWidth);

  // 5. Items
  const items = options.customItems || order?.items || [];
  let totalUnits = 0;

  for (const item of items) {
    const qty = item.quantity || 1;
    const isCancelled = Boolean(item.is_cancelled);
    const isReplaced = isCancelled && Boolean(item.cancellation_reason?.toLowerCase().includes('replace'));
    if (!isCancelled) {
      totalUnits += qty;
    }
    const name = item.name || 'Item';
    const notes = item.notes ? `(${item.notes})` : '';

    if (isCancelled) {
      const tag = isReplaced ? '[REPLACED - VOID]' : '[CANCELLED - VOID]';
      builder.bold(true);
      builder.textLine(` ${qty}x  ~~ ${name} ~~  ${tag}`);
      builder.bold(false);
      const reasonText = item.cancellation_reason || options.reason;
      if (reasonText) {
        builder.textLine(`     * Reason: ${reasonText}`);
      }
    } else {
      builder.bold(true);
      builder.textLine(` ${qty}x  ${name}`);
      builder.bold(false);
      if (notes) {
        builder.textLine(`     * Note: ${notes}`);
      }
    }
  }

  builder.separator('-', colWidth);
  builder.bold(true);
  builder.twoColumn(`TOTAL ITEMS: ${items.length}`, `TOTAL UNITS: ${totalUnits}`, colWidth);
  builder.bold(false);

  if (order?.notes) {
    builder.feed(1);
    builder.textLine(`ORDER NOTE: ${order.notes}`);
  }

  // 6. Custom Bottom Text, Footer & Cut
  if (options.bottomText && options.bottomText.trim()) {
    builder.feed(1);
    const lines = options.bottomText.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) builder.centerLine(line.trim(), colWidth);
    }
  }

  builder.feed(2);
  const endText = options.invocationMode === 'cancelled'
    ? '*** ORDER CANCELLED / VOIDED ***'
    : options.invocationMode === 'new_only'
      ? `*** END OF NEW ADDITIONS (${shortCode}) ***`
      : `*** END OF ${shortCode} ***`;
  builder.centerLine(endText, colWidth);
  const shouldCut = options.autoCut !== undefined ? options.autoCut : (options.cutPaper !== false);
  if (shouldCut) {
    builder.cut(true);
  }

  return builder.build();
}

/**
 * Renders a full customer receipt onto an offscreen HTML5 Canvas.
 * Supports all Unicode scripts (Tamil, Hindi, Telugu, Kannada, Malayalam, Arabic, etc.) with 100% typographic accuracy.
 * Output ImageData can be passed to EscPosBuilder.rasterImage for pixel-perfect thermal printing on any hardware printer.
 */
export function renderReceiptToCanvas(
  order: any,
  shop: any,
  options: {
    paperWidth?: '80mm' | '58mm';
    customItems?: any[];
    receiptTitle?: string;
    isNewOnly?: boolean;
    bottomText?: string;
    language?: string;
    translatedDescription?: string;
    translatedAddress?: string;
  } = {}
): ImageData | null {
  if (typeof document === 'undefined') return null;

  const is58mm = options.paperWidth === '58mm';
  // Standard thermal printable width: 512 dots for 80mm (64 bytes/line), 384 dots for 58mm (48 bytes/line)
  const width = is58mm ? 384 : 512;
  const padding = is58mm ? 8 : 12;
  const contentWidth = width - padding * 2;

  const targetLang = (options.language && options.language !== 'store')
    ? options.language
    : (shop?.settings?.language || 'en');
  const t = getBillTranslation(targetLang);

  const rawCurr = shop?.settings?.currency;
  const currencySymbol = (!rawCurr || rawCurr === '$') ? '₹' : rawCurr;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 3600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  const fontStack = '"Segoe UI", "Noto Sans Tamil", "Noto Sans Devanagari", "Noto Sans", Tahoma, Arial, sans-serif';

  // Helper to reliably extract pixel size from any font string (e.g. "bold 23px ...", "16px ...")
  const extractFontSize = (font: string, fallback = 16): number => {
    if (!font) return fallback;
    const match = font.match(/(\d+)px/);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
  };

  let y = padding;

  const drawCenter = (text: string, font: string, spacing = 5) => {
    if (!text) return;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.fillText(text, width / 2, y);
    y += extractFontSize(font, is58mm ? 15 : 17) + spacing;
  };

  const drawWrappedCenter = (text: string, font: string, spacing = 3) => {
    if (!text) return;
    ctx.font = font;
    ctx.textAlign = 'center';
    const words = text.split(/\s+/);
    let currentLine = '';
    const lineHeight = extractFontSize(font, is58mm ? 13 : 15) + 3;
    for (const w of words) {
      const test = currentLine ? `${currentLine} ${w}` : w;
      if (ctx.measureText(test).width > contentWidth) {
        if (currentLine) {
          ctx.fillText(currentLine, width / 2, y);
          y += lineHeight;
        }
        currentLine = w;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) {
      ctx.fillText(currentLine, width / 2, y);
      y += lineHeight + spacing;
    }
  };

  const drawDivider = (isDouble = false) => {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    if (isDouble) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(padding, y + 3);
      ctx.lineTo(width - padding, y + 3);
      ctx.moveTo(padding, y + 7);
      ctx.lineTo(width - padding, y + 7);
      ctx.stroke();
      y += 14;
    } else {
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(padding, y + 4);
      ctx.lineTo(width - padding, y + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      y += 12;
    }
  };

  const drawRow = (left: string, right: string, font = `${is58mm ? '15px' : '16px'} ${fontStack}`, isBold = false) => {
    ctx.font = isBold ? `bold ${font}` : font;
    const fontSize = extractFontSize(font, is58mm ? 15 : 16);
    const leftW = ctx.measureText(left).width;
    const rightW = ctx.measureText(right).width;

    // If left and right would overlap, break into a 2-line row cleanly
    if (leftW + rightW > contentWidth - 6) {
      ctx.textAlign = 'left';
      ctx.fillText(left, padding, y);
      y += fontSize + 3;
      ctx.textAlign = 'right';
      ctx.fillText(right, width - padding, y);
      y += fontSize + 4;
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(left, padding, y);
      ctx.textAlign = 'right';
      ctx.fillText(right, width - padding, y);
      y += fontSize + 4;
    }
  };

  // 1. Header
  const shopName = (shop?.name || 'STORE RECEIPT').toUpperCase();
  drawCenter(shopName, `bold ${is58mm ? '22px' : '26px'} ${fontStack}`, 4);

  const shopDesc = options.translatedDescription ?? shop?.description;
  if (shopDesc) {
    drawWrappedCenter(shopDesc, `${is58mm ? '13px' : '15px'} ${fontStack}`, 2);
  }

  const shopAddr = options.translatedAddress ?? shop?.address;
  if (shopAddr) {
    const lines = shopAddr.split('\n').map((l: string) => l.trim()).filter(Boolean);
    for (const l of lines) {
      drawWrappedCenter(l, `${is58mm ? '13px' : '14px'} ${fontStack}`, 1);
    }
  }

  if (shop?.phone) {
    drawCenter(`Ph: ${shop.phone}`, `${is58mm ? '13px' : '14px'} ${fontStack}`, 2);
  }
  if (shop?.settings?.gstin || shop?.gstin) {
    drawCenter(`GSTIN: ${shop?.settings?.gstin || shop?.gstin}`, `bold ${is58mm ? '13px' : '14px'} ${fontStack}`, 2);
  }
  if (shop?.settings?.fssai_license) {
    drawCenter(`FSSAI Lic: ${shop.settings.fssai_license}`, `${is58mm ? '12px' : '13px'} ${fontStack}`, 2);
  }

  drawDivider();

  // Receipt Title: dynamically translated to targetLang
  const isNewOnly = Boolean(options.isNewOnly);
  const receiptTitle = (options.receiptTitle && !['TAX INVOICE', 'TAX INVOICE (NEW)', 'TAX INVOICE - RUNNING ADDITIONS', 'TAX INVOICE (NEW ITEMS)'].includes(options.receiptTitle.trim().toUpperCase()))
    ? options.receiptTitle
    : (isNewOnly ? t.taxInvoiceNew : t.taxInvoice);
  drawCenter(receiptTitle, `bold ${is58mm ? '16px' : '19px'} ${fontStack}`, 3);
  if (isNewOnly) {
    drawCenter('* RUNNING ADDITIONS ONLY *', `bold 13px ${fontStack}`, 3);
  }

  drawDivider();

  // Metadata
  const billNo = order.invoice_number || (order.id ? String(order.id).slice(-8).toUpperCase() : 'N/A');
  drawRow(t.billNo, billNo, `${is58mm ? '14px' : '15px'} ${fontStack}`, true);

  const dateStr = order.created_at ? new Date(order.created_at).toLocaleDateString() : new Date().toLocaleDateString();
  const timeStr = order.created_at ? new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  drawRow(t.date, `${dateStr} ${timeStr}`, `${is58mm ? '13px' : '14px'} ${fontStack}`);

  if (order.customer_name && !['walk-in', 'walk-in customer'].includes(order.customer_name.trim().toLowerCase())) {
    drawRow(t.customer, order.customer_name, `${is58mm ? '13px' : '14px'} ${fontStack}`, true);
  }
  if (order.customer_phone) {
    drawRow(t.mobile, order.customer_phone, `${is58mm ? '13px' : '14px'} ${fontStack}`);
  }

  const orderTypeKey = (order.order_type || 'dine_in').toLowerCase();
  const typeLabel = orderTypeKey === 'dine_in' ? t.dineIn : (orderTypeKey === 'takeaway' ? t.takeaway : t.delivery);
  drawRow(t.type, typeLabel, `${is58mm ? '13px' : '14px'} ${fontStack}`);

  if (order.table_number) {
    drawRow(`${t.table}:`, String(order.table_number), `bold ${is58mm ? '14px' : '16px'} ${fontStack}`, true);
  }

  drawDivider();

  // Items Header
  drawRow(t.item, t.amount, `bold ${is58mm ? '14px' : '15px'} ${fontStack}`);
  drawDivider();

  // Items List
  const rawItems: any[] = options.customItems || order.items || [];
  const items = isNewOnly
    ? rawItems.filter(isNewlyAddedItem)
    : rawItems.filter((i: any) => !i.is_cancelled && (i.status || '').toLowerCase() !== 'cancelled');

  let totalQty = 0;
  let subtotal = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    totalQty += qty;
    const rate = Number(item.unit_price ?? item.price ?? 0);
    const amount = Number(item.total_price ?? (qty * rate));
    subtotal += amount;
    const name = item.item_name || item.name || 'Item';

    const itemFont = `bold ${is58mm ? '14px' : '15px'} ${fontStack}`;
    ctx.font = itemFont;
    const amountStr = `${currencySymbol} ${amount.toFixed(2)}`;
    const amountW = ctx.measureText(amountStr).width;
    const maxNameW = contentWidth - amountW - 8;
    const nameStr = `${qty}x ${name}`;

    ctx.textAlign = 'right';
    ctx.fillText(amountStr, width - padding, y);

    ctx.textAlign = 'left';
    if (ctx.measureText(nameStr).width > maxNameW) {
      const words = nameStr.split(/\s+/);
      let curLine = '';
      for (const w of words) {
        const test = curLine ? `${curLine} ${w}` : w;
        if (ctx.measureText(test).width > maxNameW) {
          if (curLine) {
            ctx.fillText(curLine, padding, y);
            y += is58mm ? 17 : 19;
          }
          curLine = w;
        } else {
          curLine = test;
        }
      }
      if (curLine) {
        ctx.fillText(curLine, padding, y);
      }
    } else {
      ctx.fillText(nameStr, padding, y);
    }
    y += is58mm ? 18 : 20;

    if (item.variant_info) {
      try {
        const v = typeof item.variant_info === 'string' ? JSON.parse(item.variant_info) : item.variant_info;
        const parts = Object.values(v);
        if (parts.length > 0) {
          ctx.font = `${is58mm ? '11px' : '12px'} ${fontStack}`;
          ctx.textAlign = 'left';
          ctx.fillText(`   (${parts.join(', ')})`, padding, y);
          y += is58mm ? 14 : 16;
        }
      } catch {}
    }

    ctx.font = `${is58mm ? '12px' : '13px'} ${fontStack}`;
    ctx.textAlign = 'left';
    ctx.fillText(`   ${qty} pc x ${rate.toFixed(2)}`, padding, y);
    y += is58mm ? 15 : 17;
  }

  drawDivider();

  const totalAmount = isNewOnly ? subtotal : Number(order.total_amount ?? subtotal);

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

  const discountAmount = isNewOnly ? 0 : (explicitDiscount > 0 ? explicitDiscount : Math.max(0, subtotal - totalAmount));

  // GST Breakdown
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isInclusive = Boolean(shop?.settings?.inclusive_tax);

  let taxable = subtotal;
  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let finalBillTotal = totalAmount;

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      finalBillTotal = totalAmount;
      taxable = Math.round((totalAmount / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((totalAmount - taxable) * 100) / 100;
      cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;
    } else {
      taxable = Math.max(0, subtotal - discountAmount);
      totalTax = Math.round((taxable * (totalTaxRate / 100)) * 100) / 100;
      cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;

      const orderAmountNum = Number(order?.total_amount || 0);
      if (!isNewOnly && orderAmountNum >= taxable + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((taxable + totalTax) * 100) / 100;
      }
    }
  }

  // Totals Breakdown
  drawRow(`Items: ${items.length}`, `Units: ${totalQty}`, `${is58mm ? '13px' : '14px'} ${fontStack}`);
  y += 2;

  drawRow(t.subtotal, `${currencySymbol} ${subtotal.toFixed(2)}`, `${is58mm ? '14px' : '15px'} ${fontStack}`);

  if (discountAmount > 0) {
    drawRow(t.discount, `-${currencySymbol} ${discountAmount.toFixed(2)}`, `bold ${is58mm ? '14px' : '15px'} ${fontStack}`);
  }

  if (isGstEnabled && totalTaxRate > 0) {
    drawDivider();
    drawRow(`${t.tax}:`, `${currencySymbol} ${taxable.toFixed(2)}`, `${is58mm ? '12px' : '13px'} ${fontStack}`);
    drawRow(`CGST (${cgstRate}%):`, `${currencySymbol} ${cgst.toFixed(2)}`, `${is58mm ? '12px' : '13px'} ${fontStack}`);
    drawRow(`SGST (${sgstRate}%):`, `${currencySymbol} ${sgst.toFixed(2)}`, `${is58mm ? '12px' : '13px'} ${fontStack}`);
    if (isInclusive) {
      drawCenter('(Prices include GST)', `${is58mm ? '10px' : '11px'} ${fontStack}`, 2);
    } else {
      drawCenter('(Exclusive: Tax added on items)', `${is58mm ? '10px' : '11px'} ${fontStack}`, 2);
    }
  }

  drawDivider(true);

  // NET PAYABLE
  drawRow(t.netPayable, `${currencySymbol} ${finalBillTotal.toFixed(2)}`, `bold ${is58mm ? '18px' : '20px'} ${fontStack}`, true);

  drawDivider(true);

  // Payment Breakdown
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
    for (const sp of activeSplits) {
      const methodLabel = formatPaymentMethod(sp.method, t);
      const amtStr = `${currencySymbol} ${Number(sp.amount || 0).toFixed(2)}`;
      drawRow(`${statusPrefix} ${methodLabel}`, amtStr, `bold ${is58mm ? '13px' : '14px'} ${fontStack}`);
    }
  } else {
    const methodLabel = formatPaymentMethod(order?.payment_method || 'CASH', t);
    const payStatus = isPaid ? t.paid : (order?.payment_status || t.due);
    drawRow(methodLabel, payStatus, `bold ${is58mm ? '13px' : '14px'} ${fontStack}`);
  }

  if (discountAmount > 0) {
    drawDivider();
    drawCenter(`${t.saved} ${currencySymbol} ${discountAmount.toFixed(2)}`, `bold ${is58mm ? '13px' : '14px'} ${fontStack}`, 5);
  }

  // Footer notes
  drawCenter(t.thankYou, `${is58mm ? '12px' : '13px'} ${fontStack}`, 2);
  drawCenter(t.returnPolicy, `${is58mm ? '11px' : '12px'} ${fontStack}`, 2);
  drawCenter(t.visitAgain, `bold ${is58mm ? '13px' : '14px'} ${fontStack}`, 10);

  y += 10;

  // Trim to actual height (guaranteeing valid positive integer long for canvas getImageData)
  const safeY = (isNaN(y) || y <= 0) ? 600 : y;
  const finalHeight = Math.max(100, Math.ceil(safeY));
  const trimmed = document.createElement('canvas');
  trimmed.width = width;
  trimmed.height = finalHeight;
  const trimmedCtx = trimmed.getContext('2d');
  if (!trimmedCtx) return null;

  trimmedCtx.drawImage(canvas, 0, 0, width, finalHeight, 0, 0, width, finalHeight);
  return trimmedCtx.getImageData(0, 0, width, finalHeight);
}

/**
 * Builds a complete binary ESC/POS payload for a Customer Tax Invoice / Bill.
 * Automatically chooses raster graphics mode for non-English / Indic languages (Tamil, Hindi, etc.)
 * to prevent hardware encoding errors (such as "??" or Mojibake).
 */
export function buildReceiptEscPos(
  order: any, 
  shop: any, 
  options: { 
    paperWidth?: '80mm' | '58mm'; 
    cutPaper?: boolean;
    autoCut?: boolean;
    bottomText?: string;
    customItems?: any[];
    receiptTitle?: string;
    isNewOnly?: boolean;
    language?: string;
    translatedDescription?: string;
    translatedAddress?: string;
  } = {}
): Uint8Array {
  const targetLang = (options.language && options.language !== 'store')
    ? options.language
    : (shop?.settings?.language || 'en');
  const t = getBillTranslation(targetLang);

  // Check if non-ASCII text exists (e.g. Tamil, Hindi, Arabic, Bengali, etc.)
  const hasNonAscii = /[^\x00-\x7F]/.test(
    (shop?.name || '') +
    (options.translatedDescription || shop?.description || '') +
    (options.translatedAddress || shop?.address || '') +
    t.taxInvoice +
    (order?.customer_name || '')
  );

  // If not English or has non-ASCII characters, render in GS v 0 raster mode
  if ((targetLang !== 'en' || hasNonAscii) && typeof document !== 'undefined') {
    const imageData = renderReceiptToCanvas(order, shop, { ...options, language: targetLang });
    if (imageData) {
      const rasterBuilder = new EscPosBuilder();
      rasterBuilder.init();
      rasterBuilder.alignCenter();
      rasterBuilder.rasterImage(imageData);
      rasterBuilder.feed(options.paperWidth === '58mm' ? 3 : 4);
      if (options.cutPaper !== false && options.autoCut !== false) {
        rasterBuilder.cut();
      }
      return rasterBuilder.build();
    }
  }

  const is58mm = options.paperWidth === '58mm';
  const colWidth = is58mm ? 32 : 42;
  const builder = new EscPosBuilder();
  const rawCurr = shop?.settings?.currency;
  const currencySymbol = (!rawCurr || rawCurr === '$' || rawCurr === '₹') ? 'Rs' : rawCurr.replace(/₹/g, 'Rs');

  const isNewOnly = Boolean(options.isNewOnly);
  const receiptTitle = (options.receiptTitle && !['TAX INVOICE', 'TAX INVOICE (NEW)', 'TAX INVOICE - RUNNING ADDITIONS', 'TAX INVOICE (NEW ITEMS)'].includes(options.receiptTitle.trim().toUpperCase()))
    ? options.receiptTitle
    : (isNewOnly ? t.taxInvoiceNew : t.taxInvoice);

  // 1. Shop Header (Software-centered with column width padding, preventing printer firmware offset)
  builder.alignLeft();
  builder.bold(true);
  const shopName = (shop?.name || 'STORE RECEIPT').toUpperCase();
  builder.centerLine(shopName, colWidth);
  builder.bold(false);

  const shopDescription = options.translatedDescription ?? shop?.description;
  if (shopDescription) {
    builder.centerLine(shopDescription, colWidth);
  }

  const shopAddress = options.translatedAddress ?? shop?.address;
  const addressLines = (shopAddress || '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);
  for (const line of addressLines) {
    builder.centerLine(line, colWidth);
  }

  if (shop?.phone) {
    builder.centerLine(`Ph: ${shop.phone}`, colWidth);
  }
  if (shop?.settings?.gstin || shop?.gstin) {
    builder.bold(true).centerLine(`GSTIN: ${shop?.settings?.gstin || shop?.gstin}`, colWidth).bold(false);
  }
  if (shop?.settings?.fssai_license) {
    builder.centerLine(`FSSAI Lic: ${shop.settings.fssai_license}`, colWidth);
  }

  builder.separator('=', colWidth);
  builder.bold(true).centerLine(receiptTitle, colWidth).bold(false);
  if (isNewOnly) {
    builder.centerLine('* RUNNING ADDITIONS ONLY *', colWidth);
  }
  builder.separator('=', colWidth);

  // 2. Metadata
  builder.alignLeft();
  const { full: dateStr, d: orderDate } = formatReceiptDateTime(order?.created_at);
  const billNo = `INV-${orderDate.getFullYear()}-${order?.id ? String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase() : '00000000'}`;

  builder.twoColumn(t.billNo, billNo, colWidth);
  builder.twoColumn(t.date, dateStr, colWidth);
  const isCustWalkIn = !order?.customer_name || 
    ['walk-in', 'walk-in customer', 'walk in', 'walk in customer', 'walkin', 'walkin customer'].includes(
      order.customer_name.trim().toLowerCase()
    );
  if (!isCustWalkIn) {
    builder.twoColumn(t.customer, order.customer_name, colWidth);
    if (order?.customer_phone) {
      builder.twoColumn(t.mobile, order.customer_phone, colWidth);
    }
  }

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `${t.dineIn} (${t.table} #${order.table_number})` : t.dineIn)
    : order?.order_type === 'takeaway'
      ? t.takeaway
      : t.delivery;
  builder.twoColumn(t.type, orderTypeLabel, colWidth);

  builder.separator('-', colWidth);
  builder.bold(true);
  builder.twoColumn(t.item, t.amount, colWidth);
  builder.bold(false);
  builder.separator('-', colWidth);

  // 3. Finalized Items ONLY (Do NOT show cancelled or void items; customItems if new additions)
  const items = (options.customItems && options.customItems.length > 0)
    ? options.customItems
    : (order?.items || []).filter((it: any) => !it.is_cancelled);
  let totalUnits = 0;
  let subtotal = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const price = Number(item.price || 0);
    const itemTotal = qty * price;
    totalUnits += qty;
    subtotal += itemTotal;

    builder.bold(true).textLine(`${qty}x ${item.name || 'Item'}`).bold(false);

    if (item.variant_info) {
      try {
        const v = typeof item.variant_info === 'string' ? JSON.parse(item.variant_info) : item.variant_info;
        const parts = Object.values(v);
        if (parts.length > 0) {
          builder.textLine(`   (${parts.join(', ')})`);
        }
      } catch {}
    }

    const rateStr = `${qty} pc x ${price.toFixed(2)}`;
    const amtStr = itemTotal.toFixed(2);
    builder.twoColumn(`   ${rateStr}`, amtStr, colWidth);
  }

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

  const discountAmount = isNewOnly ? 0 : (explicitDiscount > 0 ? explicitDiscount : Math.max(0, subtotal - totalAmount));

  // 4. Totals and Summary
  builder.separator('-', colWidth);
  builder.twoColumn(`Items: ${items.length}`, `Units: ${totalUnits}`, colWidth);
  builder.separator('-', colWidth);

  builder.twoColumn(t.subtotal, subtotal.toFixed(2), colWidth);
  if (discountAmount > 0) {
    builder.twoColumn(t.discount, `-${discountAmount.toFixed(2)}`, colWidth);
  }

  // GST Breakdown
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isInclusive = Boolean(shop?.settings?.inclusive_tax);

  let taxable = subtotal;
  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let finalBillTotal = totalAmount;

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      // INCLUSIVE: Tax is already baked into item price
      finalBillTotal = totalAmount;
      taxable = Math.round((totalAmount / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((totalAmount - taxable) * 100) / 100;
      cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;
    } else {
      // EXCLUSIVE: Tax is added on top of food subtotal
      taxable = Math.max(0, subtotal - discountAmount);
      totalTax = Math.round((taxable * (totalTaxRate / 100)) * 100) / 100;
      cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgst = Math.round((totalTax - cgst) * 100) / 100;

      const orderAmountNum = Number(order?.total_amount || 0);
      if (!isNewOnly && orderAmountNum >= taxable + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((taxable + totalTax) * 100) / 100;
      }
    }

    builder.separator('-', colWidth);
    builder.twoColumn(`${t.tax}:`, taxable.toFixed(2), colWidth);
    builder.twoColumn(`CGST (${cgstRate}%):`, cgst.toFixed(2), colWidth);
    builder.twoColumn(`SGST (${sgstRate}%):`, sgst.toFixed(2), colWidth);
    if (isInclusive) {
      builder.textLine('(Prices include GST)');
    } else {
      builder.textLine('(Exclusive: Tax added on items)');
    }
  }

  builder.separator('=', colWidth);
  builder.bold(true);
  builder.twoColumn(t.netPayable, `${currencySymbol} ${finalBillTotal.toFixed(2)}`, colWidth);
  builder.bold(false);
  builder.separator('=', colWidth);

  // 4. Payment breakdown
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
    for (const sp of activeSplits) {
      const methodName = formatPaymentMethod(sp.method, t);
      const amtStr = `${currencySymbol} ${Number(sp.amount || 0).toFixed(2)}`;
      builder.twoColumn(`${statusPrefix} ${methodName}`, amtStr, colWidth);
    }
  } else {
    const payMethod = formatPaymentMethod(order?.payment_method, t);
    const payStatus = isPaid ? t.paid : (order?.payment_status || t.due);
    builder.twoColumn(payMethod, payStatus, colWidth);
  }

  if (discountAmount > 0) {
    builder.separator('-', colWidth);
    builder.bold(true);
    builder.centerLine(`${t.saved} ${currencySymbol} ${discountAmount.toFixed(2)}`, colWidth);
    builder.bold(false);
  }

  // 5. Footer & Paper Cut
  builder.separator('-', colWidth);
  builder.feed(1);
  builder.centerLine(t.thankYou, colWidth);
  if (shop?.settings?.tax_invoice_notes) {
    builder.centerLine(shop.settings.tax_invoice_notes, colWidth);
  }
  if (options.bottomText && options.bottomText.trim()) {
    const lines = options.bottomText.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) builder.centerLine(line.trim(), colWidth);
    }
  }
  builder.centerLine(t.returnPolicy, colWidth);
  builder.bold(true).centerLine(t.visitAgain, colWidth).bold(false);

  const shouldCut = options.autoCut !== undefined ? options.autoCut : (options.cutPaper !== false);
  if (shouldCut) {
    builder.cut(true);
  }

  return builder.build();
}
