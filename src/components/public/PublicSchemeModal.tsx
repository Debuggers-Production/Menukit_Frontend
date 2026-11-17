import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Coins, Gift, CheckCircle2, Clock, Calendar, 
  ArrowRight, Phone, User, MapPin, ShieldCheck, 
  ChevronRight, Award, Trophy, Info, Building2,
  QrCode, CreditCard, ExternalLink, Lock, ChevronLeft,
  Tag, Store, Flame, Wallet, FileText, AlertTriangle, Maximize2, History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'react-hot-toast';
import { 
  schemeService, Scheme, CustomerSchemePass, SchemeMemberCreatePayload, SchemeActivityLog
} from '@/services/schemeService';
import { customerService } from '@/services/customers';
import { DiscountUnlockPopup } from './DiscountUnlockPopup';
import { triggerHaptic, HAPTIC_PATTERNS } from '@/utils/haptic';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Lightbox } from '@/components/ui/Lightbox';
import { cleanAddressDisplay } from '@/utils/address';

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

export const formatPaidDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
];

export const COUNTRY_OPTIONS = [
  { id: 'India', name: 'India', flag: '🇮🇳', code: '+91' },
  { id: 'United Arab Emirates', name: 'United Arab Emirates', flag: '🇦🇪', code: '+971' },
  { id: 'United States', name: 'United States', flag: '🇺🇸', code: '+1' },
  { id: 'United Kingdom', name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { id: 'Singapore', name: 'Singapore', flag: '🇸🇬', code: '+65' },
  { id: 'Malaysia', name: 'Malaysia', flag: '🇲🇾', code: '+60' },
  { id: 'Saudi Arabia', name: 'Saudi Arabia', flag: '🇸🇦', code: '+966' },
  { id: 'Qatar', name: 'Qatar', flag: '🇶🇦', code: '+974' },
  { id: 'Oman', name: 'Oman', flag: '🇴🇲', code: '+968' },
  { id: 'Kuwait', name: 'Kuwait', flag: '🇰🇼', code: '+965' },
  { id: 'Bahrain', name: 'Bahrain', flag: '🇧🇭', code: '+973' },
  { id: 'Sri Lanka', name: 'Sri Lanka', flag: '🇱🇰', code: '+94' },
  { id: 'Australia', name: 'Australia', flag: '🇦🇺', code: '+61' },
  { id: 'Canada', name: 'Canada', flag: '🇨🇦', code: '+1' },
  { id: 'Germany', name: 'Germany', flag: '🇩🇪', code: '+49' },
  { id: 'France', name: 'France', flag: '🇫🇷', code: '+33' },
  { id: 'New Zealand', name: 'New Zealand', flag: '🇳🇿', code: '+64' },
  { id: 'Other', name: 'Other Country', flag: '🌐', code: '' },
];

export const INDIAN_STATES = [
  'Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana',
  'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh',
  'Delhi', 'Punjab', 'Haryana', 'Bihar', 'West Bengal', 'Odisha',
  'Assam', 'Goa', 'Jharkhand', 'Chhattisgarh', 'Uttarakhand', 'Himachal Pradesh',
  'Puducherry', 'Jammu & Kashmir'
];

export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  'Tamil Nadu': [
    'Virudhunagar (Sivakasi)', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli (Trichy)', 
    'Salem', 'Tirunelveli', 'Erode', 'Tiruppur', 'Vellore', 'Thanjavur', 'Dindigul', 
    'Kanchipuram', 'Chengalpattu', 'Cuddalore', 'Dharmapuri', 'Kallakurichi', 'Karur', 
    'Krishnagiri', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris (Ooty)', 
    'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Sivaganga', 'Tenkasi', 
    'Theni', 'Thoothukudi (Tuticorin)', 'Tirupathur', 'Tiruvallur', 'Tiruvannamalai', 
    'Tiruvarur', 'Viluppuram', 'Ariyalur', 'Kanyakumari (Nagercoil)', 'Other / Custom District'
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi / Ernakulam', 'Kozhikode', 'Thrissur', 'Kollam', 
    'Palakkad', 'Kannur', 'Alappuzha', 'Kottayam', 'Malappuram', 'Kasaragod', 
    'Pathanamthitta', 'Idukki', 'Wayanad', 'Other / Custom District'
  ],
  'Karnataka': [
    'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 
    'Belagavi', 'Kalaburagi', 'Ballari', 'Shivamogga', 'Tumakuru', 'Udupi', 'Davanagere', 'Other / Custom District'
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada / NTR', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 
    'Kakinada', 'Anantapur', 'Kadapa', 'Rajahmundry', 'Other / Custom District'
  ],
  'Telangana': [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Rangareddy', 
    'Medchal-Malkajgiri', 'Sangareddy', 'Other / Custom District'
  ],
  'Maharashtra': [
    'Mumbai City', 'Mumbai Suburban', 'Pune', 'Nagpur', 'Thane', 'Nashik', 
    'Chhatrapati Sambhajinagar', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Other / Custom District'
  ],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Other / Custom District'
  ],
  'Delhi': [
    'Central Delhi', 'New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Other / Custom District'
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Noida / Gautam Buddha Nagar', 
    'Ghaziabad', 'Meerut', 'Bareilly', 'Aligarh', 'Other / Custom District'
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bhilwara', 'Other / Custom District'
  ],
  'West Bengal': [
    'Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas', 'Hooghly', 'Darjeeling', 'Siliguri', 'Other / Custom District'
  ]
};

export interface HighlightBenefitsProps {
  highlightText?: string | null;
  compact?: boolean;
  maxInitialLines?: number;
}

