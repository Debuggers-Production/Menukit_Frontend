import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';


import {
  Send,
  Users,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  RefreshCw,
  Trash2,
  Upload,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  UserPlus,
  Flame,
  Globe,
  Store,
  Check,
  Smartphone,
  Eye,
  X,
  Maximize2,
  Minimize2,
  Info,
  Radio,
  Megaphone,
  Search,
  Filter,
  Coins,
  CreditCard,
  Plus,
  Wallet,
  ShieldCheck,
  Lock,
  PartyPopper,
  Copy,
} from 'lucide-react';


import confetti from 'canvas-confetti';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/services/api';
import { broadcastService, BroadcastCampaign } from '@/services/broadcastService';

import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'react-hot-toast';

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?fm=jpg&w=800&q=90";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};



const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India (+91)' },
  { code: '+1', flag: '🇺🇸', label: 'USA / Canada (+1)' },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)' },
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)' },
  { code: '+65', flag: '🇸🇬', label: 'Singapore (+65)' },
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)' },
  { code: '+94', flag: '🇱🇰', label: 'Sri Lanka (+94)' },
  { code: '+966', flag: '🇸🇦', label: 'Saudi Arabia (+966)' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar (+974)' },
  { code: '+968', flag: '🇴🇲', label: 'Oman (+968)' },
  { code: '+965', flag: '🇰🇼', label: 'Kuwait (+965)' },
  { code: '+973', flag: '🇧🇭', label: 'Bahrain (+973)' },
];

