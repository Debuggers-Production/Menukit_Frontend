import { useState, useEffect } from 'react';
import { Printer, Copy, Check, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  formatReceiptDateTime, 
  printBillToAllPrinters,
  printThermalReceipt,
  isNewlyAddedItem,
} from '@/utils/thermalPrinter';
import { usePrinterStore } from '@/store/usePrinterStore';

interface ThermalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  shop: any | null;
  initialMode?: 'all' | 'new_only';
}

export function ThermalBillModal({ isOpen, onClose, order, shop, initialMode }: ThermalBillModalProps) {
  const { billingPrinter, billingPrinters, billingPaperWidth } = usePrinterStore();
  const activePrinters = (billingPrinters && billingPrinters.length > 0)
    ? billingPrinters.filter(p => p.enabled !== false)
    : [billingPrinter];

  // Visual receipt preview paper width from settings / registered printers
  const paperWidth: '80mm' | '58mm' = (activePrinters[0]?.paperWidth || billingPaperWidth) === '58mm' ? '58mm' : '80mm';
  const is58mm = paperWidth === '58mm';
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active (non-cancelled) items
  const allActiveItems = (order?.items || []).filter((it: any) => !it.is_cancelled);
  // Newly added items (running additions, unserved additions, or later items)
  const newlyAddedItems = allActiveItems.filter((it: any) => isNewlyAddedItem(it, order));
  const hasNewlyAdded = newlyAddedItems.length > 0 && newlyAddedItems.length < allActiveItems.length;

  const [printMode, setPrintMode] = useState<'all' | 'new_only'>(() => {
    if (initialMode) return initialMode;
    return hasNewlyAdded ? 'new_only' : 'all';
  });

  useEffect(() => {
    if (initialMode) {
      setPrintMode(initialMode);
    } else if (hasNewlyAdded) {
      setPrintMode('new_only');
    } else {
      setPrintMode('all');
    }
  }, [order?.id, initialMode, hasNewlyAdded]);

  if (!order) return null;

  const isNewOnlyMode = printMode === 'new_only' && hasNewlyAdded;
  // If newly added mode is active, ONLY include the newly added items, omitting previous items!
  const items = isNewOnlyMode ? newlyAddedItems : allActiveItems;

  const { full: formattedDateTime } = formatReceiptDateTime(order.created_at);
  const billNo = `INV-${new Date(order.created_at || Date.now()).getFullYear()}-${order.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}`;
  const currencySymbol = (!shop?.settings?.currency || shop?.settings?.currency === '$') ? 'Rs' : shop.settings.currency;
  
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalItems = items.length;

  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const rawTotalAmount = isNewOnlyMode ? subtotal : Number(order.total_amount ?? subtotal);
  const discountAmount = isNewOnlyMode ? 0 : Math.max(0, subtotal - rawTotalAmount);
  const receiptTitle = isNewOnlyMode ? 'TAX INVOICE (NEW ITEMS)' : 'TAX INVOICE';

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
  let finalBillTotal = rawTotalAmount;

  if (isGstEnabled && totalTaxRate > 0) {
    if (isInclusive) {
      finalBillTotal = rawTotalAmount;
      taxableValue = Math.round((finalBillTotal / (1 + totalTaxRate / 100)) * 100) / 100;
      totalTax = Math.round((finalBillTotal - taxableValue) * 100) / 100;
      cgstAmount = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      sgstAmount = Math.round((totalTax - cgstAmount) * 100) / 100;
    } else {
      // EXCLUSIVE: Tax is added on top of food subtotal
      taxableValue = Math.max(0, subtotal - discountAmount);
      cgstAmount = Math.round((taxableValue * (cgstRate / 100)) * 100) / 100;
      sgstAmount = Math.round((taxableValue * (sgstRate / 100)) * 100) / 100;
      totalTax = Math.round((cgstAmount + sgstAmount) * 100) / 100;

      const orderAmountNum = Number(order.total_amount || 0);
      if (!isNewOnlyMode && orderAmountNum >= taxableValue + totalTax - 0.05) {
        finalBillTotal = orderAmountNum;
      } else {
        finalBillTotal = Math.round((taxableValue + totalTax) * 100) / 100;
      }
    }
  }

  const orderTypeLabel = order.order_type === 'dine_in' 
    ? (order.table_number ? `Dine-in (Table #${order.table_number})` : 'Dine-in')
    : order.order_type === 'takeaway' 
      ? 'Takeaway' 
      : 'Online / Delivery';

  const addressLines = (shop?.address || '')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printBillToAllPrinters(order, shop, activePrinters, { 
        paperWidth,
        customItems: items,
        receiptTitle,
        isNewOnly: isNewOnlyMode,
      });
    } catch (e) {
      console.error('Print bill failed:', e);
      toast.error('Failed to print bill');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemBrowserPrint = async () => {
    setIsPrinting(true);
    try {
      await printThermalReceipt(order, shop, { 
        paperWidth,
        customItems: items,
        receiptTitle,
        isNewOnly: isNewOnlyMode,
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to open system print dialog');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyText = () => {
    const itemsText = items.map((it: any) => {
      let line = `• ${it.name} x${it.quantity} - ${currencySymbol} ${(it.price * it.quantity).toFixed(2)}`;
      if (it.variant_info) {
        try {
          const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
          const vStr = Object.values(v).join(', ');
          line += ` (${vStr})`;
        } catch {}
      }
      return line;
    }).join('\n');

    let gstText = '';
    if (isGstEnabled && totalTaxRate > 0) {
      gstText = `--------------------------------\n` +
        `Taxable Turnover: ${taxableValue.toFixed(2)}\n` +
        `CGST (${cgstRate}%): ${cgstAmount.toFixed(2)}\n` +
        `SGST (${sgstRate}%): ${sgstAmount.toFixed(2)}\n` +
        (isInclusive ? `(Prices include GST)\n` : `(Exclusive: Tax added on items)\n`);
    }

    const billText = `🧾 ${shop?.name || 'SHOP'} - ${receiptTitle}\n` +
      (isNewOnlyMode ? `*** RUNNING ADDITIONS ONLY ***\n` : '') +
      `Bill No: ${billNo}\n` +
      `Date: ${formattedDateTime}\n` +
      `--------------------------------\n` +
      `Customer: ${order.customer_name || 'Walk-in'}\n` +
      (order.customer_phone ? `Phone: ${order.customer_phone}\n` : '') +
      `Type: ${orderTypeLabel}\n` +
      `--------------------------------\n` +
      `ITEMS (${isNewOnlyMode ? 'NEW ADDITIONS' : 'FINALIZED'}):\n${itemsText}\n` +
      `--------------------------------\n` +
      `Subtotal: ${currencySymbol} ${subtotal.toFixed(2)}\n` +
      (discountAmount > 0 ? `Discount: -${currencySymbol} ${discountAmount.toFixed(2)}\n` : '') +
      gstText +
      `TOTAL: ${currencySymbol} ${finalBillTotal.toFixed(2)}\n` +
      `Payment: ${order.payment_method?.toUpperCase()} (${order.payment_status?.toUpperCase()})\n` +
      `--------------------------------\n` +
      `Thank you for ordering with us!`;

    navigator.clipboard.writeText(billText);
    setCopied(true);
    toast.success(isNewOnlyMode ? 'New items bill text copied!' : 'Final bill text copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thermal Bill Receipt"
      className="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {/* Controls Toolbar: Clean Target Status & Print Action */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 min-w-0">
            <Printer size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {activePrinters.length > 1
                  ? `Sending to all ${activePrinters.length} registered cashier printers`
                  : `Target: ${activePrinters[0]?.name || 'Cashier Printer'}`}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyText}
              className="text-xs h-9 px-3"
              title="Copy bill text"
            >
              {copied ? <Check size={14} className="text-emerald-500 mr-1" /> : <Copy size={14} className="mr-1" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              isLoading={isPrinting}
              leftIcon={<Printer size={15} />}
              className="text-xs font-bold h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              title={activePrinters.length > 1 ? `Print bill to all ${activePrinters.length} registered printers` : `Print bill to ${activePrinters[0]?.name || 'Cashier Printer'}`}
            >
              {isNewOnlyMode ? 'Print New Items' : 'Print Bill'}
            </Button>
          </div>
        </div>

        {/* If Order has Newly Added Items: Mode Toggle Banner */}
        {hasNewlyAdded && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="font-extrabold text-xs text-amber-900 dark:text-amber-200">
                  Running Additions Detected
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300">
                  {newlyAddedItems.length} newly added item(s) on this running order
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white dark:bg-slate-900 p-1 rounded-xl border border-amber-300 dark:border-amber-800 shadow-2xs">
              <button
                type="button"
                onClick={() => setPrintMode('new_only')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  isNewOnlyMode
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
                }`}
              >
                ✨ New Items Only ({newlyAddedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  !isNewOnlyMode
                    ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Full Bill ({allActiveItems.length})
              </button>
            </div>
          </div>
        )}

        {/* Thermal Receipt Visual Preview Container (Block scroll to prevent flex overflow clipping) */}
        <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[60vh]">
          <div
            id="thermal-receipt-preview-content"
            style={{
              width: is58mm ? '240px' : '310px',
              fontFamily: "'Courier New', Courier, 'Lucida Console', Monaco, monospace",
            }}
            className="mx-auto bg-white text-black p-5 sm:p-6 shadow-xl border border-slate-300 rounded-sm select-text transition-all duration-200"
          >
            {/* Shop Logo */}
            {shop?.logo_url && (
              <div className="flex justify-center mb-2.5">
                <img
                  src={shop.logo_url}
                  alt={shop.name || 'Shop Logo'}
                  className="max-h-14 max-w-[130px] object-contain filter grayscale contrast-125 mx-auto block"
                />
              </div>
            )}

            {/* Shop Header Info */}
            <div className="text-center">
              <h2 className="font-black text-sm uppercase tracking-wide leading-tight text-black">
                {shop?.name || 'STORE RECEIPT'}
              </h2>
              {shop?.description && (
                <p className="text-[10px] text-slate-700 mt-0.5">{shop.description}</p>
              )}
              {addressLines.map((line: string, idx: number) => (
                <p key={idx} className="text-[10px] text-slate-800 leading-tight">
                  {line}
                </p>
              ))}
              {shop?.phone && (
                <p className="text-[10px] text-slate-800">Ph: {shop.phone}</p>
              )}
              {shop?.whatsapp && shop.whatsapp !== shop.phone && (
                <p className="text-[10px] text-slate-800">WhatsApp: {shop.whatsapp}</p>
              )}
              {(shop?.settings?.gstin || shop?.gstin) && (
                <p className="text-[10px] font-bold text-slate-900 mt-0.5">
                  GSTIN: {shop?.settings?.gstin || shop?.gstin}
                </p>
              )}
              {shop?.settings?.fssai_license && (
                <p className="text-[10px] text-slate-800">
                  FSSAI Lic: {shop.settings.fssai_license}
                </p>
              )}
            </div>

            {/* Tax Invoice Header */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="text-center font-black text-xs uppercase tracking-widest py-0.5">
              {receiptTitle}
            </div>
            {isNewOnlyMode && (
              <div className="text-center text-[9px] font-black tracking-wider uppercase text-black">
                * RUNNING ADDITIONS ONLY *
              </div>
            )}
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Meta Information */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill No</span>
                <span className="font-bold">{billNo}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span>{formattedDateTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer</span>
                <span className="font-bold">{order.customer_name || 'Walk-in'}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between">
                  <span>Mobile</span>
                  <span className="font-bold">{order.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Type</span>
                <span>{orderTypeLabel}</span>
              </div>
              {order.delivery_address && (
                <div className="pt-0.5 text-[10px]">
                  <span>Delivery Address:</span>
                  <p className="font-bold break-words">{order.delivery_address.replace(/\s*\[loc=.*?\]/, '')}</p>
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="flex justify-between text-[11px] font-black">
              <span>ITEM</span>
              <span>AMOUNT</span>
            </div>
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Finalized Items List ONLY */}
            <div className="space-y-2.5 text-[11px]">
              {items.map((it: any, idx: number) => {
                let variantLabel: string | null = null;
                if (it.variant_info) {
                  try {
                    const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
                    const parts = Object.values(v);
                    if (parts.length > 0) variantLabel = parts.join(', ');
                  } catch {}
                }

                return (
                  <div key={idx}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold break-words leading-tight">{it.name}</span>
                    </div>
                    {variantLabel && (
                      <div className="text-[9.5px] text-slate-700">({variantLabel})</div>
                    )}
                    <div className="flex justify-between text-[10.5px]">
                      <span>{it.quantity} pc x {Number(it.price).toFixed(2)}</span>
                      <span className="font-bold">{(it.quantity * it.price).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Units & Items summary */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="flex justify-between text-[11px]">
              <span>Items: {totalItems}</span>
              <span>Units: {totalUnits}</span>
            </div>
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Subtotal & Discounts */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* GST Breakdown */}
            {isGstEnabled && totalTaxRate > 0 && (
              <>
                <div className="border-t border-dashed border-black my-2" />
                <div className="text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span>Taxable Turnover:</span>
                    <span>{taxableValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST ({cgstRate}%):</span>
                    <span>{cgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST ({sgstRate}%):</span>
                    <span>{sgstAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-[9.5px] italic text-slate-700 pt-0.5">
                    {isInclusive ? '(Prices include GST)' : '(Exclusive: Tax added on items)'}
                  </div>
                </div>
              </>
            )}

            {/* Grand Total */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="flex justify-between items-center text-sm font-black py-0.5">
              <span>TOTAL</span>
              <span>{currencySymbol} {finalBillTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-dashed border-black my-2.5" />

            {/* Payment Method & Status */}
            <div className="flex justify-between text-[11px] uppercase">
              <span>{order.payment_method || 'CASH'}</span>
              <span className="font-bold">
                {(order.payment_status || 'PENDING') === 'paid' ? 'PAID' : (order.payment_status || 'PENDING')}
              </span>
            </div>

            {/* Savings Callout */}
            {discountAmount > 0 && (
              <div className="border border-dashed border-black p-1.5 text-center font-bold text-[11px] my-2.5">
                SAVED {currencySymbol} {discountAmount.toFixed(2)} ON THIS BILL
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="text-center text-[10px] space-y-0.5 text-slate-800 leading-tight pt-1">
              <div>Thank you for ordering with us!</div>
              <div className="text-[9px]">Goods once sold are not returnable without this receipt.</div>
              <div className="font-bold text-[11px] pt-1.5">*** Visit again ***</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button
            variant="secondary"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
          <Button
            onClick={handlePrint}
            isLoading={isPrinting}
            leftIcon={<Printer size={15} />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 cursor-pointer"
          >
            {isNewOnlyMode 
              ? (activePrinters.length > 1 ? `Print New Items (${activePrinters.length} Printers)` : 'Print New Items')
              : (activePrinters.length > 1 ? `Print Bill (${activePrinters.length} Printers)` : 'Print Bill')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
