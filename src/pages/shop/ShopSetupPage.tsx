import { cn } from '@/utils/cn';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { Store, MapPin, Phone, UploadCloud, Save, ChevronRight, Check, Edit2, Clock, Navigation, UtensilsCrossed, Building2, CheckCircle2, Search, Loader2, X } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '@/components/ui/AccessDenied';
import { BUSINESS_CATEGORIES, getBusinessCategory, getCategoryIcon } from '@/config/businessCategories';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TimePicker } from '@/components/ui/TimePicker';
import { Lightbox } from '@/components/ui/Lightbox';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuthStore } from '@/store/authStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { publicCache } from '@/utils/publicCache';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
 iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
 iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
 shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

function MapLocationSelector({ 
  latitude, 
  longitude, 
  onChange 
}: { 
  latitude: string, 
  longitude: string, 
  onChange: (lat: string, lng: string) => void 
}) {
  const [mapTarget, setMapTarget] = useState<[number, number]>(
    latitude && longitude ? [parseFloat(latitude), parseFloat(longitude)] : [20.5937, 78.9629] // India center
  );
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const markerRef = useRef<L.Marker>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchLocation = async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
    if (!q) {
      toast.error("Please enter a location or landmark to search");
      return;
    }

    // Direct coordinates detection like "9.84646, 78.109179"
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]).toFixed(6);
      const lng = parseFloat(coordMatch[3]).toFixed(6);
      onChange(lat, lng);
      setMapTarget([parseFloat(lat), parseFloat(lng)]);
      toast.success("Location set from coordinates!");
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      // 1. Nominatim OpenStreetMap Geocoder
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Accept-Language': 'en'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setSearchResults(data);
          setShowDropdown(true);
          return;
        }
      }

      // 2. Fallback: Photon Komoot Geocoder
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`;
      const photonRes = await fetch(photonUrl);
      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (photonData?.features?.length > 0) {
          const mapped: SearchResult[] = photonData.features.map((f: any) => ({
            lat: f.geometry.coordinates[1].toString(),
            lon: f.geometry.coordinates[0].toString(),
            display_name: [f.properties.name, f.properties.street, f.properties.city, f.properties.state, f.properties.country].filter(Boolean).join(', ')
          }));
          setSearchResults(mapped);
          setShowDropdown(true);
          return;
        }
      }

      toast.error("No locations found. Try searching with a nearby landmark or city.");
      setSearchResults([]);
    } catch (err) {
      console.error("Geocoding search error", err);
      toast.error("Search failed. Please check connection or pick manually on map.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat).toFixed(6);
    const lng = parseFloat(result.lon).toFixed(6);
    onChange(lat, lng);
    setMapTarget([parseFloat(lat), parseFloat(lng)]);
    setSearchQuery(result.display_name.split(',')[0]);
    setShowDropdown(false);
    toast.success("Map location updated!");
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        onChange(lat, lng);
        setMapTarget([parseFloat(lat), parseFloat(lng)]);
        toast.success("Location auto-detected!");
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error", error);
        toast.error("Failed to access location. Please pick your location manually on the map.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        onChange(pos.lat.toFixed(6), pos.lng.toFixed(6));
        setMapTarget([pos.lat, pos.lng]);
      }
    },
  };

  function MapClickEvent() {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
        setMapTarget([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }

  function MapCenterUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo(center, map.getZoom() < 12 ? 15 : map.getZoom(), { duration: 0.5 });
      setTimeout(() => map.invalidateSize(), 200);
    }, [center, map]);
    return null;
  }

  return (
    <div className="space-y-2.5">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input Bar with Suggestions Dropdown */}
        <div ref={searchContainerRef} className="relative flex-1">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value) {
                  setShowDropdown(false);
                  setSearchResults([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchLocation();
                }
              }}
              placeholder="Search area, landmark, street, city or coords..."
              className="w-full pl-9 pr-20 py-2 bg-card border border-border rounded-xl text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setShowDropdown(false);
                    setSearchResults([]);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSearchLocation()}
                disabled={isSearching}
                className="px-2.5 py-1 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                <span>Search</span>
              </button>
            </div>
          </div>

          {/* Autocomplete / Search Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-[1050] bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl overflow-hidden py-1 divide-y divide-border/50 max-h-56 overflow-y-auto">
              {searchResults.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectLocation(item)}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-accent/60 transition-colors flex items-start gap-2.5 cursor-pointer group"
                >
                  <MapPin size={14} className="text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {item.display_name.split(',')[0]}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground truncate">
                      {item.display_name.split(',').slice(1).join(',').trim()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls: Detect Location & Coordinates */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-xl text-xs font-bold text-primary transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Navigation size={13} className={isLocating ? "animate-spin" : ""} />
            <span>{isLocating ? "Locating Store..." : "Detect Current Location"}</span>
          </button>

          {latitude && longitude && (
            <span className="hidden sm:inline-block text-[11px] font-mono text-muted-foreground font-semibold px-2 py-1 bg-muted/60 rounded-lg border border-border/40">
              {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-border z-10 shadow-2xs">
        <MapContainer center={mapTarget} zoom={latitude && longitude ? 15 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickEvent />
          <MapCenterUpdater center={mapTarget} />
          {(latitude && longitude) ? (
            <Marker
              draggable={true}
              eventHandlers={eventHandlers}
              position={[parseFloat(latitude), parseFloat(longitude)]}
              ref={markerRef}
            />
          ) : null}
        </MapContainer>
        <div className="absolute bottom-2 left-2 z-[1000] bg-background/90 backdrop-blur px-2.5 py-1 rounded-lg border border-border/60 shadow text-[10px] font-bold text-muted-foreground pointer-events-none">
          Click map or drag pin to adjust store location
        </div>
        {latitude && longitude && (
          <div className="sm:hidden absolute top-2 right-2 z-[1000] bg-background/90 backdrop-blur px-2 py-0.5 rounded-md border border-border/60 shadow text-[10px] font-mono font-semibold text-muted-foreground pointer-events-none">
            {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );
}

interface ShopFormData {
  name: string;
  category: string;
  description: string;
  welcome_message: string;
  phone: string;
  whatsapp: string;
  address: string;
  logo_url: string;
  banner_url: string;
  opening_time: string;
  closing_time: string;
  latitude: string;
  longitude: string;
  google_review_link: string;
  clone_from_shop_id: string;
}

export function ShopSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { shop, setShop } = useShopStore();
  const { setTitle: setHeaderTitle } = useHeaderStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isCreateNewParam = location.state?.createNew === true || searchParams.get('create') === 'true' || searchParams.get('new') === 'true';
  const [isCreateNew, setIsCreateNew] = useState<boolean>(isCreateNewParam);
  const [viewMode, setViewMode] = useState<'summary' | 'edit'>(isCreateNewParam ? 'edit' : 'edit');
  const [ownedShops, setOwnedShops] = useState<{ id: string; name: string }[]>([]);
  const isAdditionalShop = ownedShops.length > 0;
  const { canRead } = usePermissions('settings');

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10));
    date.setMinutes(parseInt(m, 10));
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };
  
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    category: 'restaurants_cafes_hotels',
    description: '',
    welcome_message: '',
    phone: '',
    whatsapp: '',
    address: '',
    logo_url: '',
    banner_url: '',
    opening_time: '',
    closing_time: '',
    latitude: '',
    longitude: '',
    google_review_link: '',
    clone_from_shop_id: '',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Sync isCreateNew when navigation changes
  useEffect(() => {
    if (isCreateNewParam) {
      setIsCreateNew(true);
      setViewMode('edit');
    }
  }, [isCreateNewParam]);

  // Always fetch owned shops to know if user owns any shop
  useEffect(() => {
    const fetchOwned = async () => {
      try {
        const res = await api.get('/shops/my-shops');
        setOwnedShops(res.data.owned || []);
      } catch (err) {
        console.error("Failed to fetch owned shops", err);
      }
    };
    fetchOwned();
  }, []);

  useEffect(() => {
    if (isCreateNew) {
      setHeaderTitle(ownedShops.length > 0 ? 'Create New Branch' : 'Create New Shop', 'Set up business profile');
    } else {
      setHeaderTitle('Shop Setup', 'Manage shop profile');
    }
  }, [setHeaderTitle, isCreateNew, ownedShops.length]);

  useEffect(() => {
    if (isCreateNew) {
      setFormData({
        name: '',
        category: 'restaurants_cafes_hotels',
        description: '',
        welcome_message: '',
        phone: '',
        whatsapp: '',
        address: '',
        logo_url: '',
        banner_url: '',
        opening_time: '',
        closing_time: '',
        latitude: '',
        longitude: '',
        google_review_link: '',
        clone_from_shop_id: '',
      });
      setViewMode('edit');
      return;
    }

    const fetchShop = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shops/me');
        if (res.data && res.data.id) {
          setShop(res.data);
          const loadedShop = res.data;
          setFormData({
            name: loadedShop.name || '',
            category: loadedShop.category || 'restaurants_cafes_hotels',
            description: loadedShop.description || '',
            welcome_message: loadedShop.welcome_message || '',
            phone: loadedShop.phone || '',
            whatsapp: loadedShop.whatsapp || '',
            address: loadedShop.address || '',
            logo_url: loadedShop.logo_url || '',
            banner_url: loadedShop.banner_url || '',
            opening_time: loadedShop.opening_time || '',
            closing_time: loadedShop.closing_time || '',
            latitude: loadedShop.latitude?.toString() || '',
            longitude: loadedShop.longitude?.toString() || '',
            google_review_link: loadedShop.google_review_link || '',
            clone_from_shop_id: '',
          });
          setViewMode('summary');
        }
      } catch (error) {
        console.error('Failed to load shop details', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShop();
  }, [setShop, isCreateNew]);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
 const { name, value } = e.target;
 setFormData(prev => ({ ...prev, [name]: value }));
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo'| 'banner') => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 5 * 1024 * 1024) {
 toast.error('File size must be less than 5MB');
 return;
 }

 const setUploading = type === 'logo'? setIsUploadingLogo : setIsUploadingBanner;
 setUploading(true);

 try {
 const compressedFile = await compressImage(file);
 const formDataObj = new FormData();
 formDataObj.append('file', compressedFile);
 formDataObj.append('folder', type === 'logo'? 'logos': 'banners');

 const res = await api.post('/upload/image', formDataObj, {
 headers: { 'Content-Type': 'multipart/form-data'}
 });

 const newUrl = res.data.url;
 setFormData(prev => ({ ...prev, [`${type}_url`]: newUrl }));
 
 if (shop?.id && !isCreateNew) {
 const updateRes = await api.put('/shops/me', { [`${type}_url`]: newUrl });
 setShop(updateRes.data);
 }
 
 toast.success(`${type === 'logo'? 'Logo': 'Banner'} uploaded successfully!`);
 } catch (error) {
 toast.error(`Failed to upload ${type}`);
 console.error(error);
 } finally {
 setUploading(false);
 }
 };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep === 1 && !formData.name) {
      toast.error('Shop name is required');
      return;
    }

    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSaveShop = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isCreateNew && !user?.phone_verified) {
      toast.error('Mobile number verification required before creating a shop');
      navigate('/verify-phone', { state: { from: location } });
      return;
    }

    if (!formData.name) {
      toast.error('Shop name is required');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = { ...formData };
      payload.latitude = payload.latitude ? parseFloat(payload.latitude) : null;
      payload.longitude = payload.longitude ? parseFloat(payload.longitude) : null;
      if (!payload.clone_from_shop_id) {
        delete payload.clone_from_shop_id;
      }

      let res;
      if (shop?.id && !isCreateNew) {
        res = await api.put('/shops/me', payload);
        publicCache.clear();
        toast.success('Shop profile updated successfully!');
        setShop(res.data);
        useAuthStore.getState().fetchUser();
        setViewMode('summary');
      } else {
        // Only additional shops require ₹50 one-time payment; first shop is 100% free
        if (isAdditionalShop) {
          try {
            const orderRes = await api.post('/shops/additional-shop-order');
            const orderData = orderRes.data;

            if (orderData.required) {
              if (orderData.mock_mode) {
                payload.razorpay_order_id = orderData.order_id;
                payload.razorpay_payment_id = `pay_mock_${Date.now()}`;
                payload.razorpay_signature = 'sig_mock_verified';
              } else {
                const loadRzp = (): Promise<boolean> => {
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

                const isLoaded = await loadRzp();
                if (!isLoaded) {
                  toast.error('Razorpay SDK failed to load. Please check your connection.');
                  setIsLoading(false);
                  return;
                }

                const paymentPromise = new Promise<{ order_id: string; payment_id: string; signature: string }>((resolve, reject) => {
                  const options = {
                    key: orderData.key_id,
                    amount: Math.round(orderData.amount * 100),
                    currency: orderData.currency || 'INR',
                    name: 'Menukit QR',
                    description: `Additional Branch Setup (₹${orderData.amount})`,
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
                      ondismiss: () => reject(new Error('Payment window closed')),
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
          } catch (err: any) {
            console.error('Payment initiation error', err);
            toast.error(err.message || 'Payment processing failed');
            setIsLoading(false);
            return;
          }
        }

        res = await api.post('/shops', payload);
        publicCache.clear();
        localStorage.setItem('current_shop_id', res.data.id);
        toast.success(ownedShops.length > 0 ? '🎉 New branch created successfully!' : '🎉 Shop created successfully!');
        setShop(res.data);
        useAuthStore.getState().fetchUser();
        window.location.href = '/dashboard';
        return;
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const errMsg = typeof detail === 'string' 
        ? detail 
        : (Array.isArray(detail) && detail[0]?.msg ? `${detail[0].loc?.[detail[0].loc.length - 1] || ''}: ${detail[0].msg}` : 'Failed to save shop details');
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreateNew && currentStep < 3) {
      handleNext();
      return;
    }

    await handleSaveShop(e);
  };

  const steps = [
    { num: 1, title: 'Basic Info', icon: <Store size={18} /> },
    { num: 2, title: 'Contact', icon: <Phone size={18} /> },
    { num: 3, title: 'Branding', icon: <UploadCloud size={18} /> },
  ];

  if (!isCreateNew && shop?.id && !canRead) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-[400px]">
        <AccessDenied />
        {ownedShops.length === 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              You are assigned to this hotel as staff, but you can create your own shop.
            </p>
            <Button
              onClick={() => {
                setIsCreateNew(true);
                setViewMode('edit');
              }}
              className="gap-2"
            >
              <Store size={16} /> Create My Own Shop
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full animate-fade-in pb-12">
      {viewMode === 'summary' && (
        <HeaderActions>
          <Button 
            onClick={() => setViewMode('edit')} 
            size="sm"
            className="gap-1.5 text-xs h-8 px-3 rounded-md font-semibold cursor-pointer shadow-2xs"
          >
            <Edit2 size={13} />
            <span>Edit Profile</span>
          </Button>
        </HeaderActions>
      )}

      {viewMode === 'summary' ? (
        <div className="bg-card border border-border/80 rounded-lg shadow-2xs overflow-hidden">
          {/* Banner */}
          <div className="h-36 sm:h-44 w-full bg-muted relative">
            {shop?.banner_url ? (
              <img src={shop.banner_url} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/40">
                <Store size={40} className="opacity-20" />
              </div>
            )}
            <div className="absolute -bottom-8 left-5 sm:left-6 p-1 bg-card rounded-lg shadow-2xs">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-muted border border-border/80">
                {shop?.logo_url ? (
                  <img src={shop.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Store size={28} />
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-12 pb-5 px-5 sm:px-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">{shop?.name}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBusinessCategory(shop?.category).badgeColor}`}>
                  {getBusinessCategory(shop?.category).label}
                </span>
              </div>
              <Button 
                onClick={() => setViewMode('edit')} 
                size="sm" 
                variant="outline" 
                className="gap-1.5 text-xs h-8 px-3 shrink-0 rounded-md font-semibold border-border shadow-2xs cursor-pointer"
              >
                <Edit2 size={13} /> Edit Shop
              </Button>
            </div>

            {shop?.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{shop.description}</p>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-muted/40 border border-border/60 text-xs">
                <MapPin className="text-primary shrink-0 mt-0.5" size={15} />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Address</span>
                  <span className="text-foreground font-medium">{shop?.address || 'No address set'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-md bg-muted/40 border border-border/60 text-xs">
                <Phone className="text-primary shrink-0" size={15} />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Phone</span>
                  <span className="text-foreground font-medium">{shop?.phone || 'No phone set'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-md bg-muted/40 border border-border/60 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-center w-[15px]">W</span>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">WhatsApp</span>
                  <span className="text-foreground font-medium">{shop?.whatsapp || 'No WhatsApp set'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-md bg-muted/40 border border-border/60 text-xs">
                <Clock className="text-primary shrink-0" size={15} />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Operating Hours</span>
                  <span className="text-foreground font-medium">
                    {shop?.opening_time ? formatTime(shop.opening_time) : '--:--'} to {shop?.closing_time ? formatTime(shop.closing_time) : '--:--'}
                  </span>
                </div>
              </div>
            </div>
            
            {shop?.welcome_message && (
              <div className="p-3 bg-muted/30 rounded-md text-xs italic text-muted-foreground border border-border/60">
                "{shop.welcome_message}"
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Boxy 3-Step Navigation Switcher */}
          <div className="p-1 bg-card rounded-lg border border-border/80 shadow-2xs grid grid-cols-3 gap-1">
            {steps.map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (step.num < currentStep || (step.num > currentStep && formData.name)) {
                      setCurrentStep(step.num);
                    }
                  }}
                  className={cn(
                    "h-8.5 rounded-md flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-white shadow-2xs"
                      : isPast
                      ? "bg-muted/60 text-foreground hover:bg-muted"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                    isActive
                      ? "bg-white/20 text-white"
                      : isPast
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isPast ? <Check size={11} strokeWidth={3} /> : step.num}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="bg-card border border-border/80 rounded-lg shadow-2xs p-5 sm:p-6 space-y-4">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex justify-between items-center pb-2 border-b border-border/80">
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
                    <p className="text-xs text-muted-foreground">
                      {isCreateNew ? "Set up your new shop's primary details." : "Update your shop's primary details."}
                    </p>
                  </div>

                  {!isCreateNew && (
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        onClick={handleSaveShop} 
                        disabled={isLoading} 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold h-8 px-3 rounded-md text-xs shadow-2xs cursor-pointer"
                      >
                        <Save size={13} /> Save Changes
                      </Button>
                      <Button onClick={() => setViewMode('summary')} variant="outline" size="sm" className="gap-1 h-8 px-3 rounded-md text-xs font-semibold cursor-pointer">
                        <ChevronRight size={14} />
                        View Summary
                      </Button>
                    </div>
                  )}
                </div>

                {((isCreateNew || !shop?.id) && isAdditionalShop) && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Building2 size={14} className="text-orange-500 shrink-0" />
                      <span>Additional Branch Setup Fee: <strong>₹50</strong></span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-500 text-white shadow-2xs">
                      ₹50 One-Time
                    </span>
                  </div>
                )}
                {((isCreateNew || !shop?.id) && !isAdditionalShop) && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      <span>First Shop Setup: <strong>Free Plan Included</strong></span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                      Free
                    </span>
                  </div>
                )}

                {/* Business Category Selection Dropdown */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground">
                    Business / Shop Category <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    options={BUSINESS_CATEGORIES.map((cat) => ({
                      id: cat.id,
                      name: cat.label,
                      badge: cat.shortLabel,
                      subtext: cat.description,
                      icon: getCategoryIcon(cat.id, 14)
                    }))}
                    value={formData.category || 'restaurants_cafes_hotels'}
                    onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                    placeholder="Select business / shop category"
                    showSearch={true}
                    className="h-8.5 rounded-md"
                    minWidth={360}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Adapts item terminology, dietary options, public filters, and thermal printer tickets.
                  </p>
                </div>
                
                {isCreateNew && ownedShops.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-foreground">
                      Clone Existing Menus & Settings
                    </label>
                    <SearchableSelect
                      options={[
                        { id: '', name: 'Start Fresh (Blank Menu)'},
                        ...ownedShops.map((s) => ({ id: s.id, name: `Clone from: ${s.name}` }))
                      ]}
                      value={formData.clone_from_shop_id || ''}
                      onChange={(value) => setFormData((prev) => ({ ...prev, clone_from_shop_id: value }))}
                      placeholder="Start Fresh (Blank Menu)"
                      showSearch={false}
                      className="h-8.5 rounded-md"
                    />
                    <p className="text-[11px] text-muted-foreground">Duplicates all categories, menu items, and discounts to this new branch.</p>
                  </div>
                )}

                <Input
                  label="Shop Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={formData.category === 'fireworks_crackers' ? "e.g. Standard Fireworks Store" : "e.g. Siva Hotel & Cafe"}
                  required
                />
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="A short description about your shop..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[75px] resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Welcome Message</label>
                  <textarea
                    name="welcome_message"
                    value={formData.welcome_message}
                    onChange={handleChange}
                    placeholder="Message displayed to customers when opening menu..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[60px] resize-y"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Contact & Location */}
            {currentStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="pb-2 border-b border-border/80">
                  <h3 className="text-sm font-bold text-foreground">Contact & Location</h3>
                  <p className="text-xs text-muted-foreground">Configure your customer support channels and physical store address.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                  />
                  <Input
                    label="WhatsApp Number"
                    name="whatsapp"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TimePicker
                    value={formData.opening_time}
                    onChange={(t) => setFormData(prev => ({ ...prev, opening_time: t }))}
                    label="Opening Time"
                  />
                  <TimePicker
                    value={formData.closing_time}
                    onChange={(t) => setFormData(prev => ({ ...prev, closing_time: t }))}
                    label="Closing Time"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Full Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your store address..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[65px] resize-y"
                  />
                </div>

                {/* Map Location Selector */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Navigation size={13} className="text-primary" /> Map Pin Location
                  </label>
                  <MapLocationSelector
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                  />
                </div>

                {/* Google Review Link */}
                <Input
                  label="Google Review Link (Optional)"
                  name="google_review_link"
                  value={formData.google_review_link}
                  onChange={handleChange}
                  placeholder="https://g.page/r/..."
                />
              </div>
            )}

            {/* Step 3: Branding */}
            {currentStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="pb-2 border-b border-border/80">
                  <h3 className="text-sm font-bold text-foreground">Media & Branding</h3>
                  <p className="text-xs text-muted-foreground">Upload your store logo and banner to personalize your digital menu.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-start gap-1.5">
                    <label className="text-xs font-bold text-foreground">Store Logo</label>
                    <div 
                      className="w-28 h-28 rounded-lg border-2 border-dashed border-border/80 flex items-center justify-center bg-muted/30 overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-colors shadow-2xs"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {formData.logo_url ? (
                        <>
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <UploadCloud className="text-white" size={20} />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-semibold text-muted-foreground block">Upload Logo</span>
                        </div>
                      )}
                      {isUploadingLogo && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo')} 
                    />
                  </div>

                  {/* Banner Upload */}
                  <div className="flex-1 flex flex-col items-start gap-1.5">
                    <label className="text-xs font-bold text-foreground">Store Banner</label>
                    <div 
                      className="w-full h-28 rounded-lg border-2 border-dashed border-border/80 flex items-center justify-center bg-muted/30 overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-colors shadow-2xs"
                      onClick={() => bannerInputRef.current?.click()}
                    >
                      {formData.banner_url ? (
                        <>
                          <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <UploadCloud className="text-white" size={20} />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-semibold text-muted-foreground block">Upload Banner Image (1200x400 rec.)</span>
                        </div>
                      )}
                      {isUploadingBanner && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                        </div>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={bannerInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'banner')} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stepper Action Buttons */}
            <div className="pt-4 border-t border-border/80 flex justify-between items-center">
              {currentStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleBack}
                  size="sm"
                  className="rounded-md font-bold h-8.5 px-3 text-xs cursor-pointer"
                >
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                {!isCreateNew && (
                  <Button 
                    type="button" 
                    onClick={handleSaveShop} 
                    disabled={isLoading} 
                    size="sm" 
                    className="rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8.5 px-3 text-xs shadow-2xs cursor-pointer"
                  >
                    <Save size={13} /> Save Changes
                  </Button>
                )}
                {currentStep < 3 ? (
                  <Button 
                    type="button" 
                    onClick={handleNext}
                    size="sm"
                    className="rounded-md font-bold h-8.5 px-3 text-xs shadow-2xs cursor-pointer"
                  >
                    Next Step <ChevronRight size={14} className="ml-1" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    size="sm" 
                    className="rounded-md font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-8.5 px-4 text-xs shadow-2xs cursor-pointer"
                  >
                    {isLoading 
                      ? (isCreateNew || !shop?.id ? 'Processing Setup...' : 'Saving Shop...') 
                      : (isCreateNew || !shop?.id ? (isAdditionalShop ? 'Pay ₹50 & Create Branch' : 'Create Free Shop Profile') : 'Save Shop Profile')} <Save size={14} className="ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
