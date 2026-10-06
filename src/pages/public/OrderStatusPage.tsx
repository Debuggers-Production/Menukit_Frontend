import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, CookingPot, CheckCircle2, Clock, XCircle, AlertCircle, CreditCard, Printer, Receipt, FileText, CheckCircle, ChefHat, Download, History, Lock, PackageCheck, Info, Plus, RotateCcw } from 'lucide-react';
import { api } from '@/services/api';
import { Shop } from '@/types';
import { getBusinessCategory } from '@/config/businessCategories';
import { APP_CONFIG } from '@/config';
import { getCustomerUserId } from '@/hooks/useActiveOrders';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { QRCodeCanvas } from 'qrcode.react';
import { calculateOrderPricing, calculateOrderReplacementCredit } from '@/utils/pricing';

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

export function roundStrictTwoDecimals(val: number): number {
  if (isNaN(val)) return 0;
  const shifted = Math.abs(val) * 1000;
  const thirdDigit = Math.floor(shifted + 1e-9) % 10;
  if (thirdDigit > 5) {
    return Math.sign(val) * (Math.ceil(Math.abs(val) * 100 - 1e-9) / 100);
  } else {
    return Math.sign(val) * (Math.floor(Math.abs(val) * 100 + 1e-9) / 100);
  }
}

