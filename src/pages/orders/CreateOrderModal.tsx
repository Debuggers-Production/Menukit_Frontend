import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, User, Phone, Check, X, ChevronDown, LayoutGrid, RotateCcw, UtensilsCrossed, AlertCircle, CornerDownLeft, Sparkles, Keyboard, Banknote, QrCode, CreditCard, Tag, Split as SplitIcon, CheckCircle2, Clock, Store, Package, UserCheck, Star, Flame, Layers } from 'lucide-react';




import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { getBusinessCategory, isFireworksBusiness } from '@/config/businessCategories';
import { MenuItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { calculateOrderPricing, calculateReplacement } from '@/utils/pricing';
import toast from 'react-hot-toast';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (order?: any, newlyAddedItems?: any[]) => void;
  targetOrder?: any;
  replacingItem?: {
    order: any;
    item: any;
  } | null;
  onItemReplaced?: (updatedOrder: any, previousItem: any, newItem: any) => void;
}

interface CartItem {
  id: string;
  menuItem: MenuItem;
  selectedVariantIdx: number;
  selectedVariant?: any;
  selectedAddons: number[]; // indices of menuItem.addons
  quantity: number;
  unitPrice: number;
}

const REPLACEMENT_REASONS = [
  { id: 'Customer changed item preference', name: 'Customer changed item preference' },
  { id: 'Item out of stock / ingredient unavailable', name: 'Item out of stock / ingredient unavailable' },
  { id: 'Different portion or spice level requested', name: 'Different portion or spice level requested' },
  { id: 'Chef recommendation / Kitchen change', name: 'Chef recommendation / Kitchen change' },
  { id: 'Billing / entry error', name: 'Billing / entry error' },
  { id: 'custom', name: 'Other reason (enter below)...' },
];

const SPLIT_PAYMENT_OPTIONS = [
  { id: 'cash', name: 'Cash', icon: <Banknote size={14} className="text-emerald-500" /> },
  { id: 'upi', name: 'UPI / QR', icon: <QrCode size={14} className="text-blue-500" /> },
  { id: 'card', name: 'Card', icon: <CreditCard size={14} className="text-purple-500" /> },
  { id: 'other', name: 'Other', icon: <Tag size={14} className="text-amber-500" /> },
];

