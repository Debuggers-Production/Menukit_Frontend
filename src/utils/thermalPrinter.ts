/**
 * Utility for rendering and printing thermal receipt bills (58mm & 80mm POS printers).
 */

export interface ThermalPrintOptions {
  paperWidth?: '80mm' | '58mm';
  autoPrint?: boolean;
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
  
  const items = order?.items || [];
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalItems = items.length;

  // Calculate items subtotal
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const totalAmount = Number(order?.total_amount ?? subtotal);
  const discountAmount = Math.max(0, subtotal - totalAmount);

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
        const parts = Object.entries(v).map(([k, val]) => `${val}`);
        if (parts.length > 0) {
          variantDetails = `<div style="font-size: 10px; color: #333; margin-left: 2px;">(${parts.join(', ')})</div>`;
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
    </div>

    <!-- Invoice Header -->
    <div class="dashed-line"></div>
    <div class="text-center invoice-title">TAX INVOICE</div>
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

    <!-- Total -->
    <div class="dashed-line"></div>
    <div class="grand-total-row">
      <span>TOTAL</span>
      <span>${currencySymbol} ${totalAmount.toFixed(2)}</span>
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

      // Create an invisible iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) {
        throw new Error('Unable to access print frame document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (e) {
          console.error('Print execution error:', e);
          resolve(false);
        } finally {
          // Cleanup iframe after a short delay
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 2000);
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
