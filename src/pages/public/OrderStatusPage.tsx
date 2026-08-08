import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, CookingPot, CheckCircle2, Clock, XCircle, AlertCircle, CreditCard, Printer, Receipt, FileText, CheckCircle, ChefHat, Download, History } from 'lucide-react';
import { api } from '@/services/api';
import { Shop } from '@/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { QRCodeCanvas } from 'qrcode.react';

export const playChimeNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = audioCtx.currentTime;
    playNote(659.25, now, 0.25);
    playNote(880.00, now + 0.12, 0.35);
  } catch (e) {
    console.error("Failed to play notification sound", e);
  }
};

export function OrderStatusPage() {
  const { id, orderId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const statusRef = useRef<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isReceiptSheetOpen, setIsReceiptSheetOpen] = useState(false);

  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayOnline = async () => {
    setIsRedirecting(true);
    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error("Could not load payment gateway SDK. Please try again.");
        setIsRedirecting(false);
        return;
      }

      const res = await api.post(`/public/shop/${id}/orders/${orderId}/pay`);
      const payData = res.data;

      if (payData.mock_mode) {
        await api.post(`/public/shop/${id}/orders/${orderId}/verify`, {
          razorpay_order_id: payData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature'
        });
        toast.success("Payment successful! Order marked as paid.");
        setOrder((prev: any) => ({ ...prev, payment_status: 'paid' }));
        return;
      }

      const baseTotal = payData.base_total || (payData.amount / 100).toFixed(2);
      const platFee = payData.platform_fee || 0;
      const pgFee = payData.pg_fee || 0;
      const gstFee = payData.gst_on_fee || 0;
      const grandTotal = payData.grand_total || (payData.amount / 100).toFixed(2);

      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Restaurant Order',
        description: `Items: ₹${baseTotal} | Platform Fee: ₹${platFee} | PG Fee (3%): ₹${pgFee} | GST: ₹${gstFee} = ₹${grandTotal}`,
        order_id: payData.razorpay_order_id,
        notes: {
          "1_Items_Subtotal": `₹${baseTotal}`,
          "2_Platform_Fee_1%": `₹${platFee}`,
          "3_Payment_Gateway_Fee_3%": `₹${pgFee}`,
          "4_GST_on_Fee_18%": `₹${gstFee}`,
          "5_Grand_Total": `₹${grandTotal}`
        },
        handler: async (response: any) => {
          try {
            await api.post(`/public/shop/${id}/orders/${orderId}/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success("Payment successful! Order marked as paid.");
            setOrder((prev: any) => ({ ...prev, payment_status: 'paid' }));
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: order?.customer_name || '',
          contact: order?.customer_phone || ''
        },
        theme: { color: shop?.theme?.primary_color || '#f97316' },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error("Failed to initiate payment", err);
      toast.error(err.response?.data?.detail || "Failed to initiate online payment. Please try again.");
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleDownloadPDF = async () => {
    const toastId = toast.loading("Generating PDF bill receipt...");
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      // 1. Header
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text((shop?.name || "BILL RECEIPT").toUpperCase(), 74, 15, { align: "center" });

      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TAX INVOICE / BILL RECEIPT", 74, 20, { align: "center" });

      // Perforation line
      doc.setLineDashPattern([2, 1], 0);
      doc.setDrawColor(203, 213, 225);
      doc.line(10, 24, 138, 24);

      // 2. Metadata Block
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Bill ID: #${order.id.slice(0, 8).toUpperCase()}`, 12, 30);
      doc.text(`Channel: ${order.order_type.replace('_', ' ').toUpperCase()}`, 80, 30);
      doc.text(`Date   : ${new Date(order.created_at).toLocaleDateString()}`, 12, 35);
      doc.text(`Status : ${order.order_status.toUpperCase()}`, 80, 35);

      // Customer Contact
      doc.text(`Contact: ${order.customer_name} (${order.customer_phone})`, 12, 40);
      let nextY = 45;
      if (order.table_number) {
        doc.text(`Table  : ${order.table_number}`, 12, nextY);
        nextY += 5;
      }
      if (order.delivery_address) {
        doc.text(`Address: ${order.delivery_address.slice(0, 40)}`, 12, nextY);
        nextY += 5;
      }

      // Perforation line
      doc.line(10, nextY, 138, nextY);
      nextY += 6;

      // 3. Table Header
      doc.setFont("courier", "bold");
      doc.text("ITEMS ORDERED", 12, nextY);
      doc.text("QTY", 85, nextY);
      doc.text("AMOUNT", 115, nextY);
      nextY += 3;
      doc.line(10, nextY, 138, nextY);
      nextY += 5;

      // Items List
      doc.setFont("courier", "normal");
      order.items.forEach((it: any) => {
        doc.text(it.name.slice(0, 30), 12, nextY);
        doc.text(`x${it.quantity}`, 85, nextY);
        doc.text(`${shop?.settings?.currency || 'Rs'}.${(it.price * it.quantity).toFixed(2)}`, 115, nextY);
        nextY += 6;
      });

      // Perforation line
      doc.line(10, nextY, 138, nextY);
      nextY += 6;

      // 4. Payment Info
      doc.text(`Payment Method: ${order.payment_method.toUpperCase()}`, 12, nextY);
      doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 80, nextY);
      nextY += 6;

      // Perforation line
      doc.line(10, nextY, 138, nextY);
      nextY += 8;

      // 5. Total
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text("GRAND TOTAL", 12, nextY);
      doc.text(`${shop?.settings?.currency || 'Rs'}.${Number(order.total_amount).toFixed(2)}`, 115, nextY);
      nextY += 8;

      // 6. QR Code representation
      doc.setLineDashPattern([], 0);
      const qrCanvas = document.getElementById('receipt-qr-canvas') as HTMLCanvasElement;
      let qrDataUrl = '';
      if (qrCanvas) {
        try {
          qrDataUrl = qrCanvas.toDataURL('image/png');
        } catch (e) {
          console.error("Failed to extract QR code canvas:", e);
        }
      }

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', 63, nextY, 20, 20);
        nextY += 22;
      } else {
        nextY += 4;
      }

      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("*SCAN TO TRACK LIVE STATUS*", 74, nextY, { align: "center" });

      // Save the generated document
      doc.save(`bill_receipt_${order.id.slice(0, 8).toUpperCase()}.pdf`);

      toast.dismiss(toastId);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.dismiss(toastId);
      toast.error("Failed to download PDF. Please try standard print option.");
    }
  };

  const fetchOrderStatus = async () => {
    try {
      const shopRes = await api.get(`/public/shop/${id}`);
      setShop(shopRes.data);

      const orderRes = await api.get(`/public/shop/${id}/orders/${orderId}`);
      const newOrder = orderRes.data;
      
      if (statusRef.current && newOrder.order_status !== statusRef.current) {
        playChimeNotificationSound();
      }
      statusRef.current = newOrder.order_status;
      setOrder(newOrder);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStatus();

    const isFinal = order && ['completed', 'cancelled', 'delivered', 'rejected'].includes(order.order_status);
    if (isFinal) return;
    
    const handleRealtimeUpdate = () => {
      fetchOrderStatus();
    };

    window.addEventListener('menukit-realtime-update', handleRealtimeUpdate);
    const interval = setInterval(fetchOrderStatus, 30000);

    return () => {
      window.removeEventListener('menukit-realtime-update', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [id, orderId, order?.order_status]);

  // If online and payment is pending, check payment status once on mount
  useEffect(() => {
    const verifyPayment = async () => {
      if (orderId && id) {
        try {
          const verifyRes = await api.post(`/public/shop/${id}/orders/${orderId}/verify`);
          setOrder(verifyRes.data);
        } catch (e) {
          console.error("Verification failed", e);
        }
      }
    };
    if (order && order.payment_method === 'online' && order.payment_status === 'pending') {
      verifyPayment();
    }
  }, [orderId, id, order?.payment_method]);

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-slate-400 mb-4" />
        <h3 className="font-bold text-slate-800 dark:text-white text-lg">Order Not Found</h3>
        <p className="text-slate-500 text-sm mt-1">We couldn't locate this order detail.</p>
        <button
          onClick={() => navigate(`/shop/${id}`)}
          className="mt-6 px-6 py-2.5 text-white rounded-xl font-bold text-sm shadow-md"
          style={{ backgroundColor: primaryColor }}
        >
          Go back to Menu
        </button>
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (order.order_status) {
      case 'pending':
        return {
          title: 'Order Placed',
          desc: 'Waiting for restaurant approval.',
          icon: <Clock size={40} className="text-amber-500 animate-pulse" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/20',
          borderColor: 'border-amber-100 dark:border-amber-900/30'
        };
      case 'accepted':
        return {
          title: 'Preparing Food',
          desc: 'Chef is preparing your order.',
          icon: <CookingPot size={40} className="text-blue-500 animate-bounce" />,
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-100 dark:border-blue-900/30'
        };
      case 'completed':
        return {
          title: 'Order Completed',
          desc: 'Your food is ready / delivered! Enjoy!',
          icon: <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
          borderColor: 'border-emerald-100 dark:border-emerald-900/30'
        };
      case 'rejected':
        return {
          title: 'Order Rejected',
          desc: 'The restaurant was unable to accept this order.',
          icon: <XCircle size={40} className="text-rose-500" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/20',
          borderColor: 'border-rose-100 dark:border-rose-900/30'
        };
      default:
        return {
          title: 'Cancelled',
          desc: 'Order has been cancelled.',
          icon: <XCircle size={40} className="text-slate-500" />,
          bgColor: 'bg-slate-50 dark:bg-slate-900/20',
          borderColor: 'border-slate-100 dark:border-slate-800'
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 antialiased">
      <style>{`
        .serrated-receipt {
          background: #fdfbf7;
          box-shadow: 0 12px 40px -12px rgba(0,0,0,0.12);
          position: relative;
          clip-path: polygon(
            0% 0%, 2.5% 6px, 5% 0%, 7.5% 6px, 10% 0%, 12.5% 6px, 15% 0%, 17.5% 6px, 20% 0%, 22.5% 6px, 25% 0%, 27.5% 6px, 30% 0%, 32.5% 6px, 35% 0%, 37.5% 6px, 40% 0%, 42.5% 6px, 45% 0%, 47.5% 6px, 50% 0%, 52.5% 6px, 55% 0%, 57.5% 6px, 60% 0%, 62.5% 6px, 65% 0%, 67.5% 6px, 70% 0%, 72.5% 6px, 75% 0%, 77.5% 6px, 80% 0%, 82.5% 6px, 85% 0%, 87.5% 6px, 90% 0%, 92.5% 6px, 95% 0%, 97.5% 6px, 100% 0%,
            100% 100%, 97.5% calc(100% - 6px), 95% 100%, 92.5% calc(100% - 6px), 90% 100%, 87.5% calc(100% - 6px), 85% 100%, 82.5% calc(100% - 6px), 80% 100%, 77.5% calc(100% - 6px), 75% 100%, 72.5% calc(100% - 6px), 70% 100%, 67.5% calc(100% - 6px), 65% 100%, 62.5% calc(100% - 6px), 60% 100%, 57.5% calc(100% - 6px), 55% 100%, 52.5% calc(100% - 6px), 50% 100%, 47.5% calc(100% - 6px), 45% 100%, 42.5% calc(100% - 6px), 40% 100%, 37.5% calc(100% - 6px), 35% 100%, 32.5% calc(100% - 6px), 30% 100%, 27.5% calc(100% - 6px), 25% 100%, 22.5% calc(100% - 6px), 20% 100%, 17.5% calc(100% - 6px), 15% 100%, 12.5% calc(100% - 6px), 10% 100%, 7.5% calc(100% - 6px), 5% 100%, 2.5% calc(100% - 6px), 0% 100%
          );
        }
        
        .dark .serrated-receipt {
          background: #1c1a16;
          box-shadow: 0 12px 40px -12px rgba(0,0,0,0.5);
        }

        .receipt-stamp {
          border: 3px double #10b981;
          color: #10b981;
          background: rgba(16, 185, 129, 0.05);
          font-family: monospace;
          font-weight: 900;
          text-transform: uppercase;
          transform: rotate(-12deg);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
        }

        .receipt-stamp-failed {
          border: 3px double #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
          font-family: monospace;
          font-weight: 900;
          text-transform: uppercase;
          transform: rotate(-12deg);
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
        }

        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, main > :not(.serrated-receipt), .print-btn, nav, .floating-actions, button {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .serrated-receipt {
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            clip-path: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-30 border-b border-slate-100 dark:border-slate-800/60 print:hidden">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center gap-3">
          <button 
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate(`/shop/${id}/orders`);
              }
            }}
            className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="font-extrabold text-slate-800 dark:text-white line-clamp-1">{shop?.name}</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Order Tracking</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Animated Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-3xl border ${statusInfo.bgColor} ${statusInfo.borderColor} flex items-center gap-5 relative overflow-hidden`}
        >
          {/* Ambient Background Glow */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-current pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md relative z-10">
            {order.order_status === 'accepted' ? (
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [0, 8, -8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <CookingPot size={36} className="text-orange-500" />
              </motion.div>
            ) : order.order_status === 'pending' ? (
              <motion.div
                animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <Clock size={36} className="text-amber-500" />
              </motion.div>
            ) : order.order_status === 'completed' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <CheckCircle2 size={36} className="text-emerald-500" />
              </motion.div>
            ) : (
              <XCircle size={36} className="text-slate-400" />
            )}
          </div>
          <div className="relative z-10">
            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/80 text-slate-650 dark:text-slate-300">
              Live Tracker
            </span>
            <h2 className="font-black text-xl text-slate-800 dark:text-white mt-1.5">{statusInfo.title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 leading-tight">{statusInfo.desc}</p>
          </div>
        </motion.div>

        {/* Serrated Thermal Print Receipt Card */}
        <motion.div 
          id="receipt-print-area"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="serrated-receipt p-7 pb-8 space-y-5 rounded-sm"
        >
          {/* Authentic Payment Stamp overlay */}
          {order.payment_status === 'paid' && (
            <div className="absolute right-6 top-10 receipt-stamp px-4 py-1.5 rounded text-sm font-bold tracking-widest text-center select-none z-20 pointer-events-none">
              <div className="text-[7px] tracking-normal font-medium leading-none opacity-80 border-b border-emerald-500/20 pb-0.5 mb-0.5">PAYMENT SECURE</div>
              <span>PAID</span>
            </div>
          )}

          {order.payment_status === 'failed' && (
            <div className="absolute right-6 top-10 receipt-stamp-failed px-4 py-1.5 rounded text-sm font-bold tracking-widest text-center select-none z-20 pointer-events-none">
              <div className="text-[7px] tracking-normal font-medium leading-none opacity-80 border-b border-red-500/20 pb-0.5 mb-0.5">TRANSACTION</div>
              <span>FAILED</span>
            </div>
          )}

          {/* Receipt Brand Name Header */}
          <div className="text-center border-b border-dashed border-slate-300/80 pb-4">
            <h3 className="font-mono font-black text-base text-slate-800 dark:text-slate-200 uppercase tracking-widest">{shop?.name}</h3>
            <p className="font-mono text-[9px] text-slate-400 mt-1 uppercase">Tax Invoice / Bill Receipt</p>
          </div>

          {/* Metadata Block */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-dashed border-slate-350 pb-4">
            <div>
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Bill ID</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-250">#{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Channel</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-250 capitalize">{order.order_type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Date & Time</span>
              <span className="text-slate-800 dark:text-slate-250">{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Status</span>
              <span className="font-bold text-orange-600 uppercase">{order.order_status}</span>
            </div>
          </div>

          {/* Customer info */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono border-b border-dashed border-slate-350 pb-4">
            <div className="col-span-2">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Customer Contact</span>
              <span className="font-extrabold text-slate-850 dark:text-slate-200">{order.customer_name} ({order.customer_phone})</span>
            </div>
            {order.table_number && (
              <div className="col-span-2">
                <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Table Number</span>
                <span className="font-extrabold text-slate-850 dark:text-slate-200">{order.table_number}</span>
              </div>
            )}
            {order.delivery_address && (
              <div className="col-span-2">
                <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Delivery Address</span>
                <span className="font-semibold text-slate-800 dark:text-slate-350 block leading-tight">
                  {order.delivery_address.replace(/\s*\[loc=.*?\]/, '')}
                </span>
              </div>
            )}
          </div>

          {/* Items Summary */}
          <div className="pt-1 space-y-3 border-b border-dashed border-slate-350 pb-4">
            <p className="text-[9px] font-mono font-bold text-slate-450 uppercase tracking-widest">Ordered Items</p>
            {order.items.map((it: any) => (
              <div key={it.id} className="flex justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-350 flex-1 pr-4">
                  {it.name} <strong className="text-slate-900 dark:text-white px-1 bg-slate-200/50 dark:bg-slate-800 rounded">x{it.quantity}</strong>
                </span>
                <span className="font-black text-slate-900 dark:text-white">
                  {shop?.settings?.currency || '₹'}{(it.price * it.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Order Bill Breakdown */}
          <div className="pt-2 space-y-2 text-xs font-mono border-b border-dashed border-slate-350 pb-4">
            <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mb-3">Order Bill Breakdown</p>
            
            <div className="flex justify-between text-slate-700 dark:text-slate-350">
              <span>Item total</span>
              <span className="font-black text-slate-900 dark:text-white">
                {shop?.settings?.currency || '₹'}{(order.items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0)).toFixed(2)}
              </span>
            </div>
            
            {Number(order.total_amount) > order.items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0) && (
              <div className="flex justify-between text-slate-700 dark:text-slate-350">
                <span>Delivery partner fee</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {shop?.settings?.currency || '₹'}{(Number(order.total_amount) - order.items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0)).toFixed(2)}
                </span>
              </div>
            )}
            
            {order.payment_method === 'online' && (
              <>
                <div className="flex justify-between text-slate-700 dark:text-slate-350">
                  <span>Platform fee</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {shop?.settings?.currency || '₹'}{(Number(order.total_amount) * 0.01).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-350">
                  <span>Payment gateway fee</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {shop?.settings?.currency || '₹'}{(Number(order.total_amount) * 0.03 + (Number(order.total_amount) * 0.03) * 0.18).toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {Number(order.total_amount) < order.items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0) && (
              <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                <span>Auto Discount</span>
                <span>-{shop?.settings?.currency || '₹'}{(order.items.reduce((acc: number, it: any) => acc + (it.price * it.quantity), 0) - Number(order.total_amount)).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Payment info */}
          <div className="flex justify-between items-center text-xs font-mono border-b border-dashed border-slate-350 pb-4 pt-2">
            <div>
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Payment Method</span>
              <span className="font-extrabold capitalize text-slate-800 dark:text-slate-250">{order.payment_method}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Payment Status</span>
              <span className={`inline-block px-2.5 py-0.5 rounded-sm text-[8px] font-black uppercase ${
                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-850 border border-amber-200'
              }`}>
                {order.payment_status}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center py-2">
            <span className="font-mono font-black text-slate-850 dark:text-white text-sm uppercase">Total Payable</span>
            <span className="font-black text-2xl tracking-tight text-orange-600">
              {shop?.settings?.currency || '₹'}{(
                order.payment_method === 'online' 
                  ? (Number(order.total_amount) + Number(order.total_amount) * 0.01 + Number(order.total_amount) * 0.03 + (Number(order.total_amount) * 0.03) * 0.18) 
                  : Number(order.total_amount)
              ).toFixed(2)}
            </span>
          </div>

          {/* Credits Message */}
          {(
            order.payment_method === 'online' 
              ? (Number(order.total_amount) + Number(order.total_amount) * 0.01 + Number(order.total_amount) * 0.03 + (Number(order.total_amount) * 0.03) * 0.18) 
              : Number(order.total_amount)
          ) >= 100 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded px-3 py-2 text-center mt-2 mb-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                🎉 You earned 0.15 credits
              </span>
            </div>
          )}


          {/* Thermal QR Code Stamp */}
          <div className="flex flex-col items-center justify-center pt-4 border-t border-dashed border-slate-300">
            <div 
              onClick={() => {
                const trackUrl = `${window.location.origin}/shop/${id}/order/${orderId}`;
                navigator.clipboard.writeText(trackUrl);
                toast.success("Live tracking link copied!");
              }}
              className="bg-white p-1.5 rounded-lg border border-slate-200/60 shadow-sm mb-1.5 cursor-pointer hover:scale-105 transition-transform active:scale-95 group relative"
              title="Click to copy live order tracking link"
            >
              <QRCodeCanvas 
                id="receipt-qr-canvas"
                value={`${window.location.origin}/shop/${id}/order/${orderId}`} 
                size={70} 
                level="M" 
                fgColor="#1e293b" 
                bgColor="#ffffff"
              />
            </div>
            <button
              onClick={() => {
                window.open(`${window.location.origin}/shop/${id}/order/${orderId}`, '_blank');
              }}
              className="font-mono text-[7px] text-slate-500 hover:text-primary uppercase tracking-widest leading-none flex items-center gap-1 cursor-pointer transition-colors"
              title="Click to open tracking link in new tab"
            >
              *SCAN OR CLICK TO TRACK LIVE STATUS*
            </button>
          </div>

          {/* Print button footer */}
          {order.payment_status === 'paid' && (
            <div className="border-t border-dashed border-slate-300 pt-3.5 flex justify-between items-center print-btn">
              <span className="text-[9px] text-slate-400 font-mono">Digital receipt issued successfully.</span>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-black tracking-wide uppercase transition-all"
              >
                <Printer size={12} />
                <span>Print Bill</span>
              </button>
            </div>
          )}
        </motion.div>

        {/* Pay Online Action Trigger — Only when online payments are enabled */}
        {order.payment_status === 'pending' && order.order_status !== 'rejected' && order.order_status !== 'cancelled' && shop?.settings?.online_payments_enabled !== false && (
          order.order_type === 'delivery' ? (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePayOnline}
              disabled={isRedirecting}
              className="w-full py-4 rounded-2xl text-white font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 cursor-pointer"
              style={{ boxShadow: `0 4px 15px ${primaryColor}40` }}
            >
              {isRedirecting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <CreditCard size={18} />
                  <span>Pay Online Instantly ({shop?.settings?.currency || '₹'}{Number(order.total_amount).toFixed(2)})</span>
                </>
              )}
            </motion.button>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-3">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">Awaiting Merchant Payment Confirmation</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  {order.payment_method === 'upi'
                    ? 'Payment via UPI initiated. The shopkeeper will verify and update your payment status.'
                    : 'Pay physically at the counter/cash. The shopkeeper will update your payment status.'}
                </p>
              </div>
            </div>
          )
        )}

        {/* Cancelled / Rejected Order Notice */}
        {(order.order_status === 'rejected' || order.order_status === 'cancelled') && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-3">
            <XCircle size={22} className="text-rose-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Order Cancelled / Rejected</p>
              <p className="text-[11px] font-medium opacity-90 mt-0.5">This order was rejected or cancelled. Online payment is disabled.</p>
            </div>
          </div>
        )}

        {/* Bottom Spacing to offset fixed bottom dock */}
        <div className="h-20 print:hidden" />
      </main>

      {/* Floating Premium Bottom Actions Dock */}
      <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[380px] z-40 print:hidden">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[20px] shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 p-1.5 flex gap-2">
          <button
            onClick={() => navigate(`/shop/${id}/orders`)}
            className="flex-1 py-2 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg font-bold text-[10px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <History size={13} />
            <span>View Orders</span>
          </button>
          <button
            onClick={() => setIsReceiptSheetOpen(true)}
            className="flex-1 py-2 text-white rounded-lg font-black text-[10px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            <Receipt size={13} />
            <span>Print / Download</span>
          </button>
        </div>
      </div>

      {/* Bottom Sheet for Print / Download Options */}
      <BottomSheet
        isOpen={isReceiptSheetOpen}
        onClose={() => setIsReceiptSheetOpen(false)}
        title="Receipt Options"
      >
        <div className="p-4 space-y-3">
          <p className="text-[11px] text-slate-450 dark:text-slate-400 font-medium leading-tight">
            Please select an action below for order #{order.id.slice(0, 8).toUpperCase()}.
          </p>
          <div className="grid grid-cols-2 gap-3 pb-1">
            <button
              onClick={() => {
                setIsReceiptSheetOpen(false);
                setTimeout(() => window.print(), 350);
              }}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-xl gap-2 transition-all cursor-pointer group active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center text-orange-650 group-hover:scale-105 transition-transform">
                <Printer size={18} />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Print Bill</span>
              <span className="text-[8px] text-slate-400 text-center leading-none">Print receipt to thermal / A4 paper</span>
            </button>
            
            <button
              onClick={() => {
                setIsReceiptSheetOpen(false);
                handleDownloadPDF();
              }}
              className="flex flex-col items-center justify-center p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 hover:border-orange-500/50 hover:bg-orange-500/5 rounded-xl gap-2 transition-all cursor-pointer group active:scale-[0.97]"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center text-blue-650 group-hover:scale-105 transition-transform">
                <Download size={18} />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">Download PDF</span>
              <span className="text-[8px] text-slate-400 text-center leading-none">Save digital PDF bill invoice</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