export const CampaignsPage: React.FC = () => {
  const { currentShop } = useShopStore();

  // Campaign Form State
  const [message, setMessage] = useState('We are currently providing a special 20% discount on all orders today! Visit our digital store now to claim your offer.');
  const [useShopBanner, setUseShopBanner] = useState(true);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto expand message textarea on content change
  useEffect(() => {
    if (messageTextareaRef.current) {
      messageTextareaRef.current.style.height = 'auto';
      messageTextareaRef.current.style.height = `${Math.max(100, Math.min(300, messageTextareaRef.current.scrollHeight))}px`;
    }
  }, [message]);

  // Audience Filtering State

  const [targetAudience, setTargetAudience] = useState<'all' | 'new' | 'min_visits'>('all');
  const [minVisits, setMinVisits] = useState(2);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  // Delivery Scheduling State
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('12:00');

  // Test Message State
  const [testCountryCode, setTestCountryCode] = useState('+91');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Floating Mini-Screen & Full View Preview States
  const [isFloatingPreviewOpen, setIsFloatingPreviewOpen] = useState(true);
  const [isFloatingPreviewMinimized, setIsFloatingPreviewMinimized] = useState(false);
  const [isFullViewOpen, setIsFullViewOpen] = useState(false);
  const dragControls = useDragControls();

  // Employee Permissions Check
  const { canWrite } = usePermissions('marketing');

  // Broadcast Credits & Top-Up States (1 credit = ₹1 = 1 recipient)
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupCredits, setTopupCredits] = useState<number>(50);
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);

  // Celebration Cracker Pop-up States
  const [showCelebrationPopup, setShowCelebrationPopup] = useState(false);
  const [lastLaunchedCampaign, setLastLaunchedCampaign] = useState<{ title: string; count: number; mode: string } | null>(null);

  // History Details Modal Preview State
  const [selectedHistoryCampaign, setSelectedHistoryCampaign] = useState<BroadcastCampaign | null>(null);


  // Cracker / Confetti Celebration Burst
  const triggerCelebrationCrackers = () => {
    const end = Date.now() + 1800;
    const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f97316', '#eab308'];

    // Left and right cracker fireworks cannons
    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: colors,
        zIndex: 10000,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: colors,
        zIndex: 10000,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Center celebratory explosion
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.55 },
      zIndex: 10000,
      colors: colors,
    });
  };


  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaigns, setCampaigns] = useState<BroadcastCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'studio' | 'history'>('studio');

  // Broadcast History Search, Date Filter & Infinite Scroll States
  const [historySearch, setHistorySearch] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistory, setTotalHistory] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // Previously Used Images Media Library
  const [mediaLibrary, setMediaLibrary] = useState<string[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const { setTitle: setHeaderTitle } = useHeaderStore();

  useEffect(() => {
    setHeaderTitle('Campaigns', 'Engage customers directly with rich WhatsApp broadcast campaigns.');
  }, [setHeaderTitle]);

  // Load available messaging credits
  const loadCredits = async () => {
    setIsLoadingCredits(true);
    try {
      const res = await broadcastService.getCredits();
      setAvailableCredits(res.available_credits);
    } catch (err) {
      console.error('Failed to load broadcast credits', err);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, [currentShop?.id]);

  // Top-Up Payment Handler (Razorpay & Mock)
  const handleTopupPayment = async () => {
    if (topupCredits < 1) {
      toast.error('Please enter at least 1 credit to recharge');
      return;
    }

    setIsProcessingTopup(true);
    try {
      const orderData = await broadcastService.createTopupOrder(topupCredits);

      if (orderData.mock_mode) {
        const verifyRes = await broadcastService.verifyTopup({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_verified_sig',
          credits: topupCredits,
        });
        setAvailableCredits(verifyRes.available_credits);
        setIsTopupModalOpen(false);
        toast.success(`Successfully recharged ${topupCredits} broadcast credits!`);
        return;
      }

      // Real Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay payment gateway. Please check your internet connection.');
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: currentShop?.name || 'Menukit Marketing',
        description: `Recharge ${topupCredits} WhatsApp Broadcast Credits`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const verifyRes = await broadcastService.verifyTopup({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              credits: topupCredits,
            });
            setAvailableCredits(verifyRes.available_credits);
            setIsTopupModalOpen(false);
            toast.success(`Successfully recharged ${topupCredits} broadcast credits!`);
          } catch (vErr: any) {
            toast.error(vErr.response?.data?.detail || 'Payment verification failed');
          }
        },
        prefill: {
          name: currentShop?.name || 'Shop Owner',
          email: currentShop?.user?.email || '',
          contact: currentShop?.phone || '',
        },
        theme: {
          color: '#f59e0b',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to initiate payment');
    } finally {
      setIsProcessingTopup(false);
    }
  };




  // Load previously used media library
  const loadMediaLibrary = async () => {
    setIsLoadingMedia(true);
    try {
      const urls = await broadcastService.getMediaLibrary();
      setMediaLibrary(urls);
    } catch (err) {
      console.error('Failed to load media library', err);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadMediaLibrary();
  }, [currentShop?.id]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Load audience count when segment options change
  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      setIsLoadingCount(true);
      try {
        const res = await broadcastService.getAudienceCount(targetAudience, minVisits);
        if (isMounted) {
          setAudienceCount(res.count);
        }
      } catch (err) {
        console.error('Failed to load audience count', err);
      } finally {
        if (isMounted) setIsLoadingCount(false);
      }
    };
    fetchCount();
    return () => {
      isMounted = false;
    };
  }, [targetAudience, minVisits, currentShop?.id]);

  // Load campaigns history with search, date filter, and pagination
  const loadCampaigns = async (pageToFetch: number = 1, isAppending: boolean = false) => {
    if (isAppending) {
      setIsLoadingMore(true);
    } else {
      setIsLoadingCampaigns(true);
    }

    try {
      const res = await broadcastService.listCampaigns({
        search: historySearch.trim() || undefined,
        date_filter: historyDate || undefined,
        page: pageToFetch,
        page_size: 15,
      });

      if (isAppending) {
        setCampaigns((prev) => [...prev, ...res.items]);
      } else {
        setCampaigns(res.items);
      }
      setHistoryPage(res.page);
      setTotalHistory(res.total);
      setHasMoreHistory(res.has_more);
    } catch (err) {
      console.error('Failed to load campaigns list', err);
    } finally {
      setIsLoadingCampaigns(false);
      setIsLoadingMore(false);
    }
  };

  // Debounced search & date filter trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      loadCampaigns(1, false);
    }, 300);
    return () => clearTimeout(handler);
  }, [historySearch, historyDate, currentShop?.id]);

  // Infinite scroll IntersectionObserver
  useEffect(() => {
    if (!hasMoreHistory || isLoadingMore || isLoadingCampaigns || activeTab !== 'history') return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreHistory && !isLoadingMore && !isLoadingCampaigns) {
          loadCampaigns(historyPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '120px' }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
      observer.disconnect();
    };
  }, [hasMoreHistory, isLoadingMore, isLoadingCampaigns, historyPage, activeTab]);

  // Image Upload handler with MinIO replacement cleanup & 4-image limit
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    // Enforce 4-image history limit
    if (mediaLibrary.length >= 4 && !mediaLibrary.includes(customImageUrl)) {
      toast.error('Media library limit reached (4/4). Please delete an existing image below before uploading a new banner.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const prevUrl = customImageUrl;
    setIsUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'banners');
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url || res.data.file_url;
      if (url) {
        // If there was an unsaved replaced custom image, delete it from MinIO
        if (prevUrl && prevUrl !== url && prevUrl.includes('/uploads/')) {
          try {
            await broadcastService.deleteUploadedImage(prevUrl);
          } catch (delErr) {
            console.warn('Failed to clean up replaced MinIO image:', delErr);
          }
        }

        setCustomImageUrl(url);
        setUseShopBanner(false);
        setMediaLibrary((prev) => [url, ...prev.filter((u) => u !== url)].slice(0, 4));
        toast.success('Image uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  // Delete previously used image from MinIO and media library
  const handleDeleteMedia = async (urlToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await broadcastService.deleteMediaLibraryImage(urlToDelete);
      setMediaLibrary((prev) => prev.filter((u) => u !== urlToDelete));
      if (customImageUrl === urlToDelete) {
        setCustomImageUrl('');
        setUseShopBanner(true);
      }
      toast.success('Image deleted from storage and media library');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete image');
    }
  };


  // Quick preset templates
  const applyPreset = (text: string) => {
    setMessage(text);
  };

  // Test Message Sender (Costs 1 credit = ₹1)
  const handleSendTest = async () => {
    const cleanNumber = testPhoneNumber.replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 7) {
      toast.error('Please enter a valid WhatsApp phone number for testing');
      return;
    }
    if (!message.trim()) {
      toast.error('Please enter your message text first');
      return;
    }
    if (availableCredits < 1) {
      setTopupCredits(5);
      setIsTopupModalOpen(true);
      toast.error('Insufficient credits. You need 1 credit (₹1.00) to send a test message.');
      return;
    }

    setIsSendingTest(true);
    try {
      const activeImg = useShopBanner ? DEFAULT_BANNER : customImageUrl;
      const fullPhone = `${testCountryCode}${cleanNumber}`;
      await broadcastService.sendTestMessage(fullPhone, message.trim(), activeImg);
      toast.success(`Test WhatsApp template sent to ${fullPhone} (1 credit used)!`);
      loadCredits();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send test message');
    } finally {
      setIsSendingTest(false);
    }
  };


  // Campaign Dispatch / Schedule
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Please enter campaign message text');
      return;
    }
    if (deliveryMode === 'schedule' && !scheduledDate) {
      toast.error('Please select a date and time for scheduled delivery');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeImg = useShopBanner ? null : (customImageUrl.trim() || null);
      const scheduleIso = deliveryMode === 'schedule' && scheduledDate 
        ? new Date(`${scheduledDate}T${scheduledTime || '12:00'}:00`).toISOString() 
        : null;

      await broadcastService.createCampaign({
        message: message.trim(),
        image_url: activeImg,
        target_audience: targetAudience,
        min_visits: targetAudience === 'min_visits' ? Number(minVisits) : undefined,
        scheduled_at: scheduleIso,
      });

      // Trigger Celebration Fireworks / Crackers Popup
      triggerCelebrationCrackers();
      setLastLaunchedCampaign({
        title: message.trim().slice(0, 40),
        count: audienceCount ?? 0,
        mode: deliveryMode,
      });
      setShowCelebrationPopup(true);

      toast.success(
        deliveryMode === 'schedule'
          ? '🎉 Campaign scheduled successfully!'
          : '🚀 Broadcast launched! WhatsApp messages are being sent...'
      );

      loadCredits();
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to launch campaign');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleCancelCampaign = async (id: string) => {
    try {
      await broadcastService.cancelCampaign(id);
      toast.success('Campaign removed');
      loadCampaigns();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel campaign');
    }
  };

  const currentPreviewImage = useShopBanner ? DEFAULT_BANNER : (customImageUrl || DEFAULT_BANNER);
  const shopDisplayName = currentShop?.name || 'Siva Hotel';

  // Realistic WhatsApp Chat Simulation Frame
  const renderWhatsAppPreviewContent = () => (
    <div className="bg-[#EFEAE2] dark:bg-[#0B141A] rounded-[24px] overflow-hidden shadow-inner flex flex-col h-full border border-slate-300 dark:border-slate-800 select-none">
      {/* WhatsApp Chat Top Header */}
      <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white p-2.5 sm:p-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-black border border-white/20">
            <Store size={15} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h4 className="font-extrabold text-xs tracking-tight truncate max-w-[130px]">{shopDisplayName}</h4>
              <CheckCircle2 size={11} className="text-emerald-300 fill-emerald-500" />
            </div>
            <p className="text-[8px] text-emerald-100 opacity-80">Official Business Account</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/80">
          <Globe size={14} />
        </div>
      </div>

      {/* WhatsApp Chat Area with Wallpaper texture */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[radial-gradient(#0000000a_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:12px_12px]">
        {/* Security Encryption Notice */}
        <div className="bg-[#FFF5C4] dark:bg-[#182229] border border-amber-200/60 dark:border-slate-800 rounded-xl px-2.5 py-1 text-center text-[8.5px] text-amber-900 dark:text-amber-300/80 max-w-[240px] mx-auto shadow-xs">
          🔒 Messages are end-to-end encrypted.
        </div>

        {/* WhatsApp Message Bubble */}
        <div className="bg-white dark:bg-[#1F2C34] rounded-2xl rounded-tl-xs shadow-md border border-slate-200/70 dark:border-slate-800/80 overflow-hidden max-w-[270px]">
          {/* Header Image Attachment */}
          <div className="relative h-32 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
            <img
              src={currentPreviewImage}
              alt="Campaign Header"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_BANNER;
              }}
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[8.5px] font-bold text-white uppercase tracking-wider">
              Offer
            </div>
          </div>

          {/* Body Content */}
          <div className="p-3 space-y-1.5 text-slate-800 dark:text-slate-100 text-xs leading-relaxed">
            <p className="font-extrabold text-slate-900 dark:text-white text-xs">
              Hi Siva 👋
            </p>
            <p className="text-slate-600 dark:text-slate-300 text-[10.5px]">
              This is from <span className="font-bold text-slate-900 dark:text-white">{shopDisplayName}</span>.
            </p>
            
            <div 
              data-lenis-prevent 
              className="text-slate-800 dark:text-slate-200 text-xs whitespace-pre-wrap font-medium bg-amber-500/5 p-2 rounded-xl border border-amber-500/10 max-h-[140px] overflow-y-auto overscroll-contain"
            >
              {message || 'Your custom offer details will appear here...'}
            </div>


            <p className="text-slate-500 dark:text-slate-400 text-[9.5px] italic">
              Thank you for choosing us! 🥰
            </p>

            <div className="flex justify-end items-center gap-1 text-[8.5px] text-slate-400 pt-0.5">
              <span>5:39 PM</span>
              <Check size={10} className="text-blue-500" />
            </div>
          </div>

          {/* Call to Action Button */}
          <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-full py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1 shadow-xs">
              <ExternalLink size={12} />
              <span>Visit Shop</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom WhatsApp bar mockup */}
      <div className="bg-[#F0F2F5] dark:bg-[#1F2C34] py-1.5 px-3 border-t border-slate-200 dark:border-slate-800 text-[9px] text-slate-400 text-center font-semibold shrink-0">
        Official WhatsApp Business Broadcast
      </div>
    </div>
  );

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(document.getElementById('header-actions-portal'));
  }, []);

  const renderTabSwitcher = () => (
    <div className="flex items-center gap-2">
      {/* Broadcast Credits Badge & Topup Trigger */}
      <button
        type="button"
        onClick={() => {
          setTopupCredits(50);
          setIsTopupModalOpen(true);
        }}
        className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        title="WhatsApp Broadcast Messaging Credits (₹1/message)"
      >
        <Coins size={13} className="text-amber-500" />
        <span>{isLoadingCredits ? '...' : `${availableCredits} Credits`}</span>
        <span className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
          <Plus size={9} strokeWidth={3} /> Top Up
        </span>
      </button>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'studio'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio size={13} className="text-amber-500" />
          <span>Campaign Studio</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock size={13} className="text-blue-500" />
          <span>Broadcast History</span>
          {campaigns.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
              {campaigns.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="px-1.5 sm:px-5 py-3 sm:py-5 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Teleport Tab Switcher to Top Navigation Bar on Desktop */}
      {portalNode && createPortal(renderTabSwitcher(), portalNode)}

      {/* Mobile Top Header: Balance & Tab Switcher */}
      <div className="lg:hidden w-full space-y-2">
        <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-amber-500" />
            <div>
              <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                {availableCredits} Credits Available
              </span>
              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">Rate: ₹1.00 / message</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTopupCredits(50);
              setIsTopupModalOpen(true);
            }}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Plus size={12} strokeWidth={3} /> Top Up
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('studio')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio size={13} className="text-amber-500" />
            <span>Campaign Studio</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock size={13} className="text-blue-500" />
            <span>Broadcast History</span>
            {campaigns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                {campaigns.length}
              </span>
            )}
          </button>
        </div>
      </div>



      {activeTab === 'studio' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ================= LEFT COLUMN: STUDIO BUILDER ================= */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sm:space-y-5">


              {/* 1. Message Text */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Campaign Message <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {message.length} chars
                  </span>
                </div>
                <textarea
                  ref={messageTextareaRef}
                  data-lenis-prevent
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter custom discount details, festival greetings, or new menu item announcements..."
                  className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-y overscroll-contain overflow-y-auto min-h-[100px] max-h-[300px] leading-relaxed"
                  required
                />
                
                {/* Preset Suggestions */}
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2.5">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 py-1">Quick Suggestions:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('🎉 Exclusive Weekend Treat! Enjoy 20% OFF on all your favorite meals. Order online now!')}
                    className="text-[10px] sm:text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    🔥 20% Weekend Offer
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('🍲 New Chef Specials just landed on our menu! Check out the mouth-watering delicacies waiting for you.')}
                    className="text-[10px] sm:text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    ✨ New Menu Specials
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('❤️ We miss you! Here is a special discount voucher for your next order with us today.')}
                    className="text-[10px] sm:text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-xl transition-all cursor-pointer"
                  >
                    💌 Customer Re-engagement
                  </button>
                </div>
              </div>


              {/* 2. Header Media Attachment */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Header Media Attachment
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                  <div
                    onClick={() => setUseShopBanner(true)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      useShopBanner
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${useShopBanner ? 'bg-amber-500 text-white' : 'border-2 border-slate-300'}`}>
                      {useShopBanner && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Shop Banner (Default)</h5>
                      <p className="text-[10px] text-slate-400">Uses shop's official theme banner</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setUseShopBanner(false)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      !useShopBanner
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${!useShopBanner ? 'bg-amber-500 text-white' : 'border-2 border-slate-300'}`}>
                      {!useShopBanner && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Custom Campaign Image</h5>
                      <p className="text-[10px] text-slate-400">Upload or link custom banner</p>
                    </div>
                  </div>
                </div>

                {!useShopBanner && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800"
                  >
                    {/* URL Input & Upload Button */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        placeholder="https://example.com/banner.jpg or upload below"
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (mediaLibrary.length >= 4 && !mediaLibrary.includes(customImageUrl)) {
                            toast.error('Media storage limit reached (4/4). Please delete one of your 4 saved images below before uploading a new one.');
                            return;
                          }
                          fileInputRef.current?.click();
                        }}
                        disabled={isUploadingImage}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm ${
                          mediaLibrary.length >= 4 && !mediaLibrary.includes(customImageUrl)
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                            : 'bg-amber-500 hover:bg-amber-600 text-white'
                        }`}
                        title={
                          mediaLibrary.length >= 4 && !mediaLibrary.includes(customImageUrl)
                            ? 'Storage full (4/4). Delete an existing banner below to upload.'
                            : 'Upload new banner image'
                        }
                      >
                        {isUploadingImage ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                      </button>
                    </div>

                    {/* Active Selected Image Preview Strip */}
                    {customImageUrl && (
                      <div className="flex items-center justify-between p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={customImageUrl}
                            alt="Selected Banner"
                            className="w-12 h-9 object-cover rounded-lg border border-amber-300 dark:border-amber-700 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] font-extrabold text-amber-900 dark:text-amber-300 truncate">
                              Active Header Image
                            </p>
                            <p className="text-[10px] text-slate-500 truncate max-w-xs">{customImageUrl}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomImageUrl('');
                            setUseShopBanner(true);
                          }}
                          className="px-2 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Previously Used Images Gallery (Max 4 Images) */}
                    <div className="pt-1.5 border-t border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <ImageIcon size={12} className="text-amber-500" />
                            <span>Media Storage History</span>
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            mediaLibrary.length >= 4
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {mediaLibrary.length}/4 {mediaLibrary.length >= 4 ? 'Full' : 'Used'}
                          </span>
                        </div>
                        {isLoadingMedia && (
                          <RefreshCw size={11} className="animate-spin text-slate-400" />
                        )}
                      </div>

                      {/* Limit Alert Notice when full */}
                      {mediaLibrary.length >= 4 && (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-start gap-2 mb-2">
                          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong>Storage limit reached (4/4):</strong> You can retain up to 4 custom banners. To upload a new image, delete an existing banner using the red trash button below.
                          </span>
                        </div>
                      )}

                      {mediaLibrary.length === 0 ? (
                        <div className="py-4 text-center text-[11px] text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          No previously uploaded images found. You can store up to 4 custom banners for 1-click reuse!
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {mediaLibrary.slice(0, 4).map((imgUrl, idx) => {
                            const isSelected = customImageUrl === imgUrl;
                            return (
                              <div
                                key={`${imgUrl}-${idx}`}
                                onClick={() => {
                                  setCustomImageUrl(imgUrl);
                                  setUseShopBanner(false);
                                }}
                                className={`group relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                                  isSelected
                                    ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-sm'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-400'
                                }`}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Used banner ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />

                                {/* Selected Indicator Badge */}
                                {isSelected && (
                                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                )}

                                {/* Slot Label */}
                                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                  Slot {idx + 1}/4
                                </div>

                                {/* Hover / Action Overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between p-1">
                                  <span className="text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded-md">
                                    Use
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteMedia(imgUrl, e)}
                                    className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-md cursor-pointer"
                                    title="Delete image permanently from MinIO storage"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>



              {/* 3. Audience Targeting Selector */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <div className="flex justify-between items-center mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Target Audience
                  </label>
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <Flame size={11} className="text-amber-500" />
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">
                      {isLoadingCount ? 'Calculating...' : `${audienceCount ?? 0} Eligible`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTargetAudience('all')}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      targetAudience === 'all'
                        ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <Users size={16} className={targetAudience === 'all' ? 'text-amber-500' : 'text-slate-400'} />
                    <h5 className="font-black text-xs text-slate-900 dark:text-white mt-1.5">All Customers</h5>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">Every registered & ordering customer</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('new')}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      targetAudience === 'new'
                        ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <UserPlus size={16} className={targetAudience === 'new' ? 'text-amber-500' : 'text-slate-400'} />
                    <h5 className="font-black text-xs text-slate-900 dark:text-white mt-1.5">New Customers</h5>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">Joined or ordered in last 7 days</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetAudience('min_visits')}
                    className={`p-3 sm:p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                      targetAudience === 'min_visits'
                        ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <Flame size={16} className={targetAudience === 'min_visits' ? 'text-amber-500' : 'text-slate-400'} />
                    <h5 className="font-black text-xs text-slate-900 dark:text-white mt-1.5">Frequent Visitors</h5>
                    <p className="text-[9.5px] text-slate-400 mt-0.5">Repeat customers with $\ge N$ visits</p>
                  </button>
                </div>

                {targetAudience === 'min_visits' && (
                  <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Minimum Visit Count:</span>
                      <p className="text-[9px] text-slate-400">Target repeat customers</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[2, 3, 5, 10].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setMinVisits(count)}
                          className={`w-8 h-8 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                            minVisits === count
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-amber-500'
                          }`}
                        >
                          {count}+
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Delivery Mode: Send Now vs Schedule */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Delivery Schedule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                  <div
                    onClick={() => setDeliveryMode('now')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      deliveryMode === 'now'
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${deliveryMode === 'now' ? 'bg-amber-500 text-white' : 'border-2 border-slate-300'}`}>
                      {deliveryMode === 'now' && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Send Immediately</h5>
                      <p className="text-[10px] text-slate-400">Broadcast right now to your audience</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setDeliveryMode('schedule')}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      deliveryMode === 'schedule'
                        ? 'border-amber-500 bg-amber-500/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${deliveryMode === 'schedule' ? 'bg-amber-500 text-white' : 'border-2 border-slate-300'}`}>
                      {deliveryMode === 'schedule' && <Check size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">Schedule for Later</h5>
                      <p className="text-[10px] text-slate-400">Automate sending at a specific time</p>
                    </div>
                  </div>
                </div>

                {/* Custom Individual Date & Time Pickers */}
                {deliveryMode === 'schedule' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    <div>
                      <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Select Date <span className="text-red-500">*</span>
                      </label>
                      <DatePicker
                        value={scheduledDate}
                        onChange={(d) => setScheduledDate(d)}
                        minDate={new Date().toISOString().split('T')[0]}
                        placeholder="Choose date"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Select Time <span className="text-red-500">*</span>
                      </label>
                      <TimePicker
                        value={scheduledTime}
                        onChange={(t) => setScheduledTime(t)}
                        placeholder="Choose time"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* 5. Test Send Bar with Single Unified Split Input Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 shrink-0">
                    <Smartphone size={14} className="text-emerald-500 shrink-0" />
                    <span>Test:</span>
                  </div>
                  
                  {/* Single Unified Split Input */}
                  <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-transparent transition-all shadow-xs w-full sm:w-56">
                    {/* Country Code Dropdown Trigger */}
                    <div ref={countryDropdownRef} className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                        className="flex items-center gap-1 pl-2.5 pr-2 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-l-xl transition-colors cursor-pointer"
                      >
                        <span className="text-xs leading-none">{COUNTRY_CODES.find(c => c.code === testCountryCode)?.flag || '🌐'}</span>
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{testCountryCode}</span>
                        <ChevronDown size={11} className={`text-slate-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isCountryDropdownOpen && (
                          <motion.div
                            data-lenis-prevent
                            initial={{ opacity: 0, y: -6, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden overscroll-contain"
                          >
                            <div 
                              data-lenis-prevent 
                              onWheel={(e) => e.stopPropagation()}
                              className="max-h-48 overflow-y-auto overscroll-contain py-1 select-none"
                            >
                              {COUNTRY_CODES.map((c) => (
                                <div
                                  key={c.code}
                                  onClick={() => {
                                    setTestCountryCode(c.code);
                                    setIsCountryDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                    testCountryCode === c.code
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 font-bold'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{c.flag}</span>
                                    <span>{c.label}</span>
                                  </div>
                                  {testCountryCode === c.code && <Check size={12} className="text-amber-500" />}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                    {/* Subtle vertical divider */}
                    <div className="w-[1px] h-4 bg-slate-200 dark:border-slate-700 shrink-0" />

                    {/* Phone Number Input */}
                    <input
                      type="tel"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Mobile number"
                      maxLength={15}
                      className="w-full px-2.5 py-1.5 bg-transparent text-xs font-semibold text-slate-900 dark:text-white outline-none rounded-r-xl"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={isSendingTest}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                  title="Send 1 test message to your phone (Costs 1 credit = ₹1)"
                >
                  {isSendingTest ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  <span>Send Test (1 Credit)</span>
                </button>

              </div>

              {/* 6. Messaging Cost Breakdown & Balance Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500">Recipients Cost ({audienceCount ?? 0} msgs × ₹1.00):</span>
                  <span className="font-black text-slate-900 dark:text-white">₹{audienceCount ?? 0}.00</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Coins size={14} className="text-amber-500" />
                    <span>Available Messaging Balance:</span>
                  </span>
                  <span className={availableCredits >= (audienceCount ?? 0) ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-rose-600 dark:text-rose-400 font-black'}>
                    {availableCredits} Credits (₹{availableCredits})
                  </span>
                </div>

                {/* Shortfall Alert & Direct Recharge Action */}
                {availableCredits < (audienceCount ?? 0) && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold min-w-0">
                      <AlertCircle size={15} className="text-rose-500 shrink-0" />
                      <span>
                        Shortfall: <strong>{(audienceCount ?? 0) - availableCredits} credits (₹{(audienceCount ?? 0) - availableCredits})</strong> needed
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTopupCredits((audienceCount ?? 0) - availableCredits);
                        setIsTopupModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-lg text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 self-end sm:self-auto"
                    >
                      <Plus size={12} strokeWidth={3} /> Recharge ₹{(audienceCount ?? 0) - availableCredits}
                    </button>
                  </div>
                )}
              </div>

              {/* 7. Refined Proportionate Submit Launch Button */}
              {!canWrite ? (
                <div className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold">
                  <Lock size={14} className="text-amber-500" />
                  <span>Read-only Staff Access (Broadcasting Restricted)</span>
                </div>
              ) : availableCredits < (audienceCount ?? 0) && (audienceCount ?? 0) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setTopupCredits((audienceCount ?? 0) - availableCredits);
                    setIsTopupModalOpen(true);
                  }}
                  className="w-full py-2.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins size={15} />
                  <span>Recharge ₹{(audienceCount ?? 0) - availableCredits} & Launch Broadcast</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting || (audienceCount === 0 && deliveryMode === 'now')}
                  className="w-full py-2.5 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Processing Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>
                        {deliveryMode === 'schedule'
                          ? 'Schedule WhatsApp Campaign'
                          : `Launch Broadcast to ${audienceCount ?? 0} Customers`}
                      </span>
                    </>
                  )}
                </button>
              )}


            </form>
          </div>

          {/* ================= RIGHT COLUMN: DESKTOP LIVE WHATSAPP PHONE PREVIEW ================= */}
          <div className="hidden lg:block lg:col-span-5 sticky top-6">
            <div className="bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 max-w-[340px] mx-auto">
              
              {/* Phone Speaker Notch */}
              <div className="w-24 h-3.5 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* WhatsApp Screen Container */}
              <div className="h-[540px]">
                {renderWhatsAppPreviewContent()}
              </div>

            </div>
          </div>

        </div>
      ) : (
        /* ================= CAMPAIGN HISTORY TAB ================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                  Broadcast Campaigns History
                </h3>
                {totalHistory > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] sm:text-[11px]">
                    {totalHistory} Total
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">Track delivery rates, scheduled jobs, and recipient stats</p>
            </div>
            <button
              onClick={() => loadCampaigns(1, false)}
              disabled={isLoadingCampaigns}
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              title="Refresh Broadcast Records"
            >
              <RefreshCw size={12} className={isLoadingCampaigns ? 'animate-spin text-amber-500' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Search & Date Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search campaign message, audience..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title="Clear Search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Date Filter & Quick Actions */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1 sm:w-48 relative">
                <DatePicker
                  value={historyDate}
                  onChange={(date) => setHistoryDate(date)}
                  placeholder="Filter by Date"
                  className="text-xs"
                />
              </div>
              {historyDate && (
                <button
                  type="button"
                  onClick={() => setHistoryDate('')}
                  className="px-2.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  title="Clear Date Filter"
                >
                  <X size={13} />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Date Shortcut Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10.5px] font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
              <Filter size={11} /> Quick Date:
            </span>
            <button
              type="button"
              onClick={() => setHistoryDate('')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                !historyDate
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setHistoryDate(today);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                historyDate === new Date().toISOString().slice(0, 10)
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setHistoryDate(d.toISOString().slice(0, 10));
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                historyDate === new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Yesterday
            </button>
          </div>


          {/* Results: Desktop Table View + Mobile Structured Cards View */}
          {isLoadingCampaigns && campaigns.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
              <span>Loading broadcast campaigns...</span>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-3">
                <Send size={24} />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                {historySearch || historyDate ? 'No matching broadcasts found' : 'No campaigns sent yet'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {historySearch || historyDate
                  ? 'Try searching with different keywords or clearing the date filter.'
                  : 'Create your first marketing broadcast in the Studio tab to engage with your customers!'}
              </p>
              {historySearch || historyDate ? (
                <button
                  onClick={() => {
                    setHistorySearch('');
                    setHistoryDate('');
                  }}
                  className="mt-3 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab('studio')}
                  className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-black shadow-md hover:bg-amber-600 transition-all cursor-pointer"
                >
                  Open Studio Builder
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* 1. DESKTOP / TABLET VIEW: FULL DATA TABLE (HIDDEN ON MOBILE) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Campaign Message</th>
                      <th className="py-3 px-4">Audience Segment</th>
                      <th className="py-3 px-4">Recipients</th>
                      <th className="py-3 px-4">Credits Deducted</th>
                      <th className="py-3 px-4">Delivery Status</th>
                      <th className="py-3 px-4">Date / Scheduled</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {campaigns.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedHistoryCampaign(c)}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        title="Click to view full message & broadcast details"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate max-w-xs group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                            <span>{c.title || c.message}</span>
                            <Eye size={12} className="opacity-0 group-hover:opacity-100 text-amber-500 transition-opacity shrink-0" />
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.message}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                            {c.target_audience === 'min_visits' ? `Frequent (≥${c.min_visits} visits)` : c.target_audience}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white">{c.total_recipients} Customers</div>
                          {c.sent_count > 0 && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                              {c.sent_count} Delivered
                            </div>
                          )}
                          {c.failed_count > 0 && (
                            <div className="text-[10px] text-rose-500 font-bold">
                              {c.failed_count} Failed (Refunded)
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {c.status === 'SENT' ? (
                            <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400">
                              <Coins size={13} className="text-amber-500 shrink-0" />
                              <span>{c.sent_count > 0 ? c.sent_count : c.total_recipients} Credits (₹{c.sent_count > 0 ? c.sent_count : c.total_recipients})</span>
                            </div>
                          ) : c.status === 'PARTIAL' ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400">
                                <Coins size={13} className="text-amber-500 shrink-0" />
                                <span>{c.sent_count} Credits (₹{c.sent_count}.00)</span>
                              </div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                {c.failed_count} Credits Refunded
                              </div>
                            </div>
                          ) : c.status === 'SCHEDULED' || c.status === 'PROCESSING' ? (
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                              <Coins size={13} className="text-amber-500 shrink-0" />
                              <span>{c.total_recipients} Credits (Reserved)</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-400 font-bold text-[11px]">
                              <span>0 Credits ({c.total_recipients} Refunded)</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            c.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' :
                            c.status === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' :
                            c.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800' :
                            c.status === 'PROCESSING' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 animate-pulse' :
                            'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800'
                          }`}>
                            {c.status === 'PARTIAL' ? 'PARTIAL' : c.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {c.scheduled_at
                            ? `Scheduled: ${new Date(c.scheduled_at).toLocaleString()}`
                            : c.sent_at
                            ? new Date(c.sent_at).toLocaleString()
                            : c.created_at
                            ? new Date(c.created_at).toLocaleString()
                            : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {c.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleCancelCampaign(c.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Scheduled Broadcast"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. MOBILE VIEW: STRUCTURED CAMPAIGN CARDS (SHOWN ON MOBILE ONLY) */}
              <div className="block md:hidden space-y-3">
                {campaigns.map((c) => {
                  const creditsCount = c.sent_count > 0 ? c.sent_count : (c.status === 'FAILED' ? 0 : c.total_recipients);
                  const formattedDate = c.scheduled_at
                    ? `Scheduled for: ${new Date(c.scheduled_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
                    : c.sent_at
                    ? new Date(c.sent_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : c.created_at
                    ? new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : '-';

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedHistoryCampaign(c)}
                      className="p-3.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-2.5 shadow-2xs cursor-pointer hover:border-amber-500/50 active:scale-[0.99] transition-all"
                    >
                      {/* Top Row: Title + Status + Action */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1">
                            <span>{c.title || 'WhatsApp Broadcast'}</span>
                            <Eye size={11} className="text-amber-500 shrink-0" />
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formattedDate}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border ${
                            c.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' :
                            c.status === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' :
                            c.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800' :
                            c.status === 'PROCESSING' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 animate-pulse' :
                            'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800'
                          }`}>
                            {c.status === 'PARTIAL' ? 'PARTIAL' : c.status}
                          </span>
                          {c.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleCancelCampaign(c.id)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                              title="Cancel Scheduled Broadcast"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Message Preview Text */}
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 text-[11.5px] text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                        {c.message}
                      </div>

                      {/* Bottom Info Grid Chips */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5 text-[11px]">
                        {/* Audience */}
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold truncate">
                          <Users size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            {c.target_audience === 'min_visits' ? `Frequent (≥${c.min_visits})` : c.target_audience.toUpperCase()}
                          </span>
                        </div>

                        {/* Recipients */}
                        <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold truncate">
                          <Send size={12} className="text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {c.sent_count > 0 ? `${c.sent_count}/${c.total_recipients} Sent` : `${c.total_recipients} Recipients`}
                          </span>
                        </div>

                        {/* Credits Deducted & Refund Status */}
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-black col-span-2">
                          <div className="flex items-center gap-1.5">
                            <Coins size={13} className="text-amber-500 shrink-0" />
                            <span>
                              {c.status === 'FAILED'
                                ? `0 Credits (${c.total_recipients} Refunded)`
                                : `${creditsCount} Credits Deducted (₹${creditsCount}.00)`}
                            </span>
                          </div>
                          {c.failed_count > 0 && c.status !== 'FAILED' && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                              {c.failed_count} Refunded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>



              {/* Infinite Scrolling Sentinel & Status */}
              <div ref={observerTargetRef} className="py-4 text-center">
                {isLoadingMore && (
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Loading more broadcast records...</span>
                  </div>
                )}
                {!hasMoreHistory && campaigns.length > 0 && (
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Showing all {campaigns.length} of {totalHistory} broadcasts
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ================= FLOATING MINI SCREEN PREVIEW (REAL PHONE PREVIEW WINDOW) ================= */}

      {activeTab === 'studio' && (
        <>
          {/* If closed, small floating phone badge to reopen (Mobile Only) */}
          {!isFloatingPreviewOpen && (
            <div className="fixed bottom-20 right-4 z-50 lg:hidden">
              <button
                type="button"
                onClick={() => {
                  setIsFloatingPreviewOpen(true);
                  setIsFloatingPreviewMinimized(false);
                }}
                className="w-11 h-11 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-2xl border border-slate-700 dark:border-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-black/20"
                title="Open WhatsApp Preview Mini-Screen"
              >
                <Smartphone size={18} className="text-emerald-400 dark:text-emerald-600" />
              </button>
            </div>
          )}

          {/* Floating Real Mini Screen with Fluid Multi-directional Drag (Mobile Only) */}
          <AnimatePresence>
            {isFloatingPreviewOpen && (
              <motion.div
                drag
                dragControls={dragControls}
                dragListener={false}
                dragMomentum={false}
                dragElastic={0}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`fixed bottom-24 right-4 z-50 lg:hidden bg-slate-950 rounded-2xl border-2 border-slate-800 shadow-2xl flex flex-col overflow-hidden ring-4 ring-black/20 select-none transition-shadow ${
                  isFloatingPreviewMinimized ? 'w-44 h-9' : 'w-[220px] sm:w-[250px] h-[350px] sm:h-[400px]'
                }`}
              >

                {/* Draggable Top Titlebar Handle */}
                <div
                  onPointerDown={(e) => dragControls.start(e)}
                  className="h-9 bg-slate-900 px-2.5 flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing border-b border-slate-800 text-white touch-none"
                >
                  <div className="flex items-center gap-1.5 min-w-0 pointer-events-none">
                    <Smartphone size={12} className="text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 truncate">WhatsApp Live</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Full View Button */}
                    {!isFloatingPreviewMinimized && (
                      <button
                        type="button"
                        onClick={() => setIsFullViewOpen(true)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Open Fullscreen View"
                      >
                        <Maximize2 size={11} />
                      </button>
                    )}

                    {/* Minimize / Restore Button */}
                    <button
                      type="button"
                      onClick={() => setIsFloatingPreviewMinimized(!isFloatingPreviewMinimized)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isFloatingPreviewMinimized ? "Expand Mini-Screen" : "Minimize Window"}
                    >
                      {isFloatingPreviewMinimized ? <Minimize2 size={11} className="rotate-180" /> : <Minimize2 size={11} />}
                    </button>

                    {/* Close Button */}
                    <button
                      type="button"
                      onClick={() => setIsFloatingPreviewOpen(false)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Close Mini-Screen"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>

                {/* Mini Phone Screen Canvas */}
                {!isFloatingPreviewMinimized && (
                  <div className="flex-1 p-1 bg-slate-900 overflow-hidden flex flex-col">
                    <div className="w-[280px] h-[440px] scale-[0.75] sm:scale-[0.85] origin-top-left flex flex-col justify-start">
                      {renderWhatsAppPreviewContent()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= FULL VIEW WHATSAPP PREVIEW MODAL ================= */}
          <AnimatePresence>
            {isFullViewOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFullViewOpen(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-xs"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-sm bg-slate-900 rounded-[36px] p-3 sm:p-4 shadow-2xl border-4 border-slate-800 z-10 flex flex-col overflow-hidden"
                >
                  {/* Phone Speaker Notch & Close Bar */}
                  <div className="flex items-center justify-between px-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-300 uppercase tracking-wider">
                      <Smartphone size={14} className="text-emerald-400" />
                      <span>Full WhatsApp Preview</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFullViewOpen(false)}
                      className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Close Full View"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* WhatsApp Screen Container */}
                  <div className="h-[520px]">
                    {renderWhatsAppPreviewContent()}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ================= RECHARGE BROADCAST CREDITS MODAL ================= */}
      <Modal
        isOpen={isTopupModalOpen}
        onClose={() => setIsTopupModalOpen(false)}
        title="Recharge Broadcast Credits"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Coins size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">1 Credit = ₹1.00 / Message</h4>
                <p className="text-[10.5px] text-amber-800/80 dark:text-amber-300/80">Every recipient consumes exactly 1 credit</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Balance</span>
              <span className="text-sm font-black text-slate-900 dark:text-white">{availableCredits} Credits</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Select Quick Top-Up Package
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[5, 25, 50, 100, 500].map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setTopupCredits(pkg)}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    topupCredits === pkg
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50 dark:bg-slate-900'
                  }`}
                >
                  <span className="block text-sm font-black text-slate-900 dark:text-white">₹{pkg}</span>
                  <span className="block text-[10px] font-bold text-slate-400">{pkg} msgs</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Or Custom Credits Amount (₹1 per credit)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min={1}
                step={1}
                value={topupCredits}
                onChange={(e) => setTopupCredits(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full pl-7 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Enter amount"
              />
            </div>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Messaging Credits ({topupCredits} msgs):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">₹{topupCredits}.00</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>PG Fee (3%) + GST (18%):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ₹{((topupCredits * 0.03) + (topupCredits * 0.03 * 0.18)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 dark:text-white font-black pt-1.5 border-t border-slate-200 dark:border-slate-800 text-sm">
              <span>Total Payable Amount:</span>
              <span className="text-amber-600 dark:text-amber-400">
                ₹{(topupCredits + (topupCredits * 0.03) + (topupCredits * 0.03 * 0.18)).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTopupPayment}
            disabled={isProcessingTopup || topupCredits < 1}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isProcessingTopup ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <CreditCard size={15} />
                <span>Pay ₹{(topupCredits + (topupCredits * 0.03) + (topupCredits * 0.03 * 0.18)).toFixed(2)} & Add {topupCredits} Credits</span>
              </>
            )}
          </button>
        </div>
      </Modal>



      {/* ================= CELEBRATION CRACKER POPUP MODAL ================= */}
      <Modal
        isOpen={showCelebrationPopup}
        onClose={() => setShowCelebrationPopup(false)}
        title="Broadcast Dispatched!"
      >
        <div className="text-center py-3 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30 animate-bounce">
            <PartyPopper size={32} />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {lastLaunchedCampaign?.mode === 'schedule' ? '🎉 Campaign Scheduled!' : '🚀 WhatsApp Broadcast Dispatched!'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {lastLaunchedCampaign?.mode === 'schedule'
                ? `Your campaign is scheduled and will be sent automatically to ${lastLaunchedCampaign?.count} customers.`
                : `Your message is now actively reaching ${lastLaunchedCampaign?.count} customer WhatsApp inboxes.`}
            </p>
          </div>

          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
              <Coins size={15} className="text-amber-500" />
              <span>Credits Deducted:</span>
            </div>
            <span className="font-black text-amber-700 dark:text-amber-300">
              {lastLaunchedCampaign?.count} Credits (₹{lastLaunchedCampaign?.count}.00)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCelebrationPopup(false);
                setActiveTab('history');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              View in Broadcast History →
            </button>
            <button
              type="button"
              onClick={() => setShowCelebrationPopup(false)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* ================= CAMPAIGN FULL DETAILS MODAL ================= */}
      <Modal
        isOpen={!!selectedHistoryCampaign}
        onClose={() => setSelectedHistoryCampaign(null)}
        title={selectedHistoryCampaign?.title || 'Broadcast Campaign Details'}
      >

        {selectedHistoryCampaign && (
          <div className="space-y-4 py-1">
            {/* Banner Image Preview if available */}
            {selectedHistoryCampaign.image_url && (
              <div className="relative h-44 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <img
                  src={selectedHistoryCampaign.image_url}
                  alt="Campaign Header"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_BANNER;
                  }}
                />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[9px] font-bold text-white uppercase tracking-wider">
                  Broadcast Banner
                </div>
              </div>
            )}

            {/* WhatsApp Message Bubble */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full WhatsApp Message
                </label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedHistoryCampaign.message);
                    toast.success('Campaign message copied to clipboard!');
                  }}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy size={12} />
                  <span>Copy Text</span>
                </button>
              </div>

              <div className="p-3.5 bg-[#EFEAE2] dark:bg-[#1F2C34] rounded-2xl border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed font-medium select-text shadow-inner">
                {selectedHistoryCampaign.message}
              </div>
            </div>

            {/* Metadata Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Status</span>
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    selectedHistoryCampaign.status === 'SENT' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' :
                    selectedHistoryCampaign.status === 'PARTIAL' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' :
                    selectedHistoryCampaign.status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800' :
                    selectedHistoryCampaign.status === 'PROCESSING' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 animate-pulse' :
                    'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800'
                  }`}>
                    {selectedHistoryCampaign.status === 'PARTIAL' ? 'PARTIALLY SENT' : selectedHistoryCampaign.status}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audience Segment</span>
                <p className="font-extrabold text-slate-900 dark:text-white capitalize truncate">
                  {selectedHistoryCampaign.target_audience === 'min_visits'
                    ? `Frequent (≥${selectedHistoryCampaign.min_visits} visits)`
                    : selectedHistoryCampaign.target_audience}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipients Stats</span>
                <p className="font-extrabold text-slate-900 dark:text-white">
                  {selectedHistoryCampaign.total_recipients} Total
                  {selectedHistoryCampaign.sent_count > 0 && ` • ${selectedHistoryCampaign.sent_count} Delivered`}
                  {selectedHistoryCampaign.failed_count > 0 && ` • ${selectedHistoryCampaign.failed_count} Failed`}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Credits Consumed</span>
                <p className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Coins size={13} />
                  <span>
                    {selectedHistoryCampaign.status === 'FAILED'
                      ? '0 Credits (Refunded)'
                      : `${selectedHistoryCampaign.sent_count > 0 ? selectedHistoryCampaign.sent_count : selectedHistoryCampaign.total_recipients} Credits`}
                  </span>
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMessage(selectedHistoryCampaign.message);
                  if (selectedHistoryCampaign.image_url) {
                    setCustomImageUrl(selectedHistoryCampaign.image_url);
                    setUseShopBanner(false);
                  }
                  setSelectedHistoryCampaign(null);
                  setActiveTab('studio');
                  toast.success('Message loaded into Studio Builder!');
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Use as Template in Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedHistoryCampaign(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};



