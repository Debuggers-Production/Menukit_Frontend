import { useMemo } from 'react';
import { ShoppingBag, X, Plus, Minus, Info } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Discount, Shop } from '@/types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  availableDiscounts: Discount[];
  memberStatus: 'unlocked' | 'verified-member' | null;
}

export function CartModal({ isOpen, onClose, shop, availableDiscounts, memberStatus }: CartModalProps) {
  const { items, updateQuantity, removeFromCart, manualDiscountId, setManualDiscount } = useCartStore();
  
    
  const primaryColor = shop.theme?.primary_color || '#ea580c';

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

      // Calculate automatic discount for this item only if no manual discount is selected
      let finalPrice = basePrice;
      if (!manualDiscountId) {
        if (menuItem.offer_price) {
          finalPrice = Number(menuItem.offer_price);
        } else if (menuItem.variants && menuItem.variants.length > 0 && menuItem.variants[selectedVariantIdx].offer_price) {
          finalPrice = Number(menuItem.variants[selectedVariantIdx].offer_price);
        } else {
          const disc = availableDiscounts.find(d => {
            if (d.id === manualDiscountId) return false; // Skip if it's the manual one
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
        const afterAuto = subtotal; // Since auto is 0 when manual is active, we just use subtotal
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg dark:text-slate-50">Your Cart</h2>
              <p className="text-xs text-slate-500">{items.length} items</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} className="dark:text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Items */}
              <div className="space-y-4">
                {items.map(item => {
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

                  const variantName = menuItem.variants && menuItem.variants.length > 0 ? menuItem.variants[selectedVariantIdx].name : '';
                  const addonNames = menuItem.addons ? selectedAddons.map(idx => menuItem.addons![idx].name).join(', ') : '';

                  return (
                    <div key={item.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative group">
                      <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                        {(menuItem.image_url || (menuItem.images && menuItem.images[0]?.image_url)) ? (
                          <img 
                            src={menuItem.image_url || menuItem.images![0].image_url} 
                            alt={menuItem.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-slate-400 font-medium text-xs">{menuItem.name.substring(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-bold text-sm dark:text-slate-200 leading-tight">{menuItem.name}</h4>
                          <span className="font-bold text-sm shrink-0" style={{ color: primaryColor }}>
                            {shop.settings?.currency || '₹'}{(basePrice + addonsPrice) * quantity}
                          </span>
                        </div>
                        
                        {(variantName || addonNames) && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {variantName && <span>{variantName}</span>}
                            {variantName && addonNames && <span> • </span>}
                            {addonNames && <span>+ {addonNames}</span>}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button 
                              onClick={() => {
                                if (quantity === 1) removeFromCart(item.id);
                                else updateQuantity(item.id, -1);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-4 text-center dark:text-slate-200">{quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-300"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Offers */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <h3 className="font-bold text-sm mb-3 dark:text-slate-300">Offers & Benefits</h3>
                
                {/* Available Manual Coupons */}
                <div className="space-y-2 mb-4">
                  {availableDiscounts.filter(d => ['percentage', 'flat'].includes(d.discount_type) && d.visibility_type !== ('hidden' as any)).map(disc => (
                    <button
                      key={disc.id}
                      onClick={() => setManualDiscount(manualDiscountId === disc.id ? null : disc.id)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                        manualDiscountId === disc.id 
                          ? 'bg-primary/5 ring-1 border-transparent' 
                          : 'border-slate-200 dark:border-slate-800 hover:border-primary/30'
                      }`}
                      style={manualDiscountId === disc.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-xs font-bold">%</span>
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-sm dark:text-slate-200">{disc.title}</div>
                          <div className="text-xs text-slate-500">{disc.description || 'Tap to apply'}</div>
                        </div>
                      </div>
                      <div 
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${manualDiscountId === disc.id ? 'border-primary' : 'border-slate-300'}`}
                        style={manualDiscountId === disc.id ? { borderColor: primaryColor } : {}}
                      >
                        {manualDiscountId === disc.id && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bill Summary */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-3">
                <h3 className="font-bold text-sm mb-2 dark:text-slate-300">Bill Details</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Item Total</span>
                  <span className="dark:text-slate-300">{shop.settings?.currency || '₹'}{subtotal.toFixed(2)}</span>
                </div>
                
                {automaticDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                    <span className="flex items-center gap-1">
                      Auto Discounts
                      <span title={appliedAutoDiscounts.join(', ')}><Info size={12} className="opacity-50" /></span>
                    </span>
                    <span>-{shop.settings?.currency || '₹'}{automaticDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                {manualDiscountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 font-medium">
                    <span>Coupon Applied</span>
                    <span>-{shop.settings?.currency || '₹'}{manualDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between font-bold text-lg">
                  <span className="dark:text-white">To Pay</span>
                  <span style={{ color: primaryColor }}>{shop.settings?.currency || '₹'}{finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
            <button
              onClick={() => {
                alert('Ordering is not supported yet!');
              }}
              className="w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px 0 ${primaryColor}40` }}
            >
              Place Order
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
