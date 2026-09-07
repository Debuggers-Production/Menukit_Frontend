/**
 * ESC/POS Binary Command Encoder for Hardware Thermal Receipt & KOT Printers.
 * Compatible with Epson, TVS, Star, Xprinter, MUNBYN, POS-58, and POS-80 machines.
 */

export interface EscPosOptions {
  paperWidth?: '80mm' | '58mm';
  stationName?: string;
  soundBuzzer?: boolean;
  cutPaper?: boolean;
  invocationMode?: 'full' | 'new_only' | 'cancelled';
  kotNumber?: string;
  customItems?: any[];
  kotTitle?: string;
  reason?: string;
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
    // Standard ESC/POS text encoding
    const cleanStr = str.replace(/[^\x00-\x7F]/g, '?');
    for (let i = 0; i < cleanStr.length; i++) {
      this.buffer.push(cleanStr.charCodeAt(i));
    }
    return this;
  }

  textLine(str: string = ''): this {
    this.text(str);
    this.buffer.push(0x0A);
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
 * Builds a complete binary ESC/POS payload for a Kitchen Order Ticket (KOT).
 */
export function buildKotEscPos(order: any, shop: any, options: EscPosOptions = {}): Uint8Array {
  const is58mm = options.paperWidth === '58mm';
  const colWidth = is58mm ? 32 : 42;
  const builder = new EscPosBuilder();

  // 1. Alert Buzzer
  if (options.soundBuzzer !== false) {
    builder.buzzer(2);
  }

  // 2. Header
  builder.alignCenter().bold(true);
  const shopName = (shop?.name || 'MENUKIT RESTAURANT').toUpperCase();
  builder.textLine(shopName);

  builder.doubleSize();
  const invocationLabel = options.kotTitle || (options.invocationMode === 'new_only'
    ? 'KOT - NEW ADDITIONS'
    : options.invocationMode === 'cancelled'
      ? 'VOID KOT - CANCELLED'
      : 'KITCHEN ORDER TICKET');
  builder.textLine(invocationLabel);
  builder.normalSize().bold(false);

  if (options.stationName) {
    builder.bold(true).textLine(`[ STATION: ${options.stationName.toUpperCase()} ]`).bold(false);
  }

  builder.separator('=', colWidth);

  // 3. Metadata Row
  builder.alignLeft();
  const rawId = order.id ? order.id.slice(0, 8).toUpperCase() : '00000000';
  const kotNo = options.kotNumber || `KOT-${rawId}`;

  const orderType = order.order_type === 'dine_in'
    ? (order.table_number ? `TABLE ${order.table_number}` : 'DINE IN')
    : order.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  builder.bold(true);
  builder.twoColumn(`TICKET: ${kotNo}`, orderType, colWidth);
  builder.bold(false);

  const nowStr = new Date(order.created_at || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = new Date(order.created_at || Date.now()).toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
  });
  builder.twoColumn(`TIME: ${nowStr} (${dateStr})`, `CUSTOMER: ${order.customer_name || 'Walk-in'}`, colWidth);

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
  const items = options.customItems || order.items || [];
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

  if (order.notes) {
    builder.feed(1);
    builder.textLine(`ORDER NOTE: ${order.notes}`);
  }

  // 6. Footer & Cut
  builder.feed(2);
  builder.alignCenter().textLine('*** END OF KOT ***');
  if (options.cutPaper !== false) {
    builder.cut(true);
  }

  return builder.build();
}

/**
 * Builds a complete binary ESC/POS payload for a Customer Tax Invoice / Bill.
 * Strictly includes finalized items only (no cancelled or void items).
 */
