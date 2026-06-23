import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import {
  QrCode, MapPin, Star, ArrowRight,
  Navigation, Tag, X, Search, Store, Gift, Phone, Clock, ExternalLink, Flame, Crown, Sparkles
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '@/services/api';
import { PublicShopListing } from '@/types';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';

const BrandFooter = ({ mode }: { mode: 'landing' | 'scanner' | 'map' }) => {
  if (mode === 'map') {
    return (
      <div style={{
        background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e2e8f0', padding: '6px 16px', zIndex: 50,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, flexShrink: 0
      }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Powered by</span>
        <a href="https://menukit.debuggers.co.in/landing" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          Menukit
          <ExternalLink size={10} color="#f97316" />
        </a>
      </div>
    );
  }

  if (mode === 'landing') {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2.5 px-5 py-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:bg-white/80 transition-colors">
          <a href="https://menukit.debuggers.co.in/landing" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[15px] font-black no-underline hover:opacity-80 transition-opacity">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Menukit</span>
            <ExternalLink size={14} className="text-orange-500" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, zIndex: 40
    }}>
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', fontWeight: 500 }}>Powered by</span>
      <a href="https://menukit.debuggers.co.in/landing" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
        Menukit
        <ExternalLink size={10} color="#f97316" />
      </a>
    </div>
  );
};


// ─── Fix Leaflet default marker icons (Vite doesn't bundle them automatically) ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Custom shop pin icon factory ────────────────────────────────────────────
function makeShopIcon(hasDeals: boolean) {
  const color = hasDeals ? '#f97316' : '#64748b';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.2 0 0 7.2 0 16C0 26.4 16 40 16 40S32 26.4 32 16C32 7.2 24.8 0 16 0Z" fill="${color}" />
      <circle cx="16" cy="16" r="9" fill="white"/>
      <text x="16" y="20" text-anchor="middle" font-size="11" fill="${color}" font-family="system-ui">🍽</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -44],
    className: '',
  });
}

// ─── Helper: fly map to position ─────────────────────────────────────────────
function FlyTo({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!position || !Array.isArray(position) || position.length !== 2) return;
    const lat = Number(position[0]);
    const lng = Number(position[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.flyTo([lat, lng], zoom, { duration: 1 });
      } else {
        map.setView([lat, lng], zoom);
      }
    }
  }, [position, zoom, map]);
  return null;
}

// ─── Helper: invalidate size when layout changes ─────────────────────────────
function MapSizeHandler({ isExpanded }: { isExpanded: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200); // 200ms allows CSS transitions/layouts to settle
    return () => clearTimeout(timer);
  }, [isExpanded, map]);
  
  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);
  return null;
}

// ─── Helper: haversine distance (km) ─────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Star rating display ──────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={11}
          className={
            i <= Math.round(rating)
              ? 'text-amber-400 fill-amber-400'
              : 'text-slate-200 fill-slate-200'
          }
        />
      ))}
    </div>
  );
}

