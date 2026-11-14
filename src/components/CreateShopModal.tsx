import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, Check, Building2, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { BUSINESS_CATEGORIES, getCategoryIcon, isSchemeDefaultCategory } from '@/config/businessCategories';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface CreateShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedShops?: Array<{ id: string; name: string }>;
  onSuccess?: (newShop: any) => void;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function CreateShopModal({ isOpen, onClose, ownedShops = [], onSuccess }: CreateShopModalProps) {
  const { user } = useAuthStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('restaurants_cafes_hotels');
  const [selectedSourceShopId, setSelectedSourceShopId] = useState<string>(ownedShops[0]?.id || '');
  const [cloneFromShopId, setCloneFromShopId] = useState<string>(ownedShops[0]?.id || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<{
    required: boolean;
    base_amount: number;
    pg_fee: number;
    gst_on_fee: number;
    amount: number;
    currency: string;
  }>({
    required: true,
    base_amount: 50,
    pg_fee: 1.50,
    gst_on_fee: 0.27,
    amount: 51.77,
    currency: 'INR'
  });
  const [loadingPricing, setLoadingPricing] = useState(false);

  const isAdditionalShop = ownedShops.length > 0;
  const selectedShop = ownedShops.find((s) => s.id === (cloneFromShopId || selectedSourceShopId)) || ownedShops[0];
  const selectedShopName = selectedShop?.name || 'Primary Store';

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCategory('restaurants_cafes_hotels');
      const initialShopId = ownedShops[0]?.id || '';
      setSelectedSourceShopId(initialShopId);
      setCloneFromShopId(initialShopId);

      const checkPricing = async () => {
        if (!isAdditionalShop) {
          setPricingInfo({
            required: false,
            base_amount: 0,
            pg_fee: 0,
            gst_on_fee: 0,
            amount: 0,
            currency: 'INR'
          });
          return;
        }

        setLoadingPricing(true);
        try {
          const res = await api.post('/shops/additional-shop-order');
          setPricingInfo({
            required: res.data.required ?? true,
            base_amount: res.data.base_amount ?? 50,
            pg_fee: res.data.pg_fee ?? 1.50,
            gst_on_fee: res.data.gst_on_fee ?? 0.27,
            amount: res.data.amount ?? 51.77,
            currency: res.data.currency || 'INR'
          });
        } catch (err) {
          console.error("Failed to check shop creation pricing", err);
          setPricingInfo({
            required: isAdditionalShop,
            base_amount: 50,
            pg_fee: 1.50,
            gst_on_fee: 0.27,
            amount: 51.77,
            currency: 'INR'
          });
        } finally {
          setLoadingPricing(false);
        }
      };

      checkPricing();
    }
  }, [isOpen, ownedShops.length, isAdditionalShop, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a shop or branch name');
      return;
    }

    if (!user?.phone_verified) {
      toast.error('Phone verification required before creating a shop');
      window.location.href = '/verify-phone';
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        category,
        clone_from_shop_id: cloneFromShopId || undefined,
        savings_schemes_enabled: isSchemeDefaultCategory(category),
      };

      // 1. If shop creation payment is required, initiate order & payment
      if (pricingInfo?.required) {
        const orderRes = await api.post('/shops/additional-shop-order');
        const orderData = orderRes.data;

        if (orderData.required) {
          // If in mock mode or fallback
          if (orderData.mock_mode) {
            payload.razorpay_order_id = orderData.order_id;
            payload.razorpay_payment_id = `pay_mock_${Date.now()}`;
            payload.razorpay_signature = 'sig_mock_verified';
          } else {
            // Live Razorpay Checkout
            const isLoaded = await loadRazorpayScript();
            if (!isLoaded) {
              toast.error('Razorpay SDK failed to load. Please check your internet connection.');
              setIsSubmitting(false);
              return;
            }

            const paymentPromise = new Promise<{ order_id: string; payment_id: string; signature: string }>((resolve, reject) => {
              const options = {
                key: orderData.key_id,
                amount: Math.round(orderData.amount * 100),
                currency: orderData.currency || 'INR',
                name: 'Menukit QR',
                description: isAdditionalShop ? `Additional Branch Setup (₹${orderData.amount})` : `Shop Creation Fee (₹${orderData.amount})`,
                order_id: orderData.order_id,
                prefill: {
                  name: user?.email?.split('@')[0] || 'Merchant',
                  email: user?.email || '',
                  contact: user?.phone || '',
                },
                theme: { color: '#f97316' },
                handler: (response: any) => {
                  resolve({
                    order_id: response.razorpay_order_id,
                    payment_id: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                  });
                },
                modal: {
                  ondismiss: () => {
                    reject(new Error('Payment window was closed'));
                  },
                },
              };

              const rzp = new (window as any).Razorpay(options);
              rzp.open();
            });

            const paymentResult = await paymentPromise;
            payload.razorpay_order_id = paymentResult.order_id;
            payload.razorpay_payment_id = paymentResult.payment_id;
            payload.razorpay_signature = paymentResult.signature;
          }
        }
      }

      // 2. Create the shop in backend
      const res = await api.post('/shops', payload);
      const newShop = res.data;

      localStorage.setItem('current_shop_id', newShop.id);
      useAuthStore.getState().fetchUser();

      toast.success(isAdditionalShop ? '🎉 New branch created successfully!' : '🎉 Shop created successfully!');
      
      if (onSuccess) {
        onSuccess(newShop);
      }
      onClose();
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Failed to create shop', err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (err.message || 'Failed to create shop');
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="relative px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xs">
              <Store size={16} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-slate-900 dark:text-white leading-tight">
                {isAdditionalShop ? 'Create New Branch / Shop' : 'Create New Shop'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdditionalShop ? 'Add an additional branch to your merchant account' : 'Set up your store and start managing your menu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Shop Creation Pricing Badge */}
          {pricingInfo?.required && (
            <div className="p-3.5 rounded-md bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/50 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-bold text-xs sm:text-sm text-orange-950 dark:text-orange-200">
                    {isAdditionalShop ? 'Additional Branch Fee' : 'One-Time Shop Creation Fee'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-500 text-white shadow-2xs">
                    ₹{pricingInfo.amount.toFixed(2)} Total
                  </span>
                </div>
                <p className="text-xs text-orange-800/80 dark:text-orange-300/80 mt-0.5 leading-relaxed">
                  {isAdditionalShop 
                    ? `One-time ₹${pricingInfo.base_amount.toFixed(0)} fee + ₹${(pricingInfo.pg_fee + pricingInfo.gst_on_fee).toFixed(2)} payment gateway fee (3% + 18% GST).` 
                    : `One-time ₹${pricingInfo.base_amount.toFixed(0)} setup fee + ₹${(pricingInfo.pg_fee + pricingInfo.gst_on_fee).toFixed(2)} payment gateway fee (3% + 18% GST).`}
                </p>
                <div className="mt-2 pt-1.5 border-t border-orange-200/60 dark:border-orange-800/40 flex items-center justify-between text-[10.5px] text-orange-900/80 dark:text-orange-200/80 font-medium">
                  <span>Base: ₹{pricingInfo.base_amount.toFixed(2)} • PG: ₹{(pricingInfo.pg_fee + pricingInfo.gst_on_fee).toFixed(2)}</span>
                  <strong className="font-bold text-orange-700 dark:text-orange-300">Total: ₹{pricingInfo.amount.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Shop / Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Siva Hotel & Cafe"
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none focus:ring-1.5 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Business Category
            </label>
            <SearchableSelect
              options={BUSINESS_CATEGORIES.map((cat) => ({
                id: cat.id,
                name: cat.label,
                badge: cat.shortLabel,
                subtext: cat.description,
                icon: getCategoryIcon(cat.id, 14)
              }))}
              value={category}
              onChange={(val) => setCategory(val)}
              placeholder="Select business category"
              showSearch={true}
            />
          </div>

          {/* Menu Sharing / Clone Option (if user has existing shops) */}
          {isAdditionalShop && ownedShops.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Menu Setup Option
              </label>
              <div className="space-y-2">
                {/* Option 1: Share Menu from existing shop */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    Boolean(cloneFromShopId)
                      ? 'border-orange-500/60 bg-orange-50/25 dark:bg-orange-950/20 ring-1 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-100/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="menu_option"
                      checked={Boolean(cloneFromShopId)}
                      onChange={() => setCloneFromShopId(selectedSourceShopId || ownedShops[0]?.id || '')}
                      className="w-4 h-4 mt-0.5 text-orange-500 focus:ring-orange-500 border-slate-300 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                        Share Menu from existing shop
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Syncs categories and menu items with {selectedShopName}
                      </span>
                    </div>
                  </label>

                  {/* Dropdown to select WHICH shop to share/sync menu from */}
                  {Boolean(cloneFromShopId) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 pl-6.5 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Select Shop to Sync Menu From
                      </label>
                      <SearchableSelect
                        options={ownedShops.map((s) => ({
                          id: s.id,
                          name: s.name,
                          icon: <Building2 className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        }))}
                        value={cloneFromShopId || selectedSourceShopId}
                        onChange={(val) => {
                          setSelectedSourceShopId(val);
                          setCloneFromShopId(val);
                        }}
                        placeholder="Select a shop to sync menu from"
                        showSearch={ownedShops.length > 5}
                        className="h-9 rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Option 2: Start with clean / empty menu */}
                <div
                  className={`p-3 rounded-lg border transition-all ${
                    !cloneFromShopId
                      ? 'border-orange-500/60 bg-orange-50/25 dark:bg-orange-950/20 ring-1 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-100/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="menu_option"
                      checked={!cloneFromShopId}
                      onChange={() => setCloneFromShopId('')}
                      className="w-4 h-4 mt-0.5 text-orange-500 focus:ring-orange-500 border-slate-300 cursor-pointer"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                        Start with clean / empty menu
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Create brand new categories and dishes from scratch
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || loadingPricing}
              className="py-2 px-5 rounded-md bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Setup...</span>
                </>
              ) : pricingInfo?.required ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹{pricingInfo.amount.toFixed(2)} & {isAdditionalShop ? 'Create Branch' : 'Create Shop'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  <span>{isAdditionalShop ? 'Create Branch' : 'Create Shop'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