export function buildReceiptEscPos(
  order: any, 
  shop: any, 
  options: { 
    paperWidth?: '80mm' | '58mm'; 
    cutPaper?: boolean;
    customItems?: any[];
    receiptTitle?: string;
    isNewOnly?: boolean;
  } = {}
): Uint8Array {
  const is58mm = options.paperWidth === '58mm';
  const colWidth = is58mm ? 32 : 42;
  const builder = new EscPosBuilder();
  const currencySymbol = (!shop?.settings?.currency || shop?.settings?.currency === '$') ? 'Rs' : shop.settings.currency;

  const isNewOnly = Boolean(options.isNewOnly || (options.customItems && options.customItems.length > 0));
  const receiptTitle = options.receiptTitle || (isNewOnly ? 'TAX INVOICE (NEW ITEMS)' : 'TAX INVOICE');

  // 1. Shop Header
  builder.alignCenter().bold(true);
  const shopName = (shop?.name || 'STORE RECEIPT').toUpperCase();
  builder.textLine(shopName);
  builder.bold(false);

  if (shop?.description) {
    builder.textLine(shop.description);
  }

  const addressLines = (shop?.address || '')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);
  for (const line of addressLines) {
    builder.textLine(line);
  }

  if (shop?.phone) {
    builder.textLine(`Ph: ${shop.phone}`);
  }
  if (shop?.settings?.gstin || shop?.gstin) {
    builder.bold(true).textLine(`GSTIN: ${shop?.settings?.gstin || shop?.gstin}`).bold(false);
  }
  if (shop?.settings?.fssai_license) {
    builder.textLine(`FSSAI Lic: ${shop.settings.fssai_license}`);
  }

  builder.separator('=', colWidth);
  builder.bold(true).textLine(receiptTitle).bold(false);
  if (isNewOnly) {
    builder.textLine('* RUNNING ADDITIONS ONLY *');
  }
  builder.separator('=', colWidth);

  // 2. Metadata
  builder.alignLeft();
  const billNo = `INV-${new Date(order?.created_at || Date.now()).getFullYear()}-${order?.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}`;
  const now = new Date(order?.created_at || Date.now());
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  builder.twoColumn('Bill No:', billNo, colWidth);
  builder.twoColumn('Date:', dateStr, colWidth);
  builder.twoColumn('Customer:', order?.customer_name || 'Walk-in', colWidth);
  if (order?.customer_phone) {
    builder.twoColumn('Mobile:', order.customer_phone, colWidth);
  }

  const orderTypeLabel = order?.order_type === 'dine_in'
    ? (order?.table_number ? `Dine-in (Table #${order.table_number})` : 'Dine-in')
    : order?.order_type === 'takeaway'
      ? 'Takeaway'
      : 'Delivery';
  builder.twoColumn('Type:', orderTypeLabel, colWidth);

  builder.separator('-', colWidth);
  builder.bold(true);
  builder.twoColumn('ITEM', 'AMOUNT', colWidth);
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
  const discountAmount = isNewOnly ? 0 : Math.max(0, subtotal - totalAmount);

  // 4. Totals and Summary
  builder.separator('-', colWidth);
  builder.twoColumn(`Items: ${items.length}`, `Units: ${totalUnits}`, colWidth);
  builder.separator('-', colWidth);

  builder.twoColumn('Subtotal:', subtotal.toFixed(2), colWidth);
  if (discountAmount > 0) {
    builder.twoColumn('Discount:', `-${discountAmount.toFixed(2)}`, colWidth);
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
      cgst = Math.round((taxable * (cgstRate / 100)) * 100) / 100;
      sgst = Math.round((taxable * (sgstRate / 100)) * 100) / 100;
      totalTax = Math.round((cgst + sgst) * 100) / 100;

      const orderAmountNum = Number(order?.total_amount || 0);
      if (!isNewOnly && orderAmountNum >= taxable + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((taxable + totalTax) * 100) / 100;
      }
    }

    builder.separator('-', colWidth);
    builder.twoColumn('Taxable Turnover:', taxable.toFixed(2), colWidth);
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
  builder.twoColumn('TOTAL', `${currencySymbol} ${finalBillTotal.toFixed(2)}`, colWidth);
  builder.bold(false);
  builder.separator('=', colWidth);

  const payMethod = (order?.payment_method || 'CASH').toUpperCase();
  const payStatus = ((order?.payment_status || 'PENDING') === 'paid' ? 'PAID' : (order?.payment_status || 'PENDING')).toUpperCase();
  builder.twoColumn(payMethod, payStatus, colWidth);

  if (discountAmount > 0) {
    builder.separator('-', colWidth);
    builder.alignCenter().bold(true);
    builder.textLine(`SAVED ${currencySymbol} ${discountAmount.toFixed(2)} ON THIS BILL`);
    builder.bold(false).alignLeft();
  }

  // 5. Footer & Paper Cut
  builder.separator('-', colWidth);
  builder.feed(1);
  builder.alignCenter();
  builder.textLine('Thank you for ordering with us!');
  if (shop?.settings?.tax_invoice_notes) {
    builder.textLine(shop.settings.tax_invoice_notes);
  }
  builder.textLine('Goods once sold are not returnable');
  builder.textLine('without this receipt.');
  builder.bold(true).textLine('*** Visit again ***').bold(false);

  if (options.cutPaper !== false) {
    builder.cut(true);
  }

  return builder.build();
}
