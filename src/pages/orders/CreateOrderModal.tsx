import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, User, Phone, Check, X, ChevronDown, LayoutGrid, RotateCcw, UtensilsCrossed, Armchair, AlertCircle, CornerDownLeft, Keyboard, Banknote, QrCode, CreditCard, Tag, Split as SplitIcon, CheckCircle2, Clock, Store, Package, UserCheck, Star, Flame, Layers, Percent, Calculator, Trash2, Delete, Truck, Receipt, MapPin, Lock } from 'lucide-react';




import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { getBusinessCategory, isFireworksBusiness } from '@/config/businessCategories';
import { MenuItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { CountryCodeSelect } from '@/components/ui/CountryCodeSelect';
import { useGeoCountryCode } from '@/hooks/useGeoCountryCode';
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
  menuItem?: MenuItem;
  customName?: string;
  name?: string;
  selectedVariantIdx?: number;
  selectedVariant?: any;
  selectedAddons?: number[]; // indices of menuItem.addons
  quantity: number;
  unitPrice: number;
  isCalculatorItem?: boolean;
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
  const isExistingOrder = Boolean(targetOrder || replacingItem);
  
  const [step, setStep] = useState<1 | 2>(1);
  const [mobileTab, setMobileTab] = useState<"catalog" | "bill">("catalog");
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

  // Adjustable Right Panel Width (with localStorage persistence)
  const [billPanelWidth, setBillPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('menukit_pos_bill_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 320 && parsed <= 750) return parsed;
      }
    } catch {}
    return 440;
  });
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleStartResize = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = billPanelWidth;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      if (!isResizingRef.current) return;
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const delta = startX - currentX; // Moving left increases right panel width
      const maxW = Math.min(750, Math.floor(window.innerWidth * 0.58));
      const minW = 320;
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
      setBillPanelWidth(newWidth);
    };

    const onEnd = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  useEffect(() => {
    try {
      localStorage.setItem('menukit_pos_bill_width', String(billPanelWidth));
    } catch {}
  }, [billPanelWidth]);

  // Calculator Mode state
  const [orderInputMode, setOrderInputMode] = useState<'menu' | 'calculator'>('menu');
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [calcQty, setCalcQty] = useState<number>(0);
  const [calcCustomNote, setCalcCustomNote] = useState<string>('');
  const calcAmountInputRef = useRef<HTMLInputElement>(null);
  const calcQtyInputRef = useRef<HTMLInputElement>(null);
  const calcNoteInputRef = useRef<HTMLInputElement>(null);

  // Discounts state
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [selectedDiscountId, setSelectedDiscountId] = useState<string | null>(null);

  // Item Customization state (Variants & Add-ons)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);
  const [selectedAddons, setSelectedAddons] = useState<number[]>([]);
  const [customizingQty, setCustomizingQty] = useState<number>(1);

  // Customer details for Step 2
  const [customerCountryCode, setCustomerCountryCode] = useGeoCountryCode('+91');
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
        const fullPhone = customerPhone.startsWith('+') ? customerPhone : `${customerCountryCode}${digits}`;
        const res = await api.get('/orders/customer-lookup', { params: { phone: fullPhone } });
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

      const sourceOrder = targetOrder || replacingItem?.order;
      if (sourceOrder) {
        // Autofill all existing order fields
        let p = String(sourceOrder.customer_phone || '').trim();
        let code = '+91';
        if (p.startsWith('+')) {
          const match = p.match(/^(\+\d{1,4})(.*)$/);
          if (match) {
            code = match[1];
            p = match[2];
          }
        }
        setCustomerCountryCode(code);
        setCustomerPhone(p);
        const rawName = sourceOrder.customer_name || '';
        setCustomerName(rawName === 'Walk-in' || rawName === 'Walk-in Customer' ? '' : rawName);
        setOrderType(sourceOrder.order_type || (isCrackers ? 'takeaway' : 'dine_in'));
        setTableNumber(sourceOrder.table_number || '');
        setDeliveryAddress(sourceOrder.delivery_address || '');
        setPaymentMethod(sourceOrder.payment_method || 'cash');
        setPaymentStatus(sourceOrder.payment_status || 'pending');
        setPriceTier(sourceOrder.price_tier || 'retail');
        setDiscountType('percentage');
        setDiscountValue('');
        setSelectedDiscountId(null);
        if (Array.isArray(sourceOrder.split_payments) && sourceOrder.split_payments.length > 0) {
          setSplitPayments(sourceOrder.split_payments);
        } else {
          setSplitPayments([
            { method: 'cash', amount: '' },
            { method: 'upi', amount: '' },
          ]);
        }
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setOrderType(isCrackers ? 'takeaway' : 'dine_in');
        setTableNumber('');
        setDeliveryAddress('');
        setPaymentMethod('cash');
        setPaymentStatus('pending');
        setPriceTier('retail');
        setDiscountType('percentage');
        setDiscountValue('');
        setSelectedDiscountId(null);
        setSplitPayments([
          { method: 'cash', amount: '' },
          { method: 'upi', amount: '' },
        ]);
      }
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
  }, [isOpen, targetOrder, replacingItem, shop?.id, isCrackers]);

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

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    safeMenuItems.forEach(item => {
      const catId = item.category_id || (typeof item.category === 'object' && item.category !== null ? (item.category as any).id : item.category);
      if (catId) {
        counts[catId] = (counts[catId] || 0) + 1;
      }
    });
    return counts;
  }, [safeMenuItems]);

  // Multiplier Helper taking active priceTier into account
  const getItemMultiplier = (item?: MenuItem, variantIdx = 0, currentTier = priceTier) => {
    if (!item) return 1;
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
      // If discount has minimum order value or spend range, it can only apply at the order level, not per item
      if ((d.min_order_value && Number(d.min_order_value) > 0) || (d.max_order_value && Number(d.max_order_value) > 0)) return false;
      // Only direct price drops apply directly to item unit prices
      if (!d.is_price_drop) return false;
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
          if (it.menuItem) {
            next[key] = {
              ...it,
              unitPrice: computeUnitPrice(it.menuItem, it.selectedVariantIdx, it.selectedAddons, customerUsedDiscountIds, tier)
            };
          } else {
            next[key] = it;
          }
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
      .filter(i => i.menuItem?.id === itemId)
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

  const clearCart = () => {
    setCart({});
  };

  // Helper to add calculator / quick item
  const handleAddCalculatorItem = () => {
    const amt = parseFloat(calcAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount (greater than ₹0)');
      calcAmountInputRef.current?.focus();
      return;
    }
    const qty = parseInt(String(calcQty), 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity (greater than 0)');
      calcQtyInputRef.current?.focus();
      calcQtyInputRef.current?.select();
      return;
    }
    
    // Determine sequential name: "Item 1", "Item 2", or custom note
    const existingCalcItems = Object.values(cart).filter(i => i.isCalculatorItem);
    const defaultItemName = `Item ${existingCalcItems.length + 1}`;
    const finalName = calcCustomNote.trim() || defaultItemName;
    
    const cartItemId = `calc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    setCart(prev => ({
      ...prev,
      [cartItemId]: {
        id: cartItemId,
        name: finalName,
        customName: finalName,
        quantity: qty,
        unitPrice: amt,
        isCalculatorItem: true,
      }
    }));

    toast.success(`Added ${finalName} (₹${amt.toFixed(2)} × ${qty})`);
    setCalcAmount('');
    setCalcQty(0);
    setCalcCustomNote('');
    setTimeout(() => {
      calcAmountInputRef.current?.focus();
    }, 40);
  };

  const handleNumpadPress = (val: string) => {
    if (val === 'C') {
      setCalcAmount('');
    } else if (val === 'BACK') {
      setCalcAmount(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!calcAmount.includes('.')) {
        setCalcAmount(prev => (prev ? prev + '.' : '0.'));
      }
    } else if (val === '+10') {
      const cur = parseFloat(calcAmount) || 0;
      setCalcAmount(String(cur + 10));
    } else if (val === '+50') {
      const cur = parseFloat(calcAmount) || 0;
      setCalcAmount(String(cur + 50));
    } else if (val === '+100') {
      const cur = parseFloat(calcAmount) || 0;
      setCalcAmount(String(cur + 100));
    } else if (val === '+500') {
      const cur = parseFloat(calcAmount) || 0;
      setCalcAmount(String(cur + 500));
    } else {
      // Numbers e.g. 0, 00, 1..9
      setCalcAmount(prev => {
        if (prev === '0' && val !== '.') return val;
        return prev + val;
      });
    }
  };

  // Compute line total taking multiplier pack pricing into account
  const getItemLineTotal = (item: CartItem) => {
    if (item.isCalculatorItem || !item.menuItem) {
      return item.unitPrice * item.quantity;
    }
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

  // Order-level store discount (e.g. 10% Flat on orders >= ₹100)
  const storeOrderDiscount = useMemo(() => {
    if (!availableDiscounts || availableDiscounts.length === 0 || totalCartAmount <= 0) return null;

    // Filter discounts that apply at the order level (not direct item price drops, active, valid type)
    const storeDiscs = availableDiscounts.filter((d: any) => {
      if (d.is_active === false) return false;
      if (!d.is_price_drop && customerUsedDiscountIds.includes(String(d.id))) return false;
      const hasSpendRange = Boolean((d.min_order_value && Number(d.min_order_value) > 0) || (d.max_order_value && Number(d.max_order_value) > 0));
      if (d.is_price_drop && !hasSpendRange) return false;
      if (!['percentage', 'flat', 'fixed'].includes(d.discount_type)) return false;
      return true;
    });

    if (storeDiscs.length === 0) return null;

    // Only apply if order total falls within the spend range [min_order_value, max_order_value]
    const eligible = storeDiscs.filter((d: any) => {
      const minSpend = Number(d.min_order_value || 0);
      const maxSpend = d.max_order_value && Number(d.max_order_value) > 0 ? Number(d.max_order_value) : Infinity;
      return totalCartAmount >= minSpend && totalCartAmount <= maxSpend;
    });

    if (eligible.length === 0) return null;

    let targetDisc = null;
    if (selectedDiscountId && selectedDiscountId !== 'none') {
      targetDisc = eligible.find((d: any) => String(d.id) === selectedDiscountId) || null;
    }
    // If not found in eligible (e.g. cart amount changed outside its range), auto-switch to the newly qualifying tier
    if (!targetDisc && selectedDiscountId !== 'none' && !discountValue) {
      targetDisc = eligible[0];
    }

    if (!targetDisc) return null;

    const val = Number(targetDisc.discount_value || 0);
    let amount = 0;
    if (targetDisc.discount_type === 'percentage') {
      amount = Math.round((totalCartAmount * (val / 100)) * 100) / 100;
      if (targetDisc.max_discount_amount && Number(targetDisc.max_discount_amount) > 0) {
        amount = Math.min(amount, Number(targetDisc.max_discount_amount));
      }
    } else {
      amount = Math.min(totalCartAmount, Math.round(val * 100) / 100);
    }

    return {
      discount: targetDisc,
      amount
    };
  }, [availableDiscounts, customerUsedDiscountIds, totalCartAmount, selectedDiscountId, discountValue]);

  // Manual Discount Calculation (Percentage or Flat Amount)
  const computedManualDiscount = useMemo(() => {
    const numVal = parseFloat(discountValue);
    if (isNaN(numVal) || numVal <= 0 || totalCartAmount <= 0) return 0;
    if (discountType === 'percentage') {
      const clampedPct = Math.min(100, Math.max(0, numVal));
      return Math.round((totalCartAmount * (clampedPct / 100)) * 100) / 100;
    } else {
      return Math.min(totalCartAmount, Math.round(numVal * 100) / 100);
    }
  }, [discountType, discountValue, totalCartAmount]);

  // Effective order discount amount (Manual overrides store auto discount)
  const effectiveDiscountAmount = useMemo(() => {
    if (computedManualDiscount > 0) return computedManualDiscount;
    if (storeOrderDiscount && storeOrderDiscount.amount > 0) return storeOrderDiscount.amount;
    return 0;
  }, [computedManualDiscount, storeOrderDiscount]);

  const netSubtotalAfterDiscount = useMemo(() => {
    return Math.max(0, Math.round((totalCartAmount - effectiveDiscountAmount) * 100) / 100);
  }, [totalCartAmount, effectiveDiscountAmount]);

  // GST Calculation (Applied on post-discount subtotal)
  const cgstRate = Number(shop?.settings?.cgst_rate || 0);
  const sgstRate = Number(shop?.settings?.sgst_rate || 0);
  const totalTaxRate = cgstRate + sgstRate;
  const isGstEnabled = Boolean(shop?.settings?.gst_enabled && totalTaxRate > 0);
  const isExclusiveTax = isGstEnabled && !shop?.settings?.inclusive_tax;

  const gstCalculation = useMemo(() => {
    const baseForTax = netSubtotalAfterDiscount;
    const basePrice = Number(totalCartAmount || 0);
    const discountAmount = Number(effectiveDiscountAmount || 0);

    if (!isGstEnabled) {
      return {
        basePrice,
        discountAmount,
        taxable: baseForTax,
        cgst: 0,
        sgst: 0,
        totalTax: 0,
        finalTotal: baseForTax,
      };
    }
    if (isExclusiveTax) {
      // EXCLUSIVE: Tax is added on top of food items
      const totalTax = Math.round((baseForTax * (totalTaxRate / 100)) * 100) / 100;
      const cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      const sgst = Math.round((totalTax - cgst) * 100) / 100;
      const finalTotal = Math.round((baseForTax + totalTax) * 100) / 100;
      return {
        basePrice,
        discountAmount,
        taxable: baseForTax,
        cgst,
        sgst,
        totalTax,
        finalTotal,
      };
    } else {
      // INCLUSIVE: Tax is already baked in
      const taxable = Math.round((baseForTax / (1 + totalTaxRate / 100)) * 100) / 100;
      const totalTax = Math.round((baseForTax - taxable) * 100) / 100;
      const cgst = Math.round((totalTax * (cgstRate / totalTaxRate)) * 100) / 100;
      const sgst = Math.round((totalTax - cgst) * 100) / 100;
      return {
        basePrice,
        discountAmount,
        taxable,
        cgst,
        sgst,
        totalTax,
        finalTotal: baseForTax,
      };
    }
  }, [isGstEnabled, isExclusiveTax, netSubtotalAfterDiscount, totalCartAmount, effectiveDiscountAmount, cgstRate, sgstRate, totalTaxRate]);

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
      if (item.isCalculatorItem || !item.menuItem) continue;
      const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      if (mult > 1 && item.quantity % mult !== 0) {
        toast.error(`Quantity for '${item.menuItem.name}' must be a multiple of ${mult} (received ${item.quantity}).`);
        return;
      }
    }
    setLoading(true);
    try {
      const itemsPayload = Object.values(cart).map(item => {
        if (item.isCalculatorItem || !item.menuItem) {
          return {
            menu_item_id: null,
            name: item.customName || item.name || 'Item',
            quantity: item.quantity,
            price: item.unitPrice,
            variant_info: null,
            addons_info: null,
          };
        }
        const variant = item.menuItem.variants && item.menuItem.variants.length > 0 
          ? item.menuItem.variants[item.selectedVariantIdx || 0] 
          : null;
        const variant_info = variant ? { name: variant.name, price: Number(variant.offer_price || variant.price) } : null;
        const addons_info = (item.menuItem.addons && item.selectedAddons && item.selectedAddons.length > 0)
          ? item.selectedAddons.map(idx => ({
              name: item.menuItem!.addons![idx].name,
              price: Number(item.menuItem!.addons![idx].price),
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
          is_taxable: item.menuItem.is_taxable !== false,
        };
      });

      const res = await api.post(`/orders/${targetOrder.id}/items`, { items: itemsPayload });

      if (paymentStatus !== targetOrder.payment_status || paymentMethod !== targetOrder.payment_method) {
        try {
          await api.put(`/orders/${targetOrder.id}/payment`, {
            payment_status: paymentStatus,
            payment_method: paymentMethod,
            split_payments: paymentMethod === 'split' ? splitPayments : undefined,
          });
        } catch (e) {
          console.warn('Failed to update payment status on append', e);
        }
      }

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
      toast.error('Please select at least one item');
      return;
    }
    for (const item of Object.values(cart)) {
      if (item.isCalculatorItem || !item.menuItem) continue;
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
      if (item.isCalculatorItem || !item.menuItem) continue;
      const mult = getItemMultiplier(item.menuItem, item.selectedVariantIdx);
      if (mult > 1 && item.quantity % mult !== 0) {
        toast.error(`Quantity for '${item.menuItem.name}' must be a multiple of ${mult} (received ${item.quantity}). Please adjust to ${mult}, ${mult * 2}, ${mult * 3}, etc.`);
        return;
      }
    }

    const isTableEnabled = (shop?.settings as any)?.dinein_tables_enabled !== false;

    if (orderType === 'dine_in' && !isCrackers && isTableEnabled && tableNumber) {
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
        if (item.isCalculatorItem || !item.menuItem) {
          return {
            menu_item_id: null,
            name: item.customName || item.name || 'Item',
            quantity: item.quantity,
            price: item.unitPrice,
            variant_info: null,
            addons_info: null,
          };
        }
        const variant = item.menuItem.variants && item.menuItem.variants.length > 0 
          ? item.menuItem.variants[item.selectedVariantIdx || 0] 
          : null;
        const variant_info = variant ? { name: variant.name, price: Number(variant.offer_price || variant.price) } : null;
        const addons_info = (item.menuItem.addons && item.selectedAddons && item.selectedAddons.length > 0)
          ? item.selectedAddons.map(idx => ({
              name: item.menuItem!.addons![idx].name,
              price: Number(item.menuItem!.addons![idx].price),
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
          is_taxable: item.menuItem.is_taxable !== false,
        };
      });

      const appliedDiscIds: string[] = [];
      const appliedDiscCodes: string[] = [];
      Object.values(cart).forEach(it => {
        if (!it.menuItem) return;
        const dInfo = getItemDiscount(it.menuItem, it.unitPrice, customerUsedDiscountIds);
        if (dInfo && !customerUsedDiscountIds.includes(String(dInfo.discount.id))) {
          if (!appliedDiscIds.includes(String(dInfo.discount.id))) {
            appliedDiscIds.push(String(dInfo.discount.id));
            appliedDiscCodes.push(dInfo.discount.code || dInfo.discount.title);
          }
        }
      });

      if (computedManualDiscount > 0) {
        const discLabel = discountType === 'percentage'
          ? `Discount (${discountValue}% - ₹${computedManualDiscount.toFixed(2)})`
          : `Flat Discount (₹${computedManualDiscount.toFixed(2)})`;
        appliedDiscCodes.push(discLabel);
      } else if (storeOrderDiscount && storeOrderDiscount.amount > 0) {
        if (!appliedDiscIds.includes(String(storeOrderDiscount.discount.id))) {
          appliedDiscIds.push(String(storeOrderDiscount.discount.id));
        }
        appliedDiscCodes.push(`${storeOrderDiscount.discount.title} (-₹${storeOrderDiscount.amount.toFixed(2)})`);
      }

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
        customer_phone: customerPhone.trim() ? (customerPhone.trim().startsWith('+') ? customerPhone.trim() : `${customerCountryCode}${customerPhone.trim().replace(/\D/g, '')}`) : '',
        order_type: orderType,
        table_number: (orderType === 'dine_in' && !isCrackers && isTableEnabled) ? tableNumber.trim() || null : null,
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
      {/* 1. ULTRA-SLEEK COMPACT POS HEADER (50px) */}
      <div className="h-12 px-3 sm:px-5 border-b border-border flex items-center justify-between shrink-0 bg-background/95 backdrop-blur z-20 gap-2">
        {/* Left Side: Store/Order Info & Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
            <Store size={16} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-foreground truncate">
              {replacingItem
                ? `Replace: "${replacingItem.item.name}"`
                : targetOrder 
                ? `Add to #${targetOrder.daily_order_number || targetOrder.id.slice(0, 8).toUpperCase()}`
                : (shop?.name ? `${shop.name} • POS` : 'POS Billing Terminal')}
            </h2>
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              <span>[Ctrl+Enter] Create</span>
            </div>
          </div>

          {/* Mode Switcher Tabs (Menu vs Calculator) */}
          {!replacingItem && (
            <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border border-border ml-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOrderInputMode('menu');
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderInputMode === 'menu'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <UtensilsCrossed size={13} />
                <span className="hidden sm:inline">Menu Items</span>
                <span className="sm:hidden text-[11px]">Menu</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOrderInputMode('calculator');
                  setTimeout(() => calcAmountInputRef.current?.focus(), 50);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  orderInputMode === 'calculator'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calculator size={13} />
                <span className="hidden sm:inline">Calculator Pad</span>
                <span className="sm:hidden text-[11px]">Calc</span>
              </button>
            </div>
          )}
        </div>

        {/* Center / Mobile View Switcher (< lg screens) */}
        <div className="flex lg:hidden items-center bg-muted/90 p-0.5 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            {orderInputMode === 'menu' ? 'Menu' : 'Calc'}
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('bill')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              mobileTab === 'bill'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground'
            }`}
          >
            <Receipt size={12} />
            <span>Bill</span>
            {totalCartCount > 0 && (
              <span className="px-1 py-0.2 rounded-full bg-white/20 text-[10px]">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Actions: Clear Cart & Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {totalCartCount > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer flex items-center gap-1"
              title="Clear all items in cart"
            >
              <Trash2 size={13} />
              <span className="hidden md:inline">Clear</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="Close modal [Esc]"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Replacement Context Sub-Banner */}
      {replacingItem && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <RotateCcw size={14} />
            </span>
            <div className="text-xs truncate">
              <span className="text-muted-foreground">Original item: </span>
              <strong className="text-foreground font-bold">{replacingItem.item.name}</strong>
              <span className="text-muted-foreground ml-1">
                (×{replacingItem.item.quantity} • ₹{Number(replacingItem.item.price * replacingItem.item.quantity).toFixed(2)})
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 hidden sm:inline">
            Pick a replacement product from the catalog
          </span>
        </div>
      )}

      {/* 2. UNIFIED POS SPLIT SCREEN: LEFT = CATALOG/CALC, RIGHT = LIVE BILL & CHECKOUT */}
      <div 
        style={{ '--bill-panel-width': `${billPanelWidth}px` } as React.CSSProperties}
        className={`flex-1 overflow-hidden bg-slate-100/60 dark:bg-slate-950/60 flex flex-col lg:flex-row min-h-0 ${
          isResizing ? 'select-none cursor-col-resize' : ''
        }`}
      >
        
        {/* ============================================================== */}
        {/* LEFT PANEL: Menu Catalog OR Touch Calculator (Flexible Width)  */}
        {/* ============================================================== */}
        <div className={`lg:flex-1 min-w-0 flex flex-col h-full bg-background overflow-hidden ${
          mobileTab === 'catalog' ? 'flex' : 'hidden lg:flex'
        }`}>
          {orderInputMode === 'menu' ? (
            /* MENU CATALOG WORKSPACE */
            <div className="flex flex-col h-full overflow-hidden">
              {/* Crackers Wholesale Tier Bar (if fireworks business) */}
              {isCrackers && (
                <div className="px-3 sm:px-4 py-2 border-b border-border bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    <Tag size={13} className="text-amber-600" />
                    <span>Price Tier:</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { id: 'retail', label: 'Retail Rate', icon: Store },
                      { id: 'wholesale', label: 'Wholesale Tier', icon: Package },
                      { id: 'other', label: 'Agent Rate', icon: UserCheck }
                    ].map(tier => {
                      const Icon = tier.icon;
                      const isSelected = priceTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => handlePriceTierChange(tier.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-background/80 text-muted-foreground hover:bg-background border border-border'
                          }`}
                        >
                          <Icon size={12} />
                          <span>{tier.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search + Dietary Filter Bar */}
              <div className="p-2.5 sm:p-3 border-b border-border/70 bg-card/60 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={isCrackers ? "Search cracker item by name... [F2]" : "Search dish or item name... [F2]"}
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
                          setFocusedItemIndex(prev => Math.min(filteredItems.length - 1, prev + 3));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setFocusedItemIndex(prev => Math.max(0, prev - 3));
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
                        } else if (e.key === 'Escape' && searchQuery) {
                          e.preventDefault();
                          setSearchQuery('');
                        }
                      }}
                      className="w-full pl-9 pr-14 bg-background border border-border/80 focus:border-primary rounded-xl h-9 text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary/10 outline-none transition-all shadow-2xs"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      )}
                      <span className="hidden sm:inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        ↵ Enter
                      </span>
                    </div>
                  </div>

                  {/* Food Dietary Filter Pills (Veg/Non-veg) */}
                  {businessCategory.dietaryEnabled && (
                    <div className="flex bg-muted/80 border border-border rounded-xl p-0.5 shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => setFoodFilter(foodFilter === 'veg' ? 'all' : 'veg')}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${
                          foodFilter === 'veg' ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/30' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Veg Only"
                      >
                        <span className="w-3 h-3 border-2 border-emerald-600 rounded-[2.5px] flex items-center justify-center">
                          <span className="w-1 h-1 bg-emerald-600 rounded-full"></span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFoodFilter(foodFilter === 'non-veg' ? 'all' : 'non-veg')}
                        className={`p-1.5 rounded-lg transition-all shrink-0 ${
                          foodFilter === 'non-veg' ? 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/30' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Non-veg Only"
                      >
                        <span className="w-3 h-3 border-2 border-rose-600 rounded-[2.5px] flex items-center justify-center">
                          <span className="w-0 h-0 border-l-[2.5px] border-r-[2.5px] border-b-[4.5px] border-transparent border-b-rose-600"></span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Categories Horizontal Carousel */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      activeCategory === 'all'
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-background hover:bg-muted text-muted-foreground border border-border/70'
                    }`}
                  >
                    <span>All Items</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full  ${
                      activeCategory === 'all' ? 'bg-white/20' : 'bg-muted'
                    }`}>
                      {safeMenuItems.length}
                    </span>
                  </button>

                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border border-border/70'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full  ${
                            isSelected ? 'bg-white/20' : 'bg-muted'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Quantity Keyboard Flow Bar */}
              {activeQtyItemId && (() => {
                const activeItem = safeMenuItems.find(m => m.id === activeQtyItemId);
                const activeStep = getItemMultiplier(activeItem);
                if (!activeItem) return null;
                return (
                  <div className="bg-primary/10 border-b border-primary/30 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 shrink-0 animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="p-1 rounded-lg bg-primary text-white shrink-0">
                        <Calculator size={13} />
                      </span>
                      <span className="text-xs truncate font-bold text-foreground">
                        Set quantity for: <span className="text-primary">{activeItem.name}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-background border border-primary rounded-xl h-7 px-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(activeQtyValue, 10) || 0;
                            const n = Math.max(0, (Math.ceil(cur / activeStep) - 1) * activeStep);
                            setActiveQtyValue(String(n));
                            handleSetExactQuantity(activeItem, n);
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded text-foreground font-bold text-xs"
                        >
                          -
                        </button>
                        <input
                          ref={qtyInputRef}
                          type="number"
                          min="0"
                          step={activeStep}
                          value={activeQtyValue}
                          onChange={(e) => {
                            setActiveQtyValue(e.target.value);
                            const parsed = parseInt(e.target.value, 10);
                            if (!isNaN(parsed) && parsed >= 0) {
                              handleSetExactQuantity(activeItem, parsed);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              commitActiveQuantity();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              commitActiveQuantity();
                            }
                          }}
                          className="w-12 text-center text-xs font-black bg-transparent outline-none text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(activeQtyValue, 10) || 0;
                            const n = (Math.floor(cur / activeStep) + 1) * activeStep;
                            setActiveQtyValue(String(n));
                            handleSetExactQuantity(activeItem, n);
                          }}
                          className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded text-foreground font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={commitActiveQuantity}
                        className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Product Cards Catalog Grid */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 bg-slate-50/40 dark:bg-slate-900/20">
                {filteredItems.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-muted-foreground border-2 border-dashed border-border/80 rounded-2xl">
                    <UtensilsCrossed size={36} className="opacity-30 mb-2" />
                    <p className="text-sm font-bold text-foreground">No menu items found</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try searching with a different keyword or category</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3">
                    {filteredItems.map((item, idx) => {
                      const isFocused = focusedItemIndex === idx;
                      const cartEntry = cart[item.id];
                      const curQty = cartEntry?.quantity || 0;
                      const multiplier = getItemMultiplier(item);
                      const unitPrice = Number(item.offer_price || item.price);
                      const isCustomizable = isItemCustomizable(item);

                      return (
                        <div
                          key={item.id}
                          ref={(el) => { itemRefs.current[item.id] = el; }}
                          onClick={() => {
                            if (isCustomizable) {
                              handleOpenCustomization(item);
                            } else {
                              handleSetExactQuantity(item, curQty + multiplier);
                            }
                          }}
                          className={`group relative bg-card rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md hover:border-primary/50 select-none ${
                            curQty > 0
                              ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/[0.02]'
                              : isFocused
                              ? 'border-primary ring-2 ring-primary/40'
                              : 'border-border/80'
                          }`}
                        >
                          {/* Image or Icon Preview */}
                          <div className="relative w-full h-24 sm:h-28 bg-muted/60 overflow-hidden flex items-center justify-center">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground/60">
                                <UtensilsCrossed size={22} className="opacity-40 mb-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                                  {item.category?.name || 'Dish'}
                                </span>
                              </div>
                            )}

                            {/* Dietary Tag (Veg / Non-veg dot) */}
                            {businessCategory.dietaryEnabled && item.dietary_preference && (
                              <div className="absolute top-2 left-2 bg-background/90 backdrop-blur rounded-md p-1 shadow-xs border border-border/50">
                                {item.dietary_preference === 'veg' ? (
                                  <span className="w-2.5 h-2.5 border-2 border-emerald-600 rounded-[2px] flex items-center justify-center">
                                    <span className="w-1 h-1 bg-emerald-600 rounded-full"></span>
                                  </span>
                                ) : item.dietary_preference === 'egg' ? (
                                  <span className="w-2.5 h-2.5 border-2 border-amber-500 rounded-[2px] flex items-center justify-center">
                                    <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                                  </span>
                                ) : (
                                  <span className="w-2.5 h-2.5 border-2 border-rose-600 rounded-[2px] flex items-center justify-center">
                                    <span className="w-0 h-0 border-l-[2px] border-r-[2px] border-b-[3.5px] border-transparent border-b-rose-600"></span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Customizable Badge */}
                            {isCustomizable && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-background/90 backdrop-blur border border-border/50 text-[10px] font-bold text-primary flex items-center gap-1 shadow-xs">
                                <Layers size={10} />
                                <span>Options</span>
                              </div>
                            )}

                            {/* Pack Multiplier Badge */}
                            {multiplier > 1 && (
                              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                                Pack of {multiplier}
                              </div>
                            )}
                          </div>

                          {/* Body Content */}
                          <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                {item.name}
                              </h4>
                              {item.category?.name && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                  {item.category.name}
                                </p>
                              )}
                            </div>

                            {/* Price & Action Button */}
                            <div className="mt-2.5 flex items-center justify-between gap-1.5 pt-2 border-t border-border/50">
                              <div>
                                <span className="font-black text-xs sm:text-sm text-foreground">
                                  ₹{unitPrice.toFixed(2)}
                                </span>
                                {item.offer_price && Number(item.price) > Number(item.offer_price) && (
                                  <span className="text-[10px] text-muted-foreground line-through ml-1">
                                    ₹{Number(item.price).toFixed(2)}
                                  </span>
                                )}
                              </div>

                              {curQty > 0 ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center bg-primary text-white rounded-xl h-7 px-1 shadow-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSetExactQuantity(item, curQty - multiplier)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded text-white font-bold text-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-xs font-black">
                                    {curQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleSetExactQuantity(item, curQty + multiplier)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-white/20 rounded text-white font-bold text-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isCustomizable) {
                                      handleOpenCustomization(item);
                                    } else {
                                      handleSetExactQuantity(item, multiplier);
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs"
                                >
                                  <Plus size={12} className="stroke-[3]" />
                                  <span>ADD</span>
                                </button>
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
          ) : (
            /* ============================================================== */
            /* ULTRA-TRENDY TOUCH CALCULATOR / QUICK BILLING TERMINAL         */
            /* ============================================================== */
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center min-h-0 bg-slate-100/50 dark:bg-slate-950/40">
              <div className="max-w-md w-full bg-card rounded-3xl border border-border/80 shadow-md p-4 sm:p-5 space-y-3.5">
                
                {/* 1. Terminal LED / LCD Screen */}
                <div className="bg-slate-50 dark:bg-slate-900 text-foreground rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <Calculator size={13} className="text-primary" />
                      <span>QUICK POS TERMINAL</span>
                    </span>
                  </div>

                  {/* Main Display Digits */}
                  <div className="py-2 flex items-baseline justify-between gap-2 overflow-x-auto">
                    <span className="text-2xl sm:text-3xl font-black text-slate-400 dark:text-slate-500 select-none">
                      ₹
                    </span>
                    <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white truncate text-right">
                      {calcAmount || '0.00'}
                    </div>
                  </div>

                  {/* Calculation Breakdown Subtext */}
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Qty: {calcQty || 1}</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/40">
                      Line Total: ₹{((parseFloat(calcAmount) || 0) * (calcQty || 1)).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 2. Quick Cash Chips (+₹10, +₹50, +₹100, etc.) */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Quick Cash Add (+₹)
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {['10', '20', '50', '100', '200', '500'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleNumpadPress(`+${val}`)}
                        className="py-1.5 rounded-xl border border-border bg-background hover:bg-muted font-bold text-xs text-foreground transition-all active:scale-95 cursor-pointer shadow-2xs"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Quick Item Preset Notes */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Item Category / Note Preset
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {['Meals Combo', 'Beverage', 'Snacks', 'Parcel Fee', 'Bakery', 'Custom Item'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCalcCustomNote(preset)}
                        className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                          calcCustomNote === preset
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Note Input & Quantity Stepper */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-8">
                    <input
                      ref={calcNoteInputRef}
                      type="text"
                      placeholder="Item note / name (optional)"
                      value={calcCustomNote}
                      onChange={(e) => setCalcCustomNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCalculatorItem();
                        }
                      }}
                      className="w-full h-9 px-3 bg-background border border-border focus:border-primary rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/10 outline-none transition-all shadow-2xs"
                    />
                  </div>

                  <div className="col-span-4 flex items-center bg-background rounded-xl border border-border h-9 px-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCalcQty(prev => Math.max(0, prev - 1))}
                      className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground font-bold text-xs cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      ref={calcQtyInputRef}
                      type="number"
                      min="0"
                      value={calcQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setCalcQty(isNaN(val) ? 0 : Math.max(0, val));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCalculatorItem();
                        }
                      }}
                      className="w-full text-center text-xs font-black bg-transparent outline-none text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setCalcQty(prev => prev + 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-muted rounded text-foreground font-bold text-xs cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 5. Touch POS Numpad (4x4) */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {[
                    { label: '7', val: '7' },
                    { label: '8', val: '8' },
                    { label: '9', val: '9' },
                    { label: 'C', val: 'C', className: 'text-red-500 font-black hover:bg-red-50 dark:hover:bg-red-950/50' },
                    { label: '4', val: '4' },
                    { label: '5', val: '5' },
                    { label: '6', val: '6' },
                    { label: '⌫', val: 'BACK', className: 'hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-600' },
                    { label: '1', val: '1' },
                    { label: '2', val: '2' },
                    { label: '3', val: '3' },
                    { label: '+50', val: '+50', className: 'text-primary font-bold bg-primary/5 hover:bg-primary/10' },
                    { label: '0', val: '0' },
                    { label: '00', val: '00' },
                    { label: '.', val: '.' },
                    { label: '+100', val: '+100', className: 'text-primary font-bold bg-primary/5 hover:bg-primary/10' },
                  ].map((btn, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleNumpadPress(btn.val)}
                      className={`h-10 sm:h-11 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-black text-sm transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center justify-center ${btn.className || ''}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                {/* 6. Big CTA: Add to Bill */}
                <button
                  type="button"
                  onClick={handleAddCalculatorItem}
                  className="w-full h-11 rounded-2xl font-bold text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white shadow-md active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus size={16} className="stroke-[3]" />
                  <span>Add to Receipt (₹{((parseFloat(calcAmount) || 0) * (calcQty || 1)).toFixed(2)})</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-normal">Enter ↵</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* DRAGGABLE RESIZER SPLITTER (Desktop LG+) */}
        {/* ============================================================== */}
        <div
          onMouseDown={handleStartResize}
          onTouchStart={handleStartResize}
          onDoubleClick={() => setBillPanelWidth(440)}
          
          className={`hidden lg:flex flex-col items-center justify-center w-2.5 hover:w-3.5 z-30 cursor-col-resize select-none transition-all group shrink-0 relative bg-border/50 hover:bg-primary/20 ${
            isResizing ? 'bg-primary/30 w-3.5' : ''
          }`}
        >
          {/* Grab Bar Indicator */}
          <div className={`w-1 rounded-full transition-all flex flex-col items-center justify-center gap-1.5 py-3 ${
            isResizing ? 'bg-primary h-28 shadow-sm scale-110' : 'bg-slate-400/60 dark:bg-slate-600 group-hover:bg-primary h-16'
          }`}>
            <span className="w-0.5 h-0.5 rounded-full bg-background" />
            <span className="w-0.5 h-0.5 rounded-full bg-background" />
            <span className="w-0.5 h-0.5 rounded-full bg-background" />
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT PANEL: LIVE BILL & CHECKOUT LEDGER (Adjustable on Desktop) */}
        {/* ============================================================== */}
        <div 
          style={{ width: `var(--bill-panel-width)` }}
          className={`w-full max-w-full lg:max-w-[65vw] min-w-[320px] shrink-0 flex flex-col h-full bg-card shadow-xl overflow-hidden border-l border-border/80 ${
            isResizing ? 'transition-none select-none' : ''
          } ${
            mobileTab === 'bill' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          
          {/* Mobile Back to Catalog Bar */}
          <div className="lg:hidden p-2.5 bg-muted/60 border-b border-border flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileTab('catalog')}
              className="text-xs font-bold text-primary flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Products</span>
            </button>
            <span className="text-xs font-bold text-foreground">
              {totalCartCount} item(s) • ₹{gstCalculation.finalTotal.toFixed(2)}
            </span>
          </div>

          {/* Section A: Fulfillment & Customer Info Card */}
          <div className="p-3 sm:p-3.5 border-b border-border bg-card/60 space-y-2.5 shrink-0">
            {/* Fulfillment Channel Pills (Dine-in, Takeaway, Delivery) */}
            <div className={`grid grid-cols-3 gap-1.5 bg-muted/70 p-1 rounded-xl border border-border/80 ${isExistingOrder ? 'opacity-90' : ''}`}>
              {(() => {
                const currentOrderTypes = isCrackers 
                  ? [
                      { id: 'takeaway', label: 'In-Store', icon: ShoppingBag },
                      { id: 'dine_in', label: 'Counter', icon: Store },
                      { id: 'delivery', label: 'Parcel', icon: Truck }
                    ]
                  : [
                      { id: 'dine_in', label: 'Dine-In', icon: UtensilsCrossed },
                      { id: 'takeaway', label: 'Takeaway', icon: ShoppingBag },
                      { id: 'delivery', label: 'Delivery', icon: Truck }
                    ];

                return currentOrderTypes.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = orderType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      ref={(el) => { orderTypeRefs.current[opt.id] = el; }}
                      type="button"
                      disabled={isExistingOrder}
                      onClick={() => !isExistingOrder && setOrderType(opt.id as any)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-primary text-white shadow-xs'
                          : isExistingOrder
                            ? 'text-muted-foreground/40 cursor-not-allowed'
                            : 'text-muted-foreground hover:text-foreground cursor-pointer'
                      } ${isExistingOrder ? 'cursor-not-allowed' : ''}`}
                    >
                      <Icon size={13} />
                      <span>{opt.label}</span>
                      {isExistingOrder && isSelected && <Lock size={10} className="ml-0.5 opacity-80" />}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Customer & Fulfillment Information - Professional POS Structured Layout */}
            <div className="space-y-2">
              {/* Row 1: Unified Country Code + Mobile Number Input Bar */}
              <div className={`flex items-center rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all h-8.5 shadow-2xs overflow-hidden ${isExistingOrder ? 'bg-muted/40 opacity-90 cursor-not-allowed' : ''}`}>
                <CountryCodeSelect
                  value={customerCountryCode}
                  onChange={setCustomerCountryCode}
                  heightClass="h-full"
                  disabled={isExistingOrder}
                  className={`border-0 bg-transparent rounded-none px-2.5 text-xs focus:ring-0 shadow-none border-r border-border/70 ${isExistingOrder ? 'cursor-not-allowed pointer-events-none' : 'hover:bg-muted/60'}`}
                  autoDetect
                />
                <div className="relative flex-1 min-w-0 flex items-center h-full">
                  <input
                    ref={customerPhoneInputRef}
                    type="tel"
                    placeholder="Customer mobile number"
                    value={customerPhone}
                    disabled={isExistingOrder}
                    readOnly={isExistingOrder}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={`w-full h-full px-2.5 bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 outline-none border-0 ${isExistingOrder ? 'cursor-not-allowed text-muted-foreground' : ''}`}
                  />
                  {customerLookupState.found && (
                    <span className="pr-2.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-1">
                      ★ Saved
                    </span>
                  )}
                  {isExistingOrder && (
                    <span className="pr-2 text-[10px] text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                      <Lock size={10} />
                      Fixed
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Contextual Details (Table + Name for Dine-in, or Name / Address for others) */}
              {orderType === 'dine_in' && !isCrackers && ((shop?.settings as any)?.dinein_tables_enabled !== false) ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                      <Armchair size={13} />
                    </div>
                    <Input
                      placeholder="Table #"
                      value={tableNumber}
                      disabled={isExistingOrder}
                      readOnly={isExistingOrder}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className={`h-8.5 rounded-xl bg-background text-xs font-bold pl-7.5 shadow-2xs ${isExistingOrder ? 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-90' : ''}`}
                    />
                    {tableNumber && occupiedTables.some((t: any) => String(t.table_number || '').toLowerCase() === tableNumber.toLowerCase()) && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        Occupied
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                      <User size={13} />
                    </div>
                    <Input
                      ref={customerNameInputRef}
                      placeholder="Walk-in Customer"
                      value={customerName}
                      disabled={isExistingOrder}
                      readOnly={isExistingOrder}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`h-8.5 rounded-xl bg-background text-xs font-semibold pl-7.5 shadow-2xs ${isExistingOrder ? 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-90' : ''}`}
                    />
                  </div>
                </div>
              ) : orderType === 'delivery' ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                      <User size={13} />
                    </div>
                    <Input
                      ref={customerNameInputRef}
                      placeholder="Customer Name"
                      value={customerName}
                      disabled={isExistingOrder}
                      readOnly={isExistingOrder}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`h-8.5 rounded-xl bg-background text-xs font-semibold pl-7.5 shadow-2xs ${isExistingOrder ? 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-90' : ''}`}
                    />
                  </div>
                  <div className="relative">
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                      <MapPin size={13} />
                    </div>
                    <Input
                      placeholder="Delivery address / landmark"
                      value={deliveryAddress}
                      disabled={isExistingOrder}
                      readOnly={isExistingOrder}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className={`h-8.5 rounded-xl bg-background text-xs pl-7.5 shadow-2xs ${isExistingOrder ? 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-90' : ''}`}
                    />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                    <User size={13} />
                  </div>
                  <Input
                    ref={customerNameInputRef}
                    placeholder="Walk-in Customer"
                    value={customerName}
                    disabled={isExistingOrder}
                    readOnly={isExistingOrder}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={`h-8.5 rounded-xl bg-background text-xs font-semibold pl-7.5 shadow-2xs ${isExistingOrder ? 'cursor-not-allowed bg-muted/40 text-muted-foreground opacity-90' : ''}`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section B: Scrollable Live Items Receipt Ledger */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-3.5 py-2.5 min-h-0 divide-y divide-border/50">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-foreground">
                <Receipt size={14} className="text-primary" />
                <span>Current Receipt</span>
                <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px] font-bold">
                  {totalCartCount}
                </span>
              </div>
              {totalCartCount > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] font-semibold text-red-500 hover:text-red-600 cursor-pointer"
                >
                  Clear Bill
                </button>
              )}
            </div>

            {Object.keys(cart).length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border/80 rounded-2xl text-muted-foreground my-2">
                <Receipt size={32} className="opacity-25 mb-2" />
                <p className="text-xs font-bold text-foreground">Bill is currently empty</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px]">
                  Click products on the left or type in calculator to add items
                </p>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                {Object.values(cart).map((item, idx) => {
                  const lineTotal = getItemLineTotal(item);
                  const multiplier = item.menuItem ? getItemMultiplier(item.menuItem, item.selectedVariantIdx) : 1;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-border/70 bg-background/60 hover:bg-background transition-all flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-foreground truncate">
                            {item.customName || item.name || item.menuItem?.name || `Item ${idx + 1}`}
                          </span>
                        </div>

                        {/* Variant / Addons Tags */}
                        {item.selectedVariant && (
                          <div className="text-[10px] text-primary font-medium mt-0.5">
                            Portion: {item.selectedVariant.name}
                          </div>
                        )}
                        {item.selectedAddons && item.selectedAddons.length > 0 && item.menuItem?.addons && (
                          <div className="text-[9px] text-muted-foreground truncate">
                            +{item.selectedAddons.map(aIdx => item.menuItem!.addons![aIdx].name).join(', ')}
                          </div>
                        )}

                        <div className="text-[11px] text-muted-foreground mt-1">
                          ₹{item.unitPrice.toFixed(2)} × {item.quantity}
                          {multiplier > 1 && (
                            <span className="text-amber-600 ml-1 font-sans text-[10px] font-bold">
                              (pack of {multiplier})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="font-black text-xs sm:text-sm text-foreground">
                          ₹{lineTotal.toFixed(2)}
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="flex items-center bg-muted rounded-lg border border-border h-6 px-0.5">
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, -multiplier)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-background rounded text-foreground text-xs font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, multiplier)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-background rounded text-foreground text-xs font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section C: Sticky Bottom Checkout Controls */}
          <div className="border-t border-border bg-card p-3 sm:p-3.5 space-y-2.5 shrink-0 shadow-lg">
            
            {/* Quick Discount Box */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    discountType === 'percentage' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                    discountType === 'fixed' ? 'bg-primary text-white shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  ₹
                </button>
              </div>

              <input
                type="number"
                min="0"
                placeholder={discountType === 'percentage' ? "Discount %" : "Discount ₹"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="flex-1 h-7 px-2.5 bg-background border border-border focus:border-primary rounded-xl text-xs font-bold text-foreground outline-none"
              />

              <div className="flex items-center gap-1 shrink-0">
                {['5', '10', '15', '20'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                      setDiscountValue(val);
                    }}
                    className="px-1.5 py-0.5 rounded-lg bg-muted hover:bg-muted/80 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Tender Pills (hidden when adding to an existing order) */}
            {!isExistingOrder && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'upi', label: 'UPI / QR', icon: QrCode },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'split', label: 'Split', icon: SplitIcon },
                  ].map(pm => {
                    const Icon = pm.icon;
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        ref={(el) => { paymentMethodRefs.current[pm.id] = el; }}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`py-1.5 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'border-primary bg-primary text-white shadow-xs'
                            : 'border-border bg-background hover:bg-muted text-foreground'
                        }`}
                      >
                        <Icon size={12} />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Split Mode Inputs (if Split selected) */}
                {paymentMethod === 'split' && (
                  <div className="p-2 rounded-xl bg-muted/60 border border-border space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      {splitPayments.map((sp, sIdx) => (
                        <div key={sp.method} className="flex items-center gap-1 bg-background rounded-lg border border-border px-2 py-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground w-10">
                            {sp.method}
                          </span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={sp.amount}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSplitPayments(prev => {
                                const next = [...prev];
                                next[sIdx] = { ...next[sIdx], amount: val };
                                return next;
                              });
                            }}
                            className="w-full text-right text-xs font-bold bg-transparent outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-border/60 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{currencySymbol}{Number(gstCalculation?.basePrice ?? totalCartAmount ?? 0).toFixed(2)}</span>
              </div>
              {Number(gstCalculation?.discountAmount ?? effectiveDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Discount</span>
                  <span>-{currencySymbol}{Number(gstCalculation?.discountAmount ?? effectiveDiscountAmount ?? 0).toFixed(2)}</span>
                </div>
              )}
              {isExclusiveTax && Number(gstCalculation?.totalTax ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>GST / Tax</span>
                  <span>+{currencySymbol}{Number(gstCalculation?.totalTax ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1 border-t border-border/80">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider font-sans">
                  Total Payable
                </span>
                <span className="text-xl sm:text-2xl font-black text-foreground">
                  {currencySymbol}{Number(gstCalculation?.finalTotal ?? 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Create Order Submit Button */}
            {replacingItem ? (
              <Button
                onClick={() => setIsConfirmingReplacement(true)}
                disabled={!selectedReplacement || loading}
                className="w-full h-11 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md gap-2"
              >
                <span>Confirm Replacement</span>
                <ArrowRight size={16} />
              </Button>
            ) : targetOrder ? (
              <Button
                onClick={handleAppendItems}
                disabled={totalCartCount === 0 || loading}
                isLoading={loading}
                className="w-full h-11 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-md gap-2"
              >
                <span>Add Items to Order (₹{gstCalculation.finalTotal.toFixed(2)})</span>
                <Check size={16} />
              </Button>
            ) : (
              <Button
                onClick={handleSubmitOrder}
                disabled={totalCartCount === 0 || loading}
                isLoading={loading}
                className="w-full h-12 rounded-2xl font-black text-sm sm:text-base gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-98 transition-all cursor-pointer"
              >
                <Check size={18} className="stroke-[3]" />
                <span>Create Order (₹{gstCalculation.finalTotal.toFixed(2)})</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-normal ml-1 hidden sm:inline">
                  Ctrl+Enter
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Mobile Cart Bar (< lg screens when in catalog mode) */}
      {mobileTab === 'catalog' && totalCartCount > 0 && (
        <div className="lg:hidden shrink-0 bg-background border-t border-border px-3 py-2 flex items-center justify-between shadow-lg z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Receipt size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">
                {totalCartCount} item(s) selected
              </div>
              <div className="text-sm font-black text-primary">
                ₹{gstCalculation.finalTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileTab('bill')}
            className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <span>View Bill</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
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
                <div className="text-lg font-black text-foreground">
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
                <div className="text-xs font-bold text-primary mt-0.5">
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
                          <div className="flex items-baseline gap-1 mt-0.5">
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
                          <div className="text-xs font-bold text-primary mt-0.5">
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
                    <span className="w-10 text-center text-xs font-black">{customizingQty}</span>
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
                <div className="text-xs text-muted-foreground">
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
                <div className="text-xs text-emerald-600 font-bold">
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
              <span className={`font-black text-sm ${replacementPriceDiff > 0 ? 'text-amber-600' : replacementPriceDiff < 0 ? 'text-emerald-600' : 'text-foreground'}`}>
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
              Customer with phone <strong className="text-slate-900 dark:text-white">{customerPhone}</strong> has already used this discount offer{discountRevertedNotice.titles.length > 0 ? ` (${discountRevertedNotice.titles.join(', ')})` : ''} on a previous order.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 mt-3 font-medium">
              <RotateCcw size={14} className="inline mr-1 text-amber-500" />The cart items have been automatically reverted to their original standard price without the discount.
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



