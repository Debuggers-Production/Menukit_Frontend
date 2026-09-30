import { useState, useEffect } from 'react';
import { X, Store, Sparkles, Check, Building2, CreditCard, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { BUSINESS_CATEGORIES } from '@/config/businessCategories';

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
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cloneFromShopId, setCloneFromShopId] = useState<string>(ownedShops[0]?.id || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<{ required: boolean; amount: number; currency: string } | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const isAdditionalShop = ownedShops.length > 0;

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setPhone(user?.phone || '');
      setAddress('');
      setCloneFromShopId(ownedShops[0]?.id || '');

      const checkPricing = async () => {
        setLoadingPricing(true);
        try {
          const res = await api.post('/shops/additional-shop-order');
          setPricingInfo({
            required: res.data.required ?? isAdditionalShop,
            amount: res.data.amount ?? 50,
            currency: res.data.currency || 'INR'
          });
        } catch (err) {
          console.error("Failed to check additional shop pricing", err);
          setPricingInfo({
            required: isAdditionalShop,
            amount: 50,
            currency: 'INR'
          });
        } finally {
          setLoadingPricing(false);
        }
      };

      checkPricing();
    }
  }, [isOpen, ownedShops.length, user]);

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
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        clone_from_shop_id: cloneFromShopId || undefined,
      };

      // 1. If additional shop payment is required, initiate order & payment
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
                description: `Additional Shop Add-on (₹${orderData.amount}/mo)`,
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

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Store size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-slate-900 dark:text-white leading-tight">
                {isAdditionalShop ? 'Create New Branch / Shop' : 'Create Your First Shop'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAdditionalShop ? 'Add an additional branch to your merchant account' : 'Set up your primary store details'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* Add-on Pricing Badge */}
          {isAdditionalShop && (
            <div className="p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-800/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading font-black text-sm text-orange-950 dark:text-orange-200">
                    Additional Branch Add-on
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-500 text-white shadow-sm">
                    ₹50 / month
                  </span>
                </div>
                <p className="text-xs text-orange-800/80 dark:text-orange-300/80 mt-1 leading-relaxed">
                  Automatically shares your primary store’s active subscription plan, unlocked modules, and customized catalog.
                </p>
              </div>
            </div>
          )}

          {/* Shop Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Shop / Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Siva Hotel - Branch 2"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Business Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium cursor-pointer"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Menu Sharing / Clone Option (if user has existing shops) */}
          {isAdditionalShop && ownedShops.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Menu Setup Option
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="menu_option"
                    checked={Boolean(cloneFromShopId)}
                    onChange={() => setCloneFromShopId(ownedShops[0]?.id || '')}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Share Menu from existing shop
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Syncs categories and menu items with {ownedShops[0]?.name || 'Primary Store'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="menu_option"
                    checked={!cloneFromShopId}
                    onChange={() => setCloneFromShopId('')}
                    className="w-4 h-4 text-orange-500 focus:ring-orange-500 border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                      Start with clean / empty menu
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Create brand new categories and dishes from scratch
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Optional Phone & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Area / City
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Gandhinagar, Bengaluru"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* Short Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Tagline / Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Delicious South Indian meals & filter coffee"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || loadingPricing}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-heading font-black text-sm shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Setup...</span>
                </>
              ) : isAdditionalShop ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₹50 & Create Branch</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Free Shop</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
