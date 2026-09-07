import { useState } from 'react';
import { Printer, Download, Copy, Check, Flame, AlertOctagon, UtensilsCrossed } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { 
  formatReceiptDateTime, 
  printThermalKot, 
  printOrderToStations,
  generateKotText,
  getKotInvocationItems 
} from '@/utils/thermalPrinter';
import { usePrinterStore } from '@/store/usePrinterStore';
import { useShopStore } from '@/store/shopStore';

interface ThermalKotModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  shop: any | null;
  initialMode?: 'full' | 'new_only' | 'cancelled';
}

export function ThermalKotModal({ 
  isOpen, 
  onClose, 
  order, 
  shop,
  initialMode = 'full'
}: ThermalKotModalProps) {
  const storePaperWidth = usePrinterStore((s) => s.paperWidth);
  const markOrderKotPrinted = usePrinterStore((s) => s.markOrderKotPrinted);
  const stations = usePrinterStore((s) => s.stations);
  const menuItems = useShopStore((s) => s.menuItems);
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(storePaperWidth || '80mm');
  const [invocationMode, setInvocationMode] = useState<'full' | 'new_only' | 'cancelled'>(initialMode);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!order) return null;

  const rawId = order.id ? order.id.slice(0, 8).toUpperCase() : '00000000';
  const kotNo = `KOT-${new Date(order.created_at || Date.now()).getFullYear()}-${rawId}`;
  const { full: formattedDateTime } = formatReceiptDateTime(order.created_at);

  const allItems = order.items || [];
  const activeItems = allItems.filter((it: any) => !it.is_cancelled);
  const newItems = allItems.filter((it: any) => !it.is_completed && !it.is_cancelled);
  const cancelledItems = allItems.filter((it: any) => Boolean(it.is_cancelled));

  const currentItems = getKotInvocationItems(order, invocationMode);
  const totalUnits = currentItems.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);

  const orderTypeLabel = order.order_type === 'dine_in'
    ? (order.table_number ? `TABLE: ${order.table_number}` : 'DINE-IN')
    : order.order_type === 'takeaway'
      ? 'TAKEAWAY'
      : 'DELIVERY';

  const handlePrint = async () => {
    setIsPrinting(true);
    const toastId = toast.loading('Dispatching KOT to kitchen printer(s)...');
    try {
      const ok = await printOrderToStations(
        order,
        shop,
        menuItems,
        stations,
        paperWidth,
        invocationMode
      );
      if (ok) {
        markOrderKotPrinted(order.id);
        toast.success('KOT printed successfully', { id: toastId });
        onClose();
      } else {
        toast.error('Print canceled or printer unavailable', { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to print KOT', { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleCopyText = () => {
    const txt = generateKotText(order, shop, { invocationMode, kotNumber: kotNo });
    navigator.clipboard.writeText(txt);
    setCopied(true);
    toast.success('KOT text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportSlip = () => {
    const txt = generateKotText(order, shop, { invocationMode, kotNumber: kotNo });
    const cleanKot = kotNo.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `kot_slip_${cleanKot}_${Date.now()}.txt`;
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        a.remove();
        URL.revokeObjectURL(url);
      } catch {}
    }, 10000);
    toast.success(`KOT slip exported (${filename})`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kitchen Order Ticket (KOT)"
      className="max-w-xl"
    >
      <div className="space-y-4 pt-1">
        {/* Invocation Mode Selector Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 bg-slate-100 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setInvocationMode('full')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                invocationMode === 'full'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <UtensilsCrossed size={13} />
              <span>Full KOT ({activeItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setInvocationMode('new_only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                invocationMode === 'new_only'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Flame size={13} className={newItems.length > 0 ? 'text-amber-400' : ''} />
              <span>New Additions</span>
              {newItems.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-white font-black">
                  {newItems.length}
                </span>
              )}
            </button>

            {cancelledItems.length > 0 && (
              <button
                type="button"
                onClick={() => setInvocationMode('cancelled')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  invocationMode === 'cancelled'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <AlertOctagon size={13} />
                <span>Void Slip ({cancelledItems.length})</span>
              </button>
            )}
          </div>

          {/* Paper Width Selector */}
          <div className="flex items-center justify-end gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5">Width:</span>
            <button
              type="button"
              onClick={() => setPaperWidth('80mm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paperWidth === '80mm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPaperWidth('58mm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                paperWidth === '58mm'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              58mm
            </button>
          </div>
        </div>

        {/* Live Thermal Paper Preview */}
        <div className="flex justify-center p-3 sm:p-5 bg-slate-200 dark:bg-slate-950 rounded-2xl border border-slate-300 dark:border-slate-800 max-h-[55vh] overflow-y-auto">
          <div 
            style={{ width: paperWidth === '58mm' ? '280px' : '360px' }}
            className="bg-white text-black p-4 sm:p-5 rounded-sm shadow-xl font-mono text-xs leading-relaxed border-t-4 border-slate-800 relative transition-all duration-200 select-text"
          >
            {/* Header Banner */}
            <div className={`p-1.5 text-center font-black text-xs uppercase tracking-wider rounded ${
              invocationMode === 'cancelled' 
                ? 'bg-rose-600 text-white' 
                : invocationMode === 'new_only' 
                  ? 'bg-emerald-700 text-white' 
                  : 'bg-black text-white'
            }`}>
              {invocationMode === 'cancelled' 
                ? '*** KOT: VOID / CANCELLED ***' 
                : invocationMode === 'new_only' 
                  ? '*** KOT: RUNNING (NEW ITEMS) ***' 
                  : '*** KITCHEN ORDER TICKET (KOT) ***'}
            </div>

            <div className="text-center font-black text-sm mt-2">
              {(shop?.name || 'RESTAURANT KITCHEN').toUpperCase()}
            </div>

            {/* Big Table / Type Banner */}
            <div className="my-2 p-2 bg-black text-white text-center font-black text-base tracking-wider rounded">
              {orderTypeLabel}
            </div>

            {/* Metadata */}
            <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 pb-2">
              <div className="flex justify-between font-bold">
                <span>KOT: {kotNo}</span>
                <span>Inv: #{rawId}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Time: {formattedDateTime}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Guest: {order.customer_name || 'Walk-in'}</span>
                {order.table_number && <span>Table: {order.table_number}</span>}
              </div>
            </div>

            {/* Column Header */}
            <div className="flex justify-between font-black text-[11px] py-1 border-b border-black mt-1">
              <span>[QTY] ITEM DESCRIPTION</span>
              <span>STATE</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-dashed divide-slate-300 py-1">
              {currentItems.length > 0 ? (
                currentItems.map((it: any, i: number) => {
                  const isVoid = Boolean(it.is_cancelled);
                  let variantText = '';
                  if (it.variant_info) {
                    try {
                      const v = typeof it.variant_info === 'string' ? JSON.parse(it.variant_info) : it.variant_info;
                      variantText = Object.values(v).join(', ');
                    } catch {}
                  }

                  return (
                    <div key={it.id || i} className="py-1.5 space-y-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                            isVoid ? 'bg-rose-600 text-white' : 'bg-black text-white'
                          }`}>
                            {it.quantity || 1}
                          </span>
                          <span className={`font-black text-xs ${isVoid ? 'line-through text-slate-500' : 'text-black'}`}>
                            {it.name}
                          </span>
                        </div>
                        {isVoid ? (
                          <span className="text-[10px] font-black text-rose-600 border border-rose-600 px-1 rounded">
                            VOID
                          </span>
                        ) : it.is_completed ? (
                          <span className="text-[10px] font-black text-emerald-700 border border-emerald-700 px-1 rounded">
                            DONE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-600">
                            NEW
                          </span>
                        )}
                      </div>

                      {variantText && (
                        <div className="text-[10px] font-bold text-slate-700 ml-6">
                          [{variantText}]
                        </div>
                      )}

                      {it.cancellation_reason && (
                        <div className="text-[10px] font-black text-rose-700 ml-6">
                          REASON: {it.cancellation_reason}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-4 text-center text-slate-400 italic text-[11px]">
                  No items found for this selection
                </div>
              )}
            </div>

            {/* Total Units Footer */}
            <div className="border-t-2 border-dashed border-black pt-2 flex justify-between font-black text-xs">
              <span>TOTAL ITEMS: {currentItems.length}</span>
              <span>TOTAL UNITS: {totalUnits}</span>
            </div>

            {invocationMode === 'cancelled' && (
              <div className="mt-3 p-2 bg-rose-50 border border-rose-600 text-rose-700 text-center font-black text-[10px] rounded">
                ⚠️ STOP PREPARATION IMMEDIATELY!
              </div>
            )}

            <div className="text-center text-[10px] text-slate-500 mt-3 pt-1 border-t border-slate-200">
              *** END OF KOT ***
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyText}
              className="text-xs h-9"
            >
              {copied ? <Check size={14} className="text-emerald-500 mr-1.5" /> : <Copy size={14} className="mr-1.5" />}
              <span>{copied ? 'Copied' : 'Copy Slip'}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSlip}
              className="text-xs h-9"
              title="Save slip as text file to Downloads"
            >
              <Download size={14} className="mr-1.5" />
              <span>Export Slip</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9"
            >
              Close
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              isLoading={isPrinting}
              className={`text-xs h-9 font-bold px-4 text-white shadow-md ${
                invocationMode === 'cancelled'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-primary hover:bg-primary-600'
              }`}
              leftIcon={<Printer size={15} />}
            >
              {invocationMode === 'cancelled' ? 'Print Void Slip' : 'Print KOT to Kitchen'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
