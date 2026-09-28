import { formatReceiptDateTime } from './thermalPrinter';

/**
 * Converts numbers to Indian English Words for standard Invoice totals
 */
function numberToWords(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return 'Zero Rupees Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num: number): string {
    if (num === 0) return '';
    if (num < 10) return singleDigits[num];
    if (num < 20) return teens[num - 10];
    const unit = num % 10;
    return tens[Math.floor(num / 10)] + (unit ? ' ' + singleDigits[unit] : '');
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let res = '';
    if (hundred > 0) res += singleDigits[hundred] + ' Hundred';
    if (rest > 0) res += (res ? ' ' : '') + convertTwoDigits(rest);
    return res;
  }

  let num = rounded;
  let words = '';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundredAndBelow = num;

  if (crore > 0) words += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) words += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += convertTwoDigits(thousand) + ' Thousand ';
  if (hundredAndBelow > 0) words += convertThreeDigits(hundredAndBelow);

  return (words.trim() ? words.trim() + ' Rupees Only' : 'Zero Rupees Only');
}

/**
 * Generates official A4 Tax Invoice HTML for an order
 */
export function generateOrderA4InvoiceHtml(order: any, shop: any): string {
  const currencySymbol = (!shop?.settings?.currency || shop?.settings?.currency === '$') ? '₹' : shop.settings.currency;
  const items = (order?.items || []).filter((it: any) => !it.is_cancelled);
  
  const { full: formattedDateTime } = formatReceiptDateTime(order?.created_at);
  const invoiceNo = `INV-${new Date(order?.created_at || Date.now()).getFullYear()}-${order?.id ? String(order.daily_order_number || order.id.slice(0, 8)).toUpperCase() : '00000000'}`;
  
  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const totalAmount = Number(order?.total_amount ?? subtotal);
  const discountAmount = Math.max(0, subtotal - totalAmount);

  // GST Calculations
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isInclusive = Boolean(shop?.settings?.inclusive_tax);

  let taxableValue = subtotal;
  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let finalBillTotal = totalAmount;

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      finalBillTotal = totalAmount;
      taxableValue = Math.round((finalBillTotal / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((finalBillTotal - taxableValue) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    } else {
      taxableValue = Math.max(0, subtotal - discountAmount);
      totalTax = Math.round((taxableValue * (totalTaxRate / 100)) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
      finalBillTotal = Math.round((taxableValue + totalTax) * 100) / 100;
    }
  }

  const orderType = String(order?.order_type || 'Dine-In').toUpperCase().replace(/_/g, ' ');
  const tableOrToken = order?.table_number ? `Table ${order.table_number}` : (order?.token_number ? `Token #${order.token_number}` : 'Counter');
  const paymentMethod = String(order?.payment_method || 'CASH').toUpperCase();
  const paymentStatus = String(order?.payment_status || 'PAID').toUpperCase();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tax Invoice - ${invoiceNo}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      padding: 30px 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04);
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .shop-brand {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }
    .shop-details {
      font-size: 12px;
      color: #475569;
      max-width: 380px;
      line-height: 1.4;
    }
    .invoice-badge-box {
      text-align: right;
    }
    .invoice-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .invoice-sub {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }
    .gstin-tag {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
      color: #1e293b;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .meta-col label {
      display: block;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-col span {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .table-container {
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 11px;
      padding: 10px 14px;
      text-align: left;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .item-name {
      font-weight: 700;
      color: #0f172a;
    }
    .item-notes {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 30px;
      border-top: 2px solid #f1f5f9;
      padding-top: 20px;
      margin-bottom: 24px;
    }
    .words-box {
      flex: 1;
      font-size: 12px;
      color: #475569;
    }
    .words-box strong {
      color: #0f172a;
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 0;
      border-bottom: none;
      font-size: 12.5px;
    }
    .grand-total-row td {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      padding: 10px 0;
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .tax-breakdown-box {
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 11.5px;
    }
    .tax-breakdown-box strong {
      font-size: 11px;
      text-transform: uppercase;
      color: #475569;
      display: block;
      margin-bottom: 6px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
      color: #64748b;
    }
    .terms-box {
      max-width: 460px;
      line-height: 1.4;
    }
    .sign-box {
      text-align: center;
      min-width: 160px;
    }
    .sign-line {
      border-top: 1px solid #94a3b8;
      margin-top: 45px;
      padding-top: 4px;
      font-weight: 700;
      color: #1e293b;
    }
    .print-bar {
      margin-bottom: 20px;
      text-align: right;
    }
    .print-btn {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .invoice-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
      .print-bar {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save PDF</button>
  </div>

  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div style="display: flex; align-items: center; gap: 16px;">
        ${shop?.logo_url ? `<img src="${shop.logo_url}" alt="${shop.name || 'Logo'}" style="width: 64px; height: 64px; border-radius: 12px; object-fit: cover; border: 1px solid #cbd5e1; flex-shrink: 0;" />` : ''}
        <div>
          <div class="shop-brand">${shop?.name || 'Store / Merchant'}</div>
          <div class="shop-details">
            ${shop?.address ? `<div>${shop.address}</div>` : ''}
            ${shop?.phone ? `<div>Phone: ${shop.phone}</div>` : ''}
            ${shop?.email ? `<div>Email: ${shop.email}</div>` : ''}
            ${shop?.settings?.fssai_number ? `<div style="margin-top: 2px;"><strong>FSSAI:</strong> ${shop.settings.fssai_number}</div>` : ''}
          </div>
        </div>
      </div>
      <div class="invoice-badge-box">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-sub">${invoiceNo}</div>
        ${shop?.settings?.gstin_number ? `<div class="gstin-tag">GSTIN: ${shop.settings.gstin_number}</div>` : ''}
      </div>
    </div>

    <!-- Meta Details Grid -->
    <div class="meta-grid">
      <div class="meta-col">
        <label>Invoice Date &amp; Time</label>
        <span>${formattedDateTime}</span>
      </div>
      <div class="meta-col">
        <label>Order Type &amp; Channel</label>
        <span>${orderType} &bull; ${tableOrToken}</span>
      </div>
      <div class="meta-col">
        <label>Customer Details</label>
        <span>${order?.customer_name || 'Walk-in Customer'} ${order?.customer_phone ? `(${order.customer_phone})` : ''}</span>
      </div>
      <div class="meta-col">
        <label>Payment Mode &amp; Status</label>
        <span>${paymentMethod} &bull; <strong style="color: #059669;">${paymentStatus}</strong></span>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="text-center" style="width: 40px;">#</th>
            <th>Item Description</th>
            <th class="text-center" style="width: 70px;">Qty</th>
            <th class="text-right" style="width: 100px;">Rate (${currencySymbol})</th>
            <th class="text-right" style="width: 110px;">Amount (${currencySymbol})</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it: any, index: number) => {
            const qty = it.quantity || 1;
            const price = Number(it.price || 0);
            const amt = (qty * price).toFixed(2);
            return `
              <tr>
                <td class="text-center" style="color: #64748b;">${index + 1}</td>
                <td>
                  <div class="item-name">${it.name || it.item_name || 'Item'}</div>
                  ${it.selected_variant ? `<div class="item-notes">Variant: ${it.selected_variant.name || it.selected_variant}</div>` : ''}
                  ${it.special_instructions ? `<div class="item-notes">Note: ${it.special_instructions}</div>` : ''}
                </td>
                <td class="text-center font-bold">${qty}</td>
                <td class="text-right">${price.toFixed(2)}</td>
                <td class="text-right font-bold">${amt}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Summary & Totals -->
    <div class="summary-section">
      <div class="words-box">
        <strong>Amount in Words:</strong>
        <div>${numberToWords(finalBillTotal)}</div>
        ${isGstEnabled && totalTaxRate > 0 ? `
          <div style="margin-top: 10px; font-size: 11px; color: #64748b;">
            Taxable Value: ${currencySymbol} ${taxableValue.toFixed(2)} | CGST (${cgstRate}%): ${currencySymbol} ${cgstAmount.toFixed(2)} | SGST (${sgstRate}%): ${currencySymbol} ${sgstAmount.toFixed(2)}
          </div>
        ` : ''}
      </div>

      <table class="totals-table">
        <tbody>
          <tr>
            <td style="color: #475569;">Subtotal:</td>
            <td class="text-right font-bold">${currencySymbol} ${subtotal.toFixed(2)}</td>
          </tr>
          ${discountAmount > 0 ? `
            <tr style="color: #16a34a;">
              <td>Discount Applied:</td>
              <td class="text-right font-bold">- ${currencySymbol} ${discountAmount.toFixed(2)}</td>
            </tr>
          ` : ''}
          ${isGstEnabled && totalTaxRate > 0 ? `
            <tr>
              <td style="color: #475569;">CGST (${cgstRate}%):</td>
              <td class="text-right font-bold">${currencySymbol} ${cgstAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="color: #475569;">SGST (${sgstRate}%):</td>
              <td class="text-right font-bold">${currencySymbol} ${sgstAmount.toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr class="grand-total-row">
            <td>GRAND TOTAL:</td>
            <td class="text-right">${currencySymbol} ${finalBillTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="terms-box">
        <strong>Terms &amp; Conditions:</strong>
        <div>${shop?.settings?.tax_invoice_notes || 'Goods once sold are not returnable without this receipt. Thank you for your business!'}</div>
      </div>
      <div class="sign-box">
        <div class="sign-line">Authorized Signatory</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}

/**
 * Opens and prints an A4 Tax Invoice for an order
 */
export function printOrderA4Invoice(order: any, shop: any): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const htmlContent = generateOrderA4InvoiceHtml(order, shop);

      // Create a hidden iframe with geometry for reliable cross-browser printing
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
        setTimeout(triggerPrint, 2500); // Fallback timeout
      } else {
        setTimeout(triggerPrint, 350);
      }
    } catch (err) {
      console.error('Failed to print A4 invoice:', err);
      resolve(false);
    }
  });
}
