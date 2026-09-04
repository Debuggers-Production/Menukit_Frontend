import { useState } from 'react';
import { Printer, Download, Copy, Check, X, Smartphone, Receipt } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  formatReceiptDateTime, 
  printThermalReceipt, 
  generateThermalReceiptHtml 
} from '@/utils/thermalPrinter';

interface ThermalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  shop: any | null;
}

export function ThermalBillModal({ isOpen, onClose, order, shop }: ThermalBillModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const { full: formattedDateTime } = formatReceiptDateTime(order.created_at);
  const billNo = `INV-${new Date(order.created_at || Date.now()).getFullYear()}-${order.id ? order.id.slice(0, 8).toUpperCase() : '00000000'}`;
  const currencySymbol = (!shop?.settings?.currency || shop?.settings?.currency === '$') ? 'Rs' : shop.settings.currency;
  
  const items = order.items || [];
  const totalUnits = items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
  const totalItems = items.length;

  const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const totalAmount = Number(order.total_amount ?? subtotal);
  const discountAmount = Math.max(0, subtotal - totalAmount);

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
    const toastId = toast.loading('Preparing print...');
    try {
      await printThermalReceipt(order, shop, { paperWidth });
      toast.success('Print dialog opened', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to open print dialog', { id: toastId });
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

    const billText = `🧾 ${shop?.name || 'SHOP'} - TAX INVOICE\n` +
      `Bill No: ${billNo}\n` +
      `Date: ${formattedDateTime}\n` +
      `--------------------------------\n` +
      `Customer: ${order.customer_name || 'Walk-in'}\n` +
      (order.customer_phone ? `Phone: ${order.customer_phone}\n` : '') +
      `Type: ${orderTypeLabel}\n` +
      `--------------------------------\n` +
      `ITEMS:\n${itemsText}\n` +
      `--------------------------------\n` +
      `TOTAL: ${currencySymbol} ${totalAmount.toFixed(2)}\n` +
      `Payment: ${order.payment_method?.toUpperCase()} (${order.payment_status?.toUpperCase()})\n` +
      `--------------------------------\n` +
      `Thank you for ordering with us!`;

    navigator.clipboard.writeText(billText);
    setCopied(true);
    toast.success('Bill text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const is58mm = paperWidth === '58mm';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thermal Bill Receipt"
      className="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          {/* Paper Width Selector */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Paper:</span>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                paperWidth === '80mm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              80mm (Standard)
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                paperWidth === '58mm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              58mm (Mini)
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyText}
              className="text-xs h-8 px-2.5"
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
              className="text-xs font-bold h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              Print Bill
            </Button>
          </div>
        </div>

        {/* Thermal Receipt Visual Preview Container (Block scroll to prevent flex overflow clipping) */}
        <div className="w-full bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[62vh]">
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
            </div>

            {/* Tax Invoice Header */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="text-center font-black text-xs uppercase tracking-widest py-0.5">
              TAX INVOICE
            </div>
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

            {/* Items List */}
            <div className="space-y-2 text-[11px]">
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
                    <div className="font-bold break-words leading-tight">{it.name}</div>
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

            {/* Grand Total */}
            <div className="border-t border-dashed border-black my-2.5" />
            <div className="flex justify-between items-center text-sm font-black py-0.5">
              <span>TOTAL</span>
              <span>{currencySymbol} {totalAmount.toFixed(2)}</span>
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
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
          >
            Print to Thermal Printer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