export function CreateOrderModal({ 
  isOpen, 
  onClose, 
  onOrderCreated, 
  targetOrder,
  replacingItem,
  onItemReplaced,
}: CreateOrderModalProps) {
  const { menuItems, setMenuItems, categories, setCategories, shop } = useShopStore();
  const businessCategory = getBusinessCategory(shop?.category);
  const isCrackers = isFireworksBusiness(shop?.category) || !businessCategory.isFood;
  
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [fetchingMenu, setFetchingMenu] = useState(false);

  // Keyboard navigation & Quick Qty references
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const customerPhoneInputRef = useRef<HTMLInputElement>(null);
  const customerNameInputRef = useRef<HTMLInputElement>(null);
  const orderTypeRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const paymentMethodRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const paymentStatusRef = useRef<HTMLDivElement>(null);

  // Active keyboard item & quantity state
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(0);
  const itemRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});


  const [activeQtyItemId, setActiveQtyItemId] = useState<string | null>(null);
  const [activeQtyValue, setActiveQtyValue] = useState<string>('1');

  // Filters for Step 1
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});

  // Discounts state
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);

  // Item Customization state (Variants & Add-ons)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [customizingQty, setCustomizingQty] = useState<number>(1);

  // Customer details for Step 2
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerUsedDiscountIds, setCustomerUsedDiscountIds] = useState<string[]>([]);
  const [discountRevertedNotice, setDiscountRevertedNotice] = useState<{
    isOpen: boolean;
    count: number;
    titles: string[];
  }>({ isOpen: false, count: 0, titles: [] });
  const [customerLookupState, setCustomerLookupState] = useState<{
    loading: boolean;
    found: boolean | null;
    name?: string;
  }>({ loading: false, found: null });
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>(isCrackers ? 'takeaway' : 'dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [occupiedTables, setOccupiedTables] = useState<any[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'other' | 'split' | 'online'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');
  const [priceTier, setPriceTier] = useState<'retail' | 'wholesale' | 'other'>('retail');
  const [splitPayments, setSplitPayments] = useState<Array<{ method: 'cash' | 'upi' | 'card' | 'other'; amount: string }>>([
    { method: 'cash', amount: '' },
    { method: 'upi', amount: '' },
  ]);

  // Category Picker Modal
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  // Food Type Filter
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg' | 'egg' | 'drink' | 'dessert'>('all');

  // Replacement Mode State
  const [isConfirmingReplacement, setIsConfirmingReplacement] = useState(false);
  const [replacementReason, setReplacementReason] = useState('Customer changed item preference');
  const [customReplacementReason, setCustomReplacementReason] = useState('');


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
      setCustomerUsedDiscountIds([]);
      return;
    }

    let isMounted = true;
    setCustomerLookupState(prev => ({ ...prev, loading: true }));

    const handler = setTimeout(async () => {
      try {
        const res = await api.get('/orders/customer-lookup', { params: { phone: digits } });
        if (!isMounted) return;
        
        const usedIds: string[] = res.data?.used_discount_ids || [];
        setCustomerUsedDiscountIds(usedIds);

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

        // Check if any cart items currently have discounts that this customer has already used
        if (usedIds.length > 0 && Object.keys(cart).length > 0) {
          const revertedTitles = new Set<string>();
          let hasChanges = false;
          const updatedCart = { ...cart };

          Object.keys(updatedCart).forEach(key => {
            const item = updatedCart[key];
            const previousUnitPrice = item.unitPrice;
            const newUnitPrice = computeUnitPrice(item.menuItem, item.selectedVariantIdx, item.selectedAddons, usedIds);

            if (newUnitPrice !== previousUnitPrice) {
              hasChanges = true;
              const prevDisc = getItemDiscount(item.menuItem, previousUnitPrice, []);
              if (prevDisc && usedIds.includes(String(prevDisc.discount.id))) {
                revertedTitles.add(prevDisc.discount.title);
              }
              updatedCart[key] = {
                ...item,
                unitPrice: newUnitPrice
              };
            }
          });

          if (hasChanges) {
            setCart(updatedCart);
            const titleList = Array.from(revertedTitles);
            setDiscountRevertedNotice({
              isOpen: true,
              count: titleList.length,
              titles: titleList
            });
            toast.error("Customer already used this discount. Reverted to standard price.");
          }
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


  // Fetch categories and active discounts on open + Auto-focus Search input
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCart({});
      setCustomizingItem(null);
      setIsConfirmingReplacement(false);
      setReplacementReason('Customer changed item preference');
      setCustomReplacementReason('');
      setCustomerName('');
      setCustomerPhone('');
      setOrderType(isCrackers ? 'takeaway' : 'dine_in');
      setTableNumber('');
      setDeliveryAddress('');
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setPriceTier('retail');
      setSplitPayments([
        { method: 'cash', amount: '' },
        { method: 'upi', amount: '' },
      ]);
      setSearchQuery('');
      setDebouncedSearch('');
      setActiveCategory('all');
      setFoodFilter('all');
      setFocusedItemIndex(0);
      setActiveQtyItemId(null);
      setActiveQtyValue('1');

      api.get('/categories')
        .then(catRes => setCategories(catRes.data || []))
        .catch(err => console.error(err));

      api.get('/discounts')
        .then(discRes => setAvailableDiscounts(discRes.data || []))
        .catch(err => console.error('Failed to load discounts', err));

      if (shop?.id && !isCrackers) {
        api.get(`/public/shop/${shop.id}/occupied-tables`)
          .then(res => setOccupiedTables(res.data || []))
          .catch(err => console.error(err));
      }

      // Auto-focus search input immediately when modal opens
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shop?.id, isCrackers]);

  // Auto-focus appropriate input on Step change
  useEffect(() => {
    if (!isOpen) return;
    if (step === 1) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (step === 2) {
      const timer = setTimeout(() => {
        const defaultOrderType = isCrackers ? (orderType || 'takeaway') : (orderType || 'dine_in');
        if (orderTypeRefs.current[defaultOrderType]) {
          orderTypeRefs.current[defaultOrderType]?.focus();
        } else {
          customerPhoneInputRef.current?.focus();
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [step, isOpen]);

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

  // Multiplier Helper taking active priceTier into account
  const getItemMultiplier = (item: MenuItem, variantIdx = 0, currentTier = priceTier) => {
    if (item.variants && item.variants.length > 0) {
      const v = item.variants[variantIdx] || item.variants[0];
      if (currentTier === 'wholesale') return v.wholesale_multiplier || v.multiplier || item.wholesale_multiplier || item.multiplier || 1;
      if (currentTier === 'other') return v.other_multiplier || v.multiplier || item.other_multiplier || item.multiplier || 1;
      return v.multiplier || item.multiplier || 1;
    }
    if (currentTier === 'wholesale') return item.wholesale_multiplier || item.multiplier || 1;
    if (currentTier === 'other') return item.other_multiplier || item.multiplier || 1;
    return item.multiplier || 1;
  };

  // Filter and prioritize items by Serial Number match first, then Name
  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    
    const matched = safeMenuItems.filter(item => {
      if (!item.is_available) return false;
      const matchCat = activeCategory === 'all' || item.category_id === activeCategory;
      if (!matchCat) return false;
      if (foodFilter !== 'all') {
        const itemFoodTypes = item.food_types || [];
        if (!itemFoodTypes.includes(foodFilter)) return false;
      }
      if (q) {
        const matchName = item.name.toLowerCase().includes(q);
        const matchSerial = item.serial_number ? item.serial_number.toLowerCase().includes(q) : false;
        if (!matchName && !matchSerial) return false;
      }
      return true;
    });

    if (!q) return matched;

    // Rank / sort by Serial Number priority
    return matched.sort((a, b) => {
      const getScore = (item: MenuItem) => {
        const sn = item.serial_number ? item.serial_number.trim().toLowerCase() : '';
        const name = item.name.trim().toLowerCase();
        if (sn === q) return 1;              // 1. Exact Serial Number Match (TOP)
        if (sn.startsWith(q)) return 2;      // 2. Serial Number Prefix Match
        if (sn.includes(q)) return 3;        // 3. Serial Number Substring Match
        if (name === q) return 4;            // 4. Exact Item Name Match
        if (name.startsWith(q)) return 5;    // 5. Name Prefix Match
        if (name.includes(q)) return 6;      // 6. Name Substring Match
        return 99;
      };

      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return (a.display_order || 0) - (b.display_order || 0);
    });
  }, [safeMenuItems, activeCategory, foodFilter, debouncedSearch]);

  // Auto-scroll focused item into view when navigating via arrow keys
  useEffect(() => {
    if (step === 1 && filteredItems.length > 0 && filteredItems[focusedItemIndex]) {
      const el = itemRefs.current[filteredItems[focusedItemIndex].id];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedItemIndex, step, filteredItems]);

  // Auto Discount helper
  const getItemDiscount = (item: MenuItem, basePrice: number, variantIdx?: number, usedDiscountIds: string[] = customerUsedDiscountIds) => {
    if (!availableDiscounts || availableDiscounts.length === 0) return null;
    const currentVariantName = (item.variants && variantIdx !== undefined && item.variants[variantIdx]) 
      ? item.variants[variantIdx].name.trim().toLowerCase() 
      : (item.variants && item.variants.length > 0 && item.variants[0]) ? item.variants[0].name.trim().toLowerCase() : null;

    const disc = availableDiscounts.find((d: any) => {
      if (d.is_active === false) return false;
      if (usedDiscountIds.includes(String(d.id))) return false;
      if (d.discount_type === 'bogo' || d.discount_type === 'combo' || d.discount_type === 'free_item') return false;
      if (d.applies_to === 'all') return true;
      if (d.applies_to === 'category' && d.target_ids?.includes(item.category_id)) return true;
      if (d.applies_to === 'items' && d.target_ids) {
        if (d.target_ids.includes(item.id)) return true;
        if (currentVariantName && d.target_ids.some((tid: string) => {
          if (tid.startsWith(`${item.id}::`)) {
            const targetVar = tid.split('::')[1]?.trim()?.toLowerCase();
            return targetVar === currentVariantName;
          }
          return false;
        })) return true;
      }
      return false;
    });
    if (!disc) return null;
    const v = Number(disc.discount_value);
    const discountedPrice = disc.discount_type === 'percentage'
      ? Math.max(0, basePrice * (1 - v / 100))
      : Math.max(0, basePrice - v);
    const discountAmount = Math.max(0, basePrice - discountedPrice);
    if (discountAmount <= 0) return null;
    return {
      discount: disc,
      discountedPrice,
      discountAmount,
      savingPercent: basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0,
    };
  };

  // Unit Price Calculation Helper
  const computeUnitPrice = (item: MenuItem, variantIdx: number, addonIndices: number[], usedDiscountIds: string[] = customerUsedDiscountIds, currentTier = priceTier) => {
    let rawBasePrice = 0;
    if (item.variants && item.variants.length > 0) {
      const v = item.variants[variantIdx] || item.variants[0];
      if (currentTier === 'wholesale' && v.wholesale_price && Number(v.wholesale_price) > 0) {
        rawBasePrice = Number(v.wholesale_price);
      } else if (currentTier === 'other' && v.other_price && Number(v.other_price) > 0) {
        rawBasePrice = Number(v.other_price);
      } else {
        const p = Number(v.price || 0);
        const op = Number(v.offer_price || 0);
        rawBasePrice = (op > 0 && op < p) ? op : (op > 0 ? op : p);
      }
    } else {
      if (currentTier === 'wholesale' && item.wholesale_price && Number(item.wholesale_price) > 0) {
        rawBasePrice = Number(item.wholesale_price);
      } else if (currentTier === 'other' && item.other_price && Number(item.other_price) > 0) {
        rawBasePrice = Number(item.other_price);
      } else {
        const p = Number(item.price || 0);
        const op = Number(item.offer_price || 0);
        rawBasePrice = (op > 0 && op < p) ? op : (op > 0 ? op : p);
      }
    }

    const discountInfo = currentTier === 'retail' ? getItemDiscount(item, rawBasePrice, variantIdx, usedDiscountIds) : null;
    const basePrice = discountInfo ? discountInfo.discountedPrice : rawBasePrice;

    let addonsTotal = 0;
    if (item.addons && addonIndices.length > 0) {
      addonIndices.forEach(idx => {
        if (item.addons && item.addons[idx]) {
          addonsTotal += Number(item.addons[idx].price || 0);
        }
      });
    }
    return Number((basePrice + addonsTotal).toFixed(2));
  };

  const handlePriceTierChange = (tier: 'retail' | 'wholesale' | 'other') => {
    setPriceTier(tier);
    if (Object.keys(cart).length > 0) {
      setCart(prev => {
        const next: Record<string, CartItem> = {};
        Object.keys(prev).forEach(key => {
          const it = prev[key];
          next[key] = {
            ...it,
            unitPrice: computeUnitPrice(it.menuItem, it.selectedVariantIdx, it.selectedAddons, customerUsedDiscountIds, tier)
          };
        });
        return next;
      });
      toast.success(`Switched price tier to ${tier.toUpperCase()}`);
    }
  };

  const isItemCustomizable = (item: MenuItem) => {
    return Boolean((item.variants && item.variants.length > 0) || (item.addons && item.addons.length > 0));
  };

  const getItemTotalQuantity = (itemId: string) => {
    return Object.values(cart)
      .filter(i => i.menuItem.id === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);
  };

  // Open Customization Modal
  const handleOpenCustomization = (item: MenuItem) => {
    setCustomizingItem(item);
    setSelectedVariantIdx(0);
    setSelectedAddons([]);
    const firstVarMultiplier = getItemMultiplier(item, 0);
    setCustomizingQty(replacingItem ? (replacingItem.item?.quantity || firstVarMultiplier) : firstVarMultiplier);
  };

  // Confirm Customization and Add to Cart
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;
    const mult = getItemMultiplier(customizingItem, selectedVariantIdx);
    if (mult > 1 && customizingQty % mult !== 0) {
      toast.error(`Quantity for ${customizingItem.name} must be a multiple of ${mult} (e.g. ${mult}, ${mult * 2}, ${mult * 3}...).`);
      return;
    }
    const unitPrice = computeUnitPrice(customizingItem, selectedVariantIdx, selectedAddons);
    const cartItemId = `${customizingItem.id}_v${selectedVariantIdx}_a${[...selectedAddons].sort().join('-')}`;
    
    setCart(prev => {
      if (replacingItem) {
        return {
          [cartItemId]: {
            id: cartItemId,
            menuItem: customizingItem,
            selectedVariantIdx,
            selectedVariant: customizingItem.variants?.[selectedVariantIdx],
            selectedAddons,
            quantity: customizingQty,
            unitPrice,
          }
        };
      }
      const existing = prev[cartItemId];
      const newQty = (existing?.quantity || 0) + customizingQty;
      return {
        ...prev,
        [cartItemId]: {
          id: cartItemId,
          menuItem: customizingItem,
          selectedVariantIdx,
          selectedVariant: customizingItem.variants?.[selectedVariantIdx],
          selectedAddons,
          quantity: newQty,
          unitPrice,
        }
      };
    });

    toast.success(`Added ${customizingItem.name} to order`);
    setCustomizingItem(null);
    setSearchQuery('');
    setDebouncedSearch('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Cart operations for simple non-customizable items
  const handleSimpleQuantity = (item: MenuItem, delta: number) => {
    const cartItemId = item.id;
    const stepVal = getItemMultiplier(item);
    const actualDelta = delta > 0 ? stepVal : -stepVal;
    const unitPrice = computeUnitPrice(item, 0, []);
    setCart(prev => {
      if (replacingItem) {
        const currentQty = prev[cartItemId]?.quantity || 0;
        let newQty = currentQty === 0 
          ? (delta > 0 ? (replacingItem.item?.quantity || stepVal) : stepVal) 
          : currentQty + actualDelta;
        if (newQty <= 0) return {};
        return {
          [cartItemId]: {
            id: cartItemId,
            menuItem: item,
            selectedVariantIdx: 0,
            selectedAddons: [],
            quantity: newQty,
            unitPrice,
          }
        };
      }

      const currentQty = prev[cartItemId]?.quantity || 0;
      const newQty = currentQty + actualDelta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[cartItemId];
        return next;
      }
      return {
        ...prev,
        [cartItemId]: {
          id: cartItemId,
          menuItem: item,
          selectedVariantIdx: 0,
          selectedAddons: [],
          quantity: newQty,
          unitPrice,
        }
      };
    });
  };

  // Set exact quantity for keyboard and input entry
  const handleSetExactQuantity = (item: MenuItem, exactQty: number) => {
    const cartItemId = item.id;
    const stepVal = getItemMultiplier(item);
    let resolvedQty = exactQty;
    if (resolvedQty > 0 && stepVal > 1 && resolvedQty % stepVal !== 0) {
      resolvedQty = Math.max(stepVal, Math.round(resolvedQty / stepVal) * stepVal);
    }
    const unitPrice = computeUnitPrice(item, 0, []);
    setCart(prev => {
      if (replacingItem) {
        if (resolvedQty <= 0) return {};
        return {
          [cartItemId]: {
            id: cartItemId,
            menuItem: item,
            selectedVariantIdx: 0,
            selectedAddons: [],
            quantity: resolvedQty,
            unitPrice,
          }
        };
      }

      if (resolvedQty <= 0) {
        const next = { ...prev };
        delete next[cartItemId];
        return next;
      }
      return {
        ...prev,
        [cartItemId]: {
          id: cartItemId,
          menuItem: item,
          selectedVariantIdx: 0,
          selectedAddons: [],
          quantity: resolvedQty,
          unitPrice,
        }
      };
    });
  };

  const commitActiveQuantity = () => {
    if (!activeQtyItemId) return;
    const item = safeMenuItems.find(m => m.id === activeQtyItemId);
    const parsed = parseInt(activeQtyValue, 10);
    const stepVal = item ? getItemMultiplier(item) : 1;
    let validQty = isNaN(parsed) || parsed <= 0 ? 0 : parsed;
    
    if (item && validQty > 0 && stepVal > 1 && validQty % stepVal !== 0) {
      validQty = Math.max(stepVal, Math.round(validQty / stepVal) * stepVal);
      setActiveQtyValue(String(validQty));
    }

    if (item) {
      handleSetExactQuantity(item, validQty);
    }
    setActiveQtyItemId(null);
    setSearchQuery('');
    setDebouncedSearch('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);
  };

  const updateCartItemQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => {
      const item = prev[cartItemId];
      if (!item) return prev;
      const stepVal = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      const actualDelta = delta > 0 ? (delta === 1 ? stepVal : delta) : (delta === -1 ? -stepVal : delta);
      const newQty = item.quantity + actualDelta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[cartItemId];
        return next;
      }
      return {
        ...prev,
        [cartItemId]: {
          ...item,
          quantity: newQty,
        }
      };
    });
  };

  const removeCartItem = (cartItemId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[cartItemId];
      return next;
    });
  };

  // Compute line total taking multiplier pack pricing into account
  const getItemLineTotal = (item: CartItem) => {
    const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
    const effQty = mult > 1 ? (item.quantity / mult) : item.quantity;
    return item.unitPrice * effQty;
  };

  const totalCartCount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalCartAmount = useMemo(() => {
    return Object.values(cart).reduce((sum, item) => {
      return sum + getItemLineTotal(item);
    }, 0);
  }, [cart]);

  // GST Calculation
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled && totalTaxRate > 0);
  const isExclusiveTax = isGstEnabled && !shop?.settings?.inclusive_tax;

  const gstCalculation = useMemo(() => {
    if (!isGstEnabled) {
      return {
        taxable: totalCartAmount,
        cgst: 0,
        sgst: 0,
        totalTax: 0,
        finalTotal: totalCartAmount,
      };
    }
    if (isExclusiveTax) {
      // EXCLUSIVE: Tax is added on top of food items
      const totalTax = Math.round((totalCartAmount * (totalTaxRate / 100)) * 100) / 100;
      const cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      const sgst = Math.round((totalTax - cgst) * 100) / 100;
      const finalTotal = Math.round((totalCartAmount + totalTax) * 100) / 100;
      return {
        taxable: totalCartAmount,
        cgst,
        sgst,
        totalTax,
        finalTotal,
      };
    } else {
      // INCLUSIVE: Tax is already baked in
      const taxable = Math.round((totalCartAmount / (1 + totalTaxRate / 100)) * 100) / 100;
      const totalTax = Math.round((totalCartAmount - taxable) * 100) / 100;
      const cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      const sgst = Math.round((totalTax - cgst) * 100) / 100;
      return {
        taxable,
        cgst,
        sgst,
        totalTax,
        finalTotal: totalCartAmount,
      };
    }
  }, [isGstEnabled, isExclusiveTax, totalCartAmount, cgstRate, sgstRate, totalTaxRate]);

  // Replacement mode calculations
  const currencySymbol = shop?.currency || '₹';
  const isPaidOnline = replacingItem 
    ? (String(replacingItem.order?.payment_status || '').toLowerCase() === 'paid' && 
       String(replacingItem.order?.payment_method || '').toLowerCase() === 'online')
    : false;

  const selectedReplacement = replacingItem ? Object.values(cart)[0] : null;
  const oldReplacementTotal = replacingItem 
    ? Number(replacingItem.item?.price || 0) * Number(replacingItem.item?.quantity || 1) 
    : 0;
  const newReplacementTotal = selectedReplacement 
    ? getItemLineTotal(selectedReplacement) 
    : 0;

  // Use the order's actual total_amount for base comparison
  const oldOrderBase = replacingItem?.order?.total_amount 
    ? Number(replacingItem.order.total_amount) 
    : oldReplacementTotal;
  
  const otherItemsTotal = (replacingItem?.order?.items || [])
    .filter((it: any) => !it.is_cancelled && it.id !== replacingItem?.item?.id)
    .reduce((acc: number, it: any) => acc + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
  
  const newOrderBase = otherItemsTotal + newReplacementTotal;

  const origPaidAmount = isPaidOnline 
    ? calculateOrderPricing(oldOrderBase, true).totalPayable 
    : oldOrderBase;

  const repCalc = calculateReplacement(origPaidAmount, newOrderBase, oldOrderBase, isPaidOnline);
  const replacementPriceDiff = repCalc.difference;

  const handleConfirmReplacementSubmit = async () => {
    if (!replacingItem || !selectedReplacement) return;
    const finalReason = replacementReason === 'custom' 
      ? (customReplacementReason.trim() || 'Item replaced') 
      : replacementReason;

    setLoading(true);
    const toastId = toast.loading(`Replacing ${replacingItem.item.name} with ${selectedReplacement.menuItem.name}...`);
    try {
      const variant = selectedReplacement.menuItem.variants && selectedReplacement.menuItem.variants.length > 0 
        ? selectedReplacement.menuItem.variants[selectedReplacement.selectedVariantIdx] 
        : null;
      const variant_info = variant ? { name: variant.name, price: Number(variant.offer_price || variant.price) } : null;
      const addons_info = (selectedReplacement.menuItem.addons && selectedReplacement.selectedAddons.length > 0)
        ? selectedReplacement.selectedAddons.map(idx => ({
            name: selectedReplacement.menuItem.addons![idx].name,
            price: Number(selectedReplacement.menuItem.addons![idx].price),
          }))
        : null;

      const payload = {
        new_menu_item_id: selectedReplacement.menuItem.id,
        name: selectedReplacement.menuItem.name,
        quantity: selectedReplacement.quantity,
        price: selectedReplacement.unitPrice,
        variant_info,
        addons_info,
        reason: finalReason,
      };

      const res = await api.post(`/orders/${replacingItem.order.id}/items/${replacingItem.item.id}/replace`, payload);
      const updatedOrder = res.data;
      toast.success(`Item replaced with ${selectedReplacement.menuItem.name}`, { id: toastId });

      if (onItemReplaced) {
        const cancelledPrevItem = {
          ...replacingItem.item,
          is_cancelled: true,
          cancellation_reason: finalReason,
        };
        const newlyAddedItem = (updatedOrder.items || []).find(
          (it: any) => !it.is_cancelled && it.menu_item_id === selectedReplacement.menuItem.id
        ) || {
          menu_item_id: selectedReplacement.menuItem.id,
          name: selectedReplacement.menuItem.name,
          quantity: selectedReplacement.quantity,
          price: selectedReplacement.unitPrice,
          variant_info,
          addons_info,
          category_id: selectedReplacement.menuItem.category_id,
        };
        onItemReplaced(updatedOrder, cancelledPrevItem, newlyAddedItem);
      }
      setIsConfirmingReplacement(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to replace item', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleAppendItems = async () => {
    if (!targetOrder || totalCartCount === 0) return;
    for (const item of Object.values(cart)) {
      const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      if (mult > 1 && item.quantity % mult !== 0) {
        toast.error(`Quantity for '${item.menuItem.name}' must be a multiple of ${mult} (received ${item.quantity}).`);
        return;
      }
    }
    setLoading(true);
    try {
      const itemsPayload = Object.values(cart).map(item => {
        const variant = item.menuItem.variants && item.menuItem.variants.length > 0 
          ? item.menuItem.variants[item.selectedVariantIdx] 
          : null;
        const variant_info = variant ? { name: variant.name, price: Number(variant.offer_price || variant.price) } : null;
        const addons_info = (item.menuItem.addons && item.selectedAddons.length > 0)
          ? item.selectedAddons.map(idx => ({
              name: item.menuItem.addons![idx].name,
              price: Number(item.menuItem.addons![idx].price),
            }))
          : null;

        const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
        const effectiveUnitPrice = mult > 1 ? (item.unitPrice / mult) : item.unitPrice;
        return {
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: effectiveUnitPrice,
          variant_info,
          addons_info,
        };
      });

      const res = await api.post(`/orders/${targetOrder.id}/items`, { items: itemsPayload });
      toast.success(`Added ${totalCartCount} item(s) to Order #${String(targetOrder.daily_order_number || (targetOrder.daily_order_number || targetOrder.id.slice(0, 8))).toUpperCase()}`);
      
      const updatedOrder = res.data;
      const prevIds = new Set((targetOrder.items || []).map((it: any) => it.id));
      const newlyAdded = (updatedOrder.items || []).filter((it: any) => !prevIds.has(it.id));
      const addedItemsToSend = newlyAdded.length > 0 ? newlyAdded : itemsPayload;

      if (onOrderCreated) onOrderCreated(updatedOrder, addedItemsToSend);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to add items to order');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (activeQtyItemId) {
      commitActiveQuantity();
    }
    if (totalCartCount === 0) {
      toast.error('Please select at least one menu item');
      return;
    }
    for (const item of Object.values(cart)) {
      const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      if (mult > 1 && item.quantity % mult !== 0) {
        toast.error(`Quantity for '${item.menuItem.name}' must be a multiple of ${mult} (received ${item.quantity}). Please adjust to ${mult}, ${mult * 2}, ${mult * 3}, etc.`);
        return;
      }
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
    for (const item of Object.values(cart)) {
      const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      if (mult > 1 && item.quantity % mult !== 0) {
        toast.error(`Quantity for '${item.menuItem.name}' must be a multiple of ${mult} (received ${item.quantity}). Please adjust to ${mult}, ${mult * 2}, ${mult * 3}, etc.`);
        return;
      }
    }

    if (orderType === 'dine_in' && !isCrackers && tableNumber) {
      const isOcc = occupiedTables.some((ot: any) => {
        const otNorm = String(ot.table_number || '').trim().toLowerCase();
        const tblNorm = tableNumber.trim().toLowerCase();
        return otNorm === tblNorm || otNorm.replace('table-', '') === tblNorm.replace('table-', '');
      });
      if (isOcc) {
        toast.error(`${tableNumber} is currently occupied. Please choose another table.`);
        return;
      }
    }

    setLoading(true);
    try {
      const itemsPayload = Object.values(cart).map(item => {
        const variant = item.menuItem.variants && item.menuItem.variants.length > 0 
          ? item.menuItem.variants[item.selectedVariantIdx] 
          : null;
        const variant_info = variant ? { name: variant.name, price: Number(variant.offer_price || variant.price) } : null;
        const addons_info = (item.menuItem.addons && item.selectedAddons.length > 0)
          ? item.selectedAddons.map(idx => ({
              name: item.menuItem.addons![idx].name,
              price: Number(item.menuItem.addons![idx].price),
            }))
          : null;

        const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
        const effectiveUnitPrice = mult > 1 ? (item.unitPrice / mult) : item.unitPrice;
        return {
          menu_item_id: item.menuItem.id,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: effectiveUnitPrice,
          variant_info,
          addons_info,
        };
      });

      const appliedDiscIds: string[] = [];
      const appliedDiscCodes: string[] = [];
      Object.values(cart).forEach(it => {
        const dInfo = getItemDiscount(it.menuItem, it.unitPrice, customerUsedDiscountIds);
        if (dInfo && !customerUsedDiscountIds.includes(String(dInfo.discount.id))) {
          if (!appliedDiscIds.includes(String(dInfo.discount.id))) {
            appliedDiscIds.push(String(dInfo.discount.id));
            appliedDiscCodes.push(dInfo.discount.code || dInfo.discount.title);
          }
        }
      });

      const validSplitPayments = paymentMethod === 'split' 
        ? splitPayments
            .filter(sp => Number(sp.amount) > 0)
            .map(sp => ({ method: sp.method, amount: Number(sp.amount) }))
        : null;

      const totalSplitPaid = validSplitPayments 
        ? validSplitPayments.reduce((acc, p) => acc + p.amount, 0)
        : 0;

      const resolvedPaymentStatus = paymentMethod === 'split'
        ? (totalSplitPaid >= gstCalculation.finalTotal ? 'paid' : (totalSplitPaid > 0 ? 'partially_paid' : 'pending'))
        : paymentStatus;

      const payload = {
        customer_name: customerName.trim() || 'Walk-in',
        customer_phone: customerPhone.trim() || '',
        order_type: orderType,
        table_number: (orderType === 'dine_in' && !isCrackers) ? tableNumber.trim() || null : null,
        delivery_address: orderType === 'delivery' ? deliveryAddress.trim() || null : null,
        payment_method: paymentMethod,
        payment_status: resolvedPaymentStatus,
        price_tier: isCrackers ? priceTier : 'retail',
        split_payments: validSplitPayments,
        total_amount: gstCalculation.finalTotal,
        applied_discount_ids: appliedDiscIds,
        applied_discount_codes: appliedDiscCodes,
        items: itemsPayload,
      };

      const res = await api.post('/orders', payload);

      toast.success('Order created successfully!');
      if (onOrderCreated) onOrderCreated(res.data);
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  // Global Keyboard Shortcuts (Ctrl+Enter, Ctrl+B, Escape, F2)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N or Cmd+N -> Next step or Create Order
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        if (step === 1) {
          if (totalCartCount > 0) {
            handleNextStep();
          } else {
            toast.error('Please select at least one menu item first');
          }
        } else if (step === 2 && !loading) {
          handleSubmitOrder();
        }
        return;
      }

      // Ctrl+Enter or Cmd+Enter -> Next step or Create Order
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (step === 1) {
          if (totalCartCount > 0) {
            handleNextStep();
          } else {
            toast.error('Please select at least one menu item first');
          }
        } else if (step === 2 && !loading) {
          handleSubmitOrder();
        }
        return;
      }

      // Ctrl+B -> Back to Step 1
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        if (step === 2) {
          e.preventDefault();
          e.stopPropagation();
          setStep(1);
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 50);
        }
        return;
      }

      // Escape key behavior
      if (e.key === 'Escape') {
        if (customizingItem) {
          e.preventDefault();
          setCustomizingItem(null);
          setTimeout(() => searchInputRef.current?.focus(), 40);
        } else if (isCategoryPickerOpen) {
          e.preventDefault();
          setIsCategoryPickerOpen(false);
          setTimeout(() => searchInputRef.current?.focus(), 40);
        } else if (isConfirmingReplacement) {
          e.preventDefault();
          setIsConfirmingReplacement(false);
          setTimeout(() => searchInputRef.current?.focus(), 40);
        } else if (activeQtyItemId) {
          e.preventDefault();
          commitActiveQuantity();
        } else if (step === 2) {
          e.preventDefault();
          setStep(1);
          setTimeout(() => searchInputRef.current?.focus(), 40);
        } else if (step === 1) {
          e.preventDefault();
          onClose();
        }
        return;
      }

      // F2 or '/' (when not typing in an input) -> Focus Search
      if (e.key === 'F2' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
        if (step === 1) {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, step, totalCartCount, loading, customizingItem, isCategoryPickerOpen, isConfirmingReplacement, activeQtyItemId, targetOrder, cart, customerName, customerPhone, orderType, tableNumber, deliveryAddress, paymentMethod, paymentStatus, gstCalculation]);

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
            {replacingItem
              ? `Replace "${replacingItem.item.name}" in Order #${replacingItem.order.daily_order_number || replacingItem.order.id.slice(0, 8).toUpperCase()}`
              : targetOrder 
              ? `Add Items to #${targetOrder.daily_order_number || targetOrder.id.slice(0, 8).toUpperCase()}`
              : (step === 1 ? 'Select Menu Items' : 'Customer & Order Info')}
          </h2>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
            {replacingItem
              ? 'Replacement Mode'
              : step === 1 
              ? `Step 1/2 • ${totalCartCount} item${totalCartCount === 1 ? '' : 's'}` 
              : 'Step 2/2'}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
        >
          <X size={20} />
        </button>
      </div>

      {/* Replacement Context Sub-Banner */}
      {replacingItem && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <RotateCcw size={14} />
            </span>
            <div className="text-xs truncate">
              <span className="text-muted-foreground">Original item: </span>
              <strong className="text-foreground font-bold">{replacingItem.item.name}</strong>
              <span className="text-muted-foreground ml-1 font-mono">
                (×{replacingItem.item.quantity} • ₹{Number(replacingItem.item.price * replacingItem.item.quantity).toFixed(2)})
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 hidden sm:inline">
            Tap + ADD on a replacement dish below
          </span>
        </div>
      )}

      {/* STEP 1: MENU SELECTION */}
      {step === 1 && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Crackers Price Tier Banner */}
          {isCrackers && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 shrink-0">
                <Tag size={14} className="text-amber-600 dark:text-amber-400" />
                <span>Price Tier:</span>
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'retail', label: 'Retailer / MRP', icon: Store },
                  { id: 'wholesale', label: 'Wholesaler (Bulk)', icon: Package },
                  { id: 'other', label: 'Other / Agent', icon: UserCheck }
                ].map(tier => {
                  const Icon = tier.icon;
                  const isSelected = priceTier === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => handlePriceTierChange(tier.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-background/80 text-muted-foreground hover:bg-background border border-border'
                      }`}
                    >
                      <Icon size={13} className={isSelected ? 'text-white' : 'text-muted-foreground'} />
                      <span>{tier.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Streamlined Search + Filter Bar */}
          <div className="px-3 sm:px-6 py-2 space-y-2 shrink-0 border-b border-border/50 bg-background/50">
            {/* Search Input + Veg/Non-veg Badges in One Compact Row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={isCrackers ? "Type cracker name and press [Enter]..." : "Type dish/item name and press [Enter]..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedItemIndex(0);
                  }}
                  onKeyDown={(e) => {
                    if (filteredItems.length === 0) return;

                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      setFocusedItemIndex(prev => (prev + 1) % filteredItems.length);
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      setFocusedItemIndex(prev => (prev <= 0 ? filteredItems.length - 1 : prev - 1));
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setFocusedItemIndex(prev => {
                        const cols = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
                        const next = prev + cols;
                        return next < filteredItems.length ? next : Math.min(filteredItems.length - 1, prev + 1);
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setFocusedItemIndex(prev => {
                        const cols = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
                        const next = prev - cols;
                        return next >= 0 ? next : Math.max(0, prev - 1);
                      });
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredItems.length > 0) {
                        const targetItem = filteredItems[focusedItemIndex] || filteredItems[0];
                        const stepVal = getItemMultiplier(targetItem);
                        if (isItemCustomizable(targetItem)) {
                          handleOpenCustomization(targetItem);
                        } else {
                          const curQty = cart[targetItem.id]?.quantity || 0;
                          const initQty = curQty > 0 ? curQty : stepVal;
                          if (curQty === 0) {
                            handleSetExactQuantity(targetItem, stepVal);
                          }
                          setActiveQtyItemId(targetItem.id);
                          setActiveQtyValue(String(initQty));
                          setTimeout(() => {
                            qtyInputRef.current?.focus();
                            qtyInputRef.current?.select();
                          }, 40);
                        }
                      }
                    } else if (e.key === 'Escape') {
                      if (searchQuery) {
                        e.preventDefault();
                        setSearchQuery('');
                      }
                    }
                  }}
                  className="w-full pl-8 pr-16 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-primary/40 rounded-full h-9 text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                    ↵ Enter
                  </span>
                </div>
              </div>

              {/* Food Filter Pills */}
              {businessCategory.dietaryEnabled && (
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
              )}
            </div>

            {/* Active Quick Quantity Bar when editing quantity via keyboard flow */}
            {activeQtyItemId && (() => {
              const activeItem = safeMenuItems.find(m => m.id === activeQtyItemId);
                  const activeStep = getItemMultiplier(activeItem);
              if (!activeItem) return null;
              return (
                <div className="bg-primary/10 border-2 border-primary/40 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 sm:gap-4 animate-in fade-in slide-in-from-top-1 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1 rounded-lg bg-primary text-white shrink-0 shadow-xs">
                      <Sparkles size={14} />
                    </span>
                    <div className="text-xs truncate">
                      <span className="text-muted-foreground">Adjust quantity for: </span>
                      <strong className="text-foreground font-bold">{activeItem.name}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-background border-2 border-primary rounded-xl h-8 px-1 shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(activeQtyValue, 10) || 0;
                          const n = Math.max(0, (Math.ceil(cur / activeStep) - 1) * activeStep);
                          setActiveQtyValue(String(n));
                          handleSetExactQuantity(activeItem, n);
                        }}
                        className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground font-black text-sm cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        ref={qtyInputRef}
                        type="number"
                        min={activeStep > 1 ? activeStep : 0}
                        step={activeStep}
                        value={activeQtyValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setActiveQtyValue('');
                            handleSetExactQuantity(activeItem, 0);
                            return;
                          }
                          const rawNum = parseInt(val, 10);
                          if (isNaN(rawNum) || rawNum <= 0) {
                            setActiveQtyValue('');
                            handleSetExactQuantity(activeItem, 0);
                            return;
                          }
                          if (activeStep > 1 && rawNum % activeStep !== 0) {
                            const snapped = Math.max(activeStep, Math.round(rawNum / activeStep) * activeStep);
                            setActiveQtyValue(String(snapped));
                            handleSetExactQuantity(activeItem, snapped);
                            toast.error(`Quantity must be a multiple of ${activeStep} (snapped to ${snapped}).`, { id: 'mult-snap' });
                            return;
                          }
                          setActiveQtyValue(String(rawNum));
                          handleSetExactQuantity(activeItem, rawNum);
                        }}
                        onBlur={() => {
                          commitActiveQuantity();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const cur = parseInt(activeQtyValue, 10) || 0;
                            const n = Math.max(activeStep, (Math.floor(cur / activeStep) + 1) * activeStep);
                            setActiveQtyValue(String(n));
                            handleSetExactQuantity(activeItem, n);
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const cur = parseInt(activeQtyValue, 10) || activeStep;
                            const n = Math.max(0, (Math.ceil(cur / activeStep) - 1) * activeStep);
                            setActiveQtyValue(String(n));
                            handleSetExactQuantity(activeItem, n);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            commitActiveQuantity();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            commitActiveQuantity();
                          }
                        }}
                        className="w-14 text-center text-xs font-black font-mono bg-transparent outline-none text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const cur = parseInt(activeQtyValue, 10) || 0;
                          const n = Math.max(activeStep, (Math.floor(cur / activeStep) + 1) * activeStep);
                          setActiveQtyValue(String(n));
                          handleSetExactQuantity(activeItem, n);
                        }}
                        className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground font-black text-sm cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={commitActiveQuantity}
                      className="h-8 px-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
                      title="Press Enter to confirm and search next item"
                    >
                      <span>Done</span>
                      <CornerDownLeft size={13} />
                    </button>
                  </div>
                </div>
              );
            })()}

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
                {filteredItems.map((item, index) => {
                  const customizable = isItemCustomizable(item);
                  const totalItemQty = getItemTotalQuantity(item.id);
                  const displayPrice = computeUnitPrice(item, 0, [], customerUsedDiscountIds, priceTier);
                  const retailMrp = Number((item.variants && item.variants.length > 0 ? item.variants[0].price : item.price) || 0);
                  const retailOffer = Number((item.variants && item.variants.length > 0 ? (item.variants[0].offer_price || item.variants[0].price) : (item.offer_price || item.price)) || 0);
                  
                  let strikethroughPrice: number | null = null;
                  let discountInfo: any = null;
                  let tierBadgeText: string | null = null;

                  if (priceTier === 'wholesale') {
                    tierBadgeText = 'Wholesale';
                    if (retailOffer > displayPrice) {
                      strikethroughPrice = retailOffer;
                    } else if (retailMrp > displayPrice) {
                      strikethroughPrice = retailMrp;
                    }
                  } else if (priceTier === 'other') {
                    tierBadgeText = 'Agent';
                    if (retailOffer > displayPrice) {
                      strikethroughPrice = retailOffer;
                    } else if (retailMrp > displayPrice) {
                      strikethroughPrice = retailMrp;
                    }
                  } else {
                    // Retail mode
                    discountInfo = getItemDiscount(item, retailOffer);
                    if (discountInfo) {
                      strikethroughPrice = retailOffer;
                    } else if (retailMrp > retailOffer && retailOffer > 0) {
                      strikethroughPrice = retailMrp;
                    }
                  }

                  const isKeyboardFocused = focusedItemIndex === index;
                  const isQtyActive = activeQtyItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      ref={(el) => { itemRefs.current[item.id] = el; }}
                      onClick={() => {
                        setFocusedItemIndex(index);
                      }}
                      className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all relative ${
                        isQtyActive
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/10 shadow-md'
                          : isKeyboardFocused
                          ? 'border-primary/80 ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm'
                          : totalItemQty > 0 
                          ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-xs' 
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
                            <span className="bg-amber-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs inline-flex items-center gap-0.5">
                              <Star size={9} className="fill-current" /> Bestseller
                            </span>
                          )}
                          {item.is_highlighted && (
                            <span className="bg-orange-500 text-white font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded-full shadow-2xs inline-flex items-center gap-0.5">
                              <Flame size={9} className="fill-current" /> Special
                            </span>
                          )}
                          {isKeyboardFocused && !isQtyActive && (
                            <span className="bg-primary/20 text-primary font-bold text-[9px] px-1.5 py-0.2 rounded-full font-mono">
                              ↵ Enter to add
                            </span>
                          )}
                        </div>

                        {/* Item Name & Serial Number */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.serial_number && (
                            <span className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded shadow-2xs">
                              #{item.serial_number}
                            </span>
                          )}
                          <h4 className="font-bold text-sm sm:text-base text-foreground leading-snug truncate">
                            {item.name}
                          </h4>
                          {(() => {
                            const mult = getItemMultiplier(item);
                            return mult > 1 ? (
                              <span className="text-[10px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded">
                                ×{mult} Pack
                              </span>
                            ) : null;
                          })()}
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                          <span className="font-extrabold text-sm sm:text-base text-foreground font-mono">
                            ₹{Number(displayPrice).toFixed(2)}
                          </span>
                          {strikethroughPrice && strikethroughPrice !== displayPrice && (
                            <span className="text-xs text-muted-foreground line-through font-medium font-mono">
                              ₹{Number(strikethroughPrice).toFixed(2)}
                            </span>
                          )}
                          {tierBadgeText && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {tierBadgeText}
                            </span>
                          )}
                          {discountInfo && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {discountInfo.discount.title || `${discountInfo.savingPercent}% OFF`}
                            </span>
                          )}
                          {customizable && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                              {item.variants?.length ? `${item.variants.length} Variants` : ''}
                              {item.variants?.length && item.addons?.length ? ' • ' : ''}
                              {item.addons?.length ? `${item.addons.length} Add-ons` : ''}
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
                          {customizable ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCustomization(item)}
                              className={`h-7 px-3 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                totalItemQty > 0
                                  ? 'bg-primary text-white shadow-md'
                                  : 'bg-background border border-primary/40 text-primary hover:bg-primary hover:text-white shadow-xs'
                              }`}
                            >
                              <span>+ ADD</span>
                              {totalItemQty > 0 && (
                                <span className="bg-white/30 text-white px-1.5 py-0.2 rounded-md text-[10px] font-mono">
                                  {totalItemQty}
                                </span>
                              )}
                            </button>
                          ) : totalItemQty === 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                const stepVal = getItemMultiplier(item);
                                handleSetExactQuantity(item, stepVal);
                                setActiveQtyItemId(item.id);
                                setActiveQtyValue(String(stepVal));
                                setTimeout(() => {
                                  qtyInputRef.current?.focus();
                                  qtyInputRef.current?.select();
                                }, 40);
                              }}
                              className="h-7 px-3.5 rounded-xl font-black text-xs bg-background border border-primary/40 text-primary hover:bg-primary hover:text-white shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              + ADD
                            </button>
                          ) : (
                            <div className="flex items-center bg-primary text-white rounded-xl shadow-md h-7 px-1 font-bold">
                              <button
                                type="button"
                                onClick={() => handleSimpleQuantity(item, -1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-sm"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveQtyItemId(item.id);
                                  setActiveQtyValue(String(totalItemQty));
                                  setTimeout(() => {
                                    qtyInputRef.current?.focus();
                                    qtyInputRef.current?.select();
                                  }, 40);
                                }}
                                className="w-6 text-center text-xs font-black hover:bg-white/20 rounded cursor-pointer"
                                title="Click to edit quantity directly"
                              >
                                {totalItemQty}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSimpleQuantity(item, 1)}
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
            <div className="p-3.5 bg-muted/60 rounded-2xl border border-border space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">{totalCartCount} Items in Order</span>
                  <div className="text-muted-foreground text-xs truncate max-w-[280px]">
                    {Object.values(cart).map(i => `${i.menuItem.name} (x${i.quantity})`).join(', ')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-base text-primary font-mono">₹{gstCalculation.finalTotal.toFixed(2)}</span>
                  {isExclusiveTax && totalCartCount > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      ₹{totalCartAmount.toFixed(2)} + ₹{gstCalculation.totalTax.toFixed(2)} GST
                    </div>
                  )}
                </div>
              </div>
              {isGstEnabled && totalCartCount > 0 && (
                <div className="pt-2 border-t border-border/60 flex justify-between items-center text-[11px] text-muted-foreground font-mono">
                  <span>GST ({cgstRate}% CGST + {sgstRate}% SGST)</span>
                  <span className="font-semibold text-foreground">
                    {isExclusiveTax ? `+₹${gstCalculation.totalTax.toFixed(2)} (Exclusive)` : `₹${gstCalculation.totalTax.toFixed(2)} (Included)`}
                  </span>
                </div>
              )}
            </div>

            {/* Selected Items Detail Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Order Items ({totalCartCount})
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer"
                >
                  + Add More Items
                </button>
              </div>

              <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden shadow-2xs">
                {Object.values(cart).map((item) => {
                  const variant = item.menuItem.variants && item.menuItem.variants.length > 0 
                    ? item.menuItem.variants[item.selectedVariantIdx] 
                    : null;
                  const addonNames = item.selectedAddons.map(idx => item.menuItem.addons?.[idx]?.name).filter(Boolean);

                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground">{item.menuItem.name}</span>
                          {variant && (
                            <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                              {variant.name}
                            </span>
                          )}
                        </div>
                        {addonNames.length > 0 && (
                          <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                            Add-ons: {addonNames.join(', ')}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          ₹{item.unitPrice.toFixed(2)} {getItemMultiplier(item.menuItem, item.selectedVariantIdx) > 1 ? `(Pack of ${getItemMultiplier(item.menuItem, item.selectedVariantIdx)})` : ''} × {getItemMultiplier(item.menuItem, item.selectedVariantIdx) > 1 ? `${item.quantity / getItemMultiplier(item.menuItem, item.selectedVariantIdx)} pack(s) (${item.quantity} pcs)` : item.quantity}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-black text-sm text-foreground font-mono">
                          ₹{getItemLineTotal(item).toFixed(2)}
                        </span>
                        <div className="flex items-center bg-muted rounded-xl border border-border h-7 px-1">
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, -1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-background rounded text-foreground text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartItemQuantity(item.id, 1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-background rounded text-foreground text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Type Tabs */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Order Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(() => {
                  const currentOrderTypes = isCrackers 
                    ? [
                        { id: 'takeaway', label: 'In-Store / Counter' },
                        { id: 'dine_in', label: 'Counter Sale' },
                        { id: 'delivery', label: 'Parcel / Delivery' }
                      ]
                    : [
                        { id: 'dine_in', label: 'Dine-In' },
                        { id: 'takeaway', label: 'Takeaway' },
                        { id: 'delivery', label: 'Delivery' }
                      ];

                  const handleOrderTypeKeyDown = (e: React.KeyboardEvent, currentId: string) => {
                    const currentIndex = currentOrderTypes.findIndex(opt => opt.id === currentId);
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      const nextIndex = (currentIndex + 1) % currentOrderTypes.length;
                      const nextOpt = currentOrderTypes[nextIndex];
                      setOrderType(nextOpt.id as any);
                      orderTypeRefs.current[nextOpt.id]?.focus();
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      const prevIndex = (currentIndex - 1 + currentOrderTypes.length) % currentOrderTypes.length;
                      const prevOpt = currentOrderTypes[prevIndex];
                      setOrderType(prevOpt.id as any);
                      orderTypeRefs.current[prevOpt.id]?.focus();
                    } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      customerPhoneInputRef.current?.focus();
                      customerPhoneInputRef.current?.select();
                    }
                  };

                  return currentOrderTypes.map((opt) => (
                    <button
                      key={opt.id}
                      ref={(el) => { orderTypeRefs.current[opt.id] = el; }}
                      type="button"
                      onClick={() => setOrderType(opt.id as any)}
                      onKeyDown={(e) => handleOrderTypeKeyDown(e, opt.id)}
                      className={`py-2 px-3 rounded-xl border text-xs sm:text-sm font-bold capitalize transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                        orderType === opt.id
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-card text-foreground hover:bg-muted'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ));
                })()}
              </div>
            </div>

            {/* Conditional Dine-in Table choosing (Only for Food Businesses, Hidden for Crackers) */}
            {orderType === 'dine_in' && !isCrackers && (() => {
              const totalTables = Number((shop?.settings as any)?.dinein_tables_count || 10);
              const tablesList = Array.from({ length: totalTables }, (_, i) => `Table-${i + 1}`);

              const tableOptions = tablesList.map((tbl) => {
                const occ = occupiedTables.find((ot: any) => {
                  const otNorm = String(ot.table_number || '').trim().toLowerCase();
                  const tblNorm = tbl.toLowerCase();
                  return otNorm === tblNorm || otNorm.replace('table-', '') === tblNorm.replace('table-', '');
                });

                const isOccupied = Boolean(occ);

                return {
                  id: tbl,
                  name: tbl,
                  icon: <UtensilsCrossed size={14} className={isOccupied ? 'text-amber-500' : 'text-primary'} />,
                  subtext: isOccupied ? `Occupied (Order #${occ?.daily_order_number || 'Active'})` : 'Available',
                  disabled: isOccupied,
                };
              });

              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-foreground block">
                      {businessCategory.tableOrStallLabel || 'Table Number'}
                    </label>
                    {tableNumber && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200">
                        {tableNumber} Selected
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    options={tableOptions}
                    value={tableNumber}
                    onChange={(val) => setTableNumber(val)}
                    placeholder={`-- Choose ${businessCategory.tableOrStallLabel || 'Table Number'} --`}
                    showSearch={tablesList.length > 8}
                    className="w-full bg-background border-border rounded-xl text-xs font-bold text-foreground"
                  />
                </div>
              );
            })()}

            {orderType === 'delivery' && (
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Delivery Address</label>
                <Input
                  placeholder="Enter customer delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitOrder();
                    }
                  }}
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
                <span className="text-[11px] text-muted-foreground italic">(Optional for counter order)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1 flex items-center gap-1">
                    <Phone size={13} /> Mobile Number
                  </label>
                  <Input
                    ref={customerPhoneInputRef}
                    placeholder="10-digit mobile number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        customerNameInputRef.current?.focus();
                        customerNameInputRef.current?.select();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const currentOpt = isCrackers ? (orderType || 'takeaway') : (orderType || 'dine_in');
                        orderTypeRefs.current[currentOpt]?.focus();
                      }
                    }}
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

                <div>
                  <label className="text-xs font-medium text-foreground block mb-1 flex items-center gap-1">
                    <User size={13} /> Customer Name
                  </label>
                  <Input
                    ref={customerNameInputRef}
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const currentPm = paymentMethod || 'cash';
                        paymentMethodRefs.current[currentPm]?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        customerPhoneInputRef.current?.focus();
                        customerPhoneInputRef.current?.select();
                      }
                    }}
                    className="rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details & Split Payments */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Payment Details
                </span>
                {paymentMethod === 'split' && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Split Payment Mode
                  </span>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-medium text-foreground block mb-1.5">Choose Payment Method</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(() => {
                    const paymentMethodOptions = [
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'upi', label: 'UPI / QR', icon: QrCode },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'other', label: 'Other', icon: Tag },
                      { id: 'split', label: 'Split', icon: SplitIcon },
                    ];

                    const handlePaymentMethodKeyDown = (e: React.KeyboardEvent, currentId: string) => {
                      const currentIndex = paymentMethodOptions.findIndex(pm => pm.id === currentId);
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        const nextIndex = (currentIndex + 1) % paymentMethodOptions.length;
                        const nextPm = paymentMethodOptions[nextIndex];
                        setPaymentMethod(nextPm.id as any);
                        paymentMethodRefs.current[nextPm.id]?.focus();
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        const prevIndex = (currentIndex - 1 + paymentMethodOptions.length) % paymentMethodOptions.length;
                        const prevPm = paymentMethodOptions[prevIndex];
                        setPaymentMethod(prevPm.id as any);
                        paymentMethodRefs.current[prevPm.id]?.focus();
                      } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        if (paymentMethod !== 'split') {
                          paymentStatusRef.current?.focus();
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        customerNameInputRef.current?.focus();
                        customerNameInputRef.current?.select();
                      }
                    };

                    return paymentMethodOptions.map((pm) => {
                      const Icon = pm.icon;
                      const isSelected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          ref={(el) => { paymentMethodRefs.current[pm.id] = el; }}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id as any)}
                          onKeyDown={(e) => handlePaymentMethodKeyDown(e, pm.id)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected
                              ? 'border-primary bg-primary text-white shadow-xs'
                              : 'border-border bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon size={14} className={isSelected ? 'text-white' : 'text-muted-foreground'} />
                          <span>{pm.label}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Single Payment Status */}
              {paymentMethod !== 'split' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Payment Status</label>
                    <SearchableSelect
                      ref={paymentStatusRef}
                      options={[
                        { 
                          id: 'paid', 
                          name: 'Paid', 
                          icon: <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> 
                        },
                        { 
                          id: 'pending', 
                          name: 'Not Paid (Pending)', 
                          icon: <Clock size={15} className="text-amber-500 shrink-0" /> 
                        },
                      ]}
                      value={paymentStatus}
                      onChange={(val) => setPaymentStatus(val as any)}
                      showSearch={false}
                      className="w-full h-10 border-border bg-background text-sm text-foreground rounded-xl"
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const currentPm = paymentMethod || 'cash';
                          paymentMethodRefs.current[currentPm]?.focus();
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Split Payment Dynamic Line Items Builder */}
              {paymentMethod === 'split' && (() => {
                const totalEntered = splitPayments.reduce((acc, sp) => acc + (Number(sp.amount) || 0), 0);
                const totalRequired = gstCalculation.finalTotal;
                const remaining = Math.max(0, totalRequired - totalEntered);
                const isFullyPaid = totalEntered >= totalRequired;

                return (
                  <div className="bg-muted/40 p-3.5 rounded-2xl border border-border space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">Split Breakdown</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Paid: <strong className="font-mono text-foreground">₹{totalEntered.toFixed(2)}</strong> / ₹{totalRequired.toFixed(2)}</span>
                        {isFullyPaid ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            Full Paid
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
                            Remaining: ₹{remaining.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {splitPayments.map((sp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-36 shrink-0">
                            <SearchableSelect
                              options={SPLIT_PAYMENT_OPTIONS}
                              value={sp.method}
                              onChange={(val) => {
                                const next = [...splitPayments];
                                next[idx].method = val as any;
                                setSplitPayments(next);
                              }}
                              showSearch={false}
                              className="h-9 text-xs font-bold"
                            />
                          </div>

                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={sp.amount}
                              onChange={(e) => {
                                const next = [...splitPayments];
                                next[idx].amount = e.target.value;
                                setSplitPayments(next);
                              }}
                              className="w-full h-9 pl-6 pr-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>

                          {remaining > 0 && Number(sp.amount || 0) === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...splitPayments];
                                next[idx].amount = String(remaining.toFixed(2));
                                setSplitPayments(next);
                              }}
                              className="h-9 px-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-[10px] font-bold transition-all shrink-0 cursor-pointer"
                              title="Fill remaining amount"
                            >
                              + ₹{remaining.toFixed(2)}
                            </button>
                          )}

                          {splitPayments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSplitPayments(splitPayments.filter((_, i) => i !== idx));
                              }}
                              className="p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors shrink-0 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitPayments([
                            ...splitPayments,
                            { method: 'upi', amount: remaining > 0 ? String(remaining.toFixed(2)) : '' }
                          ]);
                        }}
                        className="text-xs text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> Add Payment Method
                      </button>

                      {remaining > 0 && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          <AlertCircle size={12} className="inline mr-1 text-amber-500" />Order will be saved as Partially Paid
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar with Keyboard Hints */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t border-border px-3 sm:px-6 py-2.5 z-30 flex items-center justify-between shadow-lg">
        {replacingItem ? (
          <>
            <div>
              {selectedReplacement ? (
                <div>
                  <div className="text-xs font-bold text-foreground truncate max-w-[190px] sm:max-w-none flex items-center gap-1.5 flex-wrap">
                    <span>New: {selectedReplacement.menuItem.name}</span>
                    {selectedReplacement.menuItem.variants?.[selectedReplacement.selectedVariantIdx]?.name && (
                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded">
                        {selectedReplacement.menuItem.variants[selectedReplacement.selectedVariantIdx].name}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-muted-foreground">×{selectedReplacement.quantity}</span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base sm:text-lg font-black text-foreground font-mono">
                      {currencySymbol}{newReplacementTotal.toFixed(2)}
                    </span>
                    {replacementPriceDiff > 0 && (
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                        +{currencySymbol}{replacementPriceDiff.toFixed(2)} to collect
                      </span>
                    )}
                    {replacementPriceDiff < 0 && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        -{currencySymbol}{Math.abs(replacementPriceDiff).toFixed(2)} refund
                      </span>
                    )}
                    {replacementPriceDiff === 0 && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Same price
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground font-medium">
                  Tap <strong className="text-foreground">+ ADD</strong> on any item to replace
                </div>
              )}
            </div>

            <Button
              onClick={() => setIsConfirmingReplacement(true)}
              disabled={!selectedReplacement || loading}
              className="gap-2 px-5 sm:px-6 h-10 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              Confirm Replacement <ArrowRight size={16} />
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                  <span>{totalCartCount} item(s) selected</span>
                  {isExclusiveTax && gstCalculation.totalTax > 0 && (
                    <span className="text-primary font-bold">(+₹{gstCalculation.totalTax.toFixed(2)} GST)</span>
                  )}
                </div>
                <div className="text-base sm:text-lg font-black text-foreground font-mono">
                  ₹{gstCalculation.finalTotal.toFixed(2)}
                </div>
              </div>

              {/* Keyboard legend hint for admins */}
              <div className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground border-l border-border pl-3 ml-1">
                <Keyboard size={13} className="text-primary" />
                {step === 1 ? (
                  <span>
                    <strong className="text-foreground font-mono">[Enter]</strong> Select & Qty • <strong className="text-foreground font-mono">[↑/↓]</strong> Qty • <strong className="text-foreground font-mono">[Ctrl+Enter]</strong> Next
                  </span>
                ) : (
                  <span>
                    <strong className="text-foreground font-mono">[Ctrl+Enter]</strong> Create Order • <strong className="text-foreground font-mono">[Ctrl+B]</strong> Back
                  </span>
                )}
              </div>
            </div>

            {step === 1 ? (
              <Button
                onClick={handleNextStep}
                disabled={totalCartCount === 0}
                isLoading={loading}
                className="gap-2 px-5 sm:px-6 h-10 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {targetOrder ? (
                  <>Add Items (₹{gstCalculation.finalTotal.toFixed(2)}) <Check size={16} /></>
                ) : (
                  <>
                    <span>Next (₹{gstCalculation.finalTotal.toFixed(2)})</span>
                    <span className="hidden sm:inline-flex text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">Ctrl+Enter</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSubmitOrder}
                isLoading={loading}
                className="px-5 sm:px-6 h-10 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Check size={16} />
                <span>Create Order (₹{gstCalculation.finalTotal.toFixed(2)})</span>
                <span className="hidden sm:inline-flex text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">Ctrl+Enter</span>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Item Customization Modal (Variants & Add-ons) */}
      {customizingItem && (
        <Modal
          isOpen={Boolean(customizingItem)}
          onClose={() => setCustomizingItem(null)}
          title={`Customize ${customizingItem.name}`}
          className="max-w-lg"
          footer={
            <div className="flex items-center justify-between w-full gap-3">
              <div>
                <div className="text-[11px] text-muted-foreground font-semibold">Total Price</div>
                <div className="text-lg font-black text-foreground font-mono">
                  ₹{(computeUnitPrice(customizingItem, selectedVariantIdx, selectedAddons) * customizingQty).toFixed(2)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl px-4"
                  onClick={() => setCustomizingItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="rounded-xl px-5 font-bold bg-primary hover:bg-primary/90 text-white shadow-md gap-1.5"
                  onClick={handleConfirmCustomization}
                >
                  <Check size={16} />
                  {replacingItem ? 'Select for Replacement' : 'Add to Order'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 pt-1 max-h-[60vh] overflow-y-auto px-1">
            {/* Item Brief */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl border border-border">
              {customizingItem.image_url ? (
                <img
                  src={customizingItem.image_url}
                  alt={customizingItem.name}
                  className="w-14 h-14 rounded-xl object-cover border border-border shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <ShoppingBag size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-foreground truncate">{customizingItem.name}</h4>
                {customizingItem.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{customizingItem.description}</p>
                )}
                <div className="text-xs font-mono font-bold text-primary mt-0.5">
                  Unit Price: ₹{computeUnitPrice(customizingItem, selectedVariantIdx, selectedAddons).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Variants Selection */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Select Portion / Size <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-muted-foreground">Required (1 choice)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customizingItem.variants.map((v, idx) => {
                    const isSelected = selectedVariantIdx === idx;
                    let vPrice = v.offer_price || v.price;
                    if (priceTier === 'wholesale' && v.wholesale_price && Number(v.wholesale_price) > 0) {
                      vPrice = v.wholesale_price;
                    } else if (priceTier === 'other' && v.other_price && Number(v.other_price) > 0) {
                      vPrice = v.other_price;
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedVariantIdx(idx);
                          const stepM = getItemMultiplier(customizingItem, idx);
                          setCustomizingQty(prev => Math.max(stepM, Math.round(prev / stepM) * stepM || stepM));
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs'
                            : 'border-border bg-card hover:border-border/80 hover:bg-muted/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {v.name}
                            </span>
                            {Boolean(v.multiplier && v.multiplier > 1) && (
                              <span className="text-[9px] font-extrabold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.2 rounded">
                                ×{v.multiplier}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mt-0.5 font-mono">
                            <span className="text-xs font-bold text-foreground">₹{Number(vPrice).toFixed(2)}</span>
                            {priceTier === 'retail' && v.offer_price && (
                              <span className="text-[10px] text-muted-foreground line-through">₹{Number(v.price).toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add-ons Selection */}
            {customizingItem.addons && customizingItem.addons.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Select Add-ons
                  </label>
                  <span className="text-[11px] text-muted-foreground">Optional (multi-select)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customizingItem.addons.map((addon, idx) => {
                    const isSelected = selectedAddons.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedAddons(prev => 
                            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                          );
                        }}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30 shadow-xs'
                            : 'border-border bg-card hover:border-border/80 hover:bg-muted/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {addon.name}
                          </div>
                          <div className="text-xs font-bold text-primary font-mono mt-0.5">
                            +₹{Number(addon.price).toFixed(2)}
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper */}
            {(() => {
              const activeMultiplier = getItemMultiplier(customizingItem, selectedVariantIdx);

              return (
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <span className="text-xs font-bold text-foreground block">Quantity</span>
                    {activeMultiplier > 1 && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                        Steps by {activeMultiplier}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center bg-background rounded-lg border border-border h-8 px-1">
                    <button
                      type="button"
                      onClick={() => setCustomizingQty(Math.max(activeMultiplier, customizingQty - activeMultiplier))}
                      disabled={customizingQty <= activeMultiplier}
                      className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded text-foreground text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="w-10 text-center text-xs font-black font-mono">{customizingQty}</span>
                    <button
                      type="button"
                      onClick={() => setCustomizingQty(customizingQty + activeMultiplier)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-muted rounded text-foreground text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

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

      {/* Replacement Reason Confirmation Modal */}
      {replacingItem && (
        <Modal
          isOpen={isConfirmingReplacement}
          onClose={() => setIsConfirmingReplacement(false)}
          title="Confirm Item Replacement"
          className="max-w-md"
        >
          <div className="space-y-4 pt-1">
            {/* Old vs New Item comparison card */}
            <div className="p-3.5 bg-muted/60 border border-border rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Old Item (Remove)</span>
                <div className="font-bold text-sm text-foreground truncate">{replacingItem.item?.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  ×{replacingItem.item?.quantity} • {currencySymbol}{oldReplacementTotal.toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 shrink-0">
                <ArrowRight size={16} />
              </div>

              <div className="space-y-0.5 min-w-0 flex-1 text-right">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">New Item (Add)</span>
                <div className="font-bold text-sm text-foreground truncate">{selectedReplacement?.menuItem?.name}</div>
                {selectedReplacement?.menuItem?.variants?.[selectedReplacement?.selectedVariantIdx]?.name && (
                  <div className="text-[11px] text-primary font-bold">
                    ({selectedReplacement.menuItem.variants[selectedReplacement.selectedVariantIdx].name})
                  </div>
                )}
                <div className="text-xs text-emerald-600 font-bold font-mono">
                  ×{selectedReplacement?.quantity} • {currencySymbol}{newReplacementTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Price Difference / Refundable Amount Indicator */}
            <div className="p-3 rounded-xl bg-background border border-border flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {replacementPriceDiff < 0 
                  ? 'Refundable Amount:' 
                  : replacementPriceDiff > 0 
                  ? 'Additional Amount Due:' 
                  : 'Price Difference:'}
              </span>
              <span className={`font-mono font-black text-sm ${replacementPriceDiff > 0 ? 'text-amber-600' : replacementPriceDiff < 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                {replacementPriceDiff > 0 
                  ? `+${currencySymbol}${replacementPriceDiff.toFixed(2)} (${isPaidOnline ? 'Customer payment required' : 'Collect at counter'})` 
                  : replacementPriceDiff < 0 
                  ? `${currencySymbol}${Math.abs(replacementPriceDiff).toFixed(2)} (${isPaidOnline ? 'Auto-Refund online' : 'Refund at counter'})` 
                  : `${currencySymbol}0.00 (Same price — no refund needed)`}
              </span>
            </div>

            {/* Replacement Reason Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Replacement Reason <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={REPLACEMENT_REASONS}
                value={replacementReason}
                onChange={(val) => setReplacementReason(val)}
                placeholder="Select replacement reason..."
                showSearch={false}
                className="h-11 rounded-xl text-sm"
              />

              {replacementReason === 'custom' && (
                <Input
                  placeholder="Enter replacement reason here..."
                  value={customReplacementReason}
                  onChange={(e) => setCustomReplacementReason(e.target.value)}
                  className="rounded-xl mt-2"
                  autoFocus
                />
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsConfirmingReplacement(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold"
                onClick={handleConfirmReplacementSubmit}
                isLoading={loading}
              >
                Confirm & Replace Item
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discount Already Used Alert Modal */}
      <Modal
        isOpen={discountRevertedNotice.isOpen}
        onClose={() => setDiscountRevertedNotice({ isOpen: false, count: 0, titles: [] })}
        title="Discount Already Used by Customer"
        className="max-w-md"
      >
        <div className="p-4 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertCircle size={28} />
          </div>
          <div>
            <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">Discount Automatically Removed</h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              Customer with phone <strong className="text-slate-900 dark:text-white font-mono">{customerPhone}</strong> has already used this discount offer{discountRevertedNotice.titles.length > 0 ? ` (${discountRevertedNotice.titles.join(', ')})` : ''} on a previous order.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 mt-3 font-medium">
              <Sparkles size={14} className="inline mr-1 text-amber-500" />The cart items have been automatically reverted to their original standard price without the discount.
            </div>
          </div>
          <Button
            onClick={() => setDiscountRevertedNotice({ isOpen: false, count: 0, titles: [] })}
            className="w-full py-2.5 rounded-xl font-bold"
          >
            Acknowledge & Continue
          </Button>
        </div>
      </Modal>
    </div>,
    document.body
  );
}