export const HighlightBenefitsBox: React.FC<HighlightBenefitsProps> = ({
  highlightText,
  compact = true,
  maxInitialLines = 2,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!highlightText) return null;
  const lines = highlightText.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const hasMore = compact && lines.length > maxInitialLines;
  const displayedLines = hasMore && !isExpanded 
    ? lines.slice(0, maxInitialLines) 
    : lines;

  return (
    <div className="rounded-xl p-2.5 sm:p-3 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/25 space-y-1.5 shadow-2xs transition-all">
      <div className="flex items-center justify-between gap-1.5 border-b border-amber-500/20 pb-1 mb-1">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <Flame size={12} className="text-amber-500 shrink-0 animate-pulse" />
          <span>Scheme Highlights & Benefits</span>
        </span>
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
          {lines.length} {lines.length === 1 ? 'Benefit' : 'Benefits'}
        </span>
      </div>

      <div className={`space-y-1 transition-all ${isExpanded ? 'max-h-40 overflow-y-auto pr-1' : ''}`}>
        {displayedLines.map((line, lIdx) => {
          const colonIdx = line.indexOf(':');
          if (colonIdx > -1) {
            const key = line.slice(0, colonIdx).trim();
            const val = line.slice(colonIdx + 1).trim();
            const isHighlightRow = 
              key.toUpperCase().includes('TOTAL') || 
              key.toUpperCase().includes('BONUS') || 
              key.toUpperCase().includes('BENEFIT') ||
              key.toUpperCase().includes('SAVING');
            return (
              <div 
                key={lIdx} 
                className={`flex items-center justify-between text-xs py-0.5 px-1.5 rounded-md transition-colors ${
                  isHighlightRow 
                    ? 'font-bold bg-amber-500/15 text-amber-900 dark:text-amber-200' 
                    : 'text-muted-foreground'
                }`}
              >
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wide truncate max-w-[65%] font-bold">
                  {key}
                </span>
                <span className="font-mono font-black text-foreground text-[11px] sm:text-xs">
                  {val}
                </span>
              </div>
            );
          }
          return (
            <div key={lIdx} className="flex items-start gap-1.5 text-xs text-foreground font-semibold px-1">
              <span className="text-amber-500 font-bold">•</span>
              <span className="leading-tight text-[11px] sm:text-xs">{line}</span>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="w-full pt-1.5 mt-1 border-t border-amber-500/20 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer transition-colors"
        >
          <span>
            {isExpanded ? 'Show Less ▴' : `+${lines.length - maxInitialLines} More Benefits ▾`}
          </span>
        </button>
      )}
    </div>
  );
};

export const renderHighlightBenefits = (highlightText?: string | null, compact = true, maxInitialLines = 2) => {
  return <HighlightBenefitsBox highlightText={highlightText} compact={compact} maxInitialLines={maxInitialLines} />;
};

interface SchemeCardProps {
  scheme: Scheme;
  idx: number;
  currency: string;
  primaryColor: string;
  isTargetScheme?: boolean;
  onEnroll: (scheme: Scheme) => void;
  onViewRewards: (scheme: Scheme) => void;
  onOpenImage?: (imageUrl: string, title?: string) => void;
}

const SchemeCard: React.FC<SchemeCardProps> = ({
  scheme,
  idx,
  currency,
  primaryColor,
  isTargetScheme = false,
  onEnroll,
  onViewRewards,
  onOpenImage,
}) => {
  const primaryImage = scheme.image_url || scheme.items?.find(it => it.image_url)?.image_url;
  const maturityVal = (scheme.price || 0) * (scheme.term_duration || 0);
  const highlightLines = (scheme.highlight_text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <motion.div
      id={`scheme-card-${scheme.id}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -6, transition: { duration: 0.22, ease: 'easeOut' } }}
      className={`group relative bg-card border ${
        isTargetScheme
          ? 'border-amber-500 ring-2 ring-amber-500/80 shadow-xl shadow-amber-500/15'
          : 'border-border/80 hover:border-amber-500/60'
      } rounded-xl overflow-hidden shadow-xs hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between`}
    >
      {/* Top Media / Banner Section (Authentic Menu Card Cover Style) */}
      <div 
        onClick={(e) => {
          if (primaryImage) {
            e.stopPropagation();
            onOpenImage?.(primaryImage, scheme.title);
          }
        }}
        className={`relative w-full h-44 sm:h-52 overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-b border-border/60 ${primaryImage ? 'cursor-zoom-in' : ''}`}
        title={primaryImage ? "Click to view full image" : undefined}
      >
        {primaryImage ? (
          <div
            className="relative w-full h-full group/cardimg cursor-zoom-in"
            onClick={(e) => {
              e.stopPropagation();
              onOpenImage?.(primaryImage, scheme.title);
            }}
            title="Click to view full image"
          >
            <img
              src={primaryImage}
              alt={scheme.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
            />
            <div className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover/cardimg:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/20">
              <Maximize2 size={11} className="text-amber-400" />
              <span>Full View</span>
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
            {/* Ambient decorative lighting */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-orange-500/20 blur-2xl" />
            <Coins
              size={96}
              className="absolute -right-6 -bottom-6 text-amber-500/10 dark:text-amber-400/5 rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"
            />
            <Gift
              size={80}
              className="absolute -left-6 -top-6 text-orange-500/10 dark:text-orange-400/5 -rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6"
            />
            <div className="relative z-10 w-16 h-16 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-md border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
              <Coins size={32} />
            </div>
          </div>
        )}

        {/* Gradient shadow for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20 pointer-events-none">
          <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/70 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
            <Calendar size={11} className="text-amber-600 dark:text-amber-400" />
            <span>{scheme.frequency === 'weekly' ? 'Weekly Scheme' : 'Monthly Scheme'}</span>
          </div>

          {scheme.reward_type === 'all_items' ? (
            <div className="backdrop-blur-md bg-amber-500/95 text-white border border-amber-300/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Store size={11} />
              <span>All Items</span>
            </div>
          ) : scheme.reward_type === 'category' ? (
            <div className="backdrop-blur-md bg-orange-500/95 text-white border border-orange-300/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Tag size={11} />
              <span>Category</span>
            </div>
          ) : (
            <div className="backdrop-blur-md bg-amber-600/95 text-white border border-amber-400/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Gift size={11} />
              <span>{scheme.items?.length || 0} Gifts</span>
            </div>
          )}
        </div>

        {/* Compact Single-line Ribbon on Banner (never blocks artwork or collides with badges) */}
        {highlightLines.length > 0 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 pointer-events-none">
            <div className="inline-flex backdrop-blur-md bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-amber-600/95 text-white px-2.5 py-1 rounded-xl border border-white/20 shadow-md shadow-orange-950/25 items-center gap-1.5 max-w-full">
              <Flame size={12} className="text-yellow-300 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide truncate drop-shadow-xs">
                {highlightLines[0]} {highlightLines.length > 1 ? `(+${highlightLines.length - 1} More)` : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5 bg-card">
        <div className="space-y-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-amber-500 transition-colors line-clamp-1 leading-snug">
              {scheme.title}
            </h3>
            {scheme.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {scheme.description}
              </p>
            )}
          </div>

          {/* Structured Highlights & Benefits (Clean key-value breakdown) */}
          {renderHighlightBenefits(scheme.highlight_text)}

          {/* Pricing & Maturity Specs Grid */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 dark:bg-slate-800/40 border border-border/60">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Installment
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-black text-base sm:text-lg" style={{ color: primaryColor }}>
                  {currency}{scheme.price.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-muted-foreground">
                  / {scheme.frequency === 'weekly' ? 'wk' : 'mo'}
                </span>
              </div>
            </div>
            <div className="text-right border-l border-border/60 pl-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Total Maturity
              </span>
              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                <span className="font-mono font-black text-base sm:text-lg text-amber-600 dark:text-amber-400">
                  {currency}{maturityVal.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="col-span-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock size={12} className="text-muted-foreground" />
                <span>Term Duration:</span>
              </span>
              <span className="font-bold text-foreground">
                {scheme.term_duration} {scheme.term_unit}
              </span>
            </div>
          </div>

          {/* Reward Mode Terms */}
          {scheme.reward_type === 'all_items' ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/25">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Store size={14} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-black text-amber-950 dark:text-amber-200 block truncate">
                    Full Store Freedom
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    Choose any items from entire catalog
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] shrink-0 shadow-2xs">
                All Items
              </span>
            </div>
          ) : scheme.reward_type === 'category' ? (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Tag size={14} />
                  </div>
                  <span className="text-[11px] font-black text-amber-950 dark:text-amber-200 truncate">
                    Category Choice ({scheme.reward_categories?.length || 0} Categories)
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
                  Eligible
                </span>
              </div>
              {scheme.reward_categories && scheme.reward_categories.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {scheme.reward_categories.map((cat, cIdx) => (
                    <span
                      key={cIdx}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            scheme.items && scheme.items.length > 0 && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Gift size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-black text-amber-950 dark:text-amber-200 block truncate">
                      {scheme.items.length} Reward {scheme.items.length === 1 ? 'Product' : 'Products'}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Guaranteed at completion
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewRewards(scheme);
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-amber-100/60 text-amber-700 dark:text-amber-300 font-extrabold text-[10px] rounded-lg border border-amber-300 dark:border-amber-700 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                >
                  View Rewards
                </button>
              </div>
            )
          )}
        </div>

        {/* CTA Enroll Button (Actual Menu Button Style with Shimmer & Slide Arrow) */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onEnroll(scheme)}
          className="group/btn relative overflow-hidden w-full mt-2 py-3 px-4 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-98"
          style={{ backgroundColor: primaryColor }}
        >
          {/* Shimmer sweep effect on hover */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />
          <span className="relative z-10">Enroll in Scheme</span>
          <ArrowRight
            size={15}
            className="relative z-10 transition-transform duration-200 group-hover/btn:translate-x-1"
          />
        </motion.button>
      </div>
    </motion.div>
  );
};

interface PublicSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  primaryColor?: string;
  shop?: any;
  isFullPage?: boolean;
  routeSchemeId?: string;
}

export const PublicSchemeModal: React.FC<PublicSchemeModalProps> = ({
  isOpen,
  onClose,
  shopId,
  primaryColor = '#f97316',
  shop,
  isFullPage = false,
  routeSchemeId: propRouteSchemeId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramShopId, schemeId: paramSchemeId } = useParams<{ id?: string; schemeId?: string }>();

  const activeSchemeIdParam = propRouteSchemeId || paramSchemeId;
  const isHistoryRoute = Boolean(
    activeSchemeIdParam === 'history' ||
    activeSchemeIdParam === 'my-history' ||
    location.pathname.endsWith('/history') ||
    location.pathname.endsWith('/my-history') ||
    searchParams.get('tab') === 'history' ||
    searchParams.get('tab') === 'my_history' ||
    searchParams.get('tab') === 'my-history'
  );

  const isMyPassRoute = !isHistoryRoute && Boolean(
    activeSchemeIdParam === 'my-pass' ||
    activeSchemeIdParam === 'my-scheme' ||
    location.pathname.endsWith('/my-pass') ||
    location.pathname.endsWith('/my-scheme') ||
    searchParams.get('tab') === 'my_pass' ||
    searchParams.get('tab') === 'my-pass' ||
    searchParams.get('tab') === 'my_scheme'
  );

  const effectiveShopId = shop?.id || shopId || paramShopId;
  const shopSlug = shop?.slug || paramShopId || shopId;

  const currency = shop?.settings?.currency || '₹';
  const [activeTab, setActiveTab] = useState<'schemes' | 'my_pass' | 'history'>(() => {
    if (isHistoryRoute) return 'history';
    if (isMyPassRoute) return 'my_pass';
    return 'schemes';
  });
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lightbox for Scheme Banner Full View
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('Scheme Banner');

  // Joining state
  const [selectedSchemeForJoin, setSelectedSchemeForJoin] = useState<Scheme | null>(null);
  const [joinName, setJoinName] = useState(() => localStorage.getItem('customer_name') || '');
  const [joinCountryCode, setJoinCountryCode] = useState(() => localStorage.getItem('customer_country_code') || '+91');
  const [joinPhone, setJoinPhone] = useState(() => {
    const raw = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    return raw.replace(/\D/g, '').slice(-10);
  });
  const [joinStreet, setJoinStreet] = useState(() => cleanAddressDisplay(localStorage.getItem('customer_street') || localStorage.getItem('customer_address') || ''));
  const [joinCountry, setJoinCountry] = useState(() => {
    const saved = localStorage.getItem('customer_country');
    if (!saved) return 'India';
    if (COUNTRY_OPTIONS.some(c => c.id === saved)) return saved;
    return 'Other';
  });
  const [customJoinCountry, setCustomJoinCountry] = useState(() => {
    const saved = localStorage.getItem('customer_country');
    if (!saved) return '';
    if (COUNTRY_OPTIONS.some(c => c.id === saved)) return '';
    return saved;
  });
  const [joinState, setJoinState] = useState(() => localStorage.getItem('customer_state') || 'Tamil Nadu');
  const [joinDistrict, setJoinDistrict] = useState(() => localStorage.getItem('customer_district') || 'Virudhunagar (Sivakasi)');
  const [customDistrict, setCustomDistrict] = useState('');
  const [joinPincode, setJoinPincode] = useState(() => localStorage.getItem('customer_pincode') || '');
  const [isJoining, setIsJoining] = useState(false);

  const effectiveTargetSchemeId = useMemo(() => {
    if (
      activeSchemeIdParam &&
      activeSchemeIdParam !== 'my-pass' &&
      activeSchemeIdParam !== 'my-scheme' &&
      activeSchemeIdParam !== 'history' &&
      activeSchemeIdParam !== 'my-history'
    ) {
      return activeSchemeIdParam;
    }
    return searchParams.get('scheme') || searchParams.get('id') || null;
  }, [activeSchemeIdParam, searchParams]);

  const navigateToTab = (tab: 'schemes' | 'my_pass' | 'history') => {
    setActiveTab(tab);
    const isFundRoute = location.pathname.includes('/fund');
    const baseRoute = isFundRoute ? `/shop/${shopSlug}/fund` : `/shop/${shopSlug}/schemes`;

    if (tab === 'schemes') {
      setSelectedSchemeForJoin(null);
      if (isFullPage && shopSlug) {
        navigate(baseRoute, { replace: false });
      } else {
        setSearchParams({});
      }
    } else if (tab === 'my_pass') {
      if (isFullPage && shopSlug) {
        navigate(`${baseRoute}/my-scheme`, { replace: false });
      } else {
        setSearchParams({ tab: 'my_pass' });
      }
    } else if (tab === 'history') {
      if (isFullPage && shopSlug) {
        navigate(`${baseRoute}/history`, { replace: false });
      } else {
        setSearchParams({ tab: 'history' });
      }
    }
  };

  const navigateToSchemeJoin = (scheme: Scheme) => {
    setSelectedSchemeForJoin(scheme);
    setActiveTab('schemes');
    const isFundRoute = location.pathname.includes('/fund');
    const baseRoute = isFundRoute ? `/shop/${shopSlug}/fund` : `/shop/${shopSlug}/schemes`;
    if (isFullPage && shopSlug) {
      navigate(`${baseRoute}/${scheme.id}`, { replace: false });
    } else {
      setSearchParams({ scheme: scheme.id });
    }
  };

  const navigateBackToSchemesList = () => {
    setSelectedSchemeForJoin(null);
    setActiveTab('schemes');
    const isFundRoute = location.pathname.includes('/fund');
    const baseRoute = isFundRoute ? `/shop/${shopSlug}/fund` : `/shop/${shopSlug}/schemes`;
    if (isFullPage && shopSlug) {
      navigate(baseRoute, { replace: false });
    } else {
      setSearchParams({});
    }
  };

  // Keep activeTab in sync with route / search params
  useEffect(() => {
    if (isHistoryRoute) {
      setActiveTab('history');
      setSelectedSchemeForJoin(null);
    } else if (isMyPassRoute) {
      setActiveTab('my_pass');
      setSelectedSchemeForJoin(null);
    } else if (
      location.pathname.endsWith('/schemes') ||
      location.pathname.endsWith('/fund') ||
      searchParams.get('tab') === 'schemes'
    ) {
      setActiveTab('schemes');
      if (!effectiveTargetSchemeId) {
        setSelectedSchemeForJoin(null);
      }
    }
  }, [isHistoryRoute, isMyPassRoute, location.pathname, searchParams, effectiveTargetSchemeId]);

  // Restore particular scheme on page load / refresh
  useEffect(() => {
    if (effectiveTargetSchemeId && schemes.length > 0) {
      const match = schemes.find(s => s.id === effectiveTargetSchemeId || (s as any).slug === effectiveTargetSchemeId);
      if (match) {
        setSelectedSchemeForJoin(match);
        setActiveTab('schemes');
      }
    }
  }, [effectiveTargetSchemeId, schemes]);


  // My Passes State
  const [passCountryCode, setPassCountryCode] = useState(() => localStorage.getItem('customer_country_code') || '+91');
  const [customerPhone, setCustomerPhone] = useState(() => {
    const raw = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    return raw.replace(/\D/g, '').slice(-10);
  });
  const [customerName, setCustomerName] = useState(() => localStorage.getItem('customer_name') || '');
  const [customerPasses, setCustomerPasses] = useState<CustomerSchemePass[]>([]);
  const [customerHistory, setCustomerHistory] = useState<SchemeActivityLog[]>([]);
  const [lookupPhoneInput, setLookupPhoneInput] = useState(() => {
    const raw = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    return raw.replace(/\D/g, '').slice(-10);
  });
  const [isLoadingPasses, setIsLoadingPasses] = useState(false);

  const [hasQueriedPasses, setHasQueriedPasses] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpModalStep, setOtpModalStep] = useState<'intro' | 'mobile' | 'otp'>('mobile');
  const [selectedPassForRewards, setSelectedPassForRewards] = useState<CustomerSchemePass | null>(null);
  const [previewRewardsScheme, setPreviewRewardsScheme] = useState<{
    title: string;
    items: SchemeItemInfo[];
  } | null>(null);

  const displayName = customerName || customerPasses[0]?.customer_name || localStorage.getItem('customer_name') || '';

  const [pendingEnrollScheme, setPendingEnrollScheme] = useState<Scheme | null>(null);

  const handleEnrollClick = (scheme: Scheme) => {
    const token = localStorage.getItem('customer_token');
    const storedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || '';
    const cleanMobile = storedMobile.replace(/\D/g, '').slice(-10);

    if (!token || !cleanMobile || cleanMobile.length < 7) {
      // Require mobile & OTP verification before enrolling
      setPendingEnrollScheme(scheme);
      setOtpModalStep('mobile');
      setShowOtpModal(true);
      return;
    }

    // Number & token already verified -> pre-fill and proceed to enroll
    setJoinPhone(cleanMobile);
    const storedCountryCode = localStorage.getItem('customer_country_code') || '+91';
    setJoinCountryCode(storedCountryCode);
    const storedName = localStorage.getItem('customer_name') || '';
    if (storedName) setJoinName(storedName);
    const storedStreet = cleanAddressDisplay(localStorage.getItem('customer_street') || localStorage.getItem('customer_address') || '');
    if (storedStreet) setJoinStreet(storedStreet);
    const storedDistrict = localStorage.getItem('customer_district');
    if (storedDistrict) setJoinDistrict(storedDistrict);
    const storedState = localStorage.getItem('customer_state');
    if (storedState) setJoinState(storedState);
    const storedPincode = localStorage.getItem('customer_pincode');
    if (storedPincode) setJoinPincode(storedPincode);
    const storedCountry = localStorage.getItem('customer_country');
    if (storedCountry) {
      if (COUNTRY_OPTIONS.some(c => c.id === storedCountry)) {
        setJoinCountry(storedCountry);
      } else {
        setJoinCountry('Other');
        setCustomJoinCountry(storedCountry);
      }
    }
    navigateToSchemeJoin(scheme);
  };

  const handleChangeAccount = () => {
    localStorage.removeItem('pending_otp_verification');
    setOtpModalStep('mobile');
    setShowOtpModal(true);
  };

  // Installment Payment Modal State
  const [payingPass, setPayingPass] = useState<{
    pass: CustomerSchemePass;
    targetClickedNum: number;
  } | null>(null);
  const [isPayingInstallment, setIsPayingInstallment] = useState(false);

  // Trust & Terms Confirmation Modal State
  const [trustConfirmation, setTrustConfirmation] = useState<{
    type: 'join' | 'installment';
    schemeTitle: string;
    amount: number;
    customerName: string;
    customerPhone: string;
    dueNumber?: number;
    onConfirm: () => void;
  } | null>(null);
  const [hasAcceptedTrustTerms, setHasAcceptedTrustTerms] = useState(true);

  useEffect(() => {
    if (isOpen && effectiveShopId) {
      fetchPublicSchemes();
      if (customerPhone && customerPhone.length >= 7) {
        const fullPhone = passCountryCode === '+91' ? customerPhone : `${passCountryCode}${customerPhone}`;
        // Auto-fetch ONLY if the current customer_token matches this mobile number
        customerService.verifyMobile(fullPhone, effectiveShopId).then(res => {
          if (res.otp_required === false) {
            fetchCustomerPasses(fullPhone);
            if (res.customer_name) {
              setCustomerName(res.customer_name);
              setJoinName(res.customer_name);
            }
            if (res.delivery_address) {
              const cleaned = cleanAddressDisplay(res.delivery_address);
              if (cleaned) {
                setJoinStreet(cleaned);
                localStorage.setItem('customer_address', cleaned);
              }
            }
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, effectiveShopId]);

  useEffect(() => {
    if ((activeTab === 'my_pass' || activeTab === 'history') && customerPhone && customerPhone.length >= 7 && !hasQueriedPasses) {
      const fullPhone = passCountryCode === '+91' ? customerPhone : `${passCountryCode}${customerPhone}`;
      fetchCustomerPasses(fullPhone);
    }
  }, [activeTab, customerPhone, passCountryCode, hasQueriedPasses]);

  // Sync default district when state changes (for India)
  useEffect(() => {
    if (joinCountry === 'India') {
      const validDists = DISTRICTS_BY_STATE[joinState] || ['Other / Custom District'];
      if (!joinDistrict || !validDists.includes(joinDistrict)) {
        setJoinDistrict(validDists[0]);
      }
    }
  }, [joinState, joinCountry]);

  const fetchPublicSchemes = async () => {
    setIsLoading(true);
    try {
      const data = await schemeService.getPublicSchemes(effectiveShopId);
      setSchemes(data);
    } catch (err) {
      console.error('Failed to load public schemes', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomerPasses = async (phone: string) => {
    if (!phone || phone.trim().length < 7) return;
    setIsLoadingPasses(true);
    try {
      const [passes, history] = await Promise.all([
        schemeService.getMySchemeStatus(effectiveShopId, phone.trim()),
        schemeService.getMySchemeHistory(effectiveShopId, phone.trim()).catch(() => []),
      ]);
      setCustomerPasses(passes);
      setCustomerHistory(history || []);
      if (passes.length > 0 && passes[0].customer_name && !customerName) {
        setCustomerName(passes[0].customer_name);
        if (!localStorage.getItem('customer_name')) {
          localStorage.setItem('customer_name', passes[0].customer_name);
        }
      }
      setHasQueriedPasses(true);
    } catch (err) {
      console.error('Failed to fetch scheme passes & history', err);
    } finally {
      setIsLoadingPasses(false);
    }
  };


  const handleLookupPasses = async () => {
    const clean = customerPhone.replace(/\D/g, '');
    if (clean.length < 7) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    const fullPhone = passCountryCode === '+91' ? clean : `${passCountryCode}${clean}`;

    setIsLoadingPasses(true);
    try {
      // 1. Verify if the entered number matches the currently stored customer token
      const res = await customerService.verifyMobile(fullPhone, effectiveShopId);

      if (res.otp_required === false) {
        // Token is valid & matches! Directly fetch passes
        await fetchCustomerPasses(fullPhone);
      } else {
        // Token does NOT match or is missing -> prompt OTP verification modal
        localStorage.setItem('pending_otp_verification', JSON.stringify({
          shopId: effectiveShopId,
          mobileNumber: clean.slice(-10),
          countryCode: passCountryCode,
          timestamp: Date.now()
        }));
        setShowOtpModal(true);
      }
    } catch (err: any) {
      console.error('Failed to verify mobile token', err);
      // Fallback: prompt OTP modal
      localStorage.setItem('pending_otp_verification', JSON.stringify({
        shopId: effectiveShopId,
        mobileNumber: clean.slice(-10),
        countryCode: passCountryCode,
        timestamp: Date.now()
      }));
      setShowOtpModal(true);
    } finally {
      setIsLoadingPasses(false);
    }
  };

  const handleLookupHistory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = (lookupPhoneInput || customerPhone).replace(/\D/g, '');
    if (clean.length < 7) {
      toast.error('Please enter a valid mobile number');
      return;
    }
    const fullPhone = passCountryCode === '+91' ? clean : `${passCountryCode}${clean}`;

    setIsLoadingPasses(true);
    try {
      const res = await customerService.verifyMobile(fullPhone, effectiveShopId);

      if (res.otp_required === false) {
        setCustomerPhone(clean.slice(-10));
        await fetchCustomerPasses(fullPhone);
      } else {
        localStorage.setItem('pending_otp_verification', JSON.stringify({
          shopId: effectiveShopId,
          mobileNumber: clean.slice(-10),
          countryCode: passCountryCode,
          timestamp: Date.now()
        }));
        setOtpModalStep('otp');
        setShowOtpModal(true);
      }
    } catch (err: any) {
      console.error('Failed to verify mobile for scheme history', err);
      localStorage.setItem('pending_otp_verification', JSON.stringify({
        shopId: effectiveShopId,
        mobileNumber: clean.slice(-10),
        countryCode: passCountryCode,
        timestamp: Date.now()
      }));
      setOtpModalStep('mobile');
      setShowOtpModal(true);
    } finally {
      setIsLoadingPasses(false);
    }
  };

  const basePrice = selectedSchemeForJoin ? selectedSchemeForJoin.price : 0;
  const platformFee = Math.round(basePrice * 0.02 * 100) / 100;
  const pgFee = Math.round(basePrice * 0.03 * 100) / 100;
  const pgGst = Math.round(pgFee * 0.18 * 100) / 100;
  const totalPgFee = Math.round((pgFee + pgGst) * 100) / 100;
  const grandTotal = Math.round((basePrice + platformFee + totalPgFee) * 100) / 100;

  // Installment payment calculations
  const installmentBasePrice = payingPass ? payingPass.pass.price : 0;
  const instPlatformFee = Math.round(installmentBasePrice * 0.02 * 100) / 100;
  const instPgFee = Math.round(installmentBasePrice * 0.03 * 100) / 100;
  const instPgGst = Math.round(instPgFee * 0.18 * 100) / 100;
  const instTotalPgFee = Math.round((instPgFee + instPgGst) * 100) / 100;
  const instGrandTotal = Math.round((installmentBasePrice + instPlatformFee + instTotalPgFee) * 100) / 100;

  const handlePayInstallmentSubmit = () => {
    if (!payingPass) return;
    executePayInstallment();
  };

  const executePayInstallment = async () => {
    if (!payingPass) return;
    const { pass } = payingPass;
    const nextDueNum = pass.paid_installments + 1;

    setIsPayingInstallment(true);
    try {
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error('Could not load payment gateway. Please check your internet connection.');
        setIsPayingInstallment(false);
        return;
      }

      const payData = await schemeService.initiateMemberInstallmentPayment(
        effectiveShopId,
        pass.scheme_id,
        pass.member_id
      );

      const onPaymentDone = (updatedPass: CustomerSchemePass) => {
        triggerHaptic(HAPTIC_PATTERNS.successUnlock);
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: [primaryColor, '#22c55e', '#eab308', '#3b82f6'],
          zIndex: 99999
        });
        toast.success(`Payment verified! Due #${nextDueNum} is now marked as PAID.`);
        setPayingPass(null);

        // Update customerPasses state with new pass info
        setCustomerPasses(prev => prev.map(p => p.member_id === updatedPass.member_id ? updatedPass : p));
      };

      if (payData.mock_mode) {
        const updated = await schemeService.verifyMemberInstallmentPayment(
          effectiveShopId,
          pass.scheme_id,
          pass.member_id,
          {
            customer_name: pass.customer_name,
            customer_phone: pass.customer_phone,
            razorpay_order_id: payData.razorpay_order_id,
            razorpay_payment_id: `pay_inst_${Date.now()}`,
            razorpay_signature: 'mock_signature',
          }
        );
        onPaymentDone(updated);
        return;
      }

      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Savings Scheme',
        description: `${pass.scheme_title} - Due #${nextDueNum} Installment | Total: ${currency}${payData.grand_total}`,
        order_id: payData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            setIsPayingInstallment(true);
            const updated = await schemeService.verifyMemberInstallmentPayment(
              effectiveShopId,
              pass.scheme_id,
              pass.member_id,
              {
                customer_name: pass.customer_name,
                customer_phone: pass.customer_phone,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );
            onPaymentDone(updated);
          } catch (err: any) {
            console.error('Installment verification failed', err);
            toast.error(err.response?.data?.detail || 'Installment payment verification failed.');
          } finally {
            setIsPayingInstallment(false);
          }
        },
        prefill: {
          name: pass.customer_name,
          contact: pass.customer_phone.replace(/\D/g, '').slice(-10),
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            toast.error('Payment was cancelled.');
            setIsPayingInstallment(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error('Failed to initiate installment payment', err);
      toast.error(err.response?.data?.detail || 'Could not initiate installment payment.');
    } finally {
      setIsPayingInstallment(false);
    }
  };

  const handleJoinSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (!selectedSchemeForJoin) return;

    const cleanPhone = joinPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setPendingEnrollScheme(selectedSchemeForJoin);
      setOtpModalStep('mobile');
      setShowOtpModal(true);
      toast.error('Please enter a valid mobile number');
      return;
    }

    if (!joinName.trim()) {
      toast.error('Please enter your full name');
      const el = document.getElementById('enroll-name-full') || document.getElementById('enroll-name-modal');
      if (el) {
        (el as HTMLElement).focus();
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const finalPhone = joinCountryCode === '+91' ? cleanPhone : `${joinCountryCode}${cleanPhone}`;

    // Validate Country
    const effectiveCountry = joinCountry === 'Other' ? customJoinCountry.trim() : joinCountry.trim();
    if (!effectiveCountry) {
      toast.error('Please specify your country');
      const el = document.getElementById('enroll-custom-country-full') || document.getElementById('enroll-custom-country-modal');
      if (el) {
        (el as HTMLElement).focus();
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Validate State (for international addresses)
    if (joinCountry !== 'India' && !joinState.trim()) {
      toast.error('Please enter your state / province / region');
      const el = document.getElementById('enroll-state-full') || document.getElementById('enroll-state-modal');
      if (el) {
        (el as HTMLElement).focus();
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Validate District / City
    const effectiveDistrict = joinCountry === 'India'
      ? (joinDistrict === 'Other / Custom District' ? customDistrict.trim() : joinDistrict.trim())
      : joinDistrict.trim();

    if (!effectiveDistrict) {
      toast.error(joinCountry === 'India' ? 'Please specify your district or city' : 'Please enter your city / town');
      const el = document.getElementById('enroll-custom-district-full') || document.getElementById('enroll-custom-district-modal') || document.getElementById('enroll-city-full') || document.getElementById('enroll-city-modal');
      if (el) {
        (el as HTMLElement).focus();
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!joinStreet.trim()) {
      toast.error('Please enter your delivery street address / door number');
      const el = document.getElementById('enroll-street-full') || document.getElementById('enroll-street-modal');
      if (el) {
        (el as HTMLElement).focus();
        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (joinCountry === 'India') {
      if (!joinPincode.trim() || joinPincode.trim().length < 6) {
        toast.error('Please enter a valid 6-digit delivery pincode');
        const el = document.getElementById('enroll-pincode-full') || document.getElementById('enroll-pincode-modal');
        if (el) {
          (el as HTMLElement).focus();
          (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    const addressParts = [
      joinStreet.trim(),
      effectiveDistrict,
      joinState.trim() ? (joinPincode.trim() ? `${joinState.trim()} - ${joinPincode.trim()}` : joinState.trim()) : joinPincode.trim(),
      effectiveCountry && effectiveCountry !== 'India' ? effectiveCountry : ''
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    // Proceed directly to Razorpay checkout (as in previous version)
    // Terms of service and trust acknowledgement are clearly confirmed by continuing
    executeJoinPayment(finalPhone, fullAddress, effectiveDistrict);
  };

  const executeJoinPayment = async (finalPhone: string, fullAddress: string, effectiveDistrict: string) => {
    if (!selectedSchemeForJoin) return;
    const cleanPhone = joinPhone.replace(/\D/g, '');

    const onEnrollmentSuccess = (phone: string) => {
      // Save customer info in localStorage
      localStorage.setItem('customer_name', joinName.trim());
      localStorage.setItem('customer_country_code', joinCountryCode);
      localStorage.setItem('customer_mobile', cleanPhone);
      localStorage.setItem('customer_phone', cleanPhone);
      localStorage.setItem('customer_country', effectiveCountry);
      if (joinStreet.trim()) localStorage.setItem('customer_street', cleanAddressDisplay(joinStreet.trim()));
      if (effectiveDistrict) localStorage.setItem('customer_district', effectiveDistrict);
      if (joinState.trim()) localStorage.setItem('customer_state', joinState.trim());
      if (joinPincode.trim()) localStorage.setItem('customer_pincode', joinPincode.trim());
      if (fullAddress) localStorage.setItem('customer_address', cleanAddressDisplay(fullAddress));

      setCustomerPhone(phone);

      // Trigger Confetti & Haptic
      triggerHaptic(HAPTIC_PATTERNS.successUnlock);
      confetti({
        particleCount: 120,
        spread: 85,
        origin: { y: 0.6 },
        colors: [primaryColor, '#eab308', '#22c55e', '#3b82f6', '#ec4899'],
        zIndex: 99999
      });

      toast.success(`Payment verified! Congratulations on joining ${selectedSchemeForJoin.title}!`);
      navigateToTab('my_pass');
      fetchCustomerPasses(phone);
    };

    setIsJoining(true);
    try {
      console.log('[Payment] Loading Razorpay SDK...');
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        console.error('[Payment] Failed to load Razorpay SDK');
        toast.error('Could not load payment gateway. Please check your internet connection.');
        setIsJoining(false);
        return;
      }

      console.log('[Payment] Initiating join payment with shopId:', effectiveShopId, 'schemeId:', selectedSchemeForJoin.id);
      // 1. Create Razorpay order via backend with 2% platform fee & 3% PG fee (+18% GST)
      const payData = await schemeService.initiateJoinPayment(effectiveShopId, selectedSchemeForJoin.id, {
        customer_name: joinName.trim(),
        customer_phone: finalPhone,
        customer_address: fullAddress || undefined,
      });

      console.log('[Payment] Razorpay order created:', payData);

      // 2. Mock mode handling
      if (payData.mock_mode) {
        console.log('[Payment] Mock mode active, auto-verifying...');
        await schemeService.verifyJoinPayment(effectiveShopId, selectedSchemeForJoin.id, {
          customer_name: joinName.trim(),
          customer_phone: finalPhone,
          customer_address: fullAddress || undefined,
          razorpay_order_id: payData.razorpay_order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature',
        });
        onEnrollmentSuccess(finalPhone);
        return;
      }

      // 3. Open standard Razorpay Checkout
      const rzpOptions = {
        key: payData.razorpay_key,
        amount: payData.amount,
        currency: payData.currency || 'INR',
        name: shop?.name || 'Savings Scheme',
        description: `${selectedSchemeForJoin.title} - 1st Installment | Total: ${currency}${payData.grand_total}`,
        order_id: payData.razorpay_order_id,
        handler: async (response: any) => {
          try {
            setIsJoining(true);
            await schemeService.verifyJoinPayment(effectiveShopId, selectedSchemeForJoin.id, {
              customer_name: joinName.trim(),
              customer_phone: finalPhone,
              customer_address: fullAddress || undefined,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onEnrollmentSuccess(finalPhone);
          } catch (verifyErr: any) {
            console.error('[Payment] Payment verification failed', verifyErr);
            toast.error(verifyErr.response?.data?.detail || 'Payment verification failed. Please contact store.');
          } finally {
            setIsJoining(false);
          }
        },
        prefill: {
          name: joinName.trim(),
          contact: cleanPhone,
        },
        theme: { color: primaryColor },
        modal: {
          ondismiss: () => {
            toast.error('Payment was not completed. You can complete enrollment anytime.');
            setIsJoining(false);
          }
        }
      };

      console.log('[Payment] Calling Razorpay open()...');
      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.open();
    } catch (err: any) {
      console.error('[Payment] Payment initiation failed', err);
      toast.error(err.response?.data?.detail || 'Failed to initiate payment. Please try again.');
      setIsJoining(false);
    }
  };

  const renderTrustConfirmationModal = () => {
    if (!trustConfirmation) return null;
    return (
      <div 
        className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200"
        onClick={() => setTrustConfirmation(null)}
      >
        <div 
          className="bg-card border border-border rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/80 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent relative">
            <button
              type="button"
              onClick={() => setTrustConfirmation(null)}
              className="absolute right-3.5 top-3.5 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <ShieldCheck size={22} />
              </div>
              <div className="pr-6">
                <h3 className="font-black text-sm sm:text-base text-foreground leading-tight">
                  Merchant Trust & Terms Confirmation
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Please review details before proceeding to payment
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
            {/* Merchant Trust Advisory */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Store size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <span>Make sure you trust {shop?.name || 'this shop'}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                You are subscribing to a savings scheme operated and fulfilled directly by <strong className="text-foreground font-semibold">{shop?.name || 'this merchant'}</strong>. All scheme savings, product rewards, cracker hampers, and maturity claims are the sole responsibility of this merchant. Menukit acts as a software technology platform and does not hold custody of savings funds.
              </p>
            </div>

            {/* Payment Summary */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Payment Details
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Scheme:</span>
                <span className="font-bold text-foreground truncate max-w-[62%]">{trustConfirmation.schemeTitle}</span>
              </div>
              {trustConfirmation.type === 'installment' && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Installment:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">Due #{trustConfirmation.dueNumber}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Subscriber:</span>
                <span className="font-semibold text-foreground">{trustConfirmation.customerName}</span>
              </div>
              <div className="border-t border-border/60 pt-2 flex justify-between items-center text-xs font-bold">
                <span className="text-foreground">Total Payable:</span>
                <span className="font-mono font-black text-sm text-foreground" style={{ color: primaryColor }}>
                  {currency}{trustConfirmation.amount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Legal Policies */}
            <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/50 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <FileText size={13} className="text-muted-foreground" />
                <span>Terms & Legal Policies</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Before paying, please review our policies:
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <span>Terms of Service</span>
                  <ExternalLink size={10} className="text-muted-foreground" />
                </a>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <span>Privacy Policy</span>
                  <ExternalLink size={10} className="text-muted-foreground" />
                </a>
                <a
                  href="/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-bold text-foreground hover:bg-muted transition-colors shadow-2xs"
                >
                  <span>Refund Policy</span>
                  <ExternalLink size={10} className="text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* Checkbox Acceptance */}
            <label className="flex items-start gap-2.5 cursor-pointer pt-1 select-none">
              <input
                type="checkbox"
                checked={hasAcceptedTrustTerms}
                onChange={(e) => setHasAcceptedTrustTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-border text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <span className="text-[11px] text-foreground leading-snug">
                I confirm that I trust <strong className="font-semibold">{shop?.name || 'this shop'}</strong>, and by continuing I accept the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-600">Terms and Conditions</a>
                {', '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-600">Privacy Policy</a>
                {' and '}
                <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-600">Refund Policy</a>.
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setTrustConfirmation(null)}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!hasAcceptedTrustTerms || isJoining || isPayingInstallment}
              onClick={() => {
                const action = trustConfirmation.onConfirm;
                setTrustConfirmation(null);
                action();
              }}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50 hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
            >
              <Lock size={13} />
              <span>Proceed to Pay {currency}{trustConfirmation.amount.toFixed(2)}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  const modalInner = (
    <div className={`bg-card w-full ${isFullPage ? 'max-w-xl shadow-xl' : 'max-w-lg shadow-2xl max-h-[90vh]'} rounded-3xl border border-border overflow-hidden flex flex-col`}>
      {/* Header with gradient bar */}
      <div 
        className="p-4 sm:p-5 text-white relative flex items-center justify-between shrink-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, #eab308)`
        }}
      >
        <div className="flex items-center gap-3">
          {isFullPage && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black/20 hover:bg-black/30 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
              title="Back to Menu"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
            <Coins size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-black text-lg tracking-tight leading-none text-white drop-shadow-xs">
                Savings Schemes
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm uppercase">
                Fund
              </span>
            </div>
            <p className="text-[11px] text-white/90 font-medium mt-1">
              Save weekly or monthly and get rewarded with exclusive gifts!
            </p>
          </div>
        </div>

        {!isFullPage && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/40 p-1.5 gap-1.5 shrink-0">
          <button
            onClick={() => navigateToTab('schemes')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'schemes'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Gift size={14} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
            <span className="truncate">Schemes</span>
          </button>

          <button
            onClick={() => navigateToTab('my_pass')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'my_pass'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coins size={14} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
            <span className="truncate">My Pass</span>
            {customerPasses.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full text-[9.5px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                {customerPasses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => navigateToTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
              activeTab === 'history'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History size={14} style={{ color: activeTab === 'history' ? primaryColor : undefined }} />
            <span className="truncate">History</span>
            {customerHistory.length > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full text-[9.5px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                {customerHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* TAB 1: AVAILABLE SCHEMES LIST OR JOIN FORM */}
          {activeTab === 'schemes' && (
            <div>
              {selectedSchemeForJoin ? (
                /* JOIN SCHEME FORM */
                <form noValidate onSubmit={(e) => { e.preventDefault(); handleJoinSubmit(e); }} className="space-y-4">
                  <button
                    type="button"
                    onClick={navigateBackToSchemesList}
                    className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <span>← Back to schemes</span>
                  </button>

                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">
                      Joining Scheme
                    </span>
                    <h3 className="font-black text-base text-foreground break-words break-all line-clamp-2">{selectedSchemeForJoin.title}</h3>
                    <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="bg-card px-2.5 py-1 rounded-lg border border-border shadow-2xs font-mono">
                        {currency}{selectedSchemeForJoin.price.toLocaleString()} / {selectedSchemeForJoin.frequency === 'weekly' ? 'week' : 'month'}
                      </span>
                      <span className="bg-card px-2.5 py-1 rounded-lg border border-border shadow-2xs">
                        Duration: {selectedSchemeForJoin.term_duration} {selectedSchemeForJoin.term_unit}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">
                        Your Full Name *
                      </label>
                      <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          id="enroll-name-modal"
                          type="text"
                          required
                          placeholder="Enter your full name"
                          value={joinName}
                          onChange={(e) => setJoinName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-background border border-border rounded-xl text-foreground font-semibold focus:outline-hidden text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700 dark:text-slate-200 block text-xs">
                          Mobile Number *
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <ShieldCheck size={11} />
                            Verified
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.removeItem('pending_otp_verification');
                              setPendingEnrollScheme(selectedSchemeForJoin);
                              setOtpModalStep('mobile');
                              setShowOtpModal(true);
                            }}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-[110px] shrink-0">
                          <SearchableSelect
                            options={COUNTRY_CODES.map(c => ({
                              id: c.code,
                              name: `${c.flag} ${c.code}`,
                              subtext: c.country
                            }))}
                            value={joinCountryCode}
                            onChange={(val) => setJoinCountryCode(val)}
                            placeholder="+91"
                            showSearch={false}
                            className="w-full text-xs pointer-events-none opacity-80"
                          />
                        </div>
                        <div className="relative flex-1">
                          <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="tel"
                            required
                            readOnly
                            maxLength={joinCountryCode === '+91' ? 10 : 15}
                            placeholder={joinCountryCode === '+91' ? 'e.g. 9876543210' : 'Mobile number'}
                            value={joinPhone}
                            className="w-full pl-9 pr-3 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-mono focus:outline-hidden text-xs cursor-not-allowed select-none"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-0.5 block">
                        Verified mobile number linked to your scheme pass. Tap "Change" to use a different number.
                      </span>
                    </div>

                    {/* Full Delivery Address */}
                    <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/80 space-y-3 text-left">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <MapPin size={14} className="text-amber-500" />
                        <span>Delivery & Dispatch Address (For Scheme Rewards)</span>
                      </div>

                      {/* Country Selector */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                          Country *
                        </label>
                        <SearchableSelect
                          options={COUNTRY_OPTIONS.map(c => ({
                            id: c.id,
                            name: `${c.flag} ${c.name}`
                          }))}
                          value={joinCountry}
                          onChange={(val) => {
                            setJoinCountry(val);
                            if (val === 'India') {
                              if (!INDIAN_STATES.includes(joinState)) {
                                setJoinState('Tamil Nadu');
                                setJoinDistrict('Virudhunagar (Sivakasi)');
                              }
                            } else {
                              if (INDIAN_STATES.includes(joinState)) {
                                setJoinState('');
                                setJoinDistrict('');
                              }
                            }
                          }}
                          placeholder="Select Country"
                          showSearch={true}
                          className="w-full text-xs"
                        />
                      </div>

                      {/* Custom Country if 'Other' */}
                      {joinCountry === 'Other' && (
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                            Specify Country Name *
                          </label>
                          <input
                            id="enroll-custom-country-modal"
                            type="text"
                            required
                            placeholder="Enter country name"
                            value={customJoinCountry}
                            onChange={(e) => setCustomJoinCountry(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs"
                          />
                        </div>
                      )}

                      {/* State and District / City */}
                      {joinCountry === 'India' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                              State *
                            </label>
                            <SearchableSelect
                              options={INDIAN_STATES.map(s => ({ id: s, name: s }))}
                              value={joinState}
                              onChange={(val) => {
                                setJoinState(val);
                                const dists = DISTRICTS_BY_STATE[val] || ['Other / Custom District'];
                                setJoinDistrict(dists[0]);
                              }}
                              placeholder="Select State"
                              showSearch={true}
                              className="w-full text-xs"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                              District / City *
                            </label>
                            <SearchableSelect
                              options={(DISTRICTS_BY_STATE[joinState] || ['Other / Custom District']).map(d => ({ id: d, name: d }))}
                              value={joinDistrict}
                              onChange={(val) => setJoinDistrict(val)}
                              placeholder="Select District"
                              showSearch={true}
                              className="w-full text-xs"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                              State / Province / Region *
                            </label>
                            <input
                              id="enroll-state-modal"
                              type="text"
                              required
                              placeholder="e.g. Dubai, California, Selangor"
                              value={joinState}
                              onChange={(e) => setJoinState(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                              City / Town *
                            </label>
                            <input
                              id="enroll-city-modal"
                              type="text"
                              required
                              placeholder="e.g. Downtown, City Area"
                              value={joinDistrict}
                              onChange={(e) => setJoinDistrict(e.target.value)}
                              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {joinCountry === 'India' && joinDistrict === 'Other / Custom District' && (
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                            Specify District / City Name *
                          </label>
                          <div className="relative">
                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                              id="enroll-custom-district-modal"
                              type="text"
                              required
                              placeholder="Enter your district name"
                              value={customDistrict}
                              onChange={(e) => setCustomDistrict(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Full Street Address */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                          Full Address (Door No, Building, Street, Area) *
                        </label>
                        <textarea
                          id="enroll-street-modal"
                          rows={2}
                          required
                          placeholder="e.g. 12/4, Gandhi Road, Near Bus Stand"
                          value={joinStreet}
                          onChange={(e) => setJoinStreet(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden text-xs resize-none"
                        />
                      </div>

                      {/* Pincode */}
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                          {joinCountry === 'India' ? 'Pincode *' : 'Postal / ZIP Code (Optional)'}
                        </label>
                        <input
                          id="enroll-pincode-modal"
                          type="text"
                          required={joinCountry === 'India'}
                          maxLength={joinCountry === 'India' ? 6 : 12}
                          placeholder={joinCountry === 'India' ? '6-digit pincode' : 'e.g. 90210'}
                          value={joinPincode}
                          onChange={(e) => {
                            if (joinCountry === 'India') {
                              setJoinPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                            } else {
                              setJoinPincode(e.target.value.slice(0, 12));
                            }
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-mono focus:outline-hidden text-xs"
                        />
                      </div>
                    </div>

                    {/* RAZORPAY CENTRALIZED COMMISSIONS & PAYMENT SECTION */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-muted/30 border border-border space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <h4 className="font-black text-xs text-foreground">1st Installment Payment</h4>
                            <p className="text-[10px] text-muted-foreground">Secure & encrypted checkout</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <ShieldCheck size={12} />
                          <span>Instant Pass Activation</span>
                        </div>
                      </div>

                      {/* Itemized Fee Breakdown */}
                      <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>1st Installment (To Shop)</span>
                          <span className="font-mono font-bold text-foreground">{currency}{basePrice.toLocaleString()}</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>Platform Fee</span>
                          <span className="font-mono text-foreground">{currency}{platformFee.toFixed(2)}</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                          <span>Payment Gateway Fee</span>
                          <span className="font-mono text-foreground">{currency}{totalPgFee.toFixed(2)}</span>
                        </div>

                        <div className="border-t border-border/80 pt-2.5 flex justify-between items-center">
                          <div>
                            <span className="font-black text-foreground block">Total Amount to Pay</span>
                            <span className="text-[9px] text-muted-foreground">Includes all platform & PG charges</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-base" style={{ color: primaryColor }}>
                              {currency}{grandTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Methods Supported Banner */}
                      <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-muted/40 border border-border/50 text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Lock size={12} className="text-emerald-500 shrink-0" />
                          <span>256-bit SSL encrypted</span>
                        </div>
                        <span className="font-bold text-foreground">UPI • Cards • NetBanking</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isJoining}
                      onClick={handleJoinSubmit}
                      className="w-full py-3.5 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 text-sm hover:brightness-110"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Lock size={15} />
                      <span>{isJoining ? 'Processing...' : `Confirm & Pay ${currency}${grandTotal.toFixed(2)}`}</span>
                      <ArrowRight size={16} />
                    </button>
                    <p className="text-[10px] text-center text-muted-foreground mt-2 leading-relaxed">
                      By continuing, you confirm trust in <strong className="text-foreground">{shop?.name || 'this shop'}</strong> and agree to our{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Terms & Conditions</a>
                      {', '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Privacy Policy</a>
                      {' & '}
                      <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Refund Policy</a>.
                    </p>
                  </div>
                </form>
              ) : (
                /* SCHEMES LIST */
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
                      ))}
                    </div>
                  ) : schemes.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <Coins size={36} className="mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">No active schemes available at the moment.</p>
                    </div>
                  ) : (
                    schemes.map((scheme, idx) => (
                      <SchemeCard
                        key={scheme.id}
                        scheme={scheme}
                        idx={idx}
                        currency={currency}
                        primaryColor={primaryColor}
                        isTargetScheme={scheme.id === effectiveTargetSchemeId}
                        onEnroll={handleEnrollClick}
                        onViewRewards={(s) => setPreviewRewardsScheme({ title: s.title, items: s.items })}
                        onOpenImage={(url, title) => {
                          setLightboxImage(url);
                          setLightboxTitle(title || 'Scheme Banner');
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY SCHEME PASS */}
          {activeTab === 'my_pass' && (
            <div className="space-y-4">
              {/* Sleek Top Banner */}
              <div className="bg-muted/40 border border-border/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold text-xs">
                    {displayName ? displayName.charAt(0).toUpperCase() : <User size={16} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Member Pass
                    </span>
                    <h4 className="font-black text-foreground text-xs sm:text-sm truncate">
                      {displayName || (customerPhone ? `+91 ${customerPhone}` : 'Scheme Member')}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Passes List */}
              {isLoadingPasses ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Checking your passes...</div>
              ) : hasQueriedPasses && customerPasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <ShieldCheck size={32} className="mx-auto text-muted-foreground/40" />
                  <p className="text-xs">No active schemes found for mobile number {customerPhone}.</p>
                  <button
                    onClick={() => setActiveTab('schemes')}
                    className="text-xs font-bold underline"
                    style={{ color: primaryColor }}
                  >
                    Browse available schemes to join
                  </button>
                </div>
              ) : (
                customerPasses.map(pass => {
                  const percent = Math.round((pass.paid_installments / pass.total_installments) * 100);
                  const isCompleted = pass.status === 'completed' || pass.paid_installments >= pass.total_installments;

                  return (
                    <div
                      key={pass.member_id}
                      className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-foreground">{pass.scheme_title}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                              {pass.member_number || 'SCH-001'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Member: <strong className="text-foreground">{pass.customer_name}</strong> ({pass.customer_phone})
                          </p>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                          pass.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {pass.status}
                        </span>
                      </div>

                      {/* Progress summary & Remaining indicator */}
                      <div className="bg-muted/50 p-3 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {pass.paid_installments} of {pass.total_installments} Installments Paid
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {percent}% Complete
                          </span>
                        </div>

                        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${percent}%`, backgroundColor: primaryColor }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-muted-foreground font-mono">
                            Paid: {currency}{(pass.paid_installments * pass.price).toLocaleString()}
                          </span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            ⏳ {pass.remaining_installments} {pass.frequency === 'weekly' ? 'weeks' : 'months'} remaining
                          </span>
                        </div>
                      </div>

                      {/* Installment History Grid */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            Installments Breakdown
                          </span>
                          {!isCompleted && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              Tap due to pay next pending (Due #{pass.paid_installments + 1})
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                          {pass.installment_schedule.map(inst => {
                            const isNextDue = !inst.is_paid && inst.installment_number === pass.paid_installments + 1;
                            const isFutureDue = !inst.is_paid && inst.installment_number > pass.paid_installments + 1;

                            return (
                              <button
                                key={inst.installment_number}
                                type="button"
                                disabled={inst.is_paid || isCompleted}
                                onClick={() => {
                                  if (!inst.is_paid && !isCompleted) {
                                    setPayingPass({ pass, targetClickedNum: inst.installment_number });
                                  }
                                }}
                                className={`p-2 rounded-xl text-center border text-[10px] font-semibold flex flex-col items-center justify-center transition-all ${
                                  inst.is_paid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 cursor-default'
                                    : isCompleted
                                      ? 'bg-muted/30 text-muted-foreground border-border opacity-60 cursor-not-allowed'
                                      : isNextDue
                                        ? 'bg-amber-500/10 text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-600/70 shadow-2xs hover:scale-102 hover:bg-amber-500/20 cursor-pointer ring-1 ring-amber-500/30'
                                        : 'bg-background text-slate-600 border-border dark:text-slate-400 hover:border-amber-400/60 hover:bg-muted/50 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {inst.is_paid ? (
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                  ) : isNextDue ? (
                                    <CreditCard size={12} className="text-amber-500 shrink-0 animate-pulse" />
                                  ) : (
                                    <Clock size={12} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-bold">#{inst.installment_number}</span>
                                </div>

                                <span className="text-[9px] font-mono font-bold">
                                  {inst.is_paid ? 'PAID' : isNextDue ? 'PAY NOW' : 'DUE'}
                                </span>

                                {inst.is_paid && inst.paid_at && (
                                  <span className="text-[8px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 leading-tight block text-center opacity-90">
                                    {formatPaidDateTime(inst.paid_at)}
                                  </span>
                                )}
                                {!inst.is_paid && !isCompleted && isFutureDue && (
                                  <span className="text-[7.5px] text-muted-foreground mt-0.5">
                                    Pays #{pass.paid_installments + 1}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pay Next Due Installment Button or Scheme Completed Status */}
                      {pass.paid_installments < pass.total_installments && pass.status !== 'completed' ? (
                        <button
                          type="button"
                          onClick={() => setPayingPass({ pass, targetClickedNum: pass.paid_installments + 1 })}
                          className="w-full py-2.5 px-3 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all hover:brightness-110"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <CreditCard size={14} />
                          <span>Pay Next Due Installment #{pass.paid_installments + 1} ({currency}{pass.price.toLocaleString()})</span>
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={14} />
                          <span>Scheme Completed! All {pass.total_installments} installments have been fully paid.</span>
                        </div>
                      )}

                      {/* Reward Mode Terms reminder */}
                      {pass.reward_type === 'all_items' ? (
                        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 p-2.5 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                            <Store size={13} className="text-amber-500" />
                            <span>Full Store Freedom: Pick any items upon completion</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px] shrink-0">
                            All Items
                          </span>
                        </div>
                      ) : pass.reward_type === 'category' ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                              <Tag size={13} className="text-amber-500" />
                              <span>Eligible Categories ({pass.reward_categories?.length || 0})</span>
                            </span>
                          </div>
                          {pass.reward_categories && pass.reward_categories.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {pass.reward_categories.map((cat, idx) => (
                                <span key={idx} className="text-[10px] font-semibold px-2 py-0.5 rounded bg-background/80 border border-border text-foreground">
                                  {cat.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        pass.items && pass.items.length > 0 && (
                          <div 
                            onClick={() => setSelectedPassForRewards(pass)}
                            className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all group active:scale-99"
                          >
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                              <Gift size={13} className="text-amber-500 group-hover:scale-110 transition-transform" />
                              <span>Gift Box: {pass.items.length} items rewarded</span>
                            </span>
                            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold underline group-hover:text-amber-800 flex items-center gap-1">
                              <span>View Rewards</span>
                              <ChevronRight size={12} />
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: SCHEME PASSBOOK & HISTORY (Modal View) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* If no phone is verified yet, show clean compact lookup form */}
              {(!hasQueriedPasses || !customerPhone) ? (
                <div className="bg-card border border-border rounded-xl p-5 shadow-xs text-center space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                    <History size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-sm sm:text-base text-foreground">Passbook & Activity History</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your mobile number to view all your scheme enrollments, payments, transfers and refunds.
                    </p>
                  </div>
                  <form onSubmit={handleLookupHistory} className="space-y-3 pt-1">
                    <div className="flex gap-2 text-left">
                      <div className="w-28 shrink-0">
                        <SearchableSelect
                          options={COUNTRY_CODES.map(c => ({
                            id: c.code,
                            name: `${c.flag} ${c.code}`,
                            subtext: c.country
                          }))}
                          value={passCountryCode}
                          onChange={(val) => setPassCountryCode(val)}
                          placeholder="+91"
                          showSearch={false}
                          className="h-10 rounded-xl bg-muted/50 border-border text-xs font-semibold"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                          type="tel"
                          value={lookupPhoneInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setLookupPhoneInput(val);
                          }}
                          placeholder="10-digit mobile number"
                          className="w-full text-xs font-mono font-bold bg-muted/50 border border-border rounded-xl py-2.5 pl-8 pr-3 text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoadingPasses || (lookupPhoneInput.length < 7)}
                      className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-98 disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {isLoadingPasses ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Searching Records...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={14} />
                          <span>View Scheme History</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Member Banner */}
                  <div className="bg-muted/40 border border-border/80 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 font-bold text-xs">
                        {displayName ? displayName.charAt(0).toUpperCase() : <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-foreground text-xs sm:text-sm truncate">
                            {displayName || `+91 ${customerPhone}`}
                          </h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0 flex items-center gap-0.5">
                            <CheckCircle2 size={9} /> Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {passCountryCode} {customerPhone} • {customerHistory.length} event{customerHistory.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleChangeAccount}
                      className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-2.5 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {isLoadingPasses ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">Fetching passbook history...</div>
                  ) : customerHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground space-y-2 bg-card border border-dashed border-border rounded-xl p-5">
                      <History size={28} className="mx-auto text-muted-foreground/40" />
                      <h5 className="font-bold text-xs text-foreground">No Passbook Activity Recorded</h5>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        There are no enrollment, installment payment or transfer records for this number yet.
                      </p>
                      <button
                        onClick={() => navigateToTab('schemes')}
                        className="text-xs font-bold underline cursor-pointer"
                        style={{ color: primaryColor }}
                      >
                        Browse available schemes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerHistory.map(log => {
                        const isDelete = log.action_type === 'DELETED';
                        const isTransfer = log.action_type === 'TRANSFERRED';
                        const isPayment = log.action_type === 'PAYMENT_RECORDED';

                        return (
                          <div
                            key={log.id}
                            className={`p-3 rounded-xl border text-xs space-y-1 ${
                              isDelete
                                ? 'border-rose-500/30 bg-rose-500/5'
                                : isTransfer
                                  ? 'border-amber-500/30 bg-amber-500/5'
                                  : isPayment
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-border/60 bg-muted/20'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className={`font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider text-[8.5px] ${
                                isDelete
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : isTransfer
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : isPayment
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-muted text-foreground'
                              }`}>
                                {isDelete ? 'Cancelled' : isTransfer ? 'Scheme Changed' : isPayment ? 'Installment Paid' : 'Joined Scheme'}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {formatPaidDateTime(log.created_at) || new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            <div className="flex items-baseline justify-between pt-0.5">
                              <span className="font-bold text-foreground text-xs">
                                {isTransfer ? `${log.from_scheme_title} ➔ ${log.to_scheme_title}` : log.scheme_title}
                              </span>
                              {log.amount !== null && log.amount !== undefined && (
                                <span className={`font-mono font-bold text-xs ${isDelete ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isDelete ? `Refund: ${currency}${log.amount.toLocaleString()}` : `${currency}${log.amount.toLocaleString()}`}
                                </span>
                              )}
                            </div>

                            {log.notes && (
                              <p className="text-[10.5px] text-muted-foreground italic">
                                "{log.notes}"
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                              {log.member_number ? (
                                <span>Pass: <strong className="font-mono text-foreground">{log.member_number}</strong></span>
                              ) : <span />}
                              {log.otp_verified && (
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <ShieldCheck size={11} /> Verified via Customer SMS OTP
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* INSTALLMENT PAYMENT MODAL */}
        <AnimatePresence>
          {payingPass && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Pay Scheme Installment</h4>
                      <span className="text-[10px] text-muted-foreground">{payingPass.pass.scheme_title}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Member and Target Due Info */}
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member:</span>
                    <span className="font-bold text-foreground">{payingPass.pass.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Number:</span>
                    <span className="font-mono font-bold text-foreground">{payingPass.pass.member_number || 'SCH-001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installment Target:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                      Due #{payingPass.pass.paid_installments + 1}
                    </span>
                  </div>
                </div>

                {/* Sequential allocation reminder if they selected a future due */}
                {payingPass.targetClickedNum > payingPass.pass.paid_installments + 1 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      You tapped <strong>Due #{payingPass.targetClickedNum}</strong>. Installments must be cleared sequentially, so this payment is automatically allocated to your next pending installment: <strong>Due #{payingPass.pass.paid_installments + 1}</strong>.
                    </span>
                  </div>
                )}

                {/* Fee Breakdown */}
                <div className="bg-background border border-border p-3.5 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Installment Amount ({payingPass.pass.frequency})</span>
                    <span className="font-mono font-semibold text-foreground">{currency}{installmentBasePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Platform Fee</span>
                    <span className="font-mono">{currency}{instPlatformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Payment Gateway Fee</span>
                    <span className="font-mono">{currency}{instTotalPgFee.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/80 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Total Payable</span>
                    <span className="font-mono text-base" style={{ color: primaryColor }}>
                      {currency}{instGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayInstallmentSubmit}
                    disabled={isPayingInstallment}
                    className="flex-2 py-2.5 rounded-lg text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Lock size={14} />
                    <span>{isPayingInstallment ? 'Processing...' : `Confirm & Pay ${currency}${instGrandTotal.toFixed(2)}`}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground pt-1 leading-snug">
                  By continuing, you accept our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Terms</a>
                  {', '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Privacy</a>
                  {' & '}
                  <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Refunds</a>.
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {renderTrustConfirmationModal()}
    </div>
  );

  if (isFullPage) {
    return (
      <div className="min-h-screen w-full bg-slate-50/70 dark:bg-slate-950 text-foreground flex flex-col">
        {/* Full-width Sticky Top Navigation Bar */}
        <header className="sticky top-0 z-30 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-xs">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            {/* Top Bar Row */}
            <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
                  title="Back to Menu"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden xs:inline">Back to </span>
                  <span>Menu</span>
                </button>
                <div className="h-5 w-px bg-border hidden sm:block shrink-0" />
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-xs shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Coins size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h1 className="font-extrabold text-xs sm:text-base text-foreground leading-tight truncate">
                        {shop?.name || 'Savings Schemes'}
                      </h1>
                      <span className="text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        Fund
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground hidden sm:block">
                      Official Customer Savings & Festival Gift Schemes
                    </p>
                  </div>
                </div>
              </div>

              {/* Desktop Navigation Tabs (Hidden on mobile) */}
              <div className="hidden md:flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 shrink-0">
                <button
                  onClick={() => navigateToTab('schemes')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'schemes'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift size={13} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
                  <span>Available Schemes</span>
                </button>

                <button
                  onClick={() => navigateToTab('my_pass')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 relative ${
                    activeTab === 'my_pass'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Coins size={13} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
                  <span>My Scheme Pass</span>
                  {customerPasses.length > 0 && (
                    <span className="min-w-4.5 h-4.5 px-1.5 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                      {customerPasses.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigateToTab('history')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 relative ${
                    activeTab === 'history'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History size={13} style={{ color: activeTab === 'history' ? primaryColor : undefined }} />
                  <span>Passbook History</span>
                  {customerHistory.length > 0 && (
                    <span className="min-w-4.5 h-4.5 px-1.5 rounded-full text-[10px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                      {customerHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Tabs Bar (Visible only on < md, full-width segmented control) */}
            <div className="pb-2.5 pt-0.5 md:hidden">
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-xl border border-border/60 w-full">
                <button
                  onClick={() => navigateToTab('schemes')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'schemes'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Gift size={13} style={{ color: activeTab === 'schemes' ? primaryColor : undefined }} />
                  <span className="truncate">Schemes</span>
                </button>

                <button
                  onClick={() => navigateToTab('my_pass')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'my_pass'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Coins size={13} style={{ color: activeTab === 'my_pass' ? primaryColor : undefined }} />
                  <span className="truncate">My Pass</span>
                  {customerPasses.length > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full text-[9.5px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                      {customerPasses.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => navigateToTab('history')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'history'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History size={13} style={{ color: activeTab === 'history' ? primaryColor : undefined }} />
                  <span className="truncate">History</span>
                  {customerHistory.length > 0 && (
                    <span className="min-w-4 h-4 px-1 rounded-full text-[9.5px] font-black bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs leading-none">
                      {customerHistory.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Banner when viewing all available schemes */}
        {activeTab === 'schemes' && !selectedSchemeForJoin && (
          <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20 py-5 sm:py-8 px-3 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-1.5 sm:space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-bold">
                  <Coins size={13} className="text-amber-500" />
                  <span>Customer Savings Program</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-black text-foreground tracking-tight leading-snug">
                  Save Small. Celebrate Big.
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Enroll in weekly or monthly savings schemes. Save conveniently, track your installments digitally, and collect guaranteed gift hampers, festival celebration boxes, or cakes upon completion!
                </p>
              </div>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto shrink-0">
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl border border-border shadow-2xs text-center flex-1">
                  <ShieldCheck size={18} className="mx-auto text-emerald-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Verified Pass</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Digital tracking</span>
                </div>
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl border border-border shadow-2xs text-center flex-1">
                  <Gift size={18} className="mx-auto text-amber-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Bonus Gifts</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Guaranteed items</span>
                </div>
                <div className="bg-card/90 backdrop-blur-xs p-2.5 sm:p-3 rounded-xl border border-border shadow-2xs text-center flex-1">
                  <CreditCard size={18} className="mx-auto text-blue-500 mb-1" />
                  <span className="text-[10px] sm:text-[11px] font-bold block text-foreground leading-tight">Easy UPI</span>
                  <span className="text-[9px] text-muted-foreground hidden sm:block mt-0.5">Instant activation</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {/* TAB 1: SCHEMES */}
          {activeTab === 'schemes' && (
            <div>
              {selectedSchemeForJoin ? (
                /* 2-COLUMN ENROLLMENT LAYOUT */
                <div className="max-w-5xl mx-auto">
                  <button
                    type="button"
                    onClick={navigateBackToSchemesList}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer mb-6 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted shadow-2xs transition-colors"
                  >
                    <ChevronLeft size={14} />
                    <span>Back to all schemes</span>
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Scheme Summary Card (Menu-Style Structured Card) */}
                    <div className="lg:col-span-5 bg-card border border-border rounded-xl overflow-hidden shadow-sm relative lg:sticky lg:top-24">
                      {/* Top Media / Hero Banner */}
                      <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-b border-border/60">
                        {(selectedSchemeForJoin.image_url || selectedSchemeForJoin.items?.find(it => it.image_url)?.image_url) ? (
                          <div
                            className="relative w-full h-full group/joinhero cursor-zoom-in"
                            onClick={() => {
                              const heroImg = selectedSchemeForJoin.image_url || selectedSchemeForJoin.items?.find(it => it.image_url)?.image_url;
                              if (heroImg) {
                                setLightboxImage(heroImg);
                                setLightboxTitle(selectedSchemeForJoin.title);
                              }
                            }}
                            title="Click to view full image"
                          >
                            <img
                              src={selectedSchemeForJoin.image_url || selectedSchemeForJoin.items.find(it => it.image_url)!.image_url!}
                              alt={selectedSchemeForJoin.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover/joinhero:scale-105"
                            />
                            <div className="absolute top-2.5 right-2.5 z-20 opacity-90 sm:opacity-0 sm:group-hover/joinhero:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/20">
                              <Maximize2 size={11} className="text-amber-400" />
                              <span>Full View</span>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-400/25 blur-2xl" />
                            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-orange-500/20 blur-2xl" />
                            <Coins size={96} className="absolute -right-6 -bottom-6 text-amber-500/10 dark:text-amber-400/5 rotate-12" />
                            <Gift size={80} className="absolute -left-6 -top-6 text-orange-500/10 dark:text-orange-400/5 -rotate-12" />
                            <div className="relative z-10 w-16 h-16 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-md border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center text-amber-500 dark:text-amber-400">
                              <Coins size={32} />
                            </div>
                          </div>
                        )}

                        {/* Gradient overlay for contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20 pointer-events-none">
                          <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/70 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <Calendar size={11} className="text-amber-600 dark:text-amber-400" />
                            <span>{selectedSchemeForJoin.frequency === 'weekly' ? 'Weekly Scheme' : 'Monthly Scheme'}</span>
                          </div>

                          {selectedSchemeForJoin.reward_type === 'all_items' ? (
                            <div className="backdrop-blur-md bg-amber-500/95 text-white border border-amber-300/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Store size={11} />
                              <span>All Items</span>
                            </div>
                          ) : selectedSchemeForJoin.reward_type === 'category' ? (
                            <div className="backdrop-blur-md bg-orange-500/95 text-white border border-orange-300/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Tag size={11} />
                              <span>Category</span>
                            </div>
                          ) : (
                            <div className="backdrop-blur-md bg-amber-600/95 text-white border border-amber-400/50 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <Gift size={11} />
                              <span>{selectedSchemeForJoin.items?.length || 0} Gifts</span>
                            </div>
                          )}
                        </div>

                        {/* Compact Single-line Ribbon on Banner (never blocks artwork or collides with badges) */}
                        {selectedSchemeForJoin.highlight_text && (
                          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 pointer-events-none">
                            {(() => {
                              const lines = (selectedSchemeForJoin.highlight_text || '').split('\n').map(l => l.trim()).filter(Boolean);
                              if (lines.length === 0) return null;
                              return (
                                <div className="inline-flex backdrop-blur-md bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-amber-600/95 text-white px-2.5 py-1 rounded-xl border border-white/20 shadow-md shadow-orange-950/25 items-center gap-1.5 max-w-full">
                                  <Flame size={12} className="text-yellow-300 animate-pulse shrink-0" />
                                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide truncate drop-shadow-xs">
                                    {lines[0]} {lines.length > 1 ? `(+${lines.length - 1} More)` : ''}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-5 sm:p-6 space-y-4">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block mb-1">
                            Selected Scheme Plan
                          </span>
                          <h3 className="text-xl font-black text-foreground break-words break-all line-clamp-2 leading-tight">
                            {selectedSchemeForJoin.title}
                          </h3>
                          {selectedSchemeForJoin.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed break-words line-clamp-3">
                              {selectedSchemeForJoin.description}
                            </p>
                          )}
                        </div>

                        {/* Structured Highlights & Benefits */}
                        {renderHighlightBenefits(selectedSchemeForJoin.highlight_text, true, 2)}

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 p-3.5 rounded-xl bg-muted/40 dark:bg-slate-800/40 border border-border/60">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Installment
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="font-mono font-black text-lg" style={{ color: primaryColor }}>
                                {currency}{selectedSchemeForJoin.price.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                / {selectedSchemeForJoin.frequency === 'weekly' ? 'week' : 'month'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right border-l border-border/60 pl-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Total Maturity
                            </span>
                            <div className="flex items-baseline justify-end gap-1 mt-0.5">
                              <span className="font-mono font-black text-lg text-amber-600 dark:text-amber-400">
                                {currency}{(selectedSchemeForJoin.price * selectedSchemeForJoin.term_duration).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock size={12} className="text-muted-foreground" />
                              <span>Term Duration:</span>
                            </span>
                            <span className="font-bold text-foreground">
                              {selectedSchemeForJoin.term_duration} {selectedSchemeForJoin.term_unit}
                            </span>
                          </div>
                        </div>

                        {/* Reward Mode Terms */}
                        {selectedSchemeForJoin.reward_type === 'all_items' ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-amber-500/25">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                                <Store size={15} />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                                  Full Store Freedom Choice
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  Choose any items from entire store upon completion
                                </span>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-xs shrink-0 shadow-2xs">
                              All Items
                            </span>
                          </div>
                        ) : selectedSchemeForJoin.reward_type === 'category' ? (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                                  <Tag size={15} />
                                </div>
                                <div>
                                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                                    Category Special ({selectedSchemeForJoin.reward_categories?.length || 0} Categories)
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block truncate">
                                    Redeemable on items in selected categories
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
                                Eligible
                              </span>
                            </div>
                            {selectedSchemeForJoin.reward_categories && selectedSchemeForJoin.reward_categories.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {selectedSchemeForJoin.reward_categories.map((cat, cIdx) => (
                                  <span key={cIdx} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                                    {cat.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          selectedSchemeForJoin.items && selectedSchemeForJoin.items.length > 0 && (
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                                  <Gift size={15} />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 block truncate">
                                    {selectedSchemeForJoin.items.length} Included Reward {selectedSchemeForJoin.items.length === 1 ? 'Product' : 'Products'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Guaranteed upon completion
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewRewardsScheme({ 
                                  title: selectedSchemeForJoin.title, 
                                  items: selectedSchemeForJoin.items 
                                })}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-amber-100/50 text-amber-700 dark:text-amber-300 font-extrabold text-xs rounded-xl border border-amber-300 dark:border-amber-700/60 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                              >
                                View Rewards
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Right Column: Enrollment Form */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-xl p-6 shadow-sm">
                      <form noValidate onSubmit={(e) => { e.preventDefault(); handleJoinSubmit(e); }} className="space-y-5">
                        <div>
                          <h4 className="text-lg font-black text-foreground">Enrollment & Delivery Details</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">Enter customer details to activate your digital pass</p>
                        </div>

                        <div className="space-y-4 text-xs">
                          <div>
                            <label className="font-bold text-foreground block mb-1.5">Your Full Name *</label>
                            <div className="relative">
                              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                              <input
                                id="enroll-name-full"
                                type="text"
                                required
                                placeholder="Enter your full name"
                                value={joinName}
                                onChange={(e) => setJoinName(e.target.value)}
                                className="w-full pl-9 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground font-semibold text-xs focus:outline-hidden"
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="font-bold text-foreground block text-xs">Mobile Number *</label>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <ShieldCheck size={12} />
                                  Verified
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.removeItem('pending_otp_verification');
                                    setPendingEnrollScheme(selectedSchemeForJoin);
                                    setOtpModalStep('mobile');
                                    setShowOtpModal(true);
                                  }}
                                  className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  Change
                                </button>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="w-[120px] shrink-0">
                                <SearchableSelect
                                  options={COUNTRY_CODES.map(c => ({
                                    id: c.code,
                                    name: `${c.flag} ${c.code}`,
                                    subtext: c.country
                                  }))}
                                  value={joinCountryCode}
                                  onChange={(val) => setJoinCountryCode(val)}
                                  placeholder="+91"
                                  showSearch={false}
                                  className="w-full text-xs pointer-events-none opacity-80"
                                />
                              </div>
                              <div className="relative flex-1">
                                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  type="tel"
                                  required
                                  readOnly
                                  maxLength={joinCountryCode === '+91' ? 10 : 15}
                                  placeholder={joinCountryCode === '+91' ? 'e.g. 9876543210' : 'Mobile number'}
                                  value={joinPhone}
                                  className="w-full pl-9 pr-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground font-mono text-xs focus:outline-hidden cursor-not-allowed select-none"
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              Verified mobile number linked to your scheme pass. Tap "Change" to use a different number.
                            </span>
                          </div>

                          {/* Full Delivery Address */}
                          <div className="p-4 rounded-xl bg-muted/20 border border-border/80 space-y-3.5 text-left">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <MapPin size={15} className="text-amber-500" />
                              <span>Delivery & Dispatch Address (For Scheme Rewards)</span>
                            </div>

                            {/* Country Selector */}
                            <div>
                              <label className="font-bold text-foreground block mb-1 text-[11px]">Country *</label>
                              <SearchableSelect
                                options={COUNTRY_OPTIONS.map(c => ({
                                  id: c.id,
                                  name: `${c.flag} ${c.name}`
                                }))}
                                value={joinCountry}
                                onChange={(val) => {
                                  setJoinCountry(val);
                                  if (val === 'India') {
                                    if (!INDIAN_STATES.includes(joinState)) {
                                      setJoinState('Tamil Nadu');
                                      setJoinDistrict('Virudhunagar (Sivakasi)');
                                    }
                                  } else {
                                    if (INDIAN_STATES.includes(joinState)) {
                                      setJoinState('');
                                      setJoinDistrict('');
                                    }
                                  }
                                }}
                                placeholder="Select Country"
                                showSearch={true}
                                className="w-full text-xs"
                              />
                            </div>

                            {/* Custom Country if 'Other' */}
                            {joinCountry === 'Other' && (
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">
                                  Specify Country Name *
                                </label>
                                <input
                                  id="enroll-custom-country-full"
                                  type="text"
                                  required
                                  placeholder="Enter country name"
                                  value={customJoinCountry}
                                  onChange={(e) => setCustomJoinCountry(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            )}

                            {/* State and District / City */}
                            {joinCountry === 'India' ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="font-bold text-foreground block mb-1 text-[11px]">State *</label>
                                  <SearchableSelect
                                    options={INDIAN_STATES.map(s => ({ id: s, name: s }))}
                                    value={joinState}
                                    onChange={(val) => {
                                      setJoinState(val);
                                      const dists = DISTRICTS_BY_STATE[val] || [];
                                      setJoinDistrict(dists[0] || 'Other / Custom District');
                                    }}
                                    placeholder="Select State"
                                    showSearch={true}
                                    className="w-full text-xs"
                                  />
                                </div>

                                <div>
                                  <label className="font-bold text-foreground block mb-1 text-[11px]">District / City *</label>
                                  <SearchableSelect
                                    options={(DISTRICTS_BY_STATE[joinState] || ['Other / Custom District']).map(d => ({ id: d, name: d }))}
                                    value={joinDistrict}
                                    onChange={(val) => setJoinDistrict(val)}
                                    placeholder="Select District"
                                    showSearch={true}
                                    className="w-full text-xs"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="font-bold text-foreground block mb-1 text-[11px]">
                                    State / Province / Region *
                                  </label>
                                  <input
                                    id="enroll-state-full"
                                    type="text"
                                    required
                                    placeholder="e.g. Dubai, California, Selangor"
                                    value={joinState}
                                    onChange={(e) => setJoinState(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                  />
                                </div>
                                <div>
                                  <label className="font-bold text-foreground block mb-1 text-[11px]">
                                    City / Town *
                                  </label>
                                  <input
                                    id="enroll-city-full"
                                    type="text"
                                    required
                                    placeholder="e.g. Downtown, City Area"
                                    value={joinDistrict}
                                    onChange={(e) => setJoinDistrict(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                  />
                                </div>
                              </div>
                            )}

                            {joinCountry === 'India' && joinDistrict === 'Other / Custom District' && (
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">Enter City / District Name *</label>
                                <input
                                  id="enroll-custom-district-full"
                                  type="text"
                                  required
                                  placeholder="Type your district or city name"
                                  value={customDistrict}
                                  onChange={(e) => setCustomDistrict(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="font-bold text-foreground block mb-1 text-[11px]">Door / Street / Area Address *</label>
                                <input
                                  id="enroll-street-full"
                                  type="text"
                                  required
                                  placeholder="Door No, Street Name, Landmark"
                                  value={joinStreet}
                                  onChange={(e) => setJoinStreet(e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="font-bold text-foreground block mb-1 text-[11px]">
                                  {joinCountry === 'India' ? 'Pincode *' : 'Postal / ZIP Code (Optional)'}
                                </label>
                                <input
                                  id="enroll-pincode-full"
                                  type="text"
                                  required={joinCountry === 'India'}
                                  maxLength={joinCountry === 'India' ? 6 : 12}
                                  placeholder={joinCountry === 'India' ? '6-digit pincode' : 'e.g. 90210'}
                                  value={joinPincode}
                                  onChange={(e) => {
                                    if (joinCountry === 'India') {
                                      setJoinPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                    } else {
                                      setJoinPincode(e.target.value.slice(0, 12));
                                    }
                                  }}
                                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-mono text-xs focus:outline-hidden focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Fee Breakdown */}
                          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-500/5 via-primary/5 to-muted/30 border border-border space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                  <CreditCard size={16} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs text-foreground">1st Installment Payment</h4>
                                  <p className="text-[10px] text-muted-foreground">Secure & encrypted checkout</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                <ShieldCheck size={12} />
                                <span>Instant Pass Activation</span>
                              </div>
                            </div>

                            <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-2 text-xs">
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>1st Installment (To Shop)</span>
                                <span className="font-mono font-bold text-foreground">{currency}{basePrice.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>Platform Fee</span>
                                <span className="font-mono text-foreground">{currency}{platformFee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-muted-foreground">
                                <span>Payment Gateway Fee</span>
                                <span className="font-mono text-foreground">{currency}{totalPgFee.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-border pt-2.5 flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-foreground block">Total Amount to Pay</span>
                                  <span className="text-[10px] text-muted-foreground">Includes all platform & PG charges</span>
                                </div>
                                <span className="font-mono font-black text-lg" style={{ color: primaryColor }}>
                                  {currency}{grandTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isJoining}
                            onClick={handleJoinSubmit}
                            className="w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 text-sm hover:brightness-110"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Lock size={15} />
                            <span>{isJoining ? 'Processing...' : `Confirm & Pay ${currency}${grandTotal.toFixed(2)}`}</span>
                            <ArrowRight size={16} />
                          </button>

                          <div className="pt-1 text-center space-y-1">
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              By continuing, you confirm that you trust <strong className="text-foreground">{shop?.name || 'this shop'}</strong> and agree to our{' '}
                              <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Terms of Service</a>
                              {', '}
                              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Privacy Policy</a>
                              {' & '}
                              <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Refund Policy</a>.
                            </p>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              ) : (
                /* RESPONSIVE 3-COLUMN SCHEMES GRID */
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 sm:mb-6">
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-foreground">Available Savings Schemes</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Choose a scheme to begin your weekly or monthly savings plan</p>
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border/60 self-start sm:self-center text-muted-foreground shrink-0">
                      {schemes.length} Scheme{schemes.length === 1 ? '' : 's'} Available
                    </span>
                  </div>

                  {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
                      ))}
                    </div>
                  ) : schemes.length === 0 ? (
                    <div className="text-center py-16 sm:py-20 bg-card border border-dashed border-border rounded-xl p-6 sm:p-8 space-y-3">
                      <Coins size={40} className="mx-auto text-muted-foreground/40" />
                      <h4 className="text-base font-bold text-foreground">No Active Schemes Available</h4>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This shop currently has no public savings schemes open for new enrollments. Please check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {schemes.map((scheme, idx) => (
                        <SchemeCard
                          key={scheme.id}
                          scheme={scheme}
                          idx={idx}
                          currency={currency}
                          primaryColor={primaryColor}
                          isTargetScheme={scheme.id === effectiveTargetSchemeId}
                          onEnroll={handleEnrollClick}
                          onViewRewards={(s) => setPreviewRewardsScheme({ title: s.title, items: s.items })}
                          onOpenImage={(url, title) => {
                            setLightboxImage(url);
                            setLightboxTitle(title || 'Scheme Banner');
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY SCHEME PASS */}
          {activeTab === 'my_pass' && (
            <div className="space-y-8">
              {/* Little Top Banner */}
              <div className="bg-card border border-border rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                    {displayName ? displayName.charAt(0).toUpperCase() : <User size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-foreground text-sm sm:text-base truncate">
                        {displayName || (customerPhone ? `+91 ${customerPhone}` : 'Scheme Member')}
                      </h4>
                      {customerPhone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Verified
                        </span>
                      )}
                    </div>
                    {customerPhone ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                        {passCountryCode} {customerPhone}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Link mobile number to check pass status
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleChangeAccount}
                  className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-3 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>

              {/* Passes List: 2-column Grid */}
              {isLoadingPasses ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[1, 2].map(i => (
                    <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : hasQueriedPasses && customerPasses.length === 0 ? (
                <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl p-8 space-y-3 max-w-lg mx-auto">
                  <ShieldCheck size={36} className="mx-auto text-muted-foreground/40" />
                  <h4 className="text-base font-bold text-foreground">No Schemes Found</h4>
                  <p className="text-xs text-muted-foreground">
                    No active scheme passes were found for mobile number <strong className="text-foreground">{customerPhone}</strong>.
                  </p>
                  <button
                    onClick={() => setActiveTab('schemes')}
                    className="text-xs font-bold underline cursor-pointer"
                    style={{ color: primaryColor }}
                  >
                    Browse available schemes to join
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {customerPasses.map(pass => {
                    const percent = Math.round((pass.paid_installments / pass.total_installments) * 100);
                    const isCompleted = pass.status === 'completed' || pass.paid_installments >= pass.total_installments;

                    return (
                      <div
                        key={pass.member_id}
                        className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-lg text-foreground">{pass.scheme_title}</h4>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                                  {pass.member_number || 'SCH-001'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Member: <strong className="text-foreground">{pass.customer_name}</strong> ({pass.customer_phone})
                              </p>
                            </div>

                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full capitalize shrink-0 ${
                              pass.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {pass.status}
                            </span>
                          </div>

                          {/* Progress Summary Card */}
                          <div className="bg-muted/40 p-4 rounded-xl space-y-2 border border-border/60">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground">
                                {pass.paid_installments} of {pass.total_installments} Installments Paid
                              </span>
                              <span className="font-black text-emerald-600 dark:text-emerald-400">
                                {percent}% Complete
                              </span>
                            </div>
                            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${percent}%`, backgroundColor: primaryColor }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <span className="text-muted-foreground font-mono">
                                Total Saved: {currency}{(pass.paid_installments * pass.price).toLocaleString()}
                              </span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                ⏳ {pass.remaining_installments} {pass.frequency === 'weekly' ? 'weeks' : 'months'} remaining
                              </span>
                            </div>
                          </div>

                          {/* Installments History Grid */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Installments Timeline
                              </span>
                              {!isCompleted && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  Next due: Due #{pass.paid_installments + 1}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                              {pass.installment_schedule.map(inst => {
                                const isNextDue = !inst.is_paid && inst.installment_number === pass.paid_installments + 1;
                                const isFutureDue = !inst.is_paid && inst.installment_number > pass.paid_installments + 1;

                                return (
                                  <button
                                    key={inst.installment_number}
                                    type="button"
                                    disabled={inst.is_paid || isCompleted}
                                    onClick={() => {
                                      if (!inst.is_paid && !isCompleted) {
                                        setPayingPass({ pass, targetClickedNum: inst.installment_number });
                                      }
                                    }}
                                    className={`p-2.5 rounded-xl text-center border text-[10px] font-semibold flex flex-col items-center justify-center transition-all ${
                                      inst.is_paid
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 cursor-default'
                                        : isCompleted
                                          ? 'bg-muted/30 text-muted-foreground border-border opacity-60 cursor-not-allowed'
                                          : isNextDue
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-400 dark:text-amber-300 dark:border-amber-600/70 shadow-2xs hover:scale-102 hover:bg-amber-500/20 cursor-pointer ring-1 ring-amber-500/30'
                                            : 'bg-background text-slate-600 border-border dark:text-slate-400 hover:border-amber-400/60 hover:bg-muted/50 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {inst.is_paid ? (
                                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                      ) : isNextDue ? (
                                        <CreditCard size={12} className="text-amber-500 shrink-0 animate-pulse" />
                                      ) : (
                                        <Clock size={12} className="text-slate-400 shrink-0" />
                                      )}
                                      <span className="font-bold">#{inst.installment_number}</span>
                                    </div>

                                    <span className="text-[9px] font-mono font-bold">
                                      {inst.is_paid ? 'PAID' : isNextDue ? 'PAY NOW' : 'DUE'}
                                    </span>

                                    {inst.is_paid && inst.paid_at && (
                                      <span className="text-[8px] text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 leading-tight block text-center opacity-90">
                                        {formatPaidDateTime(inst.paid_at)}
                                      </span>
                                    )}
                                    {!inst.is_paid && !isCompleted && isFutureDue && (
                                      <span className="text-[7.5px] text-muted-foreground mt-0.5">
                                        Pays #{pass.paid_installments + 1}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Attached Reward Products */}
                          {pass.items && pass.items.length > 0 && (
                            <div 
                              onClick={() => setSelectedPassForRewards(pass)}
                              className="bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 p-3 rounded-2xl text-xs flex items-center justify-between cursor-pointer transition-all group active:scale-99"
                            >
                              <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                                <Gift size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                                <span>Gift Box: {pass.items.length} items rewarded upon maturity</span>
                              </span>
                              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                <span className="underline group-hover:text-amber-800">View Rewards</span>
                                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action CTA */}
                        <div className="pt-4 border-t border-border mt-2">
                          {isCompleted ? (
                            <div className="w-full py-3 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold rounded-2xl text-center text-xs flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} />
                              <span>Scheme Fully Paid & Completed! Contact shop for delivery/pickup.</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPayingPass({ pass, targetClickedNum: pass.paid_installments + 1 })}
                              className="w-full py-3 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-xs hover:brightness-110"
                              style={{ backgroundColor: primaryColor }}
                            >
                              <CreditCard size={15} />
                              <span>Pay Due #{pass.paid_installments + 1} ({currency}{pass.price.toLocaleString()})</span>
                              <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEME PASSBOOK & HISTORY (Desktop / Full-Page View) */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* If no phone is verified yet, show clean compact lookup card */}
              {(!hasQueriedPasses || !customerPhone) ? (
                <div className="bg-card border border-border rounded-xl p-8 sm:p-10 shadow-xs text-center space-y-5 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                    <History size={28} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-black text-lg text-foreground">Passbook & Activity History</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                      Enter your registered phone number to verify and view all your savings scheme enrollments, monthly installment receipts, scheme transfers and cancellations.
                    </p>
                  </div>
                  <form onSubmit={handleLookupHistory} className="space-y-3.5 pt-2 max-w-md mx-auto">
                    <div className="flex gap-2 text-left">
                      <div className="w-32 shrink-0">
                        <SearchableSelect
                          options={COUNTRY_CODES.map(c => ({
                            id: c.code,
                            name: `${c.flag} ${c.code}`,
                            subtext: c.country
                          }))}
                          value={passCountryCode}
                          onChange={(val) => setPassCountryCode(val)}
                          placeholder="+91"
                          showSearch={false}
                          className="h-11 rounded-xl bg-muted/50 border-border text-xs font-semibold"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                          type="tel"
                          value={lookupPhoneInput}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setLookupPhoneInput(val);
                          }}
                          placeholder="10-digit mobile number"
                          className="w-full text-xs font-mono font-bold bg-muted/50 border border-border rounded-xl py-3 pl-9 pr-3.5 text-foreground placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoadingPasses || (lookupPhoneInput.length < 7)}
                      className="w-full py-3 px-5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-98 disabled:opacity-50"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {isLoadingPasses ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Searching Records...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={15} />
                          <span>View Scheme History</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Top Member Banner */}
                  <div className="w-full bg-card border border-border rounded-xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
                        {displayName ? displayName.charAt(0).toUpperCase() : <User size={20} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-foreground text-base sm:text-lg truncate">
                            {displayName || `+91 ${customerPhone}`}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Verified
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                          {passCountryCode} {customerPhone} • {customerHistory.length} passbook record{customerHistory.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleChangeAccount}
                      className="text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline px-3.5 py-1.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer shrink-0"
                    >
                      Change Number
                    </button>
                  </div>

                  {isLoadingPasses ? (
                    <div className="p-12 text-center text-xs text-muted-foreground">Fetching passbook history...</div>
                  ) : customerHistory.length === 0 ? (
                    <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl p-8 space-y-3.5 max-w-lg mx-auto">
                      <div className="w-14 h-14 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                        <History size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-foreground">No Passbook Activity Recorded</h4>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                          No enrollments, monthly installment receipts or transfer activities were found for {customerPhone}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateToTab('schemes')}
                        className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer inline-flex items-center gap-2"
                        style={{ backgroundColor: primaryColor }}
                      >
                        <Gift size={15} />
                        <span>Browse Available Schemes</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/80 w-full">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                            <History size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm sm:text-base text-foreground">Complete Passbook History</h4>
                            <span className="text-[11px] sm:text-xs text-muted-foreground">Chronological record of enrollments, payments, transfers & cancellations</span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-2.5 py-1 rounded-full self-start sm:self-auto shrink-0">
                          {customerHistory.length} event{customerHistory.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 w-full">
                        {customerHistory.map(log => {
                          const isDelete = log.action_type === 'DELETED';
                          const isTransfer = log.action_type === 'TRANSFERRED';
                          const isPayment = log.action_type === 'PAYMENT_RECORDED';

                          return (
                            <div
                              key={log.id}
                              className={`p-4 rounded-xl border text-xs space-y-2 flex flex-col justify-between ${
                                isDelete
                                  ? 'border-rose-500/30 bg-rose-500/5'
                                  : isTransfer
                                    ? 'border-amber-500/30 bg-amber-500/5'
                                    : isPayment
                                      ? 'border-emerald-500/30 bg-emerald-500/5'
                                      : 'border-border/70 bg-card shadow-2xs'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className={`font-bold px-2 py-0.5 rounded-md uppercase tracking-wider text-[9px] ${
                                    isDelete
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                      : isTransfer
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                        : isPayment
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : 'bg-muted text-foreground'
                                  }`}>
                                    {isDelete ? 'Cancelled' : isTransfer ? 'Scheme Changed' : isPayment ? 'Installment Paid' : 'Joined Scheme'}
                                  </span>
                                  <span className="text-muted-foreground font-mono text-[10.5px]">
                                    {formatPaidDateTime(log.created_at) || new Date(log.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className="flex items-baseline justify-between pt-1">
                                  <h5 className="font-bold text-foreground text-sm">
                                    {isTransfer ? `${log.from_scheme_title} ➔ ${log.to_scheme_title}` : log.scheme_title}
                                  </h5>
                                  {log.amount !== null && log.amount !== undefined && (
                                    <span className={`font-mono font-bold text-sm ${isDelete ? 'text-rose-600' : 'text-emerald-600'}`}>
                                      {isDelete ? `Refund: ${currency}${log.amount.toLocaleString()}` : `${currency}${log.amount.toLocaleString()}`}
                                    </span>
                                  )}
                                </div>

                                {log.notes && (
                                  <p className="text-[11px] text-muted-foreground italic mt-1">
                                    "{log.notes}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10.5px] text-muted-foreground">
                                {log.member_number && <span>Pass: <strong className="font-mono text-foreground">{log.member_number}</strong></span>}
                                {log.otp_verified && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <ShieldCheck size={12} /> Verified via Customer SMS OTP
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* INSTALLMENT PAYMENT MODAL */}
        <AnimatePresence>
          {payingPass && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <CreditCard size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Pay Scheme Installment</h4>
                      <span className="text-[10px] text-muted-foreground">{payingPass.pass.scheme_title}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center cursor-pointer"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Member and Target Due Info */}
                <div className="bg-muted/40 p-3 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Member:</span>
                    <span className="font-bold text-foreground">{payingPass.pass.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pass Number:</span>
                    <span className="font-mono font-bold text-foreground">{payingPass.pass.member_number || 'SCH-001'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installment Target:</span>
                    <span className="font-black text-amber-600 dark:text-amber-400 font-mono">
                      Due #{payingPass.pass.paid_installments + 1}
                    </span>
                  </div>
                </div>

                {/* Sequential allocation reminder if they selected a future due */}
                {payingPass.targetClickedNum > payingPass.pass.paid_installments + 1 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 rounded-lg text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      You tapped <strong>Due #{payingPass.targetClickedNum}</strong>. Installments must be cleared sequentially, so this payment is automatically allocated to your next pending installment: <strong>Due #{payingPass.pass.paid_installments + 1}</strong>.
                    </span>
                  </div>
                )}

                {/* Fee Breakdown */}
                <div className="bg-background border border-border p-3.5 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Installment Amount ({payingPass.pass.frequency})</span>
                    <span className="font-mono font-semibold text-foreground">{currency}{installmentBasePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Platform Fee</span>
                    <span className="font-mono">{currency}{instPlatformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Payment Gateway Fee</span>
                    <span className="font-mono">{currency}{instTotalPgFee.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-border/80 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Total Payable</span>
                    <span className="font-mono text-base" style={{ color: primaryColor }}>
                      {currency}{instGrandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayingPass(null)}
                    className="flex-1 py-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePayInstallmentSubmit}
                    disabled={isPayingInstallment}
                    className="flex-2 py-2.5 rounded-lg text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all disabled:opacity-50 hover:brightness-110"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Lock size={14} />
                    <span>{isPayingInstallment ? 'Processing...' : `Confirm & Pay ${currency}${instGrandTotal.toFixed(2)}`}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground pt-1 leading-snug">
                  By continuing, you accept our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Terms</a>
                  {', '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Privacy</a>
                  {' & '}
                  <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-foreground">Refunds</a>.
                </p>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Reused Mobile Number OTP Verification Modal */}
        {showOtpModal && (
          <DiscountUnlockPopup
            shopId={effectiveShopId}
            initialStep={otpModalStep}
            onClose={() => {
              setShowOtpModal(false);
              setPendingEnrollScheme(null);
            }}
            onUnlock={() => {
              setShowOtpModal(false);
              const savedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || customerPhone;
              const digits = savedMobile.replace(/\D/g, '').slice(-10);
              const savedCountryCode = localStorage.getItem('customer_country_code') || '+91';
              const savedName = localStorage.getItem('customer_name') || '';

              setCustomerPhone(digits);
              setLookupPhoneInput(digits);
              setPassCountryCode(savedCountryCode);
              if (savedName) setCustomerName(savedName);

              setJoinPhone(digits);
              setJoinCountryCode(savedCountryCode);
              if (savedName) setJoinName(savedName);
              const savedStreet = cleanAddressDisplay(localStorage.getItem('customer_street') || localStorage.getItem('customer_address') || '');
              if (savedStreet) setJoinStreet(savedStreet);
              const savedDistrict = localStorage.getItem('customer_district');
              if (savedDistrict) setJoinDistrict(savedDistrict);
              const savedState = localStorage.getItem('customer_state');
              if (savedState) setJoinState(savedState);
              const savedPincode = localStorage.getItem('customer_pincode');
              if (savedPincode) setJoinPincode(savedPincode);
              const savedCountry = localStorage.getItem('customer_country');
              if (savedCountry) {
                if (COUNTRY_OPTIONS.some(c => c.id === savedCountry)) {
                  setJoinCountry(savedCountry);
                } else {
                  setJoinCountry('Other');
                  setCustomJoinCountry(savedCountry);
                }
              }

              const fullPhone = savedCountryCode === '+91' ? digits : `${savedCountryCode}${digits}`;
              fetchCustomerPasses(fullPhone);

              if (pendingEnrollScheme) {
                const targetScheme = pendingEnrollScheme;
                setPendingEnrollScheme(null);
                navigateToSchemeJoin(targetScheme);
                toast.success(`Verified! Ready to enroll in ${targetScheme.title}`);
              } else {
                toast.success('Mobile verified! Your scheme pass is unlocked.');
              }
            }}
          />
        )}

        {/* Rewards BottomSheet for Scheme Pass Items */}
        <BottomSheet
          isOpen={Boolean(selectedPassForRewards)}
          onClose={() => setSelectedPassForRewards(null)}
          title={selectedPassForRewards ? `${selectedPassForRewards.scheme_title} Rewards` : 'Scheme Rewards'}
        >
          {selectedPassForRewards && (
            <div className="space-y-4 pb-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {selectedPassForRewards.items?.length || 0} item{selectedPassForRewards.items?.length === 1 ? '' : 's'} rewarded upon completing all {selectedPassForRewards.total_installments} installments
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                  Guaranteed
                </span>
              </div>

              <div className="space-y-2.5">
                {selectedPassForRewards.items && selectedPassForRewards.items.length > 0 ? (
                  selectedPassForRewards.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Gift size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                        {item.variant_name && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                            {item.variant_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                            Qty: {item.quantity}
                          </span>
                          {item.price > 0 && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Worth {currency}{item.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedPassForRewards(null)}
                className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
              >
                Close
              </button>
            </div>
          )}
        </BottomSheet>

        {/* Scheme Rewards Preview BottomSheet */}
        <BottomSheet
          isOpen={Boolean(previewRewardsScheme)}
          onClose={() => setPreviewRewardsScheme(null)}
          title={previewRewardsScheme ? `${previewRewardsScheme.title} Rewards` : 'Scheme Rewards'}
        >
          {previewRewardsScheme && (
            <div className="space-y-4 pb-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                  <span className="text-[11px] text-muted-foreground block">
                    {previewRewardsScheme.items?.length || 0} reward item{previewRewardsScheme.items?.length === 1 ? '' : 's'} included with this scheme
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                  Guaranteed
                </span>
              </div>

              <div className="space-y-2.5">
                {previewRewardsScheme.items && previewRewardsScheme.items.length > 0 ? (
                  previewRewardsScheme.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Gift size={24} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                        {item.variant_name && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                            {item.variant_name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                            Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPreviewRewardsScheme(null)}
                className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
              >
                Close
              </button>
            </div>
          )}
        </BottomSheet>

        {/* Lightbox for Scheme Banner Full View in Full Page mode */}
        <Lightbox
          isOpen={Boolean(lightboxImage)}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage || ''}
          altText={lightboxTitle}
        />
      </div>
    );
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        transition={{ type: 'spring', damping: 26, stiffness: 360 }}
        className="w-full max-w-lg flex flex-col my-auto"
      >
        {modalInner}
      </motion.div>

      {/* Reused Mobile Number OTP Verification Modal */}
      {showOtpModal && (
        <DiscountUnlockPopup
          shopId={effectiveShopId}
          initialStep={otpModalStep}
          onClose={() => {
            setShowOtpModal(false);
            setPendingEnrollScheme(null);
          }}
          onUnlock={() => {
            setShowOtpModal(false);
            const savedMobile = localStorage.getItem('customer_mobile') || localStorage.getItem('customer_phone') || customerPhone;
            const digits = savedMobile.replace(/\D/g, '').slice(-10);
            const savedCountryCode = localStorage.getItem('customer_country_code') || '+91';
            const savedName = localStorage.getItem('customer_name') || '';

            setCustomerPhone(digits);
            setLookupPhoneInput(digits);
            setPassCountryCode(savedCountryCode);
            if (savedName) setCustomerName(savedName);

            setJoinPhone(digits);
            setJoinCountryCode(savedCountryCode);
            if (savedName) setJoinName(savedName);
            const savedStreet = cleanAddressDisplay(localStorage.getItem('customer_street') || localStorage.getItem('customer_address') || '');
            if (savedStreet) setJoinStreet(savedStreet);
            const savedDistrict = localStorage.getItem('customer_district');
            if (savedDistrict) setJoinDistrict(savedDistrict);
            const savedState = localStorage.getItem('customer_state');
            if (savedState) setJoinState(savedState);
            const savedPincode = localStorage.getItem('customer_pincode');
            if (savedPincode) setJoinPincode(savedPincode);
            const savedCountry = localStorage.getItem('customer_country');
            if (savedCountry) {
              if (COUNTRY_OPTIONS.some(c => c.id === savedCountry)) {
                setJoinCountry(savedCountry);
              } else {
                setJoinCountry('Other');
                setCustomJoinCountry(savedCountry);
              }
            }

            const fullPhone = savedCountryCode === '+91' ? digits : `${savedCountryCode}${digits}`;
            fetchCustomerPasses(fullPhone);

            if (pendingEnrollScheme) {
              const targetScheme = pendingEnrollScheme;
              setPendingEnrollScheme(null);
              navigateToSchemeJoin(targetScheme);
              toast.success(`Verified! Ready to enroll in ${targetScheme.title}`);
            } else {
              toast.success('Mobile verified! Your scheme pass is unlocked.');
            }
          }}
        />
      )}

      {/* Rewards BottomSheet for Scheme Pass Items */}
      <BottomSheet
        isOpen={Boolean(selectedPassForRewards)}
        onClose={() => setSelectedPassForRewards(null)}
        title={selectedPassForRewards ? `${selectedPassForRewards.scheme_title} Rewards` : 'Scheme Rewards'}
      >
        {selectedPassForRewards && (
          <div className="space-y-4 pb-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                <span className="text-[11px] text-muted-foreground block">
                  {selectedPassForRewards.items?.length || 0} item{selectedPassForRewards.items?.length === 1 ? '' : 's'} rewarded upon completing all {selectedPassForRewards.total_installments} installments
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                Guaranteed
              </span>
            </div>

            <div className="space-y-2.5">
              {selectedPassForRewards.items && selectedPassForRewards.items.length > 0 ? (
                selectedPassForRewards.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Gift size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                          {item.variant_name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                          Qty: {item.quantity}
                        </span>
                        {item.price > 0 && (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Worth {currency}{item.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedPassForRewards(null)}
              className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Scheme Rewards Preview BottomSheet */}
      <BottomSheet
        isOpen={Boolean(previewRewardsScheme)}
        onClose={() => setPreviewRewardsScheme(null)}
        title={previewRewardsScheme ? `${previewRewardsScheme.title} Rewards` : 'Scheme Rewards'}
      >
        {previewRewardsScheme && (
          <div className="space-y-4 pb-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-extrabold text-foreground text-xs block">Guaranteed Completion Gift Box</span>
                <span className="text-[11px] text-muted-foreground block">
                  {previewRewardsScheme.items?.length || 0} reward item{previewRewardsScheme.items?.length === 1 ? '' : 's'} included with this scheme
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20 shrink-0">
                Guaranteed
              </span>
            </div>

            <div className="space-y-2.5">
              {previewRewardsScheme.items && previewRewardsScheme.items.length > 0 ? (
                previewRewardsScheme.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/40 border border-border/80 rounded-2xl shadow-2xs"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border/80"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                        <Gift size={24} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 block mt-0.5">
                          {item.variant_name}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-background border border-border text-foreground font-bold">
                          Qty: {item.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">No specific items listed for this scheme.</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPreviewRewardsScheme(null)}
              className="w-full py-3 bg-foreground text-background font-bold rounded-xl text-xs shadow-sm hover:opacity-90 active:scale-98 transition-all cursor-pointer mt-2"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>

      {renderTrustConfirmationModal()}

      {/* Lightbox for Scheme Banner Full View */}
      <Lightbox
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage || ''}
        altText={lightboxTitle}
      />
    </div>
  );
};
