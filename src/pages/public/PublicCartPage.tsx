import { LinkifiedText } from '../../components/LinkifiedText';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ShoppingBag, Plus, Minus, Info, ChevronLeft, ChevronRight, CheckCircle, XCircle, Key, MapPin, Navigation, Map, Armchair, Gift, Sparkles, Percent, Banknote, Truck, Tag, Clock, AlertTriangle, UtensilsCrossed, Gamepad2, History, Trophy, ChefHat, ShieldCheck } from 'lucide-react';
import { useCartStore, useShopCart } from '@/store/cartStore';
import { api } from '@/services/api';
import { Shop, Discount } from '@/types';
import { getBusinessCategory } from '@/config/businessCategories';
import { checkShopOpenStatus } from '@/utils/shopTiming';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DiscountUnlockPopup } from '@/components/public/DiscountUnlockPopup';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useActiveOrders } from '@/hooks/useActiveOrders';

import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { loadGoogleFont } from '@/utils/fontLoader';
import { calculateOrderPricing } from '@/utils/pricing';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapEventsHandler({ onClick, center }: { onClick: (lat: number, lng: number) => void; center: [number, number] }) {
  const map = useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.setView(center, 15);
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [center, map]);

  return null;
}

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

export function PublicCartPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart, clearCart, manualDiscountId, setManualDiscount, orderType, setOrderType, isOrderTypeSet, syncWithLatestMenu } = useShopCart(id);
  
  const [shop, setShop] = useState<Shop | null>(null);
  const businessCategory = getBusinessCategory(shop?.category);
  const currencySymbol = shop?.settings?.currency || '₹';
  const [availableDiscounts, setAvailableDiscounts] = useState<Discount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const shopOpenStatus = useMemo(() => checkShopOpenStatus(shop), [shop]);
  const [memberStatus] = useState<'unlocked' | 'verified-member' | null>(() => {
    if (!id) return null;
    return (sessionStorage.getItem(`member_status_${id}`)) as any;
  });

  // Ordering & Checkout state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [occupiedTables, setOccupiedTables] = useState<any[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'upi'>('online');

  // Fetch occupied tables for dine-in
  useEffect(() => {
    if (shop?.id && orderType === 'dine_in') {
      const savedPhone = localStorage.getItem('customer_phone') || '';
      const ph = customerPhone.trim() ? customerPhone.trim() : savedPhone;
      api.get(`/public/shop/${shop.id}/occupied-tables`, { params: { phone: ph } })
        .then(res => {
          const list = res.data || [];
          setOccupiedTables(list);
          const myActive = list.find((ot: any) => ot.is_my_table);
          if (myActive && myActive.table_number) {
            setTableNumber(myActive.table_number);
          } else if (tableNumber) {
            const isOccupiedByOther = list.some((ot: any) => {
              if (ot.is_my_table) return false;
              const otNorm = String(ot.table_number || '').trim().toLowerCase();
              const tblNorm = tableNumber.trim().toLowerCase();
              return otNorm === tblNorm || otNorm.replace('table-', '') === tblNorm.replace('table-', '');
            });
            if (isOccupiedByOther) {
              setTableNumber('');
            }
          }
        })
        .catch(() => setOccupiedTables([]));
    }
  }, [shop?.id, orderType, customerPhone, tableNumber]);

  // Keep paymentMethod synchronized when shop online payments setting or orderType changes
  useEffect(() => {
    const isMasterOnline = (shop?.settings as any)?.online_payments_enabled !== false;
    let isChannelOnline = true;
    if (orderType === 'dine_in') isChannelOnline = (shop?.settings as any)?.online_payments_dinein_enabled !== false;
    else if (orderType === 'takeaway') isChannelOnline = (shop?.settings as any)?.online_payments_takeaway_enabled !== false;
    else if (orderType === 'delivery') isChannelOnline = (shop?.settings as any)?.online_payments_delivery_enabled !== false;

    const isOnline = isMasterOnline && isChannelOnline;
    if (isOnline) {
      setPaymentMethod('online');
    } else {
      setPaymentMethod('cash');
    }
  }, [
    (shop?.settings as any)?.online_payments_enabled,
    (shop?.settings as any)?.online_payments_dinein_enabled,
    (shop?.settings as any)?.online_payments_takeaway_enabled,
    (shop?.settings as any)?.online_payments_delivery_enabled,
    orderType
  ]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [pendingCheckoutAfterVerify, setPendingCheckoutAfterVerify] = useState(false);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('customer_token'));

  const [isLocating, setIsLocating] = useState(false);
  const [activeTableIdx, setActiveTableIdx] = useState(0);
  const startAngle = useRef(0);
  const isPanning = useRef(false);
  const [selectedBalloonDiscount, setSelectedBalloonDiscount] = useState<Discount | null>(null);
  const [poppingId, setPoppingId] = useState<string | null>(null);

  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [discountCodeError, setDiscountCodeError] = useState('');

  const calculateDiscountSavings = useCallback((disc: Discount): number => {
    if (items.length === 0 || disc.is_already_used) return 0;
    
    const checkItemMatches = (menuItem: any, selectedVariantIdx?: number) => {
      if (disc.applies_to === 'all') return true;
      if (disc.applies_to === 'category' && disc.target_ids?.includes(menuItem.category_id)) return true;
      if (disc.applies_to === 'items' && disc.target_ids) {
        if (disc.target_ids.includes(menuItem.id)) return true;
        if (menuItem.variants && menuItem.variants.length > 0 && selectedVariantIdx !== undefined && selectedVariantIdx >= 0) {
          const vName = menuItem.variants[selectedVariantIdx]?.name?.trim()?.toLowerCase();
          if (vName) {
            return disc.target_ids.some(tid => {
              if (tid.startsWith(`${menuItem.id}::`)) {
                const targetVar = tid.split('::')[1]?.trim()?.toLowerCase();
                return targetVar === vName;
              }
              return false;
            });
          }
        }
      }
      return false;
    };

    // Check if discount is applicable to any cart item
    const isApplicable = items.some(item => checkItemMatches(item.menuItem, item.selectedVariantIdx));
    if (!isApplicable) return 0;

    const isDelivery = orderType === 'delivery';
    let applicableSubtotal = 0;

    items.forEach(item => {
      const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
      const itemMatches = checkItemMatches(menuItem, selectedVariantIdx);
      if (itemMatches) {
        let basePrice = 0;
        if (menuItem.variants && menuItem.variants.length > 0) {
          const v = menuItem.variants[selectedVariantIdx];
          const p = (isDelivery && v.online_price) ? Number(v.online_price) : Number(v.price);
          const op = isDelivery 
            ? (v.online_offer_price ? Number(v.online_offer_price) : (v.online_price ? Number(v.online_price) : (v.offer_price ? Number(v.offer_price) : p)))
            : (v.offer_price ? Number(v.offer_price) : p);
          basePrice = op < p ? op : p;
        } else {
          const p = (isDelivery && menuItem.online_price) ? Number(menuItem.online_price) : Number(menuItem.price);
          const op = isDelivery 
            ? (menuItem.online_offer_price ? Number(menuItem.online_offer_price) : (menuItem.online_price ? Number(menuItem.online_price) : (menuItem.offer_price ? Number(menuItem.offer_price) : p)))
            : (menuItem.offer_price ? Number(menuItem.offer_price) : p);
          basePrice = op < p ? op : p;
        }
        let addonsPrice = 0;
        if (menuItem.addons) {
          selectedAddons.forEach(idx => {
            addonsPrice += Number(menuItem.addons![idx].price);
          });
        }
        applicableSubtotal += (basePrice + addonsPrice) * quantity;
      }
    });

    if (disc.min_order_value && applicableSubtotal < Number(disc.min_order_value)) return 0;

    let savings = 0;
    const v = Number(disc.discount_value);
    if (disc.discount_type === 'percentage') {
      savings = applicableSubtotal * (v / 100);
    } else if (disc.discount_type === 'flat' || disc.discount_type === 'fixed') {
      savings = Math.min(applicableSubtotal, v);
    }

    if (disc.max_discount_amount && Number(disc.max_discount_amount) > 0) {
      savings = Math.min(savings, Number(disc.max_discount_amount));
    }
    return savings;
  }, [items, orderType]);

  const isDiscountApplicable = useCallback((disc: Discount) => {
    if (disc.is_already_used) return false;
    return calculateDiscountSavings(disc) > 0 || (disc.applies_to === 'all' && items.length > 0);
  }, [calculateDiscountSavings, items.length]);

  // Auto-clear manual discount if it was already used or is no longer available
  useEffect(() => {
    if (manualDiscountId && manualDiscountId !== 'none' && availableDiscounts.length > 0) {
      const activeDisc = availableDiscounts.find(d => d.id === manualDiscountId);
      if (!activeDisc || activeDisc.is_already_used || activeDisc.is_active === false) {
        setManualDiscount('none');
      }
    }
  }, [availableDiscounts, manualDiscountId, setManualDiscount]);

  const handleVerifyDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id || !discountCodeInput.trim()) return;

    setIsVerifyingCode(true);
    setDiscountCodeError('');

    try {
      const res = await api.post(`/public/shop/${shop.id}/discounts/verify-code`, {
        code: discountCodeInput.trim()
      });
      const verifiedDisc: Discount = res.data;
      
      if (verifiedDisc.is_already_used) {
        setSelectedBalloonDiscount(verifiedDisc);
        setIsVerifyingCode(false);
        return;
      }

      if (!isDiscountApplicable(verifiedDisc)) {
        setDiscountCodeError('This discount code is not applicable to any items in your cart');
        triggerHaptic(HAPTIC_PATTERNS.error);
        setIsVerifyingCode(false);
        return;
      }

      setAvailableDiscounts(prev => {
        if (prev.some(d => d.id === verifiedDisc.id)) return prev;
        return [...prev, verifiedDisc];
      });

      setManualDiscount(verifiedDisc.id);
      triggerHaptic(HAPTIC_PATTERNS.successUnlock);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      toast.success(`Discount code "${verifiedDisc.code || verifiedDisc.title}" applied!`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid or expired discount code';
      setDiscountCodeError(msg);
      toast.error(msg);
      triggerHaptic(HAPTIC_PATTERNS.error);
    } finally {
      setIsVerifyingCode(false);
    }
  };
  
  const handleBalloonClick = (disc: Discount) => {
    triggerHaptic(HAPTIC_PATTERNS.balloonClick);
    if (manualDiscountId === disc.id || disc.is_already_used) {
      setSelectedBalloonDiscount(disc);
      return;
    }
    setPoppingId(disc.id);
    setTimeout(() => {
      setSelectedBalloonDiscount(disc);
      setPoppingId(null);
    }, 320);
  };
  
  const rotation = useMotionValue(Math.PI / 2);
  const rotationSpring = useSpring(rotation, { stiffness: 100, damping: 22 });
  const negativeRotation = useTransform(rotationSpring, r => `${-r * (180 / Math.PI)}deg`);
  const tableRotationDeg = useTransform(rotationSpring, r => `${r * (180 / Math.PI)}deg`);
  const [showMap, setShowMap] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>(() => {
    const savedLat = localStorage.getItem('customer_lat');
    const savedLng = localStorage.getItem('customer_lng');
    if (savedLat && savedLng) {
      return [parseFloat(savedLat), parseFloat(savedLng)];
    }
    return [12.9716, 77.5946];
  });

  const handleAutoFetchLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setShowMap(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter([latitude, longitude]);
        localStorage.setItem('customer_lat', latitude.toString());
        localStorage.setItem('customer_lng', longitude.toString());
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          if (data && data.display_name) {
            setDeliveryAddress(data.display_name);
            toast.success("Location auto-detected!");
          } else {
            setDeliveryAddress(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
            toast.success("Location coordinates fetched!");
          }
        } catch (error) {
          console.error("Reverse geocoding failed", error);
          setDeliveryAddress(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
          toast.success("Location coordinates fetched!");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        toast.error("Failed to access your location. Please type your address manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapMarkerChange = async (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    localStorage.setItem('customer_lat', lat.toString());
    localStorage.setItem('customer_lng', lng.toString());
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name) {
        setDeliveryAddress(data.display_name);
      } else {
        setDeliveryAddress(`Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`);
      }
    } catch (error) {
      setDeliveryAddress(`Lat: ${lat.toFixed(6)}, Lon: ${lng.toFixed(6)}`);
    }
  };

  // Auto-fetch location if delivery mode and coordinates not yet saved
  useEffect(() => {
    if (orderType === 'delivery') {
      const savedLat = localStorage.getItem('customer_lat');
      const savedLng = localStorage.getItem('customer_lng');
      if (!savedLat || !savedLng) {
        handleAutoFetchLocation();
      }
    }
  }, [orderType]);

  // Pre-fill verified phone, name, and address on mount/token change
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('customer_token');
      if (storedToken) {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload?.sub) {
          let phone = payload.sub;
          if (phone.startsWith('+91')) {
            phone = phone.substring(3);
          }
          setCustomerPhone(phone);
        }
      }
      
      const storedName = localStorage.getItem('customer_name');
      if (storedName) {
        setCustomerName(storedName);
      }

      const storedAddress = localStorage.getItem('customer_address');
      if (storedAddress) {
        setDeliveryAddress(storedAddress);
      }
    } catch (e){}
  }, [token, isCheckoutOpen]);

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

        // Always fetch fresh shop and discounts in parallel to speed up loading
        const savedPhone = localStorage.getItem('customer_phone') || '';
        const custPhoneParam = (customerPhone.trim() || savedPhone) ? `?customer_id=${encodeURIComponent(customerPhone.trim() || savedPhone)}` : '';
        const [shopRes, discountRes, itemsRes] = await Promise.all([
          api.get(`/public/shop/${id}`),
          api.get(`/public/shop/${id}/discounts${custPhoneParam}`),
          api.get(`/public/shop/${id}/items?limit=200`)
        ]);

        setShop(shopRes.data);
        
        // Sync cart with latest items
        if (itemsRes.data && Array.isArray(itemsRes.data)) {
          syncWithLatestMenu(itemsRes.data);
        }

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

  useEffect(() => {
    if (shop?.theme?.font_family) {
      loadGoogleFont(shop.theme.font_family);
    }
  }, [shop?.theme?.font_family]);

  // Set default order type once shop settings are loaded if not already set
  useEffect(() => {
    if (shop?.settings && !isOrderTypeSet) {
      if (shop.settings.dinein_enabled) {
        setOrderType('dine_in', false);
      } else if (shop.settings.takeaway_enabled) {
        setOrderType('takeaway', false);
      } else if (shop.settings.delivery_enabled) {
        setOrderType('delivery', false);
      }
    }
  }, [shop, isOrderTypeSet]);

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

  const handlePlaceOrder = async () => {
    if (!shopOpenStatus.isOpen) {
      toast.error(`Cannot place order: ${shop?.name || 'Restaurant'} is currently closed. ${shopOpenStatus.message}`);
      return;
    }

    const currentToken = localStorage.getItem('customer_token');
    if (!currentToken) {
      toast.error("Please verify your mobile number first.");
      setShowVerifyPopup(true);
      return;
    }

    if (!customerName || !customerPhone) {
      toast.error("Please enter your name and mobile number");
      return;
    }

    if (orderType === 'dine_in' && businessCategory.isFood) {
      if (!tableNumber) {
        toast.error(`Please select a ${businessCategory.tableOrStallLabel || 'table number'}`);
        return;
      }
      const isOccupiedByOther = occupiedTables.some((ot: any) => {
        if (ot.is_my_table) return false;
        const otNorm = String(ot.table_number || '').trim().toLowerCase();
        const tblNorm = tableNumber.trim().toLowerCase();
        return otNorm === tblNorm || otNorm.replace('table-', '') === tblNorm.replace('table-', '');
      });
      if (isOccupiedByOther) {
        toast.error(`${tableNumber} is currently occupied by another customer. Please choose a different table.`);
        return;
      }
    }

    if (orderType === 'delivery') {
      if (shop?.settings && !shop.settings.delivery_enabled) {
        toast.error(`Home delivery is disabled for this shop. Please choose ${businessCategory.orderTypeTakeawayTitle} or ${businessCategory.orderTypeDineInTitle}.`);
        return;
      }

      const maxDist = Number((shop?.settings as any)?.max_delivery_distance || 0);
      if (maxDist > 0 && deliveryDistanceKm > maxDist) {
        toast.error(`Out of delivery range. The restaurant only delivers within ${maxDist} km (your location is ${deliveryDistanceKm.toFixed(1)} km away).`);
        return;
      }

      const savedLat = localStorage.getItem('customer_lat');
      const savedLng = localStorage.getItem('customer_lng');
      if (!savedLat || !savedLng) {
        toast.error("GPS Location is mandatory for delivery. Please detect your location.");
        handleAutoFetchLocation();
        return;
      }

      if (!deliveryAddress) {
        toast.error("Please enter your delivery address");
        return;
      }
      localStorage.setItem('customer_address', deliveryAddress);
    }

    const savedLat = localStorage.getItem('customer_lat');
    const savedLng = localStorage.getItem('customer_lng');

    let finalPhone = customerPhone;
    try {
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      if (payload?.sub) finalPhone = payload.sub;
    } catch (e){}

    const isMasterOnline = (shop?.settings as any)?.online_payments_enabled !== false;
    let isChannelOnline = true;
    if (orderType === 'dine_in') isChannelOnline = (shop?.settings as any)?.online_payments_dinein_enabled !== false;
    else if (orderType === 'takeaway') isChannelOnline = (shop?.settings as any)?.online_payments_takeaway_enabled !== false;
    else if (orderType === 'delivery') isChannelOnline = (shop?.settings as any)?.online_payments_delivery_enabled !== false;

    const isOnlineDisabled = !(isMasterOnline && isChannelOnline);
    const apiPaymentMethod = isOnlineDisabled ? 'cash' : 'online';

    setIsPlacingOrder(true);
    try {
      let finalAddress = deliveryAddress;
      if (orderType === 'delivery' && deliveryAddress && savedLat && savedLng) {
        if (!deliveryAddress.includes('Lat:') && !deliveryAddress.includes('loc=')) {
          finalAddress = `${deliveryAddress} [loc=${savedLat},${savedLng}]`;
        }
      }

      const payload = {
        customer_name: customerName,
        customer_phone: finalPhone,
        order_type: orderType,
        table_number: orderType === 'dine_in' ? tableNumber : null,
        delivery_address: orderType === 'delivery' ? finalAddress : null,
        payment_method: apiPaymentMethod,
        total_amount: finalTotal,
        applied_discount_ids: appliedDiscountsList.map(d => d.id),
        applied_discount_codes: appliedDiscountsList.map(d => d.discount.code || d.discount.title),
        items: items.map(it => {
          const isDelivery = orderType === 'delivery';
          let itemPrice = 0;
          if (it.menuItem.variants && it.menuItem.variants.length > 0) {
            const v = it.menuItem.variants[it.selectedVariantIdx];
            const p = (isDelivery && v.online_price) ? Number(v.online_price) : Number(v.price);
            const op = isDelivery 
              ? (v.online_offer_price ? Number(v.online_offer_price) : (v.online_price ? Number(v.online_price) : (v.offer_price ? Number(v.offer_price) : p)))
              : (v.offer_price ? Number(v.offer_price) : p);
            itemPrice = op < p ? op : p;
          } else {
            const p = (isDelivery && it.menuItem.online_price) ? Number(it.menuItem.online_price) : Number(it.menuItem.price);
            const op = isDelivery 
              ? (it.menuItem.online_offer_price ? Number(it.menuItem.online_offer_price) : (it.menuItem.online_price ? Number(it.menuItem.online_price) : (it.menuItem.offer_price ? Number(it.menuItem.offer_price) : p)))
              : (it.menuItem.offer_price ? Number(it.menuItem.offer_price) : p);
            itemPrice = op < p ? op : p;
          }

          let addonsPrice = 0;
          if (it.menuItem.addons) {
            it.selectedAddons.forEach(idx => {
              addonsPrice += Number(it.menuItem.addons![idx].price);
            });
          }

          return {
            menu_item_id: it.menuItem.id,
            name: it.menuItem.name,
            quantity: it.quantity,
            price: Number((itemPrice + addonsPrice).toFixed(2)),
            variant_info: it.menuItem.variants && it.menuItem.variants.length > 0
              ? { name: it.menuItem.variants[it.selectedVariantIdx].name }
              : null,
            addons_info: it.selectedAddons.map(idx => ({ name: it.menuItem.addons![idx].name, price: it.menuItem.addons![idx].price }))
          };
        })
      };

      const res = await api.post(`/public/shop/${id}/orders`, payload);
      const order = res.data;

      const isAcceptAfterPayment = Boolean((shop?.settings as any)?.accept_after_payment);

      if (isAcceptAfterPayment && apiPaymentMethod === 'online') {
        try {
          const payRes = await api.post(`/public/shop/${id}/orders/${order.id}/pay`);
          const payData = payRes.data;

          if (payData.mock_mode) {
            await api.post(`/public/shop/${id}/orders/${order.id}/verify`, {
              razorpay_order_id: payData.razorpay_order_id,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: 'mock_signature'
            });
            clearCart();
            triggerHaptic(HAPTIC_PATTERNS.successUnlock);
            confetti({ particleCount: 100, spread: 65, origin: { y: 0.6 }, colors: [primaryColor, '#22c55e', '#3b82f6'], zIndex: 9999 });
            toast.success("Payment successful! Order confirmed.");
            navigate(`/shop/${id}/order/${order.id}`);
            return;
          }

          const sdkLoaded = await loadRazorpaySDK();
          if (!sdkLoaded) {
            toast.error("Could not load payment gateway. Please try again.");
            setIsPlacingOrder(false);
            return;
          }

          const currSymbol = payData.currency_symbol || shop?.settings?.currency || '₹';
          const currencyCode = payData.currency || 'INR';
          const baseTotal = payData.base_total || (payData.amount / 100).toFixed(2);
          const platFee = payData.platform_fee || 0;
          const pgFee = payData.pg_fee || 0;
          const grandTotalVal = payData.grand_total || (payData.amount / 100).toFixed(2);

          const rzpOptions = {
            key: payData.razorpay_key,
            amount: payData.amount,
            currency: currencyCode,
            name: shop?.name || 'Restaurant Order',
            description: `Items: ${currSymbol}${baseTotal} | Platform Fee: ${currSymbol}${platFee} | PG Fee: ${currSymbol}${pgFee} = ${currSymbol}${grandTotalVal}`,
            order_id: payData.razorpay_order_id,
            handler: async (response: any) => {
              try {
                await api.post(`/public/shop/${id}/orders/${order.id}/verify`, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                clearCart();
                triggerHaptic(HAPTIC_PATTERNS.successUnlock);
                confetti({ particleCount: 100, spread: 65, origin: { y: 0.6 }, colors: [primaryColor, '#22c55e', '#3b82f6'], zIndex: 9999 });
                toast.success("Payment successful! Order confirmed.");
                navigate(`/shop/${id}/order/${order.id}`);
              } catch {
                toast.error("Payment verification failed. Please contact support.");
                navigate(`/shop/${id}/order/${order.id}`);
              }
            },
            prefill: {
              name: customerName,
              contact: finalPhone
            },
            theme: { color: primaryColor },
            modal: {
              ondismiss: () => {
                toast.error("Payment cancelled. Please complete payment to confirm your order.");
                setIsPlacingOrder(false);
              }
            }
          };

          const rzp = new (window as any).Razorpay(rzpOptions);
          rzp.open();
          return;
        } catch (payErr: any) {
          console.error("Payment initiation failed", payErr);
          toast.error(payErr.response?.data?.detail || "Failed to initiate online payment.");
          setIsPlacingOrder(false);
          return;
        }
      }

      // Default Flow (accept_after_payment = false or cash):
      // Navigate immediately to the order tracking page.
      // Payment will happen there ONLY AFTER the shop accepts the order.
      clearCart();
      triggerHaptic(HAPTIC_PATTERNS.successUnlock);
      confetti({ particleCount: 100, spread: 65, origin: { y: 0.6 }, colors: [primaryColor, '#22c55e', '#3b82f6'], zIndex: 9999 });
      toast.success("Order sent! Waiting for shop to accept...");
      setTimeout(() => {
        navigate(`/shop/${id}/order/${order.id}`);
      }, 1000);
      
    } catch (e: any) {
      console.error(e);
      const msg = e.response?.data?.detail || "Failed to place order. Please try again.";
      toast.error(msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const primaryColor = shop?.theme?.primary_color || '#ea580c';
  const { currentOrder, totalActiveCount } = useActiveOrders(id);
  const [contestBtnTextIndex, setContestBtnTextIndex] = useState(0);
  const contestTexts = useMemo(() => ['WIN FREE', 'PLAY CONTEST', 'JOIN SPIN', 'WIN CASH'], []);

  useEffect(() => {
    const timer = setInterval(() => {
      setContestBtnTextIndex((prev) => (prev + 1) % contestTexts.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [contestTexts.length]);

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deliveryDistanceKm = useMemo(() => {
    if (orderType !== 'delivery') return 0;
    if (!shop?.latitude || !shop?.longitude) return 0;
    if (!mapCenter || (mapCenter[0] === 12.9716 && mapCenter[1] === 77.5946 && !deliveryAddress)) return 0;
    return calculateDistanceKm(shop.latitude, shop.longitude, mapCenter[0], mapCenter[1]);
  }, [orderType, shop?.latitude, shop?.longitude, mapCenter, deliveryAddress]);

  const deliveryFee = useMemo(() => {
    if (orderType !== 'delivery') return 0;
    if (!shop?.settings?.delivery_enabled) return 0;

    const baseCharge = shop.settings.base_delivery_charge ?? 0;
    const baseDistance = shop.settings.base_delivery_distance ?? 0;
    const stepKm = shop.settings.extra_delivery_distance_step || 1;
    const extraRate = shop.settings.extra_delivery_charge_per_step ?? 0;

    if (deliveryDistanceKm <= baseDistance || baseDistance <= 0 || deliveryDistanceKm === 0) {
      return baseCharge;
    }

    const extraDist = deliveryDistanceKm - baseDistance;
    const steps = Math.ceil(extraDist / stepKm);
    return baseCharge + (steps * extraRate);
  }, [orderType, shop?.settings, deliveryDistanceKm]);

  const {
    subtotal,
    automaticDiscountAmount,
    manualDiscountAmount,
    appliedDiscountsList,
    isGstEnabled,
    isInclusive,
    taxableAmount,
    cgstRate,
    sgstRate,
    cgstAmount,
    sgstAmount,
    totalTaxAmount,
    finalTotal,
    appliedAutoDiscounts,
    platformFee,
    pgFee,
    gstOnFee,
    totalPgFee,
    grandTotal,
    isOnlineAllowed,
  } = useMemo(() => {
    let subtotal = 0;
    let autoDiscountTotal = 0;
    const appliedAutoDiscounts = new Set<string>();
    const isDelivery = orderType === 'delivery';

    items.forEach(item => {
      const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
      
      let basePrice = 0;
      let effectivePrice = 0;

      if (menuItem.variants && menuItem.variants.length > 0) {
        const v = menuItem.variants[selectedVariantIdx] || menuItem.variants[0];
        const p = (isDelivery && v.online_price) ? Number(v.online_price) : Number(v.price || 0);
        const op = isDelivery 
          ? (v.online_offer_price ? Number(v.online_offer_price) : (v.online_price ? Number(v.online_price) : (v.offer_price ? Number(v.offer_price) : p)))
          : (v.offer_price ? Number(v.offer_price) : p);
        basePrice = p;
        effectivePrice = (op > 0 && op < p) ? op : p;
      } else {
        const p = (isDelivery && menuItem.online_price) ? Number(menuItem.online_price) : Number(menuItem.price || 0);
        const op = isDelivery 
          ? (menuItem.online_offer_price ? Number(menuItem.online_offer_price) : (menuItem.online_price ? Number(menuItem.online_price) : (menuItem.offer_price ? Number(menuItem.offer_price) : p)))
          : (menuItem.offer_price ? Number(menuItem.offer_price) : p);
        basePrice = p;
        effectivePrice = (op > 0 && op < p) ? op : p;
      }
      
      let addonsPrice = 0;
      if (menuItem.addons) {
        selectedAddons.forEach(idx => {
          addonsPrice += Number(menuItem.addons![idx]?.price || 0);
        });
      }

      const itemSubtotal = (basePrice + addonsPrice) * quantity;
      subtotal += itemSubtotal;

      if (basePrice > effectivePrice) {
        autoDiscountTotal += (basePrice - effectivePrice) * quantity;
        appliedAutoDiscounts.add(`${menuItem.name} Offer`);
      }
    });

    const appliedDiscountsList: Array<{ id: string; title: string; savings: number; discount: Discount }> = [];

    if (manualDiscountId && manualDiscountId !== 'none') {
      const disc = availableDiscounts.find(d => d.id === manualDiscountId);
      if (disc && disc.is_active !== false && !disc.is_already_used) {
        const isMemberOk = !((disc.visibility_type === 'members_only_hidden' || disc.visibility_type === 'members_only_visible') && memberStatus !== 'verified-member');
        const isUnlockOk = !(disc.visibility_type === 'unlock_required' && memberStatus === null);
        const isTypeOk = ['percentage', 'flat', 'fixed'].includes(disc.discount_type);
        if (isMemberOk && isUnlockOk && isTypeOk) {
          const savings = calculateDiscountSavings(disc);
          if (savings > 0) {
            appliedDiscountsList.push({
              id: disc.id,
              title: disc.title,
              savings: Number(savings.toFixed(2)),
              discount: disc
            });
          }
        }
      }
    }

    const manualDiscountAmount = appliedDiscountsList.reduce((acc, d) => acc + d.savings, 0);

    const foodSubtotalAfterDiscounts = Math.max(0, subtotal - autoDiscountTotal - manualDiscountAmount);

    // GST & Compliances Calculation
    const isGstEnabled = Boolean(shop?.settings?.gst_enabled);
    const isInclusive = Boolean(shop?.settings?.inclusive_tax);
    const cgstRate = Number(shop?.settings?.cgst_rate || 0);
    const sgstRate = Number(shop?.settings?.sgst_rate || 0);
    const totalTaxRate = cgstRate + sgstRate;

    let taxableAmount = foodSubtotalAfterDiscounts;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let totalTaxAmount = 0;

    if (isGstEnabled && totalTaxRate > 0) {
      if (isInclusive) {
        // Tax is already part of item prices
        taxableAmount = parseFloat((foodSubtotalAfterDiscounts / (1 + totalTaxRate / 100)).toFixed(2));
        totalTaxAmount = parseFloat((foodSubtotalAfterDiscounts - taxableAmount).toFixed(2));
        cgstAmount = parseFloat((totalTaxAmount * (cgstRate / totalTaxRate)).toFixed(2));
        sgstAmount = parseFloat((totalTaxAmount - cgstAmount).toFixed(2));
      } else {
        // Tax is added exclusively on top of food subtotal
        taxableAmount = foodSubtotalAfterDiscounts;
        totalTaxAmount = parseFloat((foodSubtotalAfterDiscounts * (totalTaxRate / 100)).toFixed(2));
        cgstAmount = parseFloat((totalTaxAmount * (cgstRate / totalTaxRate)).toFixed(2));
        sgstAmount = parseFloat((totalTaxAmount - cgstAmount).toFixed(2));
      }
    }

    const foodTotalWithTax = isGstEnabled && !isInclusive
      ? foodSubtotalAfterDiscounts + totalTaxAmount
      : foodSubtotalAfterDiscounts;

    const finalTotal = foodTotalWithTax + (orderType === 'delivery' ? deliveryFee : 0);

    // Online payment fees (Razorpay) — dynamically applied based on user/merchant channel setting
    const isMasterOnline = (shop?.settings as any)?.online_payments_enabled !== false;
    let isChannelOnline = true;
    if (orderType === 'dine_in') isChannelOnline = (shop?.settings as any)?.online_payments_dinein_enabled !== false;
    else if (orderType === 'takeaway') isChannelOnline = (shop?.settings as any)?.online_payments_takeaway_enabled !== false;
    else if (orderType === 'delivery') isChannelOnline = (shop?.settings as any)?.online_payments_delivery_enabled !== false;

    const isOnlineFeeApplicable = paymentMethod === 'online' && isMasterOnline && isChannelOnline;
    const pricing = calculateOrderPricing(finalTotal, isOnlineFeeApplicable);
    const platformFee = pricing.platformFee;
    const pgFee = pricing.gatewayFee;
    const gstOnFee = pricing.gatewayGst;
    const totalPgFee = pricing.totalPgFee;
    const grandTotal = pricing.totalPayable;

    return {
      subtotal,
      automaticDiscountAmount: autoDiscountTotal,
      manualDiscountAmount,
      appliedDiscountsList,
      isGstEnabled,
      isInclusive,
      taxableAmount,
      cgstRate,
      sgstRate,
      cgstAmount,
      sgstAmount,
      totalTaxAmount,
      finalTotal,
      appliedAutoDiscounts: Array.from(appliedAutoDiscounts),
      platformFee,
      pgFee,
      gstOnFee,
      totalPgFee,
      grandTotal,
      isOnlineAllowed: isMasterOnline && isChannelOnline,
    };
  }, [items, availableDiscounts, manualDiscountId, memberStatus, deliveryFee, paymentMethod, orderType, shop?.settings]);

  const [showAllItemsModal, setShowAllItemsModal] = useState(false);
  const [showAllOffersModal, setShowAllOffersModal] = useState(false);

  const renderItem = (item: any) => {
    const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
    
    const isDelivery = orderType === 'delivery';
    let basePrice = 0;
    if (menuItem.variants && menuItem.variants.length > 0) {
      const v = menuItem.variants[selectedVariantIdx] || menuItem.variants[0];
      const p = (isDelivery && v.online_price) ? Number(v.online_price) : Number(v.price || 0);
      const op = isDelivery 
        ? (v.online_offer_price ? Number(v.online_offer_price) : (v.online_price ? Number(v.online_price) : (v.offer_price ? Number(v.offer_price) : p)))
        : (v.offer_price ? Number(v.offer_price) : p);
      basePrice = (op > 0 && op < p) ? op : (op > 0 ? op : p);
    } else {
      const p = (isDelivery && menuItem.online_price) ? Number(menuItem.online_price) : Number(menuItem.price || 0);
      const op = isDelivery 
        ? (menuItem.online_offer_price ? Number(menuItem.online_offer_price) : (menuItem.online_price ? Number(menuItem.online_price) : (menuItem.offer_price ? Number(menuItem.offer_price) : p)))
        : (menuItem.offer_price ? Number(menuItem.offer_price) : p);
      basePrice = (op > 0 && op < p) ? op : (op > 0 ? op : p);
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
              loading="lazy"
              decoding="async"
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
    const isUsed = disc.is_already_used === true;
    return (
      <button
        key={disc.id}
        onClick={() => {
          setSelectedBalloonDiscount(disc);
        }}
        className={`w-full p-4 ${borderRadiusClass} border-2 flex items-center justify-between transition-all cursor-pointer ${
          isUsed
            ? 'opacity-75 bg-slate-50 border-slate-200 hover:border-slate-300'
            : manualDiscountId === disc.id 
              ? 'border-transparent' 
              : 'border-slate-100 hover:border-slate-200'
        }`}
        style={!isUsed && manualDiscountId === disc.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` } : {}}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <span className="font-black text-slate-400">%</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 leading-tight">{disc.title}</span>
              {isUsed && (
                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                  Already Used
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">
              {isUsed ? 'This discount has already been used on a previous order' : <LinkifiedText text={disc.description || 'Tap to apply this offer'} />}
            </div>
          </div>
        </div>
        {!isUsed ? (
          <div 
            className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 ${manualDiscountId === disc.id ? '' : 'border-slate-200'}`}
            style={manualDiscountId === disc.id ? { borderColor: primaryColor } : {}}
          >
            {manualDiscountId === disc.id && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />}
          </div>
        ) : (
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Used</span>
        )}
      </button>
    );
  };

  const visibleItems = items.slice(0, 3);
  const remainingItemsCount = items.length - 3;

  const applicableDiscounts = availableDiscounts.filter(d => {
    if (!['percentage', 'flat'].includes(d.discount_type)) return false;
    if (d.visibility_type === ('hidden' as any)) return false;
    if ((d.visibility_type === 'members_only_hidden' || d.visibility_type === 'members_only_visible') && memberStatus !== 'verified-member') return false;
    return true;
  });
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
            {/* Restaurant Closed Status Banner */}
            {!shopOpenStatus.isOpen && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-center gap-3.5 shadow-xs animate-in fade-in">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Clock size={20} />
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-amber-800 dark:text-amber-300">Restaurant is Currently Closed</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-200/80 dark:bg-amber-900/80 rounded-full font-bold">Orders Paused</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5 font-medium">
                    {shop?.name || 'Restaurant'} is not accepting orders at this time. {shopOpenStatus.message}
                  </p>
                </div>
              </div>
            )}

            {/* Rotating dining table container */}
            <div className="flex flex-col items-center relative w-full overflow-visible px-8">
              
              {/* Left / Right Spin Arrows (hidden on mobile, visible on desktop) */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 justify-between pointer-events-none px-1 sm:px-2 z-30 hidden md:flex">
                <button
                  onClick={() => {
                    const nextIdx = (activeTableIdx - 1 + items.length) % items.length;
                    setActiveTableIdx(nextIdx);
                    const angleStep = (2 * Math.PI) / items.length;
                    rotation.set(Math.PI / 2 - angleStep * nextIdx);
                  }}
                  className="w-10 h-10 rounded-full bg-white/95 border border-slate-200 shadow-md flex items-center justify-center pointer-events-auto active:scale-90 transition-transform cursor-pointer text-slate-700 hover:text-slate-900"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => {
                    const nextIdx = (activeTableIdx + 1) % items.length;
                    setActiveTableIdx(nextIdx);
                    const angleStep = (2 * Math.PI) / items.length;
                    rotation.set(Math.PI / 2 - angleStep * nextIdx);
                  }}
                  className="w-10 h-10 rounded-full bg-white/95 border border-slate-200 shadow-md flex items-center justify-center pointer-events-auto active:scale-90 transition-transform cursor-pointer text-slate-700 hover:text-slate-900"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Table and Chairs Wrapper Area - with top margin to avoid overlap in mobile headers */}
              <div className="relative w-64 h-64 mx-auto flex items-center justify-center overflow-visible mb-6 mt-20">
                
                {/* 4 Static Chairs (Top, Bottom, Left, Right) - rendered outside the rotating element */}
                {[
                  { id: 'top', cx: 0, cy: -156, rotation: 180 },
                  { id: 'bottom', cx: 0, cy: 156, rotation: 0 },
                  { id: 'left', cx: -156, cy: 0, rotation: 90 },
                  { id: 'right', cx: 156, cy: 0, rotation: 270 }
                ].map(chair => (
                  <div 
                    key={`chair-static-${chair.id}`}
                    className="absolute w-11 h-11 flex items-center justify-center pointer-events-none select-none z-0 bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-955/40 rounded-xl shadow-lg"
                    style={{
                      transform: `translate3d(${chair.cx}px, ${chair.cy}px, 0) rotate(${chair.rotation}deg)`,
                      left: 'calc(50% - 22px)',
                      top: 'calc(50% - 22px)',
                    }}
                  >
                    <Armchair size={20} className="text-amber-100/90 drop-shadow" />
                  </div>
                ))}

                {/* Rotating Dining Table (Lazy Susan) */}
                <motion.div
                  onPanStart={() => {
                    startAngle.current = rotation.get();
                    isPanning.current = true;
                  }}
                  onPan={(e, info) => {
                    // Spin table based on drag gesture offset with higher sensitivity for easier rotation
                    rotation.set(startAngle.current + info.offset.x * 0.018);
                  }}
                  onPanEnd={() => {
                    // Reset panning state after a tiny delay so click doesn't trigger on drag end
                    setTimeout(() => {
                      isPanning.current = false;
                    }, 50);
                  }}
                  className="absolute inset-0 rounded-full border-8 border-amber-955/80 dark:border-slate-800 shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-visible"
                  style={{
                    rotate: tableRotationDeg,
                    background: "radial-gradient(circle, #b45309 0%, #78350f 65%, #451a03 100%)",
                    boxShadow: "0 20px 40px -10px rgba(69, 26, 3, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.15)"
                  }}
                >
                  {/* Center lazy susan glass accent with counter-rotating Menukit logo */}
                  <div className="absolute w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center text-center pointer-events-none select-none z-0 overflow-hidden">
                    <motion.div style={{ rotate: negativeRotation }} className="flex items-center justify-center">
                      <img 
                        src="/menukit-logo.svg" 
                        alt="Menukit Logo" 
                        className="w-12 h-12 object-contain opacity-95 drop-shadow" 
                      />
                    </motion.div>
                  </div>

                  {/* Outer ring decorations */}
                  <div className="absolute inset-2 rounded-full border border-amber-900/30 pointer-events-none" />
                  <div className="absolute inset-16 rounded-full border border-amber-900/10 pointer-events-none" />

                {/* Plates distributed in a circle */}
                {items.map((item, idx) => {
                  const angleStep = (2 * Math.PI) / items.length;
                  const angle = angleStep * idx;
                  const radius = 86; // Radius of circular plates placement
                  const x = radius * Math.cos(angle);
                  const y = radius * Math.sin(angle);
                  const isActive = activeTableIdx === idx;
                  
                  return (
                    <div
                      key={item.id}
                      onClick={(e) => {
                        // Prevent click action if the user was actually dragging/swiping
                        if (isPanning.current) return;
                        e.stopPropagation();
                        setActiveTableIdx(idx);
                        // Gently rotate selected item to the front (bottom position: Math.PI / 2)
                        const targetRot = Math.PI / 2 - angleStep * idx;
                        rotation.set(targetRot);
                      }}
                      className="absolute w-14 h-14"
                      style={{
                        transform: `translate3d(${x}px, ${y}px, 0)`,
                        left: 'calc(50% - 28px)',
                        top: 'calc(50% - 28px)',
                      }}
                    >
                      <motion.div
                        style={{ rotate: negativeRotation }}
                        className={`w-14 h-14 rounded-full bg-white shadow-md border-2 transition-all duration-300 flex items-center justify-center cursor-pointer select-none z-10 ${
                          isActive 
                            ? 'ring-4 ring-amber-500 scale-120 border-amber-600 shadow-amber-900/40' 
                            : 'border-slate-200 opacity-90 hover:opacity-100'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 bg-slate-50 relative">
                          {(item.menuItem.image_url || item.menuItem.images?.[0]?.image_url) ? (
                            <img 
                              src={item.menuItem.image_url || item.menuItem.images![0].image_url} 
                              alt={item.menuItem.name} 
                              className="w-full h-full object-cover pointer-events-none"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center pointer-events-none">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{item.menuItem.name.substring(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                          
                          {/* Ceramic plate gold rim decoration */}
                          <div className="absolute inset-0.5 rounded-full border border-amber-300/40 pointer-events-none" />
                          
                          {/* Quantity indicator badge */}
                          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-amber-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-md border border-white">
                            {item.quantity}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </motion.div>
            </div>
          </div>

            {/* Selected food plate information card (Tooltip style popover) */}
            {items[activeTableIdx] && (() => {
              const item = items[activeTableIdx];
              const { menuItem, selectedVariantIdx, selectedAddons, quantity } = item;
              
              const isDelivery = orderType === 'delivery';
              let basePrice = 0;
              if (menuItem.variants && menuItem.variants.length > 0) {
                const v = menuItem.variants[selectedVariantIdx];
                const p = (isDelivery && v.online_price) ? Number(v.online_price) : Number(v.price);
                const op = isDelivery 
                  ? (v.online_offer_price ? Number(v.online_offer_price) : (v.online_price ? Number(v.online_price) : (v.offer_price ? Number(v.offer_price) : p)))
                  : (v.offer_price ? Number(v.offer_price) : p);
                basePrice = op < p ? op : p;
              } else {
                const p = (isDelivery && menuItem.online_price) ? Number(menuItem.online_price) : Number(menuItem.price);
                const op = isDelivery 
                  ? (menuItem.online_offer_price ? Number(menuItem.online_offer_price) : (menuItem.online_price ? Number(menuItem.online_price) : (menuItem.offer_price ? Number(menuItem.offer_price) : p)))
                  : (menuItem.offer_price ? Number(menuItem.offer_price) : p);
                basePrice = op < p ? op : p;
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
                <div className="bg-amber-50/90 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md relative animate-[fadeIn_0.3s_ease-out] mb-6">
                  {/* Tooltip arrow pointer pointing at the table */}
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-50 dark:bg-slate-900 border-l border-t border-amber-200/80 dark:border-slate-800 rotate-45" />

                  <div className="flex justify-between items-start gap-3 relative z-10">
                    <div>
                      <h4 className="font-extrabold text-base text-amber-950 dark:text-amber-100">{menuItem.name}</h4>
                      {(variantName || addonNames) && (
                        <div className="text-[11px] font-medium text-amber-800/80 dark:text-slate-400 mt-1 leading-snug">
                          {variantName && <span>{variantName}</span>}
                          {variantName && addonNames && <span> • </span>}
                          {addonNames && <span>+ {addonNames}</span>}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="font-black text-base text-amber-950 dark:text-amber-300">
                        {shop?.settings?.currency || '₹'}{(basePrice + addonsPrice) * quantity}
                      </span>
                    </div>
                  </div>

                  {/* Quantity adjustment & Remove row */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-amber-200/40 dark:border-slate-800/60 relative z-10">
                    <button
                      onClick={() => {
                        removeFromCart(item.id);
                        if (activeTableIdx >= items.length - 1) {
                          setActiveTableIdx(Math.max(0, items.length - 2));
                        }
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-650 transition-colors"
                    >
                      Remove Item
                    </button>
                    
                    <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-800 rounded-lg p-1 border border-amber-200/40 dark:border-slate-700 shadow-2xs">
                      <button 
                        onClick={() => {
                          if (quantity === 1) {
                            removeFromCart(item.id);
                            if (activeTableIdx >= items.length - 1) {
                              setActiveTableIdx(Math.max(0, items.length - 2));
                            }
                          } else {
                            updateQuantity(item.id, -1);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-750 shadow-3xs text-slate-600 hover:text-slate-900 dark:text-slate-350 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-black w-5 text-center text-slate-800 dark:text-slate-100">{quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-white dark:bg-slate-750 shadow-3xs text-slate-600 hover:text-slate-900 dark:text-slate-350 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Promo / Discount Code Box */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                  <Tag size={16} style={{ color: primaryColor }} />
                  Have a Discount Code?
                </h3>
                {appliedDiscountsList && appliedDiscountsList.length > 0 && (
                  <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {appliedDiscountsList.length > 1 ? `${appliedDiscountsList.length} Offers Applied` : 'Code Applied'}
                  </span>
                )}
              </div>

              {/* List all applied discount codes / offers */}
              {appliedDiscountsList && appliedDiscountsList.length > 0 && (
                <div className="space-y-2">
                  {appliedDiscountsList.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs">
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-emerald-950 text-xs sm:text-sm tracking-wide truncate">
                            {item.discount.code || item.discount.title}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            {item.discount.discount_type === 'percentage'
                              ? `${Number(item.discount.discount_value)}% discount (-${currencySymbol}${item.savings.toFixed(2)})`
                              : `${currencySymbol}${Number(item.discount.discount_value)} flat discount (-${currencySymbol}${item.savings.toFixed(2)})`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setManualDiscount('none');
                          setDiscountCodeInput('');
                          toast.success(`${item.discount.title} removed`);
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form to enter promo code */}
              <form onSubmit={handleVerifyDiscountCode} className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={discountCodeInput}
                      onChange={(e) => {
                        setDiscountCodeInput(e.target.value.toUpperCase());
                        setDiscountCodeError('');
                      }}
                      placeholder="Enter code (e.g. NEWCOMER10)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm uppercase tracking-wider text-slate-800 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifyingCode || !discountCodeInput.trim()}
                    className="px-4 py-2.5 rounded-xl text-white font-extrabold text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {isVerifyingCode ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {discountCodeError && (
                  <p className="text-xs font-medium text-rose-500 pl-1">{discountCodeError}</p>
                )}
              </form>
            </div>

            {/* Offers (Balloon Garden) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>%</div>
                Offers & Benefits
              </h3>
              
              {applicableDiscounts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No offers available at the moment.</p>
              ) : (
                <div className="flex flex-wrap justify-center gap-6 py-4 overflow-visible">
                  {applicableDiscounts.map((disc, idx) => {
                    const colors = [
                      { bg: 'bg-rose-500', knot: 'border-b-rose-600', string: 'bg-rose-300', particle: '#f43f5e' },
                      { bg: 'bg-purple-500', knot: 'border-b-purple-600', string: 'bg-purple-300', particle: '#a855f7' },
                      { bg: 'bg-blue-500', knot: 'border-b-blue-600', string: 'bg-blue-300', particle: '#3b82f6' },
                      { bg: 'bg-orange-500', knot: 'border-b-orange-600', string: 'bg-orange-300', particle: '#f97316' }
                    ];
                    const color = colors[idx % colors.length];
                    const isApplied = (appliedDiscountsList || []).some(d => d.id === disc.id) || manualDiscountId === disc.id;
                    const isPopping = poppingId === disc.id;

                    return (
                      <motion.div
                        key={disc.id}
                        animate={isPopping ? {
                          scale: [1, 1.3, 0],
                          opacity: [1, 0.8, 0]
                        } : { 
                          y: isApplied ? 15 : [0, -10, 0],
                          scale: isApplied ? 0.9 : 1,
                          opacity: isApplied ? 0.75 : 1
                        }}
                        transition={isPopping ? {
                          duration: 0.3,
                          ease: "easeOut"
                        } : { 
                          y: { repeat: Infinity, repeatType: "mirror", duration: 1.8 + (idx * 0.3), ease: "easeInOut" },
                          scale: { duration: 0.25 }
                        }}
                        onClick={() => {
                          if (isPanning.current) return;
                          handleBalloonClick(disc);
                        }}
                        className="relative flex flex-col items-center cursor-pointer select-none group overflow-visible"
                      >
                        {/* Particle Explosion Ring */}
                        {isPopping && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            {[...Array(10)].map((_, i) => {
                              const angle = (i * 2 * Math.PI) / 10;
                              const px = 40 * Math.cos(angle);
                              const py = 40 * Math.sin(angle);
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ x: 0, y: 0, scale: 1.2, opacity: 1 }}
                                  animate={{ x: px, y: py, scale: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                  className="absolute w-2 h-2 rounded-full"
                                  style={{ backgroundColor: color.particle }}
                                />
                              );
                            })}
                          </div>
                        )}

                        {isApplied ? (
                          /* Popped Balloon Indicator - Sparkles icon */
                          <div className="flex flex-col items-center">
                            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shadow-inner animate-pulse text-rose-500">
                              <Sparkles size={18} />
                            </div>
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1.5 uppercase">Applied</span>
                          </div>
                        ) : (
                          /* Floating Balloon */
                          <div className="relative flex flex-col items-center">
                            {/* Balloon Bubble */}
                            <div className={`w-12 h-14 rounded-[50%_50%_50%_50%_/_45%_45%_55%_55%] ${color.bg} shadow-md flex items-center justify-center relative transition-transform group-hover:scale-110`}>
                              {/* Shiny Light Reflection */}
                              <div className="absolute top-1.5 left-2 w-2.5 h-4 bg-white/30 rounded-full rotate-[30deg]" />
                              {disc.discount_type === 'percentage' ? (
                                <Percent size={15} className="text-white drop-shadow-xs" />
                              ) : (
                                <Banknote size={16} className="text-white drop-shadow-xs" />
                              )}
                            </div>
                            {/* Balloon Tie Knot */}
                            <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] ${color.knot} -mt-0.5`} />
                            {/* Hanging String */}
                            <div className={`w-0.5 h-6 ${color.string} opacity-60`} />
                            
                            {/* Coupon Label */}
                            <span className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-wider max-w-[65px] truncate text-center">
                              Offer {idx + 1}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bill Summary (Zomato-Style Modern Card) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden font-sans">
              <div className="p-4 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-base">Bill Summary</h3>
                
                {/* Item Total */}
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Item total</span>
                  <span className="text-slate-900 font-bold">{currencySymbol}{subtotal.toFixed(2)}</span>
                </div>
                
                {/* Delivery Charge */}
                {orderType === 'delivery' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">
                        Delivery partner fee {deliveryDistanceKm > 0 ? `for ${deliveryDistanceKm.toFixed(1)} km` : ''}
                      </span>
                      <span className="text-slate-900 font-bold">{currencySymbol}{deliveryFee.toFixed(2)}</span>
                    </div>
                    {(() => {
                      const maxDist = Number((shop?.settings as any)?.max_delivery_distance || 0);
                      if (maxDist > 0 && deliveryDistanceKm > maxDist) {
                        return (
                          <div className="p-2.5 mt-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700 font-bold flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span>Out of Delivery Range: Max radius is {maxDist} km (you are {deliveryDistanceKm.toFixed(1)} km away).</span>
                          </div>
                        );
                      }
                      return <p className="text-[10px] text-slate-400 font-medium">Goes to them for their time and effort</p>;
                    })()}
                  </div>
                )}

                {/* Online Payment Fees (Platform Fee, PG Fee, GST) */}
                {paymentMethod === 'online' && (
                  <>
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">Platform fee</span>
                      <span className="text-slate-900 font-bold">{currencySymbol}{platformFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">Payment gateway fee</span>
                      <span className="text-slate-900 font-bold">{currencySymbol}{totalPgFee.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {/* Discounts section */}
                {(automaticDiscountAmount > 0 || manualDiscountAmount > 0) && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {automaticDiscountAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-emerald-600">
                        <span className="flex items-center gap-1">
                          Auto Discount
                          <span title={appliedAutoDiscounts.join(', ')}><Info size={12} className="opacity-70" /></span>
                        </span>
                        <span>-{currencySymbol}{automaticDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {appliedDiscountsList && appliedDiscountsList.length > 0 && appliedDiscountsList.map((d) => (
                      <div key={d.id} className="flex justify-between text-xs font-bold text-emerald-600">
                        <span className="flex items-center gap-1">
                          <Sparkles size={13} className="text-emerald-500 shrink-0" />
                          <span>{d.title}</span>
                        </span>
                        <span>-{currencySymbol}{d.savings.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* GST Tax Breakdown */}
                {isGstEnabled && totalTaxAmount > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {!isInclusive ? (
                      <>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">CGST ({cgstRate}%)</span>
                          <span className="text-slate-900 font-bold">+{currencySymbol}{cgstAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">SGST ({sgstRate}%)</span>
                          <span className="text-slate-900 font-bold">+{currencySymbol}{sgstAmount.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <span>Includes GST ({cgstRate + sgstRate}%)</span>
                        <span className="font-bold text-slate-700">CGST: {currencySymbol}{cgstAmount.toFixed(2)} | SGST: {currencySymbol}{sgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Shop GST & FSSAI Badges */}
                {(shop?.settings?.gstin || shop?.settings?.fssai_license) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 font-medium">
                    {shop.settings.gstin && (
                      <span>GSTIN: <strong className="text-slate-600 font-bold">{shop.settings.gstin}</strong></span>
                    )}
                    {shop.settings.fssai_license && (
                      <span>FSSAI Lic: <strong className="text-slate-600 font-bold">{shop.settings.fssai_license}</strong></span>
                    )}
                  </div>
                )}

                {/* Grand Total Divider */}
                <div className="pt-3 border-t border-slate-200/80 flex justify-between items-baseline">
                  <span className="font-extrabold text-slate-900 text-sm">To pay</span>
                  <div className="text-right">
                    {paymentMethod === 'online' && finalTotal !== grandTotal && (
                      <span className="text-xs text-slate-400 line-through mr-1.5">{currencySymbol}{finalTotal.toFixed(2)}</span>
                    )}
                    <span className="font-black text-xl text-slate-900 tracking-tight">
                      {currencySymbol}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Savings Wavy Banner */}
              {(automaticDiscountAmount > 0 || manualDiscountAmount > 0) && (
                <div className="bg-blue-50/90 dark:bg-blue-950/40 px-4 py-2.5 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 font-black text-xs">
                  <span className="text-sm">🥳</span>
                  <span>You saved {currencySymbol}{(automaticDiscountAmount + manualDiscountAmount).toFixed(2)} on this order</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slim, Sticky Bottom Bar for Checkout */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-safe">
          <div className="max-w-2xl mx-auto px-4 py-2 sm:py-3 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Payable</p>
              <p className="font-black text-lg leading-none" style={{ color: primaryColor }}>
                {shop?.settings?.currency || '₹'}{grandTotal.toFixed(2)}
              </p>
              {paymentMethod === 'online' && platformFee > 0 && (
                <p className="text-[9px] text-slate-400 mt-0.5">incl. fees</p>
              )}
            </div>
            {!shopOpenStatus.isOpen ? (
              <button
                disabled
                className="flex-[2] py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-not-allowed shadow-none"
              >
                <Clock size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Closed ({shopOpenStatus.openingFormatted ? `Opens at ${shopOpenStatus.openingFormatted}` : 'Orders Paused'})</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  const anyEnabled = shop?.settings?.dinein_enabled || shop?.settings?.takeaway_enabled || shop?.settings?.delivery_enabled;
                  if (!anyEnabled) {
                    toast.error("Ordering is currently disabled for this shop.");
                    return;
                  }
                  const currentToken = localStorage.getItem('customer_token');
                  if (!currentToken) {
                    // Must verify mobile first, then open checkout
                    setPendingCheckoutAfterVerify(true);
                    setShowVerifyPopup(true);
                  } else {
                    setIsCheckoutOpen(true);
                  }
                }}
                className="flex-[2] py-2.5 rounded-xl text-white font-bold text-[15px] shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                style={{ backgroundColor: primaryColor, boxShadow: `0 4px 20px ${primaryColor}40` }}
              >
                Checkout Order
              </button>
            )}
          </div>
        </div>
      )}

      {/* Checkout Bottom Sheet (2-Step Process) */}
      <BottomSheet
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutStep(1);
        }}
        title={checkoutStep === 1 ? "Step 1: Contact & Address Details" : "Step 2: Order Summary & Payment"}
        footer={
          checkoutStep === 1 ? (
            <button
              onClick={() => {
                if (!customerName || !customerPhone) {
                  toast.error("Please enter your name and mobile number");
                  return;
                }
                if (orderType === 'delivery') {
                  if (shop?.settings && !shop.settings.delivery_enabled) {
                    toast.error("Delivery is not enabled for this shop.");
                    return;
                  }
                  const maxDist = Number((shop?.settings as any)?.max_delivery_distance || 0);
                  if (maxDist > 0 && deliveryDistanceKm > maxDist) {
                    toast.error(`Out of delivery range. The restaurant only delivers within ${maxDist} km (your distance: ${deliveryDistanceKm.toFixed(1)} km).`);
                    return;
                  }
                  const savedLat = localStorage.getItem('customer_lat');
                  const savedLng = localStorage.getItem('customer_lng');
                  if (!savedLat || !savedLng) {
                    toast.error("GPS Location is required for Delivery. Tap 'Detect Location'.");
                    handleAutoFetchLocation();
                    return;
                  }
                  if (!deliveryAddress) {
                    toast.error("Please enter your delivery address");
                    return;
                  }
                }
                setCheckoutStep(2);
              }}
              className="w-full py-3.5 rounded-2xl text-white font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Proceed to Payment & Bill Summary →</span>
            </button>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setCheckoutStep(1)}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors shrink-0"
              >
                ← Back
              </button>
              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="flex-1 py-3.5 rounded-2xl text-white font-extrabold shadow-md hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {isPlacingOrder ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : Boolean((shop?.settings as any)?.accept_after_payment) && ((shop?.settings as any)?.online_payments_enabled !== false) ? (
                  `Pay & Place Order (${currencySymbol}${grandTotal.toFixed(2)})`
                ) : (
                  `Place Order (${currencySymbol}${grandTotal.toFixed(2)})`
                )}
              </button>
            </div>
          )
        }
      >
        <div className="space-y-4 font-sans">
          {/* Step Progress Indicator */}
          <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className={`flex-1 h-1.5 rounded-full transition-all ${checkoutStep === 1 ? 'bg-primary' : 'bg-primary/40'}`} style={{ backgroundColor: primaryColor }} />
            <div className={`flex-1 h-1.5 rounded-full transition-all ${checkoutStep === 2 ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'}`} style={{ backgroundColor: checkoutStep === 2 ? primaryColor : undefined }} />
          </div>

          {/* Fulfillment Mode Banner */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {orderType === 'delivery' ? '🚚' : orderType === 'takeaway' ? '🛍️' : '🍽️'}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fulfillment Mode</p>
                <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100 capitalize">
                  {orderType === 'delivery' ? businessCategory.orderTypeDeliveryTitle : orderType === 'takeaway' ? businessCategory.orderTypeTakeawayTitle : businessCategory.orderTypeDineInTitle}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
              {orderType === 'delivery' ? businessCategory.orderTypeDeliveryTitle : orderType === 'takeaway' ? businessCategory.orderTypeTakeawayTitle : businessCategory.orderTypeDineInTitle}
            </span>
          </div>

          {/* STEP 1: Customer Contact & Delivery Info */}
          {checkoutStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center mb-1.5">
                  <span>Mobile Number</span>
                  {token ? (
                    <span className="text-[10px] text-green-600 font-extrabold uppercase bg-green-50 px-2 py-0.5 rounded-md border border-green-100 flex items-center gap-1">
                      <span>Verified</span>
                      <CheckCircle size={10} className="fill-green-600/10 text-green-650" />
                    </span>
                  ) : (
                    <button 
                      type="button" 
                      onClick={() => setShowVerifyPopup(true)} 
                      className="text-[10px] text-orange-650 font-extrabold uppercase bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 hover:bg-orange-100 transition-all flex items-center gap-1"
                    >
                      <span>Verify Now</span>
                      <Key size={10} />
                    </button>
                  )}
                </label>
                <input
                  type="tel"
                  placeholder="Enter mobile number"
                  value={customerPhone}
                  disabled={!!token}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-slate-300 transition-all font-medium text-sm ${
                    token 
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' 
                      : 'bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                />
                {!token && (
                  <p className="text-[10px] text-slate-500 mt-2">
                    By continuing, you accept our{' '}
                    <a href="https://menukit.debuggerstechnologies.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                      Terms and Conditions
                    </a>
                  </p>
                )}
              </div>

              {orderType === 'dine_in' && businessCategory.isFood && (() => {
                const totalTables = Number((shop?.settings as any)?.dinein_tables_count || 10);
                const tablesList = Array.from({ length: totalTables }, (_, i) => `Table-${i + 1}`);

                const myActiveTable = occupiedTables.find((ot: any) => ot.is_my_table);

                // If customer ALREADY has an active order on a table, do NOT show the table choosing dropdown!
                if (myActiveTable) {
                  return (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        {businessCategory.tableOrStallLabel || 'Table Number'}
                      </label>
                      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-200 text-sm">
                            <UtensilsCrossed size={16} className="text-primary shrink-0" />
                            <span>{myActiveTable.table_number || tableNumber}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                            Active Bill • Order #{myActiveTable.daily_order_number}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                          These items will automatically be added to your ongoing bill for <strong>{myActiveTable.table_number || tableNumber}</strong>. You can enjoy your meal and pay all items together at the end!
                        </p>
                      </div>
                    </div>
                  );
                }

                // If no active table order exists yet, show our custom SearchableSelect dropdown with UtensilsCrossed icon
                const tableOptions = tablesList.map((tbl) => {
                  const occ = occupiedTables.find((ot: any) => {
                    const otNorm = String(ot.table_number || '').trim().toLowerCase();
                    const tblNorm = tbl.toLowerCase();
                    return otNorm === tblNorm || otNorm.replace('table-', '') === tblNorm.replace('table-', '');
                  });

                  const isOccupiedByOther = Boolean(occ && !occ.is_my_table);

                  return {
                    id: tbl,
                    name: tbl,
                    icon: <UtensilsCrossed size={14} className={isOccupiedByOther ? 'text-slate-400' : 'text-primary'} />,
                    disabled: isOccupiedByOther,
                    subtext: isOccupiedByOther ? 'Occupied' : 'Available',
                  };
                });

                return (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        {businessCategory.tableOrStallLabel || 'Select Table Number'}
                      </label>
                      {tableNumber && (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
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
                      className="w-full h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                );
              })()}

              {orderType === 'delivery' && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Delivery Address & GPS</label>
                    {deliveryDistanceKm > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin size={10} /> ~{deliveryDistanceKm < 1 ? `${Math.round(deliveryDistanceKm * 1000)}m` : `${deliveryDistanceKm.toFixed(1)} km`} away
                      </span>
                    )}
                  </div>

                  {/* Delivery coverage & Pricing info banner */}
                  {shop?.settings && !shop.settings.delivery_enabled ? (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <span className="text-sm">🚫</span>
                      <span>Delivery is currently unavailable for this shop.</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-900 dark:text-blue-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Truck size={13} className="text-blue-600" />
                          Delivery Fee: {currencySymbol}{deliveryFee.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold">
                          {deliveryDistanceKm > 0 ? `${deliveryDistanceKm.toFixed(1)} km` : 'GPS required'}
                        </span>
                      </div>
                      {shop?.settings && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Base {currencySymbol}{shop.settings.base_delivery_charge ?? 0} up to {shop.settings.base_delivery_distance ?? 0} km, then +{currencySymbol}{shop.settings.extra_delivery_charge_per_step ?? 0} per {shop.settings.extra_delivery_distance_step ?? 1} km
                        </p>
                      )}
                    </div>
                  )}

                  <textarea
                    placeholder="Street, Building, Flat Number, Landmarks..."
                    value={deliveryAddress}
                    rows={2}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-300 transition-all font-medium text-slate-800 placeholder-slate-400 text-sm"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFetchLocation}
                      disabled={isLocating}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                    >
                      <Navigation size={14} className={isLocating ? "animate-spin text-primary" : "text-slate-500"} style={{ color: isLocating ? primaryColor : undefined }} />
                      <span>{isLocating ? "Locating GPS..." : "Detect My Location"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMap(!showMap)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                    >
                      <Map size={14} className="text-slate-500" />
                      <span>{showMap ? "Hide Map" : "Pin on Map"}</span>
                    </button>
                  </div>

                  {showMap && (
                    <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-200 relative mt-2 z-10">
                      <MapContainer
                        center={mapCenter}
                        zoom={15}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <Marker position={mapCenter} />
                        <MapEventsHandler onClick={handleMapMarkerChange} center={mapCenter} />
                      </MapContainer>
                      <div className="absolute bottom-2 left-2 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded shadow text-[9px] font-bold text-slate-650 pointer-events-none">
                        Tap map to move pin & set delivery location
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Zomato-Style Bill Summary & Payment Selection */}
          {checkoutStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Zomato-Style Bill Summary Block */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <h4 className="font-extrabold text-slate-900 dark:text-white text-xs uppercase tracking-wider">Order Bill Breakdown</h4>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                    <span>Item total</span>
                    <span className="text-slate-900 dark:text-white font-bold">{currencySymbol}{subtotal.toFixed(2)}</span>
                  </div>

                  {orderType === 'delivery' && (
                    <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                      <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">
                        Delivery partner fee {deliveryDistanceKm > 0 ? `(${deliveryDistanceKm.toFixed(1)} km)` : ''}
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold">{currencySymbol}{deliveryFee.toFixed(2)}</span>
                    </div>
                  )}

                  {paymentMethod === 'online' && (
                    <>
                      <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                        <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">Platform fee</span>
                        <span className="text-slate-900 dark:text-white font-bold">{currencySymbol}{platformFee.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                        <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">Payment gateway fee</span>
                        <span className="text-slate-900 dark:text-white font-bold">{currencySymbol}{totalPgFee.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {(automaticDiscountAmount > 0 || manualDiscountAmount > 0) && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      {automaticDiscountAmount > 0 && (
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Auto Discount</span>
                          <span>-{currencySymbol}{automaticDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {manualDiscountAmount > 0 && (
                        <div className="flex justify-between font-bold text-emerald-600 dark:text-emerald-400">
                          <span>Shop Coupon</span>
                          <span>-{currencySymbol}{manualDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* GST Tax Breakdown */}
                  {isGstEnabled && totalTaxAmount > 0 && (
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      {!isInclusive ? (
                        <>
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                            <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">CGST ({cgstRate}%)</span>
                            <span className="text-slate-900 dark:text-white font-bold">+{currencySymbol}{cgstAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
                            <span className="underline underline-offset-2 decoration-slate-300 decoration-dashed">SGST ({sgstRate}%)</span>
                            <span className="text-slate-900 dark:text-white font-bold">+{currencySymbol}{sgstAmount.toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 bg-slate-100/70 dark:bg-slate-800/80 px-2 py-1 rounded">
                          <span>Includes GST ({cgstRate + sgstRate}%)</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">CGST {currencySymbol}{cgstAmount.toFixed(2)} + SGST {currencySymbol}{sgstAmount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline font-black text-sm text-slate-900 dark:text-white">
                    <span>Total Payable</span>
                    <span className="text-base" style={{ color: primaryColor }}>
                      {currencySymbol}{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Option</label>
                <div className="space-y-2">
                  {isOnlineAllowed ? (
                    <label
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all"
                      style={{ borderColor: primaryColor, backgroundColor: `${primaryColor}08` }}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={true}
                        readOnly
                        className="w-4 h-4"
                        style={{ accentColor: primaryColor }}
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-semibold text-slate-850">Pay Online</span>
                        <span className="text-[10px] text-slate-400">UPI, Cards, Netbanking. Fast & secure.</span>
                      </div>
                    </label>
                  ) : (
                    <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all border-emerald-200 bg-emerald-50/40">
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-semibold text-slate-850">
                          {orderType === 'dine_in'
                            ? 'Pay at Counter / Cash'
                            : orderType === 'delivery'
                            ? 'Pay on Delivery (Cash / UPI on Spot)'
                            : 'Pay on Pickup (Cash / UPI at Shop)'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {orderType === 'dine_in'
                            ? 'Pay physically at the shop / counter.'
                            : 'Pay directly upon delivery or when you pick up.'}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                
                {/* Payment Notice */}
                {Boolean((shop?.settings as any)?.accept_after_payment) && isOnlineAllowed ? (
                  <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex gap-2">
                    <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-snug">
                      <span className="font-bold">Instant Payment Required:</span> Complete payment to confirm and place your order immediately.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex gap-2">
                    <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium leading-snug">
                      <span className="font-bold">Payment Option Unlocks Later:</span> You can pay only after {shop?.name || 'the shop'} accepts your order. This reduces cancellation rates and guarantees your order is prepared!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

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

      {/* Balloon Pop Reveal Modal */}
      <Modal
        isOpen={!!selectedBalloonDiscount}
        onClose={() => setSelectedBalloonDiscount(null)}
        title={selectedBalloonDiscount?.is_already_used ? "Offer Details" : "Special Offer Found!"}
      >
        {selectedBalloonDiscount && (() => {
          const disc = selectedBalloonDiscount;
          const isApplied = manualDiscountId === disc.id;
          const isUsed = !!disc.is_already_used;
          return (
            <div className="text-center p-3">
              <div className="flex justify-center mb-4">
                {isUsed ? (
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center border-2 border-red-200">
                    <XCircle size={36} className="text-red-500" />
                  </div>
                ) : disc.discount_type === 'percentage' ? (
                  <Percent size={40} className="text-emerald-500 animate-bounce" />
                ) : (
                  <Banknote size={40} className="text-emerald-500 animate-bounce" />
                )}
              </div>
              <h3 className="text-xl font-black text-slate-800">{disc.title}</h3>
              {isUsed && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/80 text-red-700 text-xs font-bold mt-2 border border-red-200">
                  <XCircle size={14} />
                  Already Used
                </div>
              )}
              <p className="text-sm font-medium text-slate-500 mt-2">
                <LinkifiedText text={disc.description || 'Tap below to apply this exclusive dining discount to your current bill!'} showIcon />
              </p>
              
              <div className={`border rounded-xl p-3 my-5 flex items-center justify-between shadow-inner ${
                isUsed ? 'bg-slate-100/70 border-slate-200 opacity-75' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-xs font-bold text-slate-500">Discount Offer</span>
                <span className={`font-black text-lg ${isUsed ? 'text-slate-500 line-through' : 'text-emerald-600'}`}>
                  {disc.discount_type === 'percentage' ? `${disc.discount_value}% OFF` : `Flat ₹${disc.discount_value} OFF`}
                </span>
              </div>

              {isUsed ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 text-center font-medium">
                    This discount has already been redeemed for your account/mobile number.
                  </div>
                  <button
                    disabled={true}
                    className="w-full py-3.5 rounded-xl bg-slate-200 text-slate-500 font-extrabold text-base border border-slate-300 cursor-not-allowed"
                  >
                    Already Used
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!isApplied && !isDiscountApplicable(disc)) {
                      toast.error('This discount is not applicable to any items in your cart');
                      triggerHaptic(HAPTIC_PATTERNS.error);
                      return;
                    }
                    setManualDiscount(isApplied ? 'none' : disc.id);
                    setSelectedBalloonDiscount(null);
                    if (!isApplied) {
                      toast.success(`Discount applied successfully!`);
                    } else {
                      toast.success('Discount removed.');
                    }
                  }}
                  className="w-full py-3.5 rounded-xl text-white font-extrabold text-base shadow-lg transition-all hover:brightness-110 active:scale-[0.97]"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isApplied ? 'Remove Discount' : 'Apply Discount'}
                </button>
              )}
            </div>
          );
        })()}
      </Modal>

      {showVerifyPopup && shop && (
        <DiscountUnlockPopup 
          shopId={shop.id}
          initialStep={pendingCheckoutAfterVerify ? 'mobile' : 'intro'}
          onClose={() => {
            setShowVerifyPopup(false);
            setPendingCheckoutAfterVerify(false);
          }}
          onUnlock={() => {
            setShowVerifyPopup(false);
            const newToken = localStorage.getItem('customer_token');
            if (newToken) {
              setToken(newToken);
              // If checkout was pending, open it now after verification
              if (pendingCheckoutAfterVerify) {
                setPendingCheckoutAfterVerify(false);
                setTimeout(() => setIsCheckoutOpen(true), 300);
              }
            }
          }}
        />
      )}
      {/* 🧱 Premium Floating Bottom Asymmetric Sized Navigation Dock Frame (Visible when cart is empty) */}
      {items.length === 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] z-40 transition-transform duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[32px] shadow-[0_12px_45px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 p-2">
            <div className="grid grid-cols-6 gap-1 items-center text-center">

              {/* Menu Button */}
              <button 
                onClick={() => { triggerHaptic(HAPTIC_PATTERNS.tap); navigate(`/shop/${id}`); }} 
                className="col-span-1 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <UtensilsCrossed size={19} className="text-slate-400 group-hover:text-slate-650" />
                <span className="text-[10px] font-bold text-slate-400">Menu</span>
              </button>

              {/* Cart Button (Active) */}
              <button 
                onClick={() => { triggerHaptic(HAPTIC_PATTERNS.tap); }} 
                className="col-span-1 flex flex-col items-center justify-center gap-1 relative cursor-pointer"
              >
                <ShoppingBag size={19} style={{ color: primaryColor }} />
                <span className="text-[10px] font-bold" style={{ color: primaryColor }}>Cart</span>
              </button>

              {/* Games Button */}
              <button 
                onClick={() => { triggerHaptic(HAPTIC_PATTERNS.tap); navigate(`/shop/${id}?games=true`); }} 
                className="col-span-1 flex flex-col items-center justify-center gap-1 cursor-pointer"
              >
                <Gamepad2 size={19} className="text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400">Games</span>
              </button>

              {/* Orders Button */}
              <div className="col-span-1 flex flex-col items-center justify-center gap-1 relative">
                <div className="relative">
                  <button
                    onClick={() => { triggerHaptic(HAPTIC_PATTERNS.tap); navigate(`/shop/${id}/orders`); }}
                    className="flex items-center justify-center cursor-pointer"
                  >
                    <History size={19} className="text-slate-400" />
                  </button>
                  {totalActiveCount > 0 && currentOrder && (
                    <button
                      key={currentOrder.id}
                      onClick={() => { triggerHaptic(HAPTIC_PATTERNS.tap); navigate(`/shop/${id}/order/${currentOrder.id}`); }}
                      className={`absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white dark:border-slate-900 transition-all duration-300 cursor-pointer hover:brightness-110 active:scale-95 ${
                        currentOrder.order_status === 'pending'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 animate-bounce'
                      }`}
                    >
                      <span>#{currentOrder.id.slice(0, 4).toUpperCase()}</span>
                      {currentOrder.order_status === 'pending' ? <Clock size={10} className="animate-spin text-white" /> : <ChefHat size={10} className="text-white" />}
                      <span>{currentOrder.order_status === 'pending' ? 'Waiting' : 'Preparing'}</span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400">Orders</span>
              </div>

              {/* 🏆 Asymmetric Extra-Wide Contest Button */}
              <button
                onClick={() => { triggerHaptic(HAPTIC_PATTERNS.balloonClick); navigate(`/shop/${id}/contest`); }}
                className="col-span-2 relative flex items-center justify-center gap-1.5 h-[46px] text-white font-black shadow-md transition-all active:scale-[0.97] hover:brightness-110 tracking-wider px-3 rounded-r-2xl rounded-l-none overflow-hidden cursor-pointer" 
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #ff8c00 100%)`,
                  boxShadow: `0 4px 12px 0 ${primaryColor}30`
                }}
              >
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-r-2xl">
                  <div className="absolute left-1/2 top-1/2 w-2.5 h-1.5 bg-yellow-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out]" style={{ '--tx': '45px', '--ty': '-12px', '--rot': '120deg' } as any} />
                  <div className="absolute left-1/2 top-1/2 w-1.5 h-3.5 bg-rose-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out_0.2s]" style={{ '--tx': '-40px', '--ty': '10px', '--rot': '180deg' } as any} />
                  <div className="absolute left-1/2 top-1/2 w-3 h-1.5 bg-cyan-400 rounded-sm animate-[particle-pop_1.8s_infinite_ease-out_0.4s]" style={{ '--tx': '30px', '--ty': '15px', '--rot': '90deg' } as any} />
                  <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-[particle-pop_1.8s_infinite_ease-out_0.6s]" style={{ '--tx': '-25px', '--ty': '-16px', '--rot': '45deg' } as any} />
                </div>

                <Trophy size={15} className="text-white fill-white/10 shrink-0 relative z-10" />
                <span 
                  key={contestBtnTextIndex} 
                  className="text-[10px] uppercase tracking-widest text-white relative z-10 animate-[btn-text-swap_0.4s_ease-out] block"
                >
                  {contestTexts[contestBtnTextIndex]}
                </span>
              </button>

            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes btn-text-swap {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes particle-pop {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          90% { opacity: 0.8; }
          100% { transform: translate(calc(-50% + var(--tx, 0px)), calc(-50% + var(--ty, 0px))) scale(0) rotate(var(--rot, 0deg)); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
