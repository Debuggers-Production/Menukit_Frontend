import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ShoppingBag, Plus, Minus, Info, ChevronLeft } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { api } from '@/services/api';
import { Shop, Discount } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export function PublicCartPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, manualDiscountId, setManualDiscount } = useCartStore();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [memberStatus] = useState<'unlocked' | 'verified-member' | null>(() => {
    return sessionStorage.getItem('member_status') as any;
  });

  // Fetch shop and discounts
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Try getting shop from session cache first for instant load
        const cachedDataStr = sessionStorage.getItem(`menu_cache_${id}`);
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
              setShop(cachedData.shop);
            }
          } catch (e) {}
        }

        // Fetch fresh shop if not in cache
        if (!shop) {
          const shopRes = await api.get(`/public/shop/${id}`);
          setShop(shopRes.data);
        }

        // Fetch discounts
        const discountRes = await api.get(`/public/shop/${id}/discounts`);
        const now = new Date();
        const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const filteredDiscounts = (discountRes.data || []).filter((d: Discount) => {
          if (d.available_days && d.available_days.length > 0) {
            if (!d.available_days.includes(currentDay)) return false;
          }
          if (d.available_time_presets && d.available_time_presets.length > 0) {
            const timingFilters = [];
            if (currentTime >= 240 && currentTime < 480) timingFilters.push('Early Morning');
            if (currentTime >= 480 && currentTime < 720) timingFilters.push('Morning');
            if (currentTime >= 720 && currentTime < 960) timingFilters.push('Afternoon');
            if (currentTime >= 960 && currentTime < 1200) timingFilters.push('Evening');
            if (currentTime >= 1200 && currentTime < 1440) timingFilters.push('Night');
            if (currentTime >= 0 && currentTime < 240) timingFilters.push('Mid-night');

            if (!timingFilters.some(t => d.available_time_presets?.includes(t))) return false;
          }
          return true;
        });

        setAvailableDiscounts(filteredDiscounts);
      } catch (error) {
        console.error("Failed to load cart data", error);
        toast.error("Failed to load shop details.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [id, memberStatus]);

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  const { subtotal, automaticDiscountAmount, manualDiscountAmount, finalTotal, appliedAutoDiscounts } = useMemo(() => {
    let subtotal = 0;
    let autoDiscountTotal = 0;
    const appliedAutoDiscounts = new Set<string>();

    items.forEach(item => {
      const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
      
      let basePrice = 0;
      if (menuItem.variants && menuItem.variants.length > 0) {
        basePrice = Number(menuItem.variants[selectedVariantIdx].price);
      } else {
        basePrice = Number(menuItem.price);
      }
      
      let addonsPrice = 0;
      if (menuItem.addons) {
        selectedAddons.forEach(idx => {
          addonsPrice += Number(menuItem.addons![idx].price);
        });
      }

      const itemSubtotal = (basePrice + addonsPrice) * quantity;
      subtotal += itemSubtotal;

      // Calculate automatic discount
      let finalPrice = basePrice;
      if (!manualDiscountId) {
        if (menuItem.offer_price) {
          finalPrice = Number(menuItem.offer_price);
        } else if (menuItem.variants && menuItem.variants.length > 0 && menuItem.variants[selectedVariantIdx].offer_price) {
          finalPrice = Number(menuItem.variants[selectedVariantIdx].offer_price);
        } else {
          const disc = availableDiscounts.find(d => {
            if (d.id === manualDiscountId) return false;
            if (d.visibility_type === 'members_only_hidden' && memberStatus !== 'verified-member') return false;
            if (d.visibility_type === 'members_only_visible' && memberStatus !== 'verified-member') return false;
            if (d.visibility_type === 'unlock_required' && memberStatus === null) return false;
            if (d.discount_type === 'bogo' || d.discount_type === 'combo') return false;
            if (d.applies_to === 'all') return true;
            if (d.applies_to === 'category' && d.target_ids?.includes(menuItem.category_id)) return true;
            if (d.applies_to === 'items' && d.target_ids?.includes(menuItem.id)) return true;
            return false;
          });

          if (disc) {
            const v = Number(disc.discount_value);
            if (disc.discount_type === 'percentage') {
              finalPrice = basePrice * (1 - v / 100);
            } else {
              finalPrice = Math.max(0, basePrice - v);
            }
            appliedAutoDiscounts.add(disc.title);
          }
        }
      }

      autoDiscountTotal += (basePrice - finalPrice) * quantity;
    });

    let manualDiscountAmount = 0;
    if (manualDiscountId) {
      const manualDisc = availableDiscounts.find(d => d.id === manualDiscountId);
      if (manualDisc) {
        const afterAuto = subtotal;
        const v = Number(manualDisc.discount_value);
        if (manualDisc.discount_type === 'percentage') {
          manualDiscountAmount = afterAuto * (v / 100);
        } else if (manualDisc.discount_type === 'flat') {
          manualDiscountAmount = v;
        }
      }
    }

    const finalTotal = Math.max(0, subtotal - autoDiscountTotal - manualDiscountAmount);

    return {
      subtotal,
      automaticDiscountAmount: autoDiscountTotal,
      manualDiscountAmount,
      finalTotal,
      appliedAutoDiscounts: Array.from(appliedAutoDiscounts)
    };
  }, [items, availableDiscounts, manualDiscountId, memberStatus]);

  const [showAllItemsModal, setShowAllItemsModal] = useState(false);
  const [showAllOffersModal, setShowAllOffersModal] = useState(false);

  const renderItem = (item: any) => {
    const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
    
    let basePrice = 0;
    if (menuItem.variants && menuItem.variants.length > 0) {
      basePrice = Number(menuItem.variants[selectedVariantIdx].price);
    } else {
      basePrice = Number(menuItem.price);
    }
    
    let addonsPrice = 0;
    if (menuItem.addons) {
      selectedAddons.forEach((idx: number) => {
        addonsPrice += Number(menuItem.addons![idx].price);
      });
    }

    const variantName = menuItem.variants && menuItem.variants.length > 0 ? menuItem.variants[selectedVariantIdx].name : '';
    const addonNames = menuItem.addons ? selectedAddons.map((idx: number) => menuItem.addons![idx].name).join(', ') : '';

    return (
      <div key={item.id} className={`flex gap-3 p-3 ${borderRadiusClass} bg-white shadow-sm border border-slate-100 relative group`}>
        <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
          {(menuItem.image_url || (menuItem.images && menuItem.images[0]?.image_url)) ? (
            <img 
              src={menuItem.image_url || menuItem.images![0].image_url} 
              alt={menuItem.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-slate-400 font-bold text-lg">{menuItem.name.substring(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start gap-2 mb-1">
              <h4 className="font-bold text-base text-slate-800 leading-tight line-clamp-2">{menuItem.name}</h4>
              <span className="font-black text-sm shrink-0 whitespace-nowrap" style={{ color: primaryColor }}>
                {shop?.settings?.currency || '₹'}{(basePrice + addonsPrice) * quantity}
              </span>
            </div>
            
            {(variantName || addonNames) && (
              <div className="text-xs font-medium text-slate-500 mb-2 leading-snug">
                {variantName && <span>{variantName}</span>}
                {variantName && addonNames && <span> • </span>}
                {addonNames && <span>+ {addonNames}</span>}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end mt-2">
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-1 border border-slate-200 shadow-inner">
              <button 
                onClick={() => {
                  if (quantity === 1) removeFromCart(item.id);
                  else updateQuantity(item.id, -1);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-sm font-black w-6 text-center text-slate-800">{quantity}</span>
              <button 
                onClick={() => updateQuantity(item.id, 1)}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white shadow-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderOffer = (disc: Discount) => {
    return (
      <button
        key={disc.id}
        onClick={() => setManualDiscount(manualDiscountId === disc.id ? null : disc.id)}
        className={`w-full p-4 ${borderRadiusClass} border-2 flex items-center justify-between transition-all ${
          manualDiscountId === disc.id 
            ? 'border-transparent' 
            : 'border-slate-100 hover:border-slate-200'
        }`}
        style={manualDiscountId === disc.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="font-black text-slate-400">%</span>
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-800 leading-tight">{disc.title}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">{disc.description || 'Tap to apply this offer'}</div>
          </div>
        </div>
        <div 
          className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 ${manualDiscountId === disc.id ? '' : 'border-slate-200'}`}
          style={manualDiscountId === disc.id ? { borderColor: primaryColor } : {}}
        >
          {manualDiscountId === disc.id && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />}
        </div>
      </button>
    );
  };

  const visibleItems = items.slice(0, 3);
  const remainingItemsCount = items.length - 3;

  const applicableDiscounts = availableDiscounts.filter(d => ['percentage', 'flat'].includes(d.discount_type) && d.visibility_type !== ('hidden' as any));
  const visibleDiscounts = applicableDiscounts.slice(0, 2);
  const remainingDiscountsCount = applicableDiscounts.length - 2;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        {/* Sticky Header Skeleton */}
        <div className="bg-white shadow-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="w-24 h-5 rounded-md mb-1" />
              <Skeleton className="w-16 h-3 rounded-md" />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Cart Items Skeleton */}
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl bg-white shadow-sm border border-slate-100">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="flex justify-between">
                    <Skeleton className="w-32 h-5 rounded-md" />
                    <Skeleton className="w-16 h-5 rounded-md" />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Skeleton className="w-24 h-8 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Offers Skeleton */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <Skeleton className="w-32 h-6 rounded-md mb-4" />
            <div className="space-y-3">
              {[1].map((i) => (
                <div key={i} className="w-full p-4 rounded-xl border-2 border-slate-100 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-3/4 h-5 rounded-md" />
                    <Skeleton className="w-1/2 h-3 rounded-md" />
                  </div>
                  <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Bill Summary Skeleton */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4 mb-24">
            <Skeleton className="w-24 h-6 rounded-md mb-2" />
            <div className="flex justify-between">
              <Skeleton className="w-20 h-4 rounded-md" />
              <Skeleton className="w-16 h-4 rounded-md" />
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              <Skeleton className="w-16 h-6 rounded-md" />
              <Skeleton className="w-24 h-8 rounded-md" />
            </div>
          </div>
        </div>

        {/* Bottom Bar Skeleton */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe">
          <div className="max-w-2xl mx-auto px-4 py-2 sm:py-3 flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="w-12 h-3 rounded-md" />
              <Skeleton className="w-20 h-5 rounded-md" />
            </div>
            <Skeleton className="flex-[2] py-5 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const { theme } = shop || {};
  const borderRadiusClass = (theme as any)?.border_radius === 'sharp' ? 'rounded-none' : (theme as any)?.border_radius === 'pill' ? 'rounded-3xl' : 'rounded-xl';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-2xl mx-auto pb-[90px]" style={{ fontFamily: theme?.font_family || 'Inter' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/shop/${id}`)}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-700" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
            <ShoppingBag size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 leading-tight">Your Cart</h1>
            <p className="text-xs font-medium text-slate-500">{items.length} items</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
            <ShoppingBag size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-500">Your cart is empty.</p>
            <button 
              onClick={() => navigate(`/shop/${id}`)}
              className="mt-6 px-6 py-2 rounded-full font-bold text-white transition-transform hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: primaryColor }}
            >
              Browse Menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Items List */}
            <div className="space-y-3">
              {visibleItems.map(item => renderItem(item))}
              
              {remainingItemsCount > 0 && (
                <button 
                  onClick={() => setShowAllItemsModal(true)}
                  className="w-full py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-[0.98] border-2 mt-2"
                  style={{ color: primaryColor, backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}
                >
                  View All {items.length} Items
                </button>
              )}
            </div>

            {/* Offers */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>%</div>
                Offers & Benefits
              </h3>
              
              <div className="space-y-3">
                {visibleDiscounts.map(disc => renderOffer(disc))}
                
                {applicableDiscounts.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No offers available at the moment.</p>
                )}
                
                {remainingDiscountsCount > 0 && (
                  <button 
                    onClick={() => setShowAllOffersModal(true)}
                    className="w-full py-2.5 rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-all active:scale-[0.98] border-2 mt-2"
                    style={{ color: primaryColor, backgroundColor: `${primaryColor}15`, borderColor: `${primaryColor}30` }}
                  >
                    View All {applicableDiscounts.length} Offers
                  </button>
                )}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-black text-slate-800 mb-2">Bill Details</h3>
              
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500">Item Total</span>
                <span className="text-slate-800">{shop?.settings?.currency || '₹'}{subtotal.toFixed(2)}</span>
              </div>
              
              {automaticDiscountAmount > 0 && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span className="flex items-center gap-1.5">
                    Auto Discounts
                    <span title={appliedAutoDiscounts.join(', ')}><Info size={14} className="opacity-60" /></span>
                  </span>
                  <span>-{shop?.settings?.currency || '₹'}{automaticDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {manualDiscountAmount > 0 && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Coupon Applied</span>
                  <span>-{shop?.settings?.currency || '₹'}{manualDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="font-black text-slate-800 text-lg">To Pay</span>
                <span className="font-black text-2xl tracking-tight" style={{ color: primaryColor }}>
                  {shop?.settings?.currency || '₹'}{finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slim, Sticky Bottom Bar for Checkout */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-safe">
          <div className="max-w-2xl mx-auto px-4 py-2 sm:py-3 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total</p>
              <p className="font-black text-lg leading-none" style={{ color: primaryColor }}>
                {shop?.settings?.currency || '₹'}{finalTotal.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => toast('Checkout is coming soon!', { icon: '🚧' })}
              className="flex-[2] py-2.5 rounded-xl text-white font-bold text-[15px] shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98] opacity-80 cursor-not-allowed"
              style={{ backgroundColor: primaryColor, boxShadow: `0 4px 20px ${primaryColor}40` }}
            >
              Coming Soon
            </button>
          </div>
        </div>
      )}

      {/* All Items Modal */}
      <Modal 
        isOpen={showAllItemsModal} 
        onClose={() => setShowAllItemsModal(false)}
        title="Your Cart Items"
        className="bg-slate-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-3 mt-4">
          {items.map(item => renderItem(item))}
        </div>
      </Modal>

      {/* All Offers Modal */}
      <Modal 
        isOpen={showAllOffersModal} 
        onClose={() => setShowAllOffersModal(false)}
        title="All Offers"
        className="bg-slate-50 max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-3 mt-4">
          {applicableDiscounts.map(disc => renderOffer(disc))}
        </div>
      </Modal>
    </div>
  );
}