export function OrderStatusPage() {
  const { id, orderId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const businessCategory = getBusinessCategory(shop?.category);
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
    if (order?.order_type === 'dine_in' && (order?.order_status === 'PENDING_VENDOR' || order?.order_status === 'PENDING')) {
      toast.error("Please wait for the shop to accept your order before completing payment.");
      return;
    }
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
        fetchOrderStatus();
        return;
      }

      const currSymbol = payData.currency_symbol || shop?.settings?.currency || '₹';
      const currencyCode = payData.currency || 'INR';
      const baseTotal = payData.base_total || (payData.amount / 100).toFixed(2);
      const platFee = payData.platform_fee || 0;
      const pgFee = payData.pg_fee || 0;
      const gstFee = payData.gst_on_fee || 0;
      const grandTotal = payData.grand_total || (payData.amount / 100).toFixed(2);

      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: currencyCode,
        name: shop?.name || 'Restaurant Order',
        description: `Items: ${currSymbol}${baseTotal} | Platform Fee: ${currSymbol}${platFee} | PG Fee (3%): ${currSymbol}${pgFee} | GST: ${currSymbol}${gstFee} = ${currSymbol}${grandTotal}`,
        order_id: payData.razorpay_order_id,
        notes: {
          "1_Items_Subtotal": `${currSymbol}${baseTotal}`,
          "2_Platform_Fee_2%": `${currSymbol}${platFee}`,
          "3_Payment_Gateway_Fee_3%": `${currSymbol}${pgFee}`,
          "4_GST_on_Fee_18%": `${currSymbol}${gstFee}`,
          "5_Grand_Total": `${currSymbol}${grandTotal}`
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
            fetchOrderStatus();
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

      let headerY = 24;
      if (shop?.settings?.gstin) {
        doc.text(`GSTIN: ${shop.settings.gstin}`, 74, headerY, { align: "center" });
        headerY += 4;
      }
      if (shop?.settings?.fssai_license) {
        doc.text(`FSSAI Lic: ${shop.settings.fssai_license}`, 74, headerY, { align: "center" });
        headerY += 4;
      }

      // Perforation line
      doc.setLineDashPattern([2, 1], 0);
      doc.setDrawColor(203, 213, 225);
      doc.line(10, headerY, 138, headerY);

      // 2. Metadata Block
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Bill ID: #${String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase()}`, 12, 30);
      doc.text(`Channel: ${order.order_type.replace('_', ' ').toUpperCase()}`, 80, 30);
      doc.text(`Date   : ${new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 12, 35);

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
      (order.items || []).forEach((it: any) => {
        const itemText = it.is_cancelled ? `${it.name.slice(0, 20)} [CANCELLED]` : it.name.slice(0, 30);
        const itemAmt = it.is_cancelled ? '0.00' : (it.price * it.quantity).toFixed(2);
        doc.text(itemText, 12, nextY);
        doc.text(`x${it.quantity}`, 85, nextY);
        doc.text(`${shop?.settings?.currency || 'Rs'}.${itemAmt}`, 115, nextY);
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

      // 5. Taxes & Total
      let grandTotalToPrint = Number(order.total_amount || 0);
      if (shop?.settings?.gst_enabled) {
        const cgstRate = Number(shop.settings.cgst_rate || 0);
        const sgstRate = Number(shop.settings.sgst_rate || 0);
        const totalTaxRate = cgstRate + sgstRate;
        const items = (order.items || []).filter((it: any) => !it.is_cancelled);
        const itemsSubtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
        const baseFoodAmount = itemsSubtotal > 0 ? itemsSubtotal : Number(order.total_amount || 0);

        if (totalTaxRate > 0) {
          let taxable = baseFoodAmount;
          let totalTax = 0;
          let cgst = 0;
          let sgst = 0;
          if (shop.settings.inclusive_tax) {
            taxable = Math.round((baseFoodAmount / (1 + totalTaxRate / 100)) * 100) / 100;
            totalTax = Math.round((baseFoodAmount - taxable) * 100) / 100;
            cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
            sgst = Math.round((totalTax - cgst) * 100) / 100;
            grandTotalToPrint = baseFoodAmount;
          } else {
            // Exclusive: Tax is added on top of food items
            taxable = baseFoodAmount;
            cgst = Math.round((taxable * (cgstRate / 100)) * 100) / 100;
            sgst = Math.round((taxable * (sgstRate / 100)) * 100) / 100;
            totalTax = Math.round((cgst + sgst) * 100) / 100;
            grandTotalToPrint = Math.round((taxable + totalTax) * 100) / 100;
          }
          doc.text(`Taxable: ${shop?.settings?.currency || 'Rs'}.${taxable.toFixed(2)}`, 12, nextY);
          doc.text(`CGST (${cgstRate}%): ${shop?.settings?.currency || 'Rs'}.${cgst.toFixed(2)}`, 80, nextY);
          nextY += 5;
          doc.text(`SGST (${sgstRate}%): ${shop?.settings?.currency || 'Rs'}.${sgst.toFixed(2)}`, 80, nextY);
          nextY += 5;
          doc.line(10, nextY, 138, nextY);
          nextY += 6;
        }
      }

      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text("GRAND TOTAL", 12, nextY);
      doc.text(`${shop?.settings?.currency || 'Rs'}.${grandTotalToPrint.toFixed(2)}`, 115, nextY);
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

      if (shop?.settings?.tax_invoice_notes) {
        nextY += 5;
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(shop.settings.tax_invoice_notes, 74, nextY, { align: "center", maxWidth: 110 });
      }

      // Save the generated document
      doc.save(`bill_receipt_${String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase()}.pdf`);

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
      const [shopRes, orderRes] = await Promise.all([
        api.get(`/public/shop/${id}`),
        api.get(`/public/shop/${id}/orders/${orderId}`)
      ]);
      setShop(shopRes.data);

      const newOrder = orderRes.data;
      
      if (statusRef.current && newOrder.order_status !== statusRef.current) {
        playChimeNotificationSound();
      }
      statusRef.current = newOrder.order_status;
      setOrder(newOrder);
    } catch (err) {
      console.error("Failed to load order status", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderStatus();

    const isFinal = order && ['completed', 'cancelled', 'delivered', 'rejected'].includes(order.order_status);
    if (isFinal) return;

    // Realtime broadcast listener (for in-app / window updates)
    const handleRealtimeUpdate = (e: any) => {
      const detail = e.detail;
      if (!detail) {
        fetchOrderStatus();
        return;
      }
      const incomingId = detail.order_id || detail.order?.id || detail.metadata?.order_id;
      if (!incomingId || incomingId === orderId) {
        if (detail.order) {
          setOrder((prev: any) => ({ ...prev, ...detail.order }));
        } else if (detail.status) {
          setOrder((prev: any) => ({ ...prev, order_status: detail.status, payment_status: detail.payment_status || prev?.payment_status }));
        }
        playChimeNotificationSound();
        fetchOrderStatus();
      }
    };

    window.addEventListener('menukit-realtime-update', handleRealtimeUpdate);
    const interval = setInterval(fetchOrderStatus, 30000);

    return () => {
      window.removeEventListener('menukit-realtime-update', handleRealtimeUpdate);
      clearInterval(interval);
    };
  }, [id, orderId, order?.order_status]);

  // Dedicated direct WebSocket connection for instant 0-delay tracking on customer mobile device
  useEffect(() => {
    if (!id || !orderId) return;

    const isProd = import.meta.env.MODE === 'production';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = isProd ? window.location.host : 'localhost:8000';
    const baseUrl = APP_CONFIG.API_URL ? APP_CONFIG.API_URL.replace(/^http/, 'ws') : `${protocol}//${host}`;
    
    // Connect directly using orderId as primary channel
    const wsUrl = `${baseUrl}/api/v1/public/shop/${id}/ws/customer/${orderId}`;

    let socket: WebSocket | null = null;
    let pingInterval: any = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      if (socket && socket.readyState === WebSocket.OPEN) return;

      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          console.log('[Customer Live Tracker WS] Connected with 0 delay for order:', orderId);
          if (pingInterval) clearInterval(pingInterval);
          pingInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              try { socket.send('ping'); } catch {}
            }
          }, 25000);
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== 'string') return;
          const trimmed = event.data.trim();
          if (trimmed === 'ping' || trimmed === 'pong' || !trimmed.startsWith('{')) return;
          try {
            const data = JSON.parse(trimmed);
            if (data.type === 'order_update' || data.event === 'order_update' || data.type === 'ORDER_STATUS' || data.type === 'NEW_ORDER') {
              console.log('[Customer Live Tracker WS] Order update received:', data);
              
              const incomingId = data.order_id || data.order?.id || data.data?.id;
              if (!incomingId || incomingId === orderId) {
                // Immediate sub-second state update
                if (data.order || data.data) {
                  const fullOrder = data.order || data.data;
                  setOrder((prev: any) => ({ ...prev, ...fullOrder }));
                } else if (data.status) {
                  setOrder((prev: any) => ({ 
                    ...prev, 
                    order_status: data.status, 
                    payment_status: data.payment_status || prev?.payment_status,
                    payment_expires_at: data.payment_expires_at !== undefined ? data.payment_expires_at : prev?.payment_expires_at
                  }));
                }
                
                playChimeNotificationSound();
                toast.success(`Order status: ${(data.status || 'Updated').toUpperCase()}`, {
                  icon: '🔔',
                  duration: 4000
                });
                
                // Also fetch fresh payload to guarantee consistency
                fetchOrderStatus();
              }
            }
          } catch (err) {
            console.error('[Customer Live Tracker WS] Parse error:', err);
          }
        };

        socket.onclose = () => {
          if (pingInterval) clearInterval(pingInterval);
          if (!isDisposed) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connect, 1500);
          }
        };

        socket.onerror = (err) => {
          console.error('[Customer Live Tracker WS] Socket error:', err);
          try { socket?.close(); } catch {}
        };
      } catch (e) {
        if (!isDisposed) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(connect, 2000);
        }
      }
    };

    connect();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' || navigator.onLine) {
        if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
          connect();
        }
        fetchOrderStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    return () => {
      isDisposed = true;
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      if (socket) socket.close();
    };
  }, [id, orderId]);

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (order?.order_status === 'PAYMENT_PENDING' && order?.payment_expires_at) {
      const interval = setInterval(() => {
        const expiry = new Date(order.payment_expires_at).getTime();
        const now = new Date().getTime();
        const diff = expiry - now;
        
        if (diff <= 0) {
          setTimeLeft('EXPIRED');
          clearInterval(interval);
          // Refresh order status if expired
          fetchOrderStatus();
        } else {
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [order?.order_status, order?.payment_expires_at]);

  // If returning from an external payment gateway redirect with signature params, verify payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const razorpay_order_id = params.get('razorpay_order_id');
    const razorpay_payment_id = params.get('razorpay_payment_id');
    const razorpay_signature = params.get('razorpay_signature');

    if (orderId && id && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const verifyPayment = async () => {
        try {
          const verifyRes = await api.post(`/public/shop/${id}/orders/${orderId}/verify`, {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          });
          setOrder(verifyRes.data);
          toast.success("Payment verified successfully!");
        } catch (e) {
          console.error("Verification failed", e);
        }
      };
      verifyPayment();
    }
  }, [orderId, id]);

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
    const norm = (order.order_status || '').toUpperCase();
    switch (norm) {
      case 'PENDING_VENDOR':
      case 'PENDING':
        return {
          title: 'Order Placed',
          desc: 'Waiting for shop approval.',
          icon: <Clock size={40} className="text-amber-500 animate-pulse" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950/20',
          borderColor: 'border-amber-100 dark:border-amber-900/30'
        };
      case 'PAYMENT_PENDING':
        return {
          title: 'Payment Pending',
          desc: 'Please complete your payment. Your order will only be processed further once payment is received.',
          icon: <CreditCard size={40} className="text-orange-500 animate-pulse" />,
          bgColor: 'bg-orange-50 dark:bg-orange-950/20',
          borderColor: 'border-orange-100 dark:border-orange-900/30'
        };
      case 'PAID':
      case 'PREPARING':
      case 'ACCEPTED':
      case 'COOKING':
        return {
          title: businessCategory.prepStatusTitle,
          desc: businessCategory.prepStatusDesc,
          icon: businessCategory.isFood ? <CookingPot size={40} className="text-blue-500 animate-bounce" /> : <PackageCheck size={40} className="text-amber-500 animate-bounce" />,
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-100 dark:border-blue-900/30'
        };
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return {
          title: 'Ready / On the Way',
          desc: 'Your order is on the way or ready for pickup.',
          icon: <CheckCircle size={40} className="text-indigo-500" />,
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
          borderColor: 'border-indigo-100 dark:border-indigo-900/30'
        };
      case 'COMPLETED':
      case 'DELIVERED':
        return {
          title: 'Order Completed',
          desc: businessCategory.orderCompletedDesc,
          icon: <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
          borderColor: 'border-emerald-100 dark:border-emerald-900/30'
        };
      case 'REJECTED':
        return {
          title: 'Order Rejected',
          desc: 'The shop was unable to accept this order.',
          icon: <XCircle size={40} className="text-rose-500" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/20',
          borderColor: 'border-rose-100 dark:border-rose-900/30'
        };
      case 'CANCELLED':
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
  const isUnpaid = String(order?.payment_status || '').toLowerCase() === 'pending';
  const isAllItemsCancelled = (order?.items || []).length > 0 && (order?.items || []).every((it: any) => it.is_cancelled);
  const isCancelled = order?.order_status?.toUpperCase() === 'REJECTED' || order?.order_status?.toUpperCase() === 'CANCELLED' || isAllItemsCancelled;
  const isActuallyCancelled = isCancelled || (order?.payment_status === 'refunded' && isAllItemsCancelled);
  const isDineIn = order?.order_type === 'dine_in';
  const normOrderStatus = (order?.order_status || '').toUpperCase();
  const isCompleted = normOrderStatus === 'COMPLETED' || normOrderStatus === 'DELIVERED';
  const isPendingVendor = normOrderStatus === 'PENDING_VENDOR' || normOrderStatus === 'PENDING';

  // Rule: Payment is disabled until the merchant accepts the order.
  const isPaymentDisabledUntilAccepted = isPendingVendor;
  const canPayNow = isUnpaid && !isCancelled && !isPaymentDisabledUntilAccepted;
  // Presented items: excludes replaced predecessor items
  const presentedItems = (order?.items || []).filter((it: any) => !String(it.cancellation_reason || '').startsWith('Replaced with'));
  const allItemsSubtotal = presentedItems.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  const activeItems = (order?.items || []).filter((it: any) => !it.is_cancelled);
  const activeItemsSubtotal = activeItems.reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0);

  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  let calculatedTaxAmount = 0;
  const targetSubtotal = isActuallyCancelled && activeItemsSubtotal === 0 ? allItemsSubtotal : activeItemsSubtotal;
  let computedFoodTotal = targetSubtotal;
  if (shop?.settings?.gst_enabled && totalTaxRate > 0 && !shop?.settings?.inclusive_tax) {
    calculatedTaxAmount = Math.round((targetSubtotal * (totalTaxRate / 100)) * 100) / 100;
    computedFoodTotal = Math.round((targetSubtotal + calculatedTaxAmount) * 100) / 100;
  }

  const backendTotal = Number(order?.total_amount || 0);
  const effectiveOrderTotal = (backendTotal > 0) ? backendTotal : (computedFoodTotal > 0 ? computedFoodTotal : allItemsSubtotal);

  // Replaced items credit deduction: accurate predecessor credit calculation
  const hasReplacementCancelled = (order?.items || []).some((it: any) => it.is_cancelled && String(it.cancellation_reason || '').startsWith('Replaced with'));
  const replacedCredit = hasReplacementCancelled ? calculateOrderReplacementCredit(order?.items || [], false) : 0;

  const netPayableBase = (replacedCredit > 0 && isUnpaid)
    ? Math.max(0, effectiveOrderTotal - replacedCredit)
    : effectiveOrderTotal;

  const currencySymbol = shop?.settings?.currency || '₹';

  const isMasterOnline = (shop?.settings as any)?.online_payments_enabled !== false;
  let isChannelOnline = true;
  if (order?.order_type === 'dine_in') isChannelOnline = (shop?.settings as any)?.online_payments_dinein_enabled !== false;
  else if (order?.order_type === 'takeaway') isChannelOnline = (shop?.settings as any)?.online_payments_takeaway_enabled !== false;
  else if (order?.order_type === 'delivery') isChannelOnline = (shop?.settings as any)?.online_payments_delivery_enabled !== false;

  const isOnlineFeeApplicable = Boolean(order?.payment_method === 'online' && isMasterOnline && isChannelOnline);
  const pricing = calculateOrderPricing(netPayableBase, isOnlineFeeApplicable);
  const platformFee = pricing.platformFee;
  const totalPgFee = pricing.totalPgFee;
  const grandTotal = pricing.totalPayable;
  const grandTotalFormatted = grandTotal.toFixed(2);

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
          className={`p-5 sm:p-6 rounded-3xl border ${statusInfo.bgColor} ${statusInfo.borderColor} flex items-center justify-between gap-3 relative overflow-hidden`}
        >
          {/* Ambient Background Glow */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-10 blur-2xl bg-current pointer-events-none" />
          
          <div className="flex items-center gap-4 min-w-0 relative z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md relative z-10 shrink-0">
              {statusInfo.icon}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800/80 text-slate-650 dark:text-slate-300 inline-block">
                Live Tracker
              </span>
              <h2 className="font-black text-lg sm:text-xl text-slate-800 dark:text-white mt-1 leading-snug">{statusInfo.title}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 leading-tight">{statusInfo.desc}</p>
            </div>
          </div>

          {isDineIn && !isPendingVendor && !isActuallyCancelled && !isCompleted && (
            <button
              type="button"
              onClick={() => {
                const tableParam = order.table_number ? `?table=${encodeURIComponent(order.table_number)}` : '';
                navigate(`/shop/${id}${tableParam}`);
              }}
              className="relative z-10 shrink-0 px-3 py-2 rounded-xl text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
              style={{ backgroundColor: primaryColor }}
              title="Add more items to this order"
            >
              <Plus size={13} />
              <span>Add More</span>
            </button>
          )}
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
            {(shop?.settings?.gstin || shop?.settings?.fssai_license) && (
              <div className="mt-1 text-[9px] font-mono text-slate-500 flex flex-wrap items-center justify-center gap-2">
                {shop.settings.gstin && <span>GSTIN: <strong className="font-bold text-slate-700 dark:text-slate-300">{shop.settings.gstin}</strong></span>}
                {shop.settings.fssai_license && <span>FSSAI: <strong className="font-bold text-slate-700 dark:text-slate-300">{shop.settings.fssai_license}</strong></span>}
              </div>
            )}
          </div>

          {/* Metadata Block */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-dashed border-slate-350 pb-4">
            <div>
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Bill ID</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-250">#{String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase()}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Channel</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-250 capitalize">{order.order_type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-450 block uppercase tracking-wider">Date & Time</span>
              <span className="text-slate-800 dark:text-slate-250">{new Date(order.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
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
                <span className="text-[9px] text-slate-450 block uppercase tracking-wider">{businessCategory.tableOrStallLabel}</span>
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
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-mono font-bold text-slate-450 uppercase tracking-widest">Ordered Items</p>
              {isDineIn && !isPendingVendor && !isActuallyCancelled && !isCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    const tableParam = order.table_number ? `?table=${encodeURIComponent(order.table_number)}` : '';
                    navigate(`/shop/${id}${tableParam}`);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer active:scale-95 border border-orange-500/20"
                >
                  <Plus size={11} />
                  <span>Add More</span>
                </button>
              )}
            </div>
            {(order.items || []).map((it: any) => {
              const isReplaced = it.is_cancelled && String(it.cancellation_reason || '').startsWith('Replaced with');
              return (
                <div key={it.id} className="flex justify-between text-xs font-mono">
                  <span className={`flex-1 pr-4 ${it.is_cancelled ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-350'}`}>
                    {it.name} <strong className="text-slate-900 dark:text-white px-1 bg-slate-200/50 dark:bg-slate-800 rounded">x{it.quantity}</strong>
                    {it.is_cancelled && (
                      <span className={`ml-1.5 text-[9px] font-bold uppercase not-italic no-underline inline-block ${
                        isReplaced ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'
                      }`}>
                        ({isReplaced ? 'Replaced' : 'Cancelled'})
                      </span>
                    )}
                  </span>
                  <span className={`font-black ${it.is_cancelled ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {shop?.settings?.currency || '₹'}{(it.price * it.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Order Bill Breakdown */}
          <div className="pt-2 space-y-2 text-xs font-mono border-b border-dashed border-slate-350 pb-4">
            <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mb-3">Order Bill Breakdown</p>
            
            <div className="flex justify-between text-slate-700 dark:text-slate-350">
              <span>{isActuallyCancelled ? 'Ordered Items Total' : 'Item total'}</span>
              <span className="font-black text-slate-900 dark:text-white">
                {shop?.settings?.currency || '₹'}
                {(
                  isActuallyCancelled && activeItemsSubtotal === 0
                    ? allItemsSubtotal
                    : activeItemsSubtotal
                ).toFixed(2)}
              </span>
            </div>

            {replacedCredit > 0 && isUnpaid && (
              <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                <span>Previous Payment (Replaced Items)</span>
                <span>-{shop?.settings?.currency || '₹'}{replacedCredit.toFixed(2)}</span>
              </div>
            )}

            {isActuallyCancelled && (
              <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                <span>Cancelled Order Adjustment</span>
                <span>-{shop?.settings?.currency || '₹'}{(
                  backendTotal > 0 
                    ? backendTotal 
                    : (computedFoodTotal > 0 ? computedFoodTotal : allItemsSubtotal)
                ).toFixed(2)}</span>
              </div>
            )}
            
            {(() => {
              const hasReplacedOrCancelledItems = (order.items || []).some((it: any) => it.is_cancelled);
              const discountAmount = (!isActuallyCancelled && !hasReplacedOrCancelledItems && backendTotal > 0 && computedFoodTotal > backendTotal)
                ? Math.max(0, computedFoodTotal - backendTotal)
                : 0;
              if (discountAmount > 0.01) {
                return (
                  <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span>-{shop?.settings?.currency || '₹'}{discountAmount.toFixed(2)}</span>
                  </div>
                );
              }
              return null;
            })()}

            {order.order_type === 'delivery' && (() => {
              const itemsSubtotal = (order.items || []).filter((it: any) => !it.is_cancelled).reduce((acc: number, it: any) => acc + (Number(it.price) * Number(it.quantity)), 0);
              const diff = Number(order.total_amount) - itemsSubtotal;
              if (diff > 0.01) {
                return (
                  <div className="flex justify-between text-slate-700 dark:text-slate-350">
                    <span>Delivery partner fee</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {shop?.settings?.currency || '₹'}{diff.toFixed(2)}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
            
            {isOnlineFeeApplicable && (
              <>
                <div className="flex justify-between text-slate-700 dark:text-slate-350">
                  <span>Platform fee</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {currencySymbol}{platformFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700 dark:text-slate-350">
                  <span>Payment gateway fee</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {currencySymbol}{totalPgFee.toFixed(2)}
                  </span>
                </div>
              </>
            )}

            {/* GST Tax Breakdown */}
            {shop?.settings?.gst_enabled && (() => {
              const cgstRate = Number(shop.settings.cgst_rate || 0);
              const sgstRate = Number(shop.settings.sgst_rate || 0);
              const totalTaxRate = cgstRate + sgstRate;
              if (totalTaxRate <= 0) return null;

              const itemsSubtotal = (order.items || []).filter((it: any) => !it.is_cancelled).reduce((acc: number, it: any) => acc + (Number(it.price) * Number(it.quantity)), 0);
              if (isActuallyCancelled || itemsSubtotal <= 0) return null;

              let taxable = itemsSubtotal;
              let cgst = 0;
              let sgst = 0;
              if (shop.settings.inclusive_tax) {
                taxable = Math.round((itemsSubtotal / (1 + totalTaxRate / 100)) * 100) / 100;
                const totalTax = Math.round((itemsSubtotal - taxable) * 100) / 100;
                cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
                sgst = Math.round((totalTax - cgst) * 100) / 100;
              } else {
                // Exclusive mode: itemsSubtotal is the taxable turnover
                taxable = itemsSubtotal;
                const totalTax = Math.round((taxable * (totalTaxRate / 100)) * 100) / 100;
                cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
                sgst = Math.round((totalTax - cgst) * 100) / 100;
              }
              return (
                <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Turnover</span>
                    <span className="font-bold">{shop?.settings?.currency || '₹'}{taxable.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-350">
                    <span>CGST ({cgstRate}%)</span>
                    <span className="font-bold">{shop?.settings?.currency || '₹'}{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-slate-350">
                    <span>SGST ({sgstRate}%)</span>
                    <span className="font-bold">{shop?.settings?.currency || '₹'}{sgst.toFixed(2)}</span>
                  </div>
                  <p className="text-[9px] text-slate-400 italic text-right">
                    {shop.settings.inclusive_tax ? '(Item prices are inclusive of GST)' : '(Exclusive: Tax added on items)'}
                  </p>
                </div>
              );
            })()}
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
                order.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                order.payment_status === 'refunded' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                'bg-amber-100 text-amber-850 border border-amber-200'
              }`}>
                {order.payment_status}
              </span>
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center py-2">
            <span className="font-mono font-black text-slate-850 dark:text-white text-sm uppercase">Total Payable</span>
            <span className="font-black text-2xl tracking-tight text-orange-600">
              {isActuallyCancelled ? `${currencySymbol}0.00` : `${currencySymbol}${grandTotalFormatted}`}
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
                size={90} 
                level="H" 
                fgColor="#000000" 
                bgColor="#ffffff"
                imageSettings={shop?.logo_url ? {
                  src: shop.logo_url,
                  x: undefined,
                  y: undefined,
                  height: 24,
                  width: 24,
                  excavate: true,
                } : undefined}
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
            {shop?.settings?.tax_invoice_notes && (
              <p className="mt-2 text-[8px] font-mono text-slate-400 text-center max-w-[240px] leading-tight">
                {shop.settings.tax_invoice_notes}
              </p>
            )}
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

        {/* Awaiting Vendor Acceptance */}
        {isPendingVendor && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs font-medium flex items-center gap-3">
            <Clock size={18} className="text-blue-600 shrink-0 animate-spin" />
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-200">Awaiting Merchant Acceptance</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                The restaurant is reviewing your order. Payment options will be activated once your order is accepted.
              </p>
            </div>
          </div>
        )}

        {/* Payment Locked Notice for pending acceptance */}
        {isUnpaid && !isCancelled && isPaymentDisabledUntilAccepted && (
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-200/80 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Payment Available After Acceptance
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                Payment options will be unlocked automatically as soon as the merchant accepts your order.
              </p>
            </div>
          </div>
        )}

        {/* Payment Action Options — Displayed whenever the order is unpaid and payment is permitted */}
        {canPayNow && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-900/60 shadow-lg shadow-amber-500/5 space-y-4"
          >
            {/* Payment header with window timer if active */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center text-orange-600">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Complete Payment
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {order.payment_method === 'cash' || order.payment_method === 'cash_on_delivery'
                      ? 'Cash on Delivery selected'
                      : 'Choose your payment option below'}
                  </p>
                </div>
              </div>

              {timeLeft && timeLeft !== 'EXPIRED' && (
                <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 rounded-full text-[9px] font-black animate-pulse">
                  <Clock size={10} />
                  <span>{timeLeft}</span>
                </div>
              )}
            </div>

            {/* Online payment via Razorpay / Cards / UPI / NetBanking */}
            {(
              shop?.settings?.online_payments_enabled !== false && (
                order.order_type === 'dine_in' ? shop?.settings?.online_payments_dinein_enabled !== false :
                order.order_type === 'takeaway' ? shop?.settings?.online_payments_takeaway_enabled !== false :
                order.order_type === 'delivery' ? shop?.settings?.online_payments_delivery_enabled !== false : true
              )
            ) && (
              <div className="space-y-1.5">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePayOnline}
                  disabled={isRedirecting}
                  className="w-full py-3.5 px-4 rounded-2xl text-white font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 cursor-pointer disabled:opacity-50"
                  style={{ boxShadow: `0 4px 15px ${primaryColor}40` }}
                >
                  {isRedirecting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span className="text-xs uppercase tracking-wider">
                        Pay Online Instantly ({currencySymbol}{grandTotalFormatted})
                      </span>
                    </>
                  )}
                </motion.button>
                <p className="text-[9px] text-center text-slate-400">
                  Instant UPI (GPay / PhonePe / Paytm), Cards & NetBanking
                </p>
              </div>
            )}



            {/* Cash on Delivery / Counter information note */}
            {(order.payment_method === 'cash' || order.payment_method === 'cash_on_delivery') && (
              <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-start gap-2.5">
                <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                    Pay with Cash / Counter
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
                    You can pay cash to the delivery partner or at counter. You can also pay online instantly using the button above.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Cancelled / Rejected Order Notice */}
        {(order.order_status?.toUpperCase() === 'REJECTED' || order.order_status?.toUpperCase() === 'CANCELLED') && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-3">
            <XCircle size={22} className="text-rose-600 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Order Cancelled / Rejected</p>
              <p className="text-[11px] font-medium opacity-90 mt-0.5">
                {order.cancellation_reason ? (
                  <span>Reason: <span className="font-bold">{order.cancellation_reason}</span></span>
                ) : (
                  'This order was rejected or cancelled. Online payment is disabled.'
                )}
              </p>
            </div>
          </div>
        )}

        {/* Cancelled Items / Refund Notice (Bottom Banner) */}
        {(() => {
          // Pure cancelled items (exclude replaced items)
          const pureCancelledItems = (order.items || []).filter(
            (it: any) => it.is_cancelled && !String(it.cancellation_reason || '').startsWith('Replaced with')
          );
          const isFullyCancelled = order.order_status?.toUpperCase() === 'CANCELLED' || order.order_status?.toUpperCase() === 'REJECTED' || (order.items?.length > 0 && pureCancelledItems.length === order.items?.length);
          const hasCancelledItems = pureCancelledItems.length > 0;

          // If the order is NOT cancelled and does NOT contain any cancelled items, do not show refund notice!
          if (!isFullyCancelled && !hasCancelledItems) return null;

          const rawCancelledTotal = pureCancelledItems.reduce(
            (acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0
          );
          const isPaid = ['paid', 'refunded', 'partially_refunded'].includes(String(order?.payment_status || '').toLowerCase());

          // Compute exact refundable/refunded amount accounting for predecessors and paid differences
          const refundableRefundTotal = (order?.items || []).reduce((acc: number, it: any) => {
            if (it.is_cancelled && !String(it.cancellation_reason || '').startsWith('Replaced with')) {
              const predecessor = (order?.items || []).find((p: any) =>
                p.is_cancelled && String(p.cancellation_reason || '').startsWith(`Replaced with ${it.name}`)
              );
              if (predecessor) {
                return acc + Math.min(Number(it.price || 0) * Number(it.quantity || 1), Number(predecessor.price || 0) * Number(predecessor.quantity || 1));
              }
              return acc + (Number(it.price || 0) * Number(it.quantity || 1));
            }
            return acc;
          }, 0);

          const pureCancelledTotal = isFullyCancelled
            ? (Number(order.total_amount || 0) > 0 ? Number(order.total_amount) : (allItemsSubtotal > 0 ? allItemsSubtotal : (refundableRefundTotal > 0 ? refundableRefundTotal : rawCancelledTotal)))
            : (refundableRefundTotal > 0 ? refundableRefundTotal : rawCancelledTotal);

          if (pureCancelledTotal <= 0.01) return null;

          const isRefundAllowed = shop?.settings?.refund_allowed !== false;

          return (
            <div className={`p-4 rounded-2xl ${isRefundAllowed ? 'bg-rose-50/90 dark:bg-rose-950/30 border-rose-200/90 dark:border-rose-900/50 text-rose-900 dark:text-rose-200' : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200'} border text-xs font-medium flex items-start gap-3 shadow-xs`}>
              <div className={`w-8 h-8 rounded-xl ${isRefundAllowed ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'} flex items-center justify-center shrink-0 mt-0.5`}>
                <Info size={18} />
              </div>
              <div className="space-y-0.5 text-left">
                <p className={`font-extrabold text-[11px] uppercase tracking-wider ${isRefundAllowed ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-400'}`}>
                  {isPaid ? (isRefundAllowed ? 'Refund Notice' : 'Cancellation & Policy Notice') : 'Order Adjustment Notice'}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {isPaid
                    ? (isRefundAllowed
                        ? (shop?.settings?.refund_policy_notes || `The amount for cancelled ${isFullyCancelled ? 'order' : 'items'} (${shop?.settings?.currency || '₹'}${pureCancelledTotal.toFixed(2)}) will be refunded to your account within 5–7 working days.`)
                        : (shop?.settings?.refund_policy_notes || `This store has a strict no-refund policy. As per store rules, the amount for cancelled ${isFullyCancelled ? 'order' : 'items'} (${shop?.settings?.currency || '₹'}${pureCancelledTotal.toFixed(2)}) is non-refundable.`))
                    : `The amount for cancelled ${isFullyCancelled ? 'order' : 'items'} (${shop?.settings?.currency || '₹'}${pureCancelledTotal.toFixed(2)}) has been deducted from your payable total.`
                  }
                </p>
              </div>
            </div>
          );
        })()}

        {/* Item Replaced - Difference Due / Pending Banner */}
        {isUnpaid && !isCancelled && (order.items || []).some((it: any) => String(it.cancellation_reason || '').startsWith('Replaced with')) && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard size={18} />
            </div>
            <div className="space-y-0.5 text-left">
              <p className="font-extrabold text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Item Replaced — Payment Difference Due
              </p>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                An item was replaced with a higher-priced item. Please pay the remaining balance using the button below.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Store Policies (Refund, Return & Replacement) */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-amber-600 dark:text-amber-400" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Store Order & Cancellation Policies
            </h4>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* Cancellation Policy */}
            <div className="pt-1.5 first:pt-0">
              <strong className="text-slate-900 dark:text-white font-semibold">
                {shop?.settings?.refund_allowed === false ? '• Cancellation Policy (No Refunds): ' : '• Cancellation Policy: '}
              </strong>
              <span>
                {shop?.settings?.refund_allowed === false
                  ? (shop?.settings?.refund_policy_notes || 'This store operates under a strict no-refund policy. Orders cannot be refunded upon cancellation.')
                  : (shop?.settings?.refund_policy_notes || 'If any item is cancelled or unavailable, 100% of product value is refunded to original source in 5-7 business days.')
                }
              </span>
            </div>

            {/* Replacement Policy */}
            <div className="pt-1.5">
              <strong className="text-slate-900 dark:text-white font-semibold">
                {shop?.settings?.replacement_allowed === false ? '• Replacement Policy (No Replacements): ' : `• Replacement Policy ${shop?.settings?.replacement_window_days ? `(${shop.settings.replacement_window_days} Days)` : ''}: `}
              </strong>
              <span>
                {shop?.settings?.replacement_allowed === false
                  ? (shop?.settings?.replacement_policy_notes || 'Item replacements are not accepted on public orders.')
                  : (shop?.settings?.replacement_policy_notes || 'Free replacement provided for damaged or mismatched delivered items.')
                }
              </span>
            </div>

            <div className="pt-1.5">
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium italic">
                *Terms & conditions applicable
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Spacing to offset fixed bottom dock */}
        <div className="h-20 print:hidden" />
      </main>

      {/* Floating Premium Bottom Actions Dock */}
      <div className="fixed bottom-4 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] sm:max-w-lg z-40 print:hidden">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.15)] border border-slate-200/80 dark:border-slate-800 p-2 flex items-center gap-2">

          {/* Bottom Dock Action Buttons - Dine-in only for adding items to current table order */}
          {isDineIn && !isActuallyCancelled && !isCompleted && !isPendingVendor && (
            <button
              onClick={() => {
                const tableParam = order.table_number ? `?table=${encodeURIComponent(order.table_number)}` : '';
                navigate(`/shop/${id}${tableParam}`);
              }}
              className="flex-1 min-w-0 py-2.5 px-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 rounded-xl font-heading font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
              title="Add more items to this order"
            >
              <Plus size={13} className="shrink-0" />
              <span className="leading-tight">Order More</span>
            </button>
          )}

          {canPayNow && (
            shop?.settings?.online_payments_enabled !== false && (
              order.order_type === 'dine_in' ? shop?.settings?.online_payments_dinein_enabled !== false :
              order.order_type === 'takeaway' ? shop?.settings?.online_payments_takeaway_enabled !== false :
              order.order_type === 'delivery' ? shop?.settings?.online_payments_delivery_enabled !== false : true
            )
          ) ? (
            <button
              onClick={handlePayOnline}
              disabled={isRedirecting}
              className="flex-1 min-w-0 py-2.5 px-2.5 text-white rounded-xl font-heading font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 disabled:opacity-50 text-center"
            >
              {isRedirecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white shrink-0" />
              ) : (
                <>
                  <CreditCard size={14} className="shrink-0" />
                  <span className="leading-tight">Pay Now ({currencySymbol}{grandTotalFormatted})</span>
                </>
              )}
            </button>
          ) : isPaymentDisabledUntilAccepted ? (
            <div className="flex-1 min-w-0 py-2.5 px-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-[10px] sm:text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 text-center">
              <Clock size={13} className="text-blue-500 shrink-0 animate-spin" />
              <span className="leading-tight">Awaiting Acceptance</span>
            </div>
          ) : (
            <button
              onClick={() => navigate(`/shop/${id}/orders`)}
              className="flex-1 min-w-0 py-2.5 px-2 text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl font-heading font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
            >
              <History size={13} className="shrink-0" />
              <span className="leading-tight">View Orders</span>
            </button>
          )}
          <button
            onClick={() => setIsReceiptSheetOpen(true)}
            className="flex-1 min-w-0 py-2.5 px-2 text-white rounded-xl font-heading font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm text-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Receipt size={13} className="shrink-0" />
            <span className="leading-tight">Receipt</span>
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
            Please select an action below for order #{String(order.daily_order_number || (order.daily_order_number || order.id.slice(0, 8))).toUpperCase()}.
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