// ─── Shop Marker Component (Auto-opens popup when selected) ────────────────────
function ShopMarker({
  shop,
  isSelected,
  onSelect
}: {
  shop: PublicShopListing;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isSelected && markerRef.current) {
      // Small timeout ensures the flyTo animation has started so the popup stays in view
      setTimeout(() => markerRef.current?.openPopup(), 150);
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[shop.latitude!, shop.longitude!]}
      icon={makeShopIcon(shop.active_discounts_count > 0)}
      eventHandlers={{ click: onSelect }}
    >
      <Popup>
        <div style={{ minWidth: 180, fontFamily: 'system-ui' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {shop.logo_url
              ? <img src={shop.logo_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
              : <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><Store size={18} /></div>
            }
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{shop.name}</div>
              {shop.average_rating && (
                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Star size={11} className="fill-amber-400 text-amber-400" /> {shop.average_rating} ({shop.total_reviews} reviews)
                </div>
              )}
            </div>
          </div>
          {shop.best_discount_label && (
            <div style={{
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 6, padding: '4px 8px', marginBottom: 8,
              fontSize: 12, color: '#ea580c', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4
            }}>
              <Gift size={12} /> {shop.best_discount_label}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            {shop.show_menus_in_discovery !== false && (
              <button
                onClick={() => navigate(`/shop/${shop.id}`)}
                style={{
                  flex: 1, padding: '8px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg,#f97316,#ea580c)',
                  color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                View Menu
              </button>
            )}
            <button
              onClick={() => {
                // We will dispatch a custom event or set a global state if we refactor,
                // but since ShopMarker is a subcomponent, let's pass a callback or just
                // dispatch a custom event to the parent.
                window.dispatchEvent(new CustomEvent('open-shop-info', { detail: shop.id }));
              }}
              style={{
                flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0',
                background: 'white', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              Shop Info
            </button>
          </div>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '6px', borderRadius: 8, border: 'none',
              background: '#f1f5f9', color: '#3b82f6', fontWeight: 600, fontSize: 12,
              textDecoration: 'none'
            }}
          >
            <Navigation size={12} /> Directions
          </a>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Mode = 'landing' | 'scanner' | 'map';
type SortMode = 'deals' | 'rating' | 'nearest';

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

export function StoreDiscoveryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mode: Mode = location.pathname.endsWith('/scan') ? 'scanner' : location.pathname.endsWith('/stores') ? 'map' : 'landing';

  // ── Shops state ──────────────────────────────────────────────────────────
  const [shops, setShops] = useState<PublicShopListing[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(false);
  const [isLoadingMoreShops, setIsLoadingMoreShops] = useState(false);
  const [shopsOffset, setShopsOffset] = useState(0);
  const [hasMoreShops, setHasMoreShops] = useState(true);
  const SHOPS_LIMIT = 20;

  const [sortMode, setSortMode] = useState<SortMode>('deals');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<PublicShopListing | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapTarget, setMapTarget] = useState<{ pos: [number, number]; zoom: number }>({
    pos: INDIA_CENTER,
    zoom: 5,
  });
  const [pendingNearestFly, setPendingNearestFly] = useState(false);

  // ── Modals state ──────────────────────────────────────────────────────────
  const [infoShopId, setInfoShopId] = useState<string | null>(null);
  const [infoShopData, setInfoShopData] = useState<any>(null);
  const [offersShopId, setOffersShopId] = useState<string | null>(null);
  const [offersData, setOffersData] = useState<any[]>([]);

  // ── Mobile Map state ──────────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleOpenShopInfo = (e: any) => {
      setInfoShopId(e.detail);
    };
    window.addEventListener('open-shop-info', handleOpenShopInfo);
    return () => window.removeEventListener('open-shop-info', handleOpenShopInfo);
  }, []);

  useEffect(() => {
    if (infoShopId) {
      setInfoShopData(null);
      api.get(`/public/shop/${infoShopId}`).then(res => setInfoShopData(res.data)).catch(() => { });
    }
  }, [infoShopId]);

  useEffect(() => {
    if (offersShopId) {
      setOffersData([]);
      api.get(`/public/shop/${offersShopId}/discounts`).then(res => setOffersData(res.data)).catch(() => { });
    }
  }, [offersShopId]);

  // ── Scanner state ─────────────────────────────────────────────────────────
  const [scanError, setScanError] = useState('');
    const [isScanningImage, setIsScanningImage] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ── Load shops ────────────────────────────────────────────────────────────
  const loadShops = useCallback(async (currentOffset: number = 0, append = false) => {
    if (append) setIsLoadingMoreShops(true);
    else setIsLoadingShops(true);
    
    try {
      const res = await api.get(`/public/shops?limit=${SHOPS_LIMIT}&offset=${currentOffset}`);
      const data = res.data || [];
      
      if (data.length < SHOPS_LIMIT) {
        setHasMoreShops(false);
      } else {
        setHasMoreShops(true);
      }

      if (append) {
        setShops(prev => {
          const newShops = [...prev];
          data.forEach((shop: any) => {
            if (!newShops.find(s => s.id === shop.id)) {
              newShops.push(shop);
            }
          });
          return newShops;
        });
      } else {
        setShops(data);
      }
    } catch {
      /* silently ignore */
    } finally {
      if (append) setIsLoadingMoreShops(false);
      else setIsLoadingShops(false);
    }
  }, []);

  const handleLoadMoreShops = () => {
    const newOffset = shopsOffset + SHOPS_LIMIT;
    setShopsOffset(newOffset);
    loadShops(newOffset, true);
  };

  // ── Geolocation ───────────────────────────────────────────────────────────
  const getUserLocation = useCallback((flyToUser: boolean = true) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserLocation(loc);
      if (flyToUser) {
        setMapTarget({ pos: loc, zoom: 13 });
      }
    });
  }, []);

  // ── Handle Scanned QR Code ─────────────────────────────────────────────────
  const handleScanResult = useCallback((text: string) => {
    const match = text.match(/\/shop\/([a-f0-9-]{36})/);
    if (match) {
      if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} }
      navigate(`/shop/${match[1]}`);
    } else if (text.startsWith('http')) {
      if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} }
      window.location.href = text;
    } else {
      setScanError(`Not a MenuKit QR — scanned: ${text.substring(0, 50)}`);
    }
  }, [navigate]);

  // ── Upload from gallery ────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setScanError('');
      setIsScanningImage(true);
      try {
        const fileScanner = new Html5Qrcode('file-scan-div');
        const text = await fileScanner.scanFile(file, false);
        fileScanner.clear();
        handleScanResult(text);
      } catch (err: any) {
        console.error("File scan error:", err);
        setScanError('Could not detect a valid MenuKit QR code in this image.');
      } finally {
        setIsScanningImage(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Start/stop QR scanner ──────────────────────────────────────────────────
  const startScanner = useCallback(async () => {
    setScanError('');
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { }
      scannerRef.current = null;
    }
    const scanner = new Html5Qrcode('qr-reader-div');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10 },
        handleScanResult,
        () => { }
      );
    } catch (err: any) {
      setScanError(err?.message || 'Camera access denied. Please allow camera permissions.');
    }
  }, [handleScanResult]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { }
      scannerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (mode === 'scanner') {
      const t = setTimeout(startScanner, 300);
      return () => { clearTimeout(t); stopScanner(); };
    }
    if (mode === 'map') {
      loadShops();
      getUserLocation(true);
    }
    return () => { stopScanner(); };
  }, [mode]);

  // ── Fly to nearest ────────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingNearestFly && userLocation && shops.length > 0) {
      let nearestShop: PublicShopListing | null = null;
      let minDistance = 9999;
      for (const s of shops) {
        if (s.latitude && s.longitude) {
          const d = haversineKm(userLocation[0], userLocation[1], s.latitude, s.longitude);
          if (d < minDistance) {
            minDistance = d;
            nearestShop = s;
          }
        }
      }
      if (nearestShop) {
        setMapTarget({ pos: [nearestShop.latitude!, nearestShop.longitude!], zoom: 15 });
        setSelectedShop(nearestShop);
      } else {
        setMapTarget({ pos: userLocation, zoom: 13 });
      }
      setPendingNearestFly(false);
    }
  }, [pendingNearestFly, userLocation, shops]);

  // ── Sorted & filtered list ────────────────────────────────────────────────
  const filteredShops = shops
    .filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortMode === 'deals')
        return (b.active_discounts_count - a.active_discounts_count)
          || ((b.average_rating ?? 0) - (a.average_rating ?? 0));
      if (sortMode === 'rating')
        return (b.average_rating ?? 0) - (a.average_rating ?? 0);
      if (sortMode === 'nearest' && userLocation) {
        const da = a.latitude && a.longitude
          ? haversineKm(userLocation[0], userLocation[1], a.latitude, a.longitude) : 9999;
        const db = b.latitude && b.longitude
          ? haversineKm(userLocation[0], userLocation[1], b.latitude, b.longitude) : 9999;
        return da - db;
      }
      return 0;
    });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. LANDING
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === 'landing') {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center py-10 pb-28 px-5 relative overflow-y-auto overflow-x-hidden font-sans">
        {/* Radial glow blobs for light theme */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 20% -10%, rgba(249,115,22,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 110%, rgba(124,58,237,0.1) 0%, transparent 50%)',
        }} />

        {/* Intro Animations container */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md flex flex-col items-center relative z-10 my-auto"
        >
          {/* Logo and Brand Name */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/menukit-logo.svg"
              alt="MenuKit Logo"
              className="w-24 h-24 object-contain drop-shadow-[0_8px_24px_rgba(249,115,22,0.25)] relative z-10"
              onError={(e) => { e.currentTarget.src = '/menukit.png'; }}
            />
            <h1 className="text-[40px] md:text-[48px] font-black text-slate-900 tracking-tight text-center leading-none -mt-4 relative z-0">
              Menu<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Kit</span>
            </h1>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center leading-[1.1] mb-3 tracking-tight">
            Find Your Perfect{' '}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
              Dining Spot
            </span>
          </h2>
          <p className="text-slate-500 text-center text-[13px] sm:text-[15px] mb-8 max-w-[300px] leading-snug">
            Discover restaurants near you with the best deals, offers, and reviews — completely free.
          </p>

          {/* Action Cards */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            className="w-full flex flex-col gap-3 mb-8 relative z-10 px-2"
          >
            {/* Discover Shops (Primary) */}
            <button
              id="btn-choose-store"
              onClick={() => navigate('/discover/stores')}
              className="group relative w-full overflow-hidden flex flex-col items-start gap-3 p-5 sm:p-6 rounded-[28px] border-none cursor-pointer bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_16px_40px_-10px_rgba(249,115,22,0.4)] hover:shadow-[0_24px_60px_-10px_rgba(249,115,22,0.5)] hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] text-left"
            >
              {/* Decorative Map Pattern inside the card */}
              <div className="absolute top-0 right-0 bottom-0 w-2/3 pointer-events-none opacity-[0.15]" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '20px 20px',
                WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
                maskImage: 'linear-gradient(to left, black, transparent)'
              }} />
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-12 h-12 rounded-[16px] bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/30 mb-0.5">
                <MapPin size={24} className="text-white drop-shadow-sm" />
              </div>
              <div className="relative z-10 flex flex-col items-start w-full pr-10">
                <span className="text-white text-[22px] font-black tracking-tight drop-shadow-sm mb-0.5 leading-tight">Discover Shops</span>
                <span className="text-white/90 text-[13px] font-medium leading-tight">
                  Explore interactive map & filter by the best deals around you
                </span>
              </div>
              
              <div className="absolute right-5 bottom-5 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md group-hover:bg-white/30 transition-colors shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/20">
                <ArrowRight size={20} className="text-white group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Scan QR (Secondary - Glassmorphism) */}
            <button
              id="btn-scan-qr"
              onClick={() => navigate('/discover/scan')}
              className="w-full group relative overflow-hidden flex items-center gap-4 p-4 rounded-[24px] border border-white/60 cursor-pointer bg-white/50 backdrop-blur-xl shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] hover:bg-white/70 hover:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] hover:border-white transition-all duration-300 active:scale-[0.98]"
            >
               {/* Decorative subtle beam */}
               <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-gradient-to-b from-orange-400 to-orange-500 rounded-l-[24px]" />

              <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center shrink-0 shadow-sm ml-1">
                <QrCode size={22} className="text-slate-600 group-hover:text-orange-500 transition-colors" />
              </div>
              <div className="flex flex-col items-start flex-1 text-left">
                <span className="text-slate-800 text-[16px] font-black tracking-tight drop-shadow-sm">Scan QR Code</span>
                <span className="text-slate-500 text-[12px] font-semibold mt-0.5">
                  At a restaurant? Scan to order
                </span>
              </div>
            </button>
          </motion.div>

          {/* Feature pills (Glassmorphism) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-wrap gap-2 justify-center max-w-[320px]"
          >
            {[
              { icon: <Store size={13} className="text-purple-500" />, text: 'Shop Menus' },
              { icon: <Tag size={13} className="text-orange-500" />, text: 'Best Discounts' },
              { icon: <Star size={13} className="text-amber-400 fill-amber-400" />, text: 'Top Rated' },
              { icon: <Navigation size={13} className="text-blue-500" />, text: 'Nearby Stores' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 backdrop-blur-lg border border-white/80 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-slate-700 text-[11px] font-bold hover:shadow-md hover:bg-white/80 transition-all cursor-default">
                {f.icon} {f.text}
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. QR SCANNER
  // ════════════════════════════════════════════════════════════════════════════
  if (mode === 'scanner') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif", zIndex: 100
      }}>
        {/* Camera feed as full background */}
        <div
          id="qr-reader-div"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        />
        <div id="file-scan-div" style={{ display: 'none' }} />

        {/* SVG Overlay for darkened background with transparent cutout */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' }}
          preserveAspectRatio="none"
        >
          <defs>
            <mask id="cutout-mask">
              <rect width="100%" height="100%" fill="white" />
              {/* The cutout: rx/ry controls corner rounding. x/y and width/height define the box */}
              <rect x="50%" y="40%" width="300" height="300" rx="24" ry="24" fill="black" transform="translate(-150, -150)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.6)" mask="url(#cutout-mask)" />
        </svg>

        {/* Overlay Content */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 20,
          display: 'flex', flexDirection: 'column', pointerEvents: 'none',
        }}>
          {/* Top Header */}
          <div style={{
            width: '100%', padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            pointerEvents: 'auto'
          }}>
            <button
              onClick={() => navigate('/discover')}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', background: 'transparent', border: 'none'
              }}
            >
              <X size={26} />
            </button>
          </div>

          {/* Corner brackets matching the cutout */}
          <div style={{
            position: 'absolute', top: '40%', left: '50%',
            width: 300, height: 300, transform: 'translate(-50%, -50%)',
            pointerEvents: 'none'
          }}>
            {/* Top-Left */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTop: '4px solid #f97316', borderLeft: '4px solid #f97316', borderTopLeftRadius: 24 }} />
            {/* Top-Right */}
            <div style={{ position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTop: '4px solid #f97316', borderRight: '4px solid #f97316', borderTopRightRadius: 24 }} />
            {/* Bottom-Left */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottom: '4px solid #f97316', borderLeft: '4px solid #f97316', borderBottomLeftRadius: 24 }} />
            {/* Bottom-Right */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottom: '4px solid #f97316', borderRight: '4px solid #f97316', borderBottomRightRadius: 24 }} />
          </div>

          {/* Upload Button */}
          <div style={{
            position: 'absolute', top: 'calc(40% + 180px)', left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'auto'
          }}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImageUpload}
            />
            <button 
              onClick={() => !isScanningImage && fileInputRef.current?.click()}
              style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              background: '#f8f9fa', color: '#3c4043', border: 'none', borderRadius: 24,
              fontSize: '14px', fontWeight: 500, cursor: isScanningImage ? 'not-allowed' : 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              opacity: isScanningImage ? 0.8 : 1
            }}>
              {isScanningImage ? (
                <div style={{ width: 14, height: 14, border: '2px solid #3c4043', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <span style={{ border: '1.5px solid #3c4043', borderRadius: 4, width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ width: 6, height: 6, background: '#3c4043', borderRadius: '50%' }}></span>
                </span>
              )}
              {isScanningImage ? 'Scanning image...' : 'Upload from gallery'}
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Bottom Sheet */}
          <div style={{
            width: '100%', padding: '24px 20px 36px',
            background: 'rgba(255, 255, 255, 0.95)', borderTopLeftRadius: 32, borderTopRightRadius: 32,
            boxShadow: '0 -8px 30px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            pointerEvents: 'auto', backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: 40, height: 5, background: 'rgba(0,0,0,0.15)', borderRadius: 4, marginBottom: 24 }} />
            
            {scanError && (
              <div style={{
                marginBottom: 16, background: '#fee2e2',
                border: '1px solid #fecaca', borderRadius: 12,
                padding: '10px 18px', color: '#dc2626', fontSize: '.85rem',
                maxWidth: 320, textAlign: 'center'
              }}>
                {scanError}
              </div>
            )}
            
            <h3 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Scan any MenuKit QR code</h3>
            <p style={{ color: '#64748b', fontSize: '.9rem', margin: 0, fontWeight: 500 }}>
              to view menu
            </p>
          </div>
        </div>

        <style>{`
          #qr-reader-div {
            border: none !important;
          }
          #qr-reader-div > div {
            width: 100% !important;
            height: 100% !important;
          }
          #qr-reader-div video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
          }
        `}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. MAP BROWSER  (OpenStreetMap + react-leaflet — 100% free)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', system-ui, sans-serif", background: '#f8fafc',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', zIndex: 30, flexShrink: 0,
      }}>
        <button
          onClick={() => navigate('/discover')}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: '#f1f5f9', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <X size={18} color="#475569" />
        </button>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search restaurants…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', height: 38, paddingLeft: 32, paddingRight: 12,
              borderRadius: 10, border: 'none', background: '#f1f5f9',
              fontSize: '.875rem', fontWeight: 500, color: '#334155',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Locate me */}
        <button
          onClick={() => getUserLocation(true)}
          title="Use my location"
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: '#fff7ed', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Navigation size={16} color="#f97316" />
        </button>
      </div>

      {/* ── Main split: Map + List ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
        {/* Leaflet Map */}
        <AnimatePresence>
          {isMobile && !isMapExpanded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              drag
              dragConstraints={{ left: -window.innerWidth + 140, right: 0, top: -window.innerHeight + 160, bottom: 0 }}
              dragElastic={0.1}
              dragMomentum={false}
              onClick={() => setIsMapExpanded(true)}
              className="fixed bottom-24 right-4 z-[100] w-28 h-32 rounded-xl shadow-2xl overflow-hidden border-2 border-white cursor-pointer"
            >
              <div className="absolute inset-0 z-[1000] bg-transparent" />
              <MapContainer
                center={INDIA_CENTER}
                zoom={5}
                style={{ width: '100%', height: '100%', background: '#f1f5f9' }}
                zoomControl={false}
                scrollWheelZoom={false}
                attributionControl={false}
                dragging={false}
                touchZoom={false}
              >
                <TileLayer 
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                  noWrap={true}
                />
                <MapSizeHandler isExpanded={isMapExpanded} />
                <FlyTo position={mapTarget.pos} zoom={mapTarget.zoom} />
                {userLocation && (
                  <Marker position={userLocation} icon={L.divIcon({ html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.3)"></div>`, iconSize: [14, 14], iconAnchor: [7, 7], className: '' })} />
                )}
                {filteredShops.filter(s => s.latitude && s.longitude).map(shop => (
                  <Marker key={shop.id} position={[shop.latitude!, shop.longitude!]} icon={makeShopIcon(shop.active_discounts_count > 0)} />
                ))}
              </MapContainer>
              <div className="absolute top-2 right-2 z-[1100] bg-white/90 p-1 rounded-full shadow-md">
                <MapPin size={14} color="#f97316" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className={`z-50 md:z-0 md:relative md:h-full md:w-[60%] lg:w-[65%] ${
            isMobile
              ? isMapExpanded
                ? 'fixed inset-0 bg-white flex flex-col'
                : 'hidden'
              : 'relative h-[42%] min-h-[220px]'
          }`}
        >
          {isMobile && isMapExpanded && (
            <div className="absolute top-16 right-4 z-[1000]">
              <button
                onClick={() => setIsMapExpanded(false)}
                className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
              >
                <X size={24} />
              </button>
            </div>
          )}
          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            minZoom={4}
            maxBounds={[[-90, -180], [90, 180]]}
            style={{ width: '100%', height: '100%', background: '#f1f5f9' }}
            zoomControl={true}
            scrollWheelZoom={true}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              noWrap={true}
            />

            <MapSizeHandler isExpanded={isMapExpanded} />

            {/* Fly to target when user clicks a shop or uses locate */}
            <FlyTo position={mapTarget.pos} zoom={mapTarget.zoom} />

            {/* User location marker */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={L.divIcon({
                  html: `<div style="width:14px;height:14px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.3)"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7],
                  className: '',
                })}
              >
                <Popup><div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} color="#3b82f6" /> You are here</div></Popup>
              </Marker>
            )}

            {/* Shop markers */}
            {filteredShops
              .filter(s => s.latitude && s.longitude)
              .map(shop => (
                <ShopMarker
                  key={shop.id}
                  shop={shop}
                  isSelected={selectedShop?.id === shop.id}
                  onSelect={() => {
                    setSelectedShop(shop);
                    setMapTarget({ pos: [shop.latitude!, shop.longitude!], zoom: 15 });
                  }}
                />
              ))}
          </MapContainer>
        </motion.div>

        {/* List Panel */}
        <div className="flex flex-col flex-1 bg-white z-10 overflow-hidden md:w-[40%] lg:w-[35%] md:border-l md:border-slate-200 md:shadow-[-4px_0_20px_rgba(0,0,0,0.05)]">
          {/* Draggable handle (mobile only, visual) */}
          {/* Sort Tabs */}
          <div className="flex items-center gap-2 px-3.5 py-2 shrink-0 bg-white border-b border-slate-100 sticky top-0 z-10">
            {([
              { id: 'deals', label: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Flame size={12} /> Best Deals</div> },
              { id: 'rating', label: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><Star size={12} className={sortMode === 'rating' ? 'fill-white' : 'fill-amber-400'} /> Top Rated</div> },
              { id: 'nearest', label: <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}><MapPin size={12} /> Nearest</div> },
            ] as { id: SortMode; label: React.ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSortMode(tab.id);
                  if (tab.id === 'nearest') {
                    setPendingNearestFly(true);
                    getUserLocation(false);
                  }
                }}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                  fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                  background: sortMode === tab.id ? '#f97316' : '#f8fafc',
                  color: sortMode === tab.id ? 'white' : '#64748b',
                  boxShadow: sortMode === tab.id ? '0 2px 8px rgba(249,115,22,.35)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Count row */}
          <div style={{
            padding: '6px 14px', borderBottom: '1px solid #f8fafc',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 500 }}>
              {isLoadingShops ? 'Loading…'
                : `${filteredShops.length} restaurant${filteredShops.length !== 1 ? 's' : ''}`}
            </span>
            {filteredShops.filter(s => s.active_discounts_count > 0).length > 0 && (
              <span style={{
                fontSize: '.65rem', fontWeight: 800, padding: '2px 8px',
                borderRadius: 100, background: '#fff7ed', color: '#ea580c',
                border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', gap: 4
              }}>
                <Gift size={10} /> {filteredShops.filter(s => s.active_discounts_count > 0).length} with offers
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.65rem', color: '#cbd5e1', fontWeight: 500 }}>
              © OpenStreetMap
            </span>
          </div>

          {/* Shop cards */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoadingShops ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                <div style={{
                  width: 32, height: 32, border: '2px solid #f97316',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin .7s linear infinite', margin: '0 auto 12px',
                }} />
                Finding restaurants…
              </div>
            ) : filteredShops.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: '#94a3b8' }}><Store size={40} /></div>
                <p style={{ color: '#94a3b8', fontSize: '.875rem', fontWeight: 600 }}>
                  No restaurants found
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ marginTop: 8, fontSize: '.75rem', color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              filteredShops.map(shop => {
                const distKm = userLocation && shop.latitude && shop.longitude
                  ? haversineKm(userLocation[0], userLocation[1], shop.latitude, shop.longitude)
                  : null;
                const isSelected = selectedShop?.id === shop.id;

                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      if (shop.latitude && shop.longitude) {
                        setSelectedShop(shop);
                        setMapTarget({ pos: [shop.latitude, shop.longitude], zoom: 15 });
                        setIsMapExpanded(true);
                      } else {
                        alert(`Coordinates not set for ${shop.name}. Ask the shop owner to add their location on the map in Shop Setup!`);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', cursor: 'pointer', transition: 'background .15s',
                      borderBottom: '1px solid #f8fafc',
                      background: isSelected ? '#fff7ed' : 'white',
                      borderLeft: isSelected ? '4px solid #f97316' : '4px solid transparent',
                    }}
                  >
                    {/* Logo */}
                    <div style={{
                      width: 52, height: 52, borderRadius: 14, overflow: 'hidden',
                      background: '#f1f5f9', border: '1px solid #e2e8f0', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      {shop.logo_url
                        ? <img src={shop.logo_url} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <Store size={22} color="#94a3b8" />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                        <span style={{
                          fontWeight: 700, fontSize: '.875rem', color: '#1e293b',
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{shop.name}</span>
                        {shop.active_discounts_count > 0 && (
                          <span
                            onClick={(e) => { e.stopPropagation(); setOffersShopId(shop.id); }}
                            style={{
                              flexShrink: 0, fontSize: '.65rem', fontWeight: 800,
                              padding: '2px 6px', borderRadius: 100,
                              background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa',
                              display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(249,115,22,.15)'
                            }}>
                            <Gift size={9} /> {shop.active_discounts_count} offer{shop.active_discounts_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Best discount */}
                      {shop.best_discount_label && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                          <Tag size={10} color="#f97316" />
                          <span style={{ fontSize: '.7rem', fontWeight: 700, color: '#ea580c' }}>
                            {shop.best_discount_label}
                          </span>
                        </div>
                      )}

                      {/* Rating + distance */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {shop.average_rating ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <StarRating rating={shop.average_rating} />
                            <span style={{ fontSize: '.7rem', fontWeight: 600, color: '#475569' }}>
                              {shop.average_rating} ({shop.total_reviews})
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '.7rem', color: '#cbd5e1' }}>No reviews</span>
                        )}
                        {distKm !== null && (
                          <span style={{ fontSize: '.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Navigation size={9} />
                            {distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`}
                          </span>
                        )}
                      </div>

                      {/* Address */}
                      {shop.address && (
                        <p style={{
                          fontSize: '.68rem', color: '#94a3b8', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          <MapPin size={8} /> {shop.address}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Go button */}
                      {shop.show_menus_in_discovery !== false && (
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/shop/${shop.id}`); }}
                          style={{
                            width: 36, height: 36, borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg,#f97316,#ea580c)',
                            color: 'white', cursor: 'pointer', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(249,115,22,.35)',
                          }}
                        >
                          <ArrowRight size={15} />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setInfoShopId(shop.id); }}
                        style={{
                          width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0',
                          background: 'white',
                          color: '#475569', cursor: 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="Shop Info"
                      >
                        <Store size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {/* Infinite Scroll Pagination */}
            {hasMoreShops && filteredShops.length > 0 && (
              <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                <InfiniteScrollTrigger 
                  onIntersect={handleLoadMoreShops} 
                  isLoading={isLoadingMoreShops} 
                  hasMore={hasMoreShops} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {infoShopId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px'
        }} onClick={() => setInfoShopId(null)}>
          <div style={{
            background: 'white', width: '100%', maxWidth: 400, borderRadius: 24, padding: 20,
            transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Shop Info</h3>
              <button onClick={() => setInfoShopId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#64748b" /></button>
            </div>
            {!infoShopData ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>Loading info...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {infoShopData.logo_url ? <img src={infoShopData.logo_url} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} /> : <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Store size={24} color="#94a3b8" /></div>}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{infoShopData.name}</div>
                    {infoShopData.average_rating && <div style={{ fontSize: '.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}><Star size={12} className="fill-amber-400 text-amber-400" /> {infoShopData.average_rating} ({infoShopData.total_reviews} reviews)</div>}
                  </div>
                </div>
                {infoShopData.description && <div style={{ fontSize: '.875rem', color: '#475569', lineHeight: 1.5 }}>{infoShopData.description}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 12, borderRadius: 12 }}>
                  {infoShopData.address && <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.875rem', color: '#334155' }}><MapPin size={16} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} /> <span>{infoShopData.address}</span></div>}
                  {(infoShopData.opening_time || infoShopData.closing_time) && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.875rem', color: '#334155' }}><Clock size={16} color="#64748b" /> {infoShopData.opening_time} - {infoShopData.closing_time}</div>}
                  {infoShopData.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.875rem', color: '#334155' }}><Phone size={16} color="#64748b" /> {infoShopData.phone}</div>}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  {infoShopData.settings?.show_menus_in_discovery !== false && (
                    <button onClick={() => navigate(`/shop/${infoShopData.id}`)} style={{ flex: 1, padding: '12px', background: '#f97316', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>View Menu</button>
                  )}
                  {infoShopData.latitude && infoShopData.longitude && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${infoShopData.latitude},${infoShopData.longitude}`} target="_blank" rel="noreferrer" style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#3b82f6', textDecoration: 'none', borderRadius: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Navigation size={16} /> Directions
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offers Modal */}
      {offersShopId && (() => {
        const offersShop = shops.find(s => s.id === offersShopId);
        const showMenuInDiscovery = offersShop?.show_menus_in_discovery !== false;
        return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px'
        }} onClick={() => setOffersShopId(null)}>
          <div style={{
            background: 'white', width: '100%', maxWidth: 400, borderRadius: 24, padding: 20, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            transform: 'translateY(0)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={22} color="#f97316" /> Available Offers</h3>
              <button onClick={() => setOffersShopId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#64748b" /></button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {offersData.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>Loading offers...</div>
              ) : (
                offersData.map(disc => (
                  <div
                    key={disc.id}
                    className="relative shrink-0 w-full flex shadow-md rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white group"
                    style={{ border: `1px solid #f9731630` }}
                    onClick={() => { 
                      setOffersShopId(null); 
                      if (showMenuInDiscovery) {
                        navigate(`/shop/${offersShopId}`); 
                      } else {
                        setInfoShopId(offersShopId);
                      }
                    }}
                  >
                    {/* Left Ticket Stub */}
                    <div
                      className="relative w-28 sm:w-32 flex flex-col items-center justify-center text-white p-4 shrink-0"
                      style={{ backgroundColor: '#f97316' }}
                    >
                      {/* Cutouts for ticket effect */}
                      <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border-b border-l border-transparent" style={{ borderColor: `#f9731630` }} />
                      <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full border-t border-l border-transparent" style={{ borderColor: `#f9731630` }} />

                      <div className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md text-center">
                        {disc.discount_type === 'percentage' && `${Number(disc.discount_value)}%`}
                        {disc.discount_type === 'flat' && `₹${Number(disc.discount_value)}`}
                        {disc.discount_type === 'bogo' && 'BOGO'}
                        {disc.discount_type === 'combo' && 'COMBO'}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 opacity-90 text-center">
                        {['percentage', 'flat'].includes(disc.discount_type) && 'Off'}
                        {disc.discount_type === 'bogo' && `Buy ${disc.buy_quantity} Get ${disc.get_quantity}`}
                        {disc.discount_type === 'combo' && `₹${Number(disc.discount_value)}`}
                      </div>
                    </div>

                    {/* Perforated line */}
                    <div className="relative border-l-2 border-dashed border-slate-200 my-4" />

                    {/* Right Ticket Body */}
                    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center relative bg-white overflow-hidden min-w-0 text-left">
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <h3 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight truncate m-0">
                          {disc.title}
                        </h3>
                        <Sparkles size={16} className="shrink-0 animate-pulse text-orange-500" />
                      </div>

                      {disc.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 font-medium m-0">
                          {disc.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 min-w-0">
                        <div className="flex flex-col gap-1 min-w-0 shrink">
                          <div className="flex gap-1.5">
                            {disc.visibility_type === 'members_only' || disc.visibility_type === 'everyone_unlock_members' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm flex items-center gap-1 bg-purple-100 text-purple-700 min-w-0">
                                <Crown size={10} className="shrink-0" />
                                <span className="truncate">Members Only</span>
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm truncate min-w-0"
                                style={{ color: '#f97316', backgroundColor: `#f9731615` }}
                              >
                                Limited Offer
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 mt-1">
                            Applies to: {disc.applies_to === 'all' ? 'All Menu' : disc.applies_to === 'category' ? 'Selected Categories' : 'Selected Items'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-600 transition-colors flex items-center gap-1 shrink-0 whitespace-nowrap">
                          {showMenuInDiscovery ? 'Tap to use' : 'View Info'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {showMenuInDiscovery ? (
              <button onClick={() => { setOffersShopId(null); navigate(`/shop/${offersShopId}`); }} style={{ width: '100%', padding: '14px', background: '#f97316', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>
                Order Now
              </button>
            ) : (
              <button onClick={() => { setOffersShopId(null); setInfoShopId(offersShopId); }} style={{ width: '100%', padding: '14px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', marginTop: 16 }}>
                Shop Info
              </button>
            )}
          </div>
        </div>
        );
      })()}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <BrandFooter mode="map" />
    </div>
  );
}
