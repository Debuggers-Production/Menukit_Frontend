import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingBag, Truck, Store, Check, UtensilsCrossed, MapPin, AlertCircle, Loader2, Navigation } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Shop } from '@/types';
import toast from 'react-hot-toast';

interface OrderTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedType: 'dine_in' | 'takeaway' | 'delivery';
  onSelectType: (type: 'dine_in' | 'takeaway' | 'delivery') => void;
  allowClose?: boolean;
  availableTypes?: {
    dine_in?: boolean;
    takeaway?: boolean;
    delivery?: boolean;
  };
  shop?: Shop | null;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const OrderTypeModal: React.FC<OrderTypeModalProps> = ({
  isOpen,
  onClose,
  selectedType,
  onSelectType,
  allowClose = true,
  availableTypes = { dine_in: true, takeaway: true, delivery: true },
  shop,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const savedLat = localStorage.getItem('customer_lat');
    const savedLng = localStorage.getItem('customer_lng');
    if (savedLat && savedLng) {
      const lat = parseFloat(savedLat);
      const lng = parseFloat(savedLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  });

  // Re-read coords when opened
  useEffect(() => {
    if (isOpen) {
      const savedLat = localStorage.getItem('customer_lat');
      const savedLng = localStorage.getItem('customer_lng');
      if (savedLat && savedLng) {
        const lat = parseFloat(savedLat);
        const lng = parseFloat(savedLng);
        if (!isNaN(lat) && !isNaN(lng)) {
          setUserCoords({ lat, lng });
        }
      }
      setLocationError(null);
    }
  }, [isOpen]);

  const requestUserLocation = useCallback((onSuccess?: (coords: { lat: number; lng: number }) => void) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      toast.error('Geolocation is not supported by your device.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        localStorage.setItem('customer_lat', latitude.toString());
        localStorage.setItem('customer_lng', longitude.toString());
        const coords = { lat: latitude, lng: longitude };
        setUserCoords(coords);
        setIsLocating(false);
        toast.success('Location detected!');
        if (onSuccess) onSuccess(coords);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Please enable location permissions in your browser to verify home delivery.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location access was denied. Location is required for home delivery to check restaurant coverage.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is currently unavailable. Please check GPS settings.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setLocationError(msg);
        toast.error('Location is required for delivery.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }, []);

  // Calculate distance
  const distanceKm = useMemo(() => {
    if (!userCoords || !shop?.latitude || !shop?.longitude) return null;
    return haversineDistanceKm(shop.latitude, shop.longitude, userCoords.lat, userCoords.lng);
  }, [userCoords, shop?.latitude, shop?.longitude]);

  // Calculate delivery fee
  const deliveryFee = useMemo(() => {
    if (!shop?.settings?.delivery_enabled) return null;
    const baseCharge = Number(shop.settings.base_delivery_charge ?? 0);
    const baseDist = Number(shop.settings.base_delivery_distance ?? 0);
    const stepKm = Number(shop.settings.extra_delivery_distance_step || 1);
    const extraRate = Number(shop.settings.extra_delivery_charge_per_step ?? 0);

    if (!distanceKm || distanceKm <= baseDist || baseDist <= 0) {
      return baseCharge;
    }

    const extraDist = distanceKm - baseDist;
    const steps = Math.ceil(extraDist / stepKm);
    return baseCharge + steps * extraRate;
  }, [shop?.settings, distanceKm]);

  const isDeliveryDisabledByShop = !availableTypes.delivery || (shop?.settings && !shop.settings.delivery_enabled);

  const handleDeliverySelect = () => {
    if (isDeliveryDisabledByShop) {
      toast.error('Delivery is currently unavailable for this restaurant.');
      return;
    }

    // Location is mandatory for delivery
    if (!userCoords) {
      requestUserLocation((coords) => {
        onSelectType('delivery');
      });
      return;
    }

    onSelectType('delivery');
  };

  const hasAnyAvailable = Boolean(availableTypes.dine_in || availableTypes.takeaway || (!isDeliveryDisabledByShop));

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => allowClose && onClose()}
      title=""
    >
      <div className="text-center pb-2 pt-1">
        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mx-auto mb-3">
          <Store size={26} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {hasAnyAvailable ? 'How would you like your order?' : 'Digital Menu View'}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {hasAnyAvailable 
            ? 'Select your preferred fulfillment method to continue.' 
            : 'Online ordering is currently disabled for this restaurant. You can browse the menu catalog.'}
        </p>

        {/* Location alert if delivery error exists */}
        {locationError && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-left flex items-start gap-2">
            <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Location Required for Delivery
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-snug">
                {locationError}
              </p>
              <button
                type="button"
                onClick={() => requestUserLocation()}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 underline"
              >
                <Navigation size={11} /> Turn On GPS / Retry
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mt-5">
          {/* Dine-In Option */}
          <button
            type="button"
            disabled={!availableTypes.dine_in}
            onClick={() => availableTypes.dine_in && onSelectType('dine_in')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              !availableTypes.dine_in 
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'dine_in'
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !availableTypes.dine_in 
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'dine_in'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100'
              }`}>
                <UtensilsCrossed size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Dine-In
                  {!availableTypes.dine_in && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Order and eat at the restaurant table.
                </p>
              </div>
            </div>

            {selectedType === 'dine_in' && availableTypes.dine_in && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Takeaway Option */}
          <button
            type="button"
            disabled={!availableTypes.takeaway}
            onClick={() => availableTypes.takeaway && onSelectType('takeaway')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              !availableTypes.takeaway
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'takeaway'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                !availableTypes.takeaway
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'takeaway'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-slate-200'
              }`}>
                <ShoppingBag size={22} />
              </div>
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  Takeaway / Store Pickup
                  {!availableTypes.takeaway && (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pick up your order directly at the restaurant.
                </p>
              </div>
            </div>

            {selectedType === 'takeaway' && availableTypes.takeaway && (
              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>

          {/* Delivery Option */}
          <button
            type="button"
            disabled={isDeliveryDisabledByShop}
            onClick={handleDeliverySelect}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${
              isDeliveryDisabledByShop
                ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                : selectedType === 'delivery'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-2">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isDeliveryDisabledByShop
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  : selectedType === 'delivery'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100'
              }`}>
                {isLocating ? (
                  <Loader2 size={22} className="animate-spin text-blue-600" />
                ) : (
                  <Truck size={22} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                  Delivery to Doorstep
                  {isDeliveryDisabledByShop ? (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-sm">
                      Unavailable
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-sm">
                      GPS Mandatory
                    </span>
                  )}
                </div>
                
                {isDeliveryDisabledByShop ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Delivery not enabled for this restaurant.
                  </p>
                ) : isLocating ? (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1 font-medium">
                    <Loader2 size={11} className="animate-spin" /> Fetching your location to verify delivery...
                  </p>
                ) : userCoords && distanceKm !== null ? (
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 font-medium flex items-center gap-1">
                    <MapPin size={11} className="text-blue-500 shrink-0" />
                    <span>~{distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`} away</span>
                    {deliveryFee !== null && (
                      <span className="font-bold ml-1 text-slate-800 dark:text-slate-200">
                        • ₹{deliveryFee} fee
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tap to verify GPS location & delivery coverage.
                  </p>
                )}
              </div>
            </div>

            {selectedType === 'delivery' && !isDeliveryDisabledByShop && (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check size={14} />
              </div>
            )}
          </button>
        </div>

        {allowClose && (
          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full text-slate-600 dark:text-slate-400"
            >
              Continue Browsing
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
