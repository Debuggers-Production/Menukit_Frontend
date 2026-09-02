import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, User, Phone, Check, X, ChevronDown, LayoutGrid } from 'lucide-react';




import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { MenuItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import toast from 'react-hot-toast';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
  targetOrder?: any;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export function CreateOrderModal({ isOpen, onClose, onOrderCreated, targetOrder }: CreateOrderModalProps) {
  const { menuItems, setMenuItems, categories, setCategories } = useShopStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(false);

  // Filters for Step 1
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Customer details for Step 2
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLookupState, setCustomerLookupState] = useState<{
    loading: boolean;
    found: boolean | null;
    name?: string;
  }>({ loading: false, found: null });
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');

  // Category Picker Modal
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Food Type Filter
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg' | 'drink' | 'dessert'>('all');


  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Debounce customer phone lookup (400ms)
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      setCustomerLookupState({ loading: false, found: null });
      return;
    }

    let isMounted = true;
    setCustomerLookupState(prev => ({ ...prev, loading: true }));

    const handler = setTimeout(async () => {
      try {
        const res = await api.get('/orders/customer-lookup', { params: { phone: digits } });
        if (!isMounted) return;
        if (res.data?.exists) {
          setCustomerLookupState({ loading: false, found: true, name: res.data.name });
          if (res.data.name && (!customerName || customerName.trim() === 'Walk-in Customer')) {
            setCustomerName(res.data.name);
          }
          if (res.data.delivery_address && !deliveryAddress) {
            setDeliveryAddress(res.data.delivery_address);
          }
        } else {
          setCustomerLookupState({ loading: false, found: false });
        }
      } catch {
        if (isMounted) setCustomerLookupState({ loading: false, found: null });
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(handler);
    };
  }, [customerPhone]);


  // Fetch categories on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCart({});
      setCustomerName('');
      setCustomerPhone('');
      setOrderType('dine_in');
      setTableNumber('');
      setDeliveryAddress('');
      setPaymentMethod('cash');
      setPaymentStatus('paid');
      setSearchQuery('');
      setDebouncedSearch('');
      setActiveCategory('all');
      setFoodFilter('all');

      api.get('/categories')
        .then(catRes => setCategories(catRes.data || []))
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // Fetch backend menu items whenever search or modal open changes
  useEffect(() => {
    if (!isOpen) return;

    setFetchingMenu(true);
    const params: any = { limit: 200 };
    if (debouncedSearch.trim()) {
      params.search = debouncedSearch.trim();
    }

    api.get('/menu-items', { params })
      .then(res => {
        setMenuItems(res.data || []);
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load menu items');
      })
      .finally(() => {
        setFetchingMenu(false);
      });
  }, [isOpen, debouncedSearch]);

  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  // Filter items by active category and food filter (exact public menu logic)
  const filteredItems = useMemo(() => {
    return safeMenuItems.filter(item => {
      if (!item.is_available) return false;
      const matchCat = activeCategory === 'all' || item.category_id === activeCategory;
      if (!matchCat) return false;
      if (foodFilter !== 'all') {
        const itemFoodTypes = item.food_types || [];
        if (!itemFoodTypes.includes(foodFilter)) return false;
      }
      return true;
    });
  }, [safeMenuItems, activeCategory, foodFilter]);

  // Cart operations
  const getItemQuantity = (itemId: string) => cart[itemId]?.quantity || 0;

  const updateQuantity = (item: MenuItem, delta: number) => {
    setCart(prev => {
      const currentQty = prev[item.id]?.quantity || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return {
        ...prev,
        [item.id]: {
          menuItem: item,
          quantity: newQty,
        }
      };
    });
  };

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => {
      const price = item.menuItem.offer_price || item.menuItem.price;
      return sum + Number(price) * item.quantity;
    }, 0);
  }, [cart]);

  const handleAppendItems = async () => {
    if (!targetOrder || totalCartCount === 0) return;
    setLoading(true);
    try {
      const itemsPayload = Object.values(cart).map(item => ({
        menu_item_id: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: Number(item.menuItem.offer_price || item.menuItem.price),
      }));

      await api.post(`/orders/${targetOrder.id}/items`, { items: itemsPayload });
      toast.success(`Added ${totalCartCount} item(s) to Order #${targetOrder.id.slice(0, 8).toUpperCase()}`);
      onOrderCreated();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to add items to order');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (totalCartCount === 0) {
      toast.error('Please select at least one menu item');
      return;
    }
    if (targetOrder) {
      handleAppendItems();
      return;
    }
    setStep(2);
  };

  const handleSubmitOrder = async () => {
    if (totalCartCount === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const itemsPayload = Object.values(cart).map(item => ({
        menu_item_id: item.menuItem.id,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: Number(item.menuItem.offer_price || item.menuItem.price),
      }));

      const payload = {
        customer_name: customerName.trim() || 'Walk-in',
        customer_phone: customerPhone.trim() || '',
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber.trim() || null : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() || null : null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        total_amount: totalCartAmount,
        items: itemsPayload,
      };

      await api.post('/orders', payload);

      toast.success('Order created successfully!');
      onOrderCreated();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background flex flex-col h-screen w-screen overflow-hidden">
      {/* 1. Sleek Compact Header (Only 48px!) */}
      <div className="h-12 px-3 sm:px-6 border-b border-border flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-20">
        <div className="flex items-center gap-2 min-w-0">
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors mr-0.5 cursor-pointer shrink-0"
              title="Back to items"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
            {targetOrder 
              ? `Add Items to #${targetOrder.id.slice(0, 6).toUpperCase()}`
              : (step === 1 ? 'Select Menu Items' : 'Customer & Order Info')}
          </h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
            {step === 1 ? `Step 1/2 • ${totalCartCount} item${totalCartCount === 1 ? '' : 's'}` : 'Step 2/2'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      {/* STEP 1: MENU SELECTION */}
      {step === 1 && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Streamlined Search + Filter Bar */}
          <div className="px-3 sm:px-6 py-2 space-y-2 shrink-0 border-b border-border/50 bg-background/50">
            {/* Search Input + Veg/Non-veg Badges in One Compact Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dishes, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 bg-slate-100 dark:bg-slate-800/80 border-0 rounded-full h-8.5 text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Food Filter Pills */}
              <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-full p-0.5 shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => setFoodFilter(foodFilter === 'veg' ? 'all' : 'veg')}
                  className={`p-1 rounded-full transition-all shrink-0 ${foodFilter === 'veg' ? 'bg-emerald-100 dark:bg-emerald-950/60 shadow-xs ring-1 ring-emerald-400' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Veg Only"
                >
                  <span className="w-3 h-3 border-2 border-emerald-600 rounded-[2.5px] flex items-center justify-center">
                    <span className="w-1 h-1 bg-emerald-600 rounded-full"></span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFoodFilter(foodFilter === 'non-veg' ? 'all' : 'non-veg')}
                  className={`p-1 rounded-full transition-all shrink-0 ${foodFilter === 'non-veg' ? 'bg-rose-100 dark:bg-rose-950/60 shadow-xs ring-1 ring-rose-400' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Non-veg Only"
                >
                  <span className="w-3 h-3 border-2 border-rose-600 rounded-[2.5px] flex items-center justify-center">
                    <span className="w-0 h-0 border-l-[2.5px] border-r-[2.5px] border-b-[4.5px] border-transparent border-b-rose-600"></span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFoodFilter(foodFilter === 'egg' ? 'all' : 'egg')}
                  className={`p-1 rounded-full transition-all shrink-0 ${foodFilter === 'egg' ? 'bg-amber-100 dark:bg-amber-950/60 shadow-xs ring-1 ring-amber-400' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Contains Egg"
                >
                  <span className="w-3 h-3 border-2 border-amber-500 rounded-[2.5px] flex items-center justify-center">
                    <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                  </span>
                </button>
              </div>
            </div>

            {/* Categories Scrolling Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Items
              </button>

              {categories.slice(0, 3).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}

              {categories.length > 3 && (
                <button
                  type="button"
                  onClick={() => { setCategorySearch(''); setIsCategoryPickerOpen(true); }}
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                    categories.slice(3).some(c => c.id === activeCategory)
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {categories.slice(3).find(c => c.id === activeCategory)?.name || '+ More'}
                  <ChevronDown size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Menu Items Grid (Utilizes Maximum Vertical Space) */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 pt-2.5 pb-24">
            {fetchingMenu ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-medium">
                Loading menu items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <ShoppingBag size={36} className="text-slate-300 dark:text-slate-600 mb-2" />
                No menu items found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5">

                {filteredItems.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const displayPrice = item.offer_price || item.price;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all ${
                        qty > 0 
                          ? 'border-primary/60 bg-primary/5 dark:bg-primary/10 shadow-xs' 
                          : 'border-slate-100 dark:border-slate-800/80 bg-card hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs'
                      }`}
                    >
                      {/* Left Side: Dish Info */}
                      <div className="flex-1 min-w-0 pr-3">
                        {/* Tags & Veg/Non-veg Icons */}
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {item.food_types?.map((type) => (
                            <div key={type} className="inline-flex items-center">
                              {type === 'veg' ? (
                                <span className="w-3.5 h-3.5 border-2 border-emerald-600 rounded-[3px] flex items-center justify-center" title="Veg">
                                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                                </span>
                              ) : type === 'egg' ? (
                                <span className="w-3.5 h-3.5 border-2 border-amber-500 rounded-[3px] flex items-center justify-center" title="Contains Egg">
                                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                </span>
                              ) : type === 'non-veg' ? (
                                <span className="w-3.5 h-3.5 border-2 border-rose-600 rounded-[3px] flex items-center justify-center" title="Non-Veg">
                                  <span className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-transparent border-b-rose-600"></span>
                                </span>
                              ) : type === 'drink' ? (
                                <span className="w-3.5 h-3.5 border-2 border-blue-500 rounded-full flex items-center justify-center" title="Beverage">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                </span>
                              ) : type === 'dessert' ? (
                                <span className="w-3.5 h-3.5 border-2 border-pink-500 rounded-[3px] flex items-center justify-center" title="Dessert">
                                  <span className="w-1.5 h-1.5 bg-pink-500 rounded-[1px]"></span>
                                </span>
                              ) : null}
                            </div>
                          ))}

                          {item.is_bestseller && (
                            <span className="bg-amber-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs">
                              ⭐ Bestseller
                            </span>
                          )}
                          {item.is_highlighted && (
                            <span className="bg-orange-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs">
                              🔥 Special
                            </span>
                          )}
                        </div>

                        {/* Item Name */}
                        <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug truncate">
                          {item.name}
                        </h4>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-extrabold text-sm sm:text-base text-foreground font-mono">
                            ₹{Number(displayPrice).toFixed(2)}
                          </span>
                          {item.offer_price && (
                            <span className="text-xs text-muted-foreground line-through font-medium font-mono">
                              ₹{Number(item.price).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right Side: Image + Floating ADD/QTY button */}
                      <div className="relative flex flex-col items-center shrink-0 mb-1.5">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-muted border border-border shadow-2xs"
                          />
                        ) : (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-2xs">
                            <ShoppingBag size={22} />
                          </div>
                        )}

                        {/* Quantity Controls Floating at Bottom of Image */}
                        <div className="absolute -bottom-2.5 shadow-sm">
                          {qty === 0 ? (
                            <button
                              type="button"
                              onClick={() => updateQuantity(item, 1)}
                              className="h-7 px-3.5 rounded-xl font-black text-xs bg-background border border-primary/40 text-primary hover:bg-primary hover:text-white shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              + ADD
                            </button>
                          ) : (
                            <div className="flex items-center bg-primary text-white rounded-xl shadow-md h-7 px-1 font-bold">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item, -1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-sm"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-black">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item, 1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-sm"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: CUSTOMER & ORDER DETAILS */}
      {step === 2 && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4 pb-24 max-w-2xl mx-auto w-full">
            {/* Cart Summary Banner */}
            <div className="p-3.5 bg-muted/60 rounded-2xl border border-border flex items-center justify-between text-xs sm:text-sm">
              <div>
                <span className="font-bold text-foreground">{totalCartCount} Items in Order</span>
                <div className="text-muted-foreground text-xs truncate max-w-[280px]">
                  {Object.values(cart).map(i => `${i.menuItem.name} (x${i.quantity})`).join(', ')}
                </div>
              </div>
              <span className="font-black text-base text-primary font-mono">₹{totalCartAmount.toFixed(2)}</span>
            </div>

            {/* Order Type Tabs */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Order Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold capitalize transition-all ${
                      orderType === type
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Dine-in / Delivery fields */}
            {orderType === 'dine_in' && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Table Number (Optional)</label>
                <Input
                  placeholder="e.g. T-4"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            {orderType === 'delivery' && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Delivery Address</label>
                <Input
                  placeholder="Enter customer address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            )}

            {/* Customer Info (Optional) */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Customer Info
                </span>
                <span className="text-[11px] text-muted-foreground italic">(Optional for offline order)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1 flex items-center gap-1">
                    <User size={13} /> Customer Name
                  </label>
                  <Input
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1 flex items-center gap-1">
                    <Phone size={13} /> Mobile Number
                  </label>
                  <Input
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="rounded-xl"
                  />
                  {customerLookupState.loading && (
                    <span className="text-[11px] text-muted-foreground mt-1 block animate-pulse">
                      Searching customer...
                    </span>
                  )}
                  {!customerLookupState.loading && customerLookupState.found === true && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                      <Check size={12} /> Existing customer recognized
                    </span>
                  )}
                  {!customerLookupState.loading && customerLookupState.found === false && customerPhone.replace(/\D/g, '').length >= 10 && (
                    <span className="text-[11px] text-primary font-medium mt-1 block">
                      + New customer (will be registered & linked)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3 pt-2 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Payment Details
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Payment Method</label>
                  <SearchableSelect
                    options={[
                      { id: 'cash', name: 'Cash / Counter' },
                      { id: 'online', name: 'UPI / QR Code' },
                    ]}
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as any)}
                    showSearch={false}
                    className="w-full h-10 border-border bg-background text-sm text-foreground rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Payment Status</label>
                  <SearchableSelect
                    options={[
                      { id: 'paid', name: 'Paid' },
                      { id: 'pending', name: 'Not Paid (Pending)' },
                    ]}
                    value={paymentStatus}
                    onChange={(val) => setPaymentStatus(val as any)}
                    showSearch={false}
                    className="w-full h-10 border-border bg-background text-sm text-foreground rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border px-4 py-3 z-30 flex items-center justify-between shadow-lg">
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground">{totalCartCount} item(s) selected</div>
          <div className="text-base sm:text-lg font-black text-foreground font-mono">
            ₹{totalCartAmount.toFixed(2)}
          </div>
        </div>

        {step === 1 ? (
          <Button
            onClick={handleNextStep}
            disabled={totalCartCount === 0}
            isLoading={loading}
            className="gap-2 px-6 h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            {targetOrder ? (
              <>Add Items (₹{totalCartAmount.toFixed(2)}) <Check size={16} /></>
            ) : (
              <>Next <ArrowRight size={16} /></>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSubmitOrder}
            isLoading={loading}
            className="px-6 h-10 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Check size={16} /> Create Order (₹{totalCartAmount.toFixed(2)})
          </Button>
        )}
      </div>

      {/* Category Picker Modal (Exact Public Menu 'Filter by Category' UI) */}
      <Modal
        isOpen={isCategoryPickerOpen}
        onClose={() => setIsCategoryPickerOpen(false)}
        title="Filter by Category"
        className="max-w-lg w-full rounded-3xl"
        footer={
          <div className="flex flex-col gap-3 w-full">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search categories..."
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-primary text-slate-800 dark:text-slate-100 text-sm"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Action Buttons */}
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => { setActiveCategory('all'); setCategorySearch(''); setIsCategoryPickerOpen(false); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(false)}
                className="flex-[2] py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-md bg-primary hover:bg-primary/90 cursor-pointer"
              >
                {activeCategory === 'all' ? 'Show All' : 'Apply Filter'}
              </button>
            </div>
          </div>
        }
      >
        <div className="pb-2">
          <div className="flex flex-wrap gap-2">
            {/* All Menu pill */}
            <button
              type="button"
              onClick={() => { setActiveCategory('all'); setIsCategoryPickerOpen(false); }}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-primary border-primary text-white shadow-sm scale-105'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {activeCategory === 'all' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow border border-slate-100">
                  <Check size={10} className="text-primary stroke-[3]" />
                </span>
              )}
              <LayoutGrid size={13} className={activeCategory === 'all' ? 'text-white' : 'text-slate-500'} />
              <span className="text-sm font-bold">All Menu</span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  activeCategory === 'all'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {safeMenuItems.length}
              </span>
            </button>

            {/* Category pills */}
            {categories
              .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
              .map((cat, idx) => {
                const isSelected = activeCategory === cat.id;
                const catItemCount = safeMenuItems.filter(m => m.category_id === cat.id).length;
                const palette = ['#f97316','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#a855f7'];
                const accent = palette[idx % palette.length];

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { setActiveCategory(cat.id); setIsCategoryPickerOpen(false); }}
                    className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all cursor-pointer"
                    style={
                      isSelected
                        ? { backgroundColor: accent, borderColor: accent, color: 'white' }
                        : { backgroundColor: `${accent}0d`, borderColor: `${accent}40`, color: '#1e293b' }
                    }
                  >
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow border border-slate-100">
                        <Check size={10} style={{ color: accent }} className="stroke-[3]" />
                      </span>
                    )}
                    <span className="text-sm font-bold dark:text-white" style={{ color: isSelected ? 'white' : undefined }}>
                      {cat.name}
                    </span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={
                        isSelected
                          ? { backgroundColor: 'rgba(255,255,255,0.25)', color: 'white' }
                          : { backgroundColor: `${accent}20`, color: accent }
                      }
                    >
                      {catItemCount}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>,
    document.body
  );
}



