import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, User, Phone, Check } from 'lucide-react';
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
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  // Filter items by active category tab (category is client tab filter, search is backend)
  const filteredItems = useMemo(() => {
    return safeMenuItems.filter(item => {
      if (!item.is_available) return false;
      return activeCategory === 'all' || item.category_id === activeCategory;
    });
  }, [safeMenuItems, activeCategory]);

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
      return sum + price * item.quantity;
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
        price: item.menuItem.offer_price || item.menuItem.price,
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
        price: item.menuItem.offer_price || item.menuItem.price,
      }));

      const payload = {
        customer_name: customerName.trim() || 'Walk-in',
        customer_phone: customerPhone.trim() || '',
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber.trim() || null : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() || null : null,
        payment_method: paymentMethod,
        total_amount: totalCartAmount,
        items: itemsPayload,
      };

      const res = await api.post('/orders', payload);
      
      // If user selected payment_status as paid, update payment
      if (res.data?.id && paymentStatus === 'paid') {
        try {
          await api.put(`/orders/${res.data.id}/payment`, { payment_status: 'paid' });
        } catch { }
      }

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

  const modalTitle = targetOrder 
    ? `Add Items to Order #${targetOrder.id.slice(0, 8).toUpperCase()} (${targetOrder.customer_name || 'Walk-in'}${targetOrder.table_number ? ` • Table ${targetOrder.table_number}` : ''})`
    : (step === 1 ? 'Select Menu Items' : 'Customer & Order Details');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      closeOnBackdropClick={false}
      className="max-w-none w-screen h-screen max-h-screen rounded-none sm:rounded-none m-0 border-none flex flex-col"
      footer={
        step === 1 ? (
          <div className="flex items-center justify-between w-full">
            <div>
              <div className="text-xs text-muted-foreground">{totalCartCount} new item(s) selected</div>
              <div className="text-lg font-bold text-foreground">
                {targetOrder ? `Added Total: ₹${totalCartAmount.toFixed(2)}` : `₹${totalCartAmount.toFixed(2)}`}
              </div>
            </div>

            <Button
              onClick={handleNextStep}
              disabled={totalCartCount === 0}
              isLoading={loading}
              className="gap-2 px-6"
            >
              {targetOrder ? (
                <>Add Items to Order (₹{totalCartAmount.toFixed(2)}) <Check size={16} /></>
              ) : (
                <>Next <ArrowRight size={16} /></>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
            >
              Back
            </Button>

            <Button
              onClick={handleSubmitOrder}
              isLoading={loading}
              className="px-6 gap-2"
            >
              <Check size={16} /> Create Order (₹{totalCartAmount.toFixed(2)})
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col h-full w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`px-2.5 py-1 rounded-full ${step === 1 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              1. Menu Items ({totalCartCount})
            </span>
            <ArrowRight size={14} className="text-muted-foreground" />
            <span className={`px-2.5 py-1 rounded-full ${step === 2 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              2. Order Info
            </span>
          </div>

          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={14} /> Back to Items
            </button>
          )}
        </div>

        {/* STEP 1: MENU SELECTION */}
        {step === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search Bar & Categories */}
            <div className="space-y-3 mb-3 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background text-sm"
                />
              </div>

              {/* Categories Pills with More Dropdown */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-slate-900 text-white dark:bg-muted dark:text-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  All Items
                </button>

                {/* Display first 5 categories as direct pills */}
                {categories.slice(0, 5).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-slate-900 text-white dark:bg-muted dark:text-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}

                {/* Dropdown for remaining categories if more than 5 */}
                {categories.length > 5 && (
                  <div className="w-24 shrink-0">
                    <SearchableSelect
                      options={[
                        ...categories.slice(5).map((c) => ({ id: c.id, name: c.name })),
                      ]}
                      value={categories.slice(5).some((c) => c.id === activeCategory) ? activeCategory : ''}
                      onChange={(val) => setActiveCategory(val)}
                      placeholder="More"
                      showSearch={true}
                      minWidth={180}
                      className="h-7 text-xs bg-muted/60 border-border rounded-full py-0 px-1"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {fetchingMenu ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Loading menu items...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                  <ShoppingBag size={32} className="text-slate-300 mb-2" />
                  No menu items found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredItems.map((item) => {
                    const qty = getItemQuantity(item.id);
                    const displayPrice = item.offer_price || item.price;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          qty > 0 ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm' : 'border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 font-medium text-xs">
                              No image
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate text-foreground">{item.name}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-bold text-sm text-foreground">₹{displayPrice}</span>
                              {item.offer_price && (
                                <span className="text-xs text-muted-foreground line-through">₹{item.price}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="shrink-0">
                          {qty === 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item, 1)}
                              className="h-8 px-3 rounded-lg border-primary text-primary hover:bg-primary hover:text-white transition-colors"
                            >
                              <Plus size={14} className="mr-1" /> Add
                            </Button>
                          ) : (
                            <div className="flex items-center bg-primary text-white rounded-lg p-0.5 shadow-sm">
                              <button
                                onClick={() => updateQuantity(item, -1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-7 text-center text-xs font-bold">{qty}</span>
                              <button
                                onClick={() => updateQuantity(item, 1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}
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
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Cart Summary Banner */}
              <div className="p-3 bg-muted/60 rounded-xl border border-border flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <span className="font-semibold text-foreground">{totalCartCount} Items in Order</span>
                  <div className="text-muted-foreground text-xs truncate max-w-[280px]">
                    {Object.values(cart).map(i => `${i.menuItem.name} (x${i.quantity})`).join(', ')}
                  </div>
                </div>
                <span className="font-bold text-base text-primary">₹{totalCartAmount.toFixed(2)}</span>
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
                      className={`py-2 px-3 rounded-lg border text-xs sm:text-sm font-medium capitalize transition-all ${
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
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1 flex items-center gap-1">
                      <Phone size={13} /> Mobile Number
                    </label>
                    <Input
                      placeholder="Optional phone number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
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
                      className="w-full h-10 border-border bg-background text-sm text-foreground rounded-lg"
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
                      className="w-full h-10 border-border bg-background text-sm text-foreground rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
