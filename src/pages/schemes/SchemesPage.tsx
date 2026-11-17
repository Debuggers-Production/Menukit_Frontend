import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { 
  Coins, Plus, Search, Users, CheckCircle2, Clock, Calendar, 
  Trash2, Edit3, ArrowLeft, Eye, EyeOff, ShieldCheck, 
  Gift, ChevronRight, AlertCircle, Phone, 
  User, Check, Wallet, ArrowUpRight, Filter,
  Minus, Receipt, Info, Layers, Tag, Building2, MapPin,
  CreditCard, ArrowRight, Lock, ChevronLeft, Store, Flame, ShoppingBag, QrCode,
  Share2, Copy, ExternalLink, Camera, UploadCloud, ImageIcon, Loader2, X, Maximize2,
  ArrowRightLeft, ShieldAlert, KeyRound, History, ChevronDown, Globe,
  AlertTriangle, Ban
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  schemeService, Scheme, SchemeMember, SchemeCreatePayload, 
  SchemeMemberCreatePayload, RecordPaymentPayload, SchemeItemInfo,
  SchemeMemberDeleteOtpResponse, SchemeActivityLog
} from '@/services/schemeService';
import { api } from '@/services/api';
import { MenuItem, MenuItemVariant, Category } from '@/types';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SquareFAB } from '@/components/ui/SquareFAB';
import { SearchableSelect, Option } from '@/components/ui/SearchableSelect';
import { Lightbox } from '@/components/ui/Lightbox';
import { isBakeryBusiness, isFireworksBusiness, isFoodBusiness, isSchemeEnabledShop } from '@/config/businessCategories';
import { 
  COUNTRY_CODES, COUNTRY_OPTIONS, DISTRICTS_BY_STATE, INDIAN_STATES, formatPaidDateTime,
  renderHighlightBenefits
} from '@/components/public/PublicSchemeModal';

import { formatPhoneWithCountryCode } from '@/utils/phone';
import { cleanAddressDisplay } from '@/utils/address';
export { formatPhoneWithCountryCode };

export default function SchemesPage() {
  const { shop } = useShopStore();
  const currency = shop?.settings?.currency || '₹';
  const isBakery = isBakeryBusiness(shop?.category);
  const isCrackers = isFireworksBusiness(shop?.category);
  const isFood = isFoodBusiness(shop?.category);

  const categorySchemeConfig = useMemo(() => {
    if (isBakery) {
      return {
        titleLabel: 'Scheme Title *',
        titlePlaceholder: 'e.g. Diwali Sweets & Cakes Scheme 2026, Birthday Celebration Box Scheme',
        descriptionPlaceholder: 'e.g. Save monthly to collect luxury celebration cakes, bakery pastries, assorted sweets, and dry fruit hampers for the festive season...',
        itemsSectionTitle: 'Included Cakes, Sweets & Bakery Products',
        itemsSectionSubtitle: 'Select cake variants, pastries, or sweet boxes provided upon scheme completion',
        itemPickerPlaceholder: 'Search & choose cake, pastry, or sweets...',
        tagBadge: 'Bakery Scheme',
        pricePlaceholder: '500',
        helpText: 'Perfect for regular bakery customers saving up for festival sweets, anniversary cakes, or seasonal bakery hampers.'
      };
    }
    if (isCrackers) {
      return {
        titleLabel: 'Scheme Title *',
        titlePlaceholder: 'e.g. Diwali Mega Cracker Scheme 2026, Family Fireworks Savings Box',
        descriptionPlaceholder: 'e.g. Pay monthly towards Diwali fireworks. Members get guaranteed gift boxes, aerial shots, and festival sparkler bundles on Diwali day...',
        itemsSectionTitle: 'Included Fireworks & Cracker Packs',
        itemsSectionSubtitle: 'Select crackers, sparkler packs, aerial boxes, or gift hampers provided in this scheme',
        itemPickerPlaceholder: 'Search & choose sparklers, 1000 wala, gift boxes...',
        tagBadge: 'Cracker Scheme',
        pricePlaceholder: '1000',
        helpText: 'Allows customers to save in advance across 10-12 months and collect their complete Diwali cracker box hassle-free.'
      };
    }
    if (isFood) {
      return {
        titleLabel: 'Scheme Title *',
        titlePlaceholder: 'e.g. Festival Feast Pass 2026, Annual Dining Savings Scheme',
        descriptionPlaceholder: 'e.g. Save monthly to collect festival family feast hampers, dining vouchers, and holiday dinner packages...',
        itemsSectionTitle: 'Included Feast Packs & Special Dishes',
        itemsSectionSubtitle: 'Select menu items, feast platters, or dinner vouchers provided upon scheme completion',
        itemPickerPlaceholder: 'Search & choose dish or combo pack...',
        tagBadge: 'Dining Scheme',
        pricePlaceholder: '500',
        helpText: 'Great for regulars saving up for grand festival family feasts, celebration dinners, or holiday dining packages.'
      };
    }
    return {
      titleLabel: 'Scheme Title *',
      titlePlaceholder: 'e.g. Annual Savings Scheme 2026, Festive Gift Hamper Scheme',
      descriptionPlaceholder: 'Explain how the scheme works, rules, bonus perks, and collection dates...',
      itemsSectionTitle: 'Included Reward Products / Gift Items',
      itemsSectionSubtitle: 'Select products and variants provided in this scheme',
      itemPickerPlaceholder: 'Search & select item from menu...',
      tagBadge: 'Savings Scheme',
      pricePlaceholder: '500',
      helpText: 'Customers contribute weekly or monthly and receive bonus products and perks upon completion.'
    };
  }, [isBakery, isCrackers, isFood]);

  const { setTitle } = useHeaderStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const schemeParam = searchParams.get('scheme') || searchParams.get('id');

  // Lightbox Modal for Scheme Image Full View
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>('Scheme Banner');

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [members, setMembers] = useState<SchemeMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    // Clear top bar title completely so action buttons get the entire header width
    setTitle('', '');
    return () => {
      setTitle('', '');
    };
  }, [setTitle]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [schemeToDelete, setSchemeToDelete] = useState<Scheme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Rewards Modal & Mobile Dropdown
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState(false);
  const [isRewardsMobileDropdownOpen, setIsRewardsMobileDropdownOpen] = useState(false);
  const rewardsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        rewardsDropdownRef.current &&
        !rewardsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRewardsMobileDropdownOpen(false);
      }
    }

    if (isRewardsMobileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isRewardsMobileDropdownOpen]);

  useEffect(() => {
    setIsRewardsMobileDropdownOpen(false);
    setIsRewardsModalOpen(false);
  }, [selectedScheme?.id]);

  // Step wizard state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Active customers guard
  const hasActiveCustomers = useMemo(() => {
    if (!editingScheme) return false;
    const memberCount = editingScheme.stats?.total_members || 0;
    const hasMembersList = editingScheme.members && editingScheme.members.length > 0;
    return memberCount > 0 || Boolean(hasMembersList);
  }, [editingScheme]);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [customerAutoFilled, setCustomerAutoFilled] = useState(false);
  const [alreadyEnrolledMember, setAlreadyEnrolledMember] = useState<{ member_number?: string | null; name?: string | null } | null>(null);

  const [paymentModalData, setPaymentModalData] = useState<{ member: SchemeMember; nextInstallment: number } | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Delete Member State (with Customer OTP verification)
  const [memberToDelete, setMemberToDelete] = useState<SchemeMember | null>(null);
  const [deleteOtpData, setDeleteOtpData] = useState<SchemeMemberDeleteOtpResponse | null>(null);
  const [deleteOtpCode, setDeleteOtpCode] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isSendingDeleteOtp, setIsSendingDeleteOtp] = useState(false);
  const [isSubmittingDeleteMember, setIsSubmittingDeleteMember] = useState(false);

  // Transfer Member State (Switch Scheme)
  const [memberToTransfer, setMemberToTransfer] = useState<SchemeMember | null>(null);
  const [transferTargetSchemeId, setTransferTargetSchemeId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Choosable options for customer scheme transfer dropdown
  const destinationSchemeOptions = useMemo<Option[]>(() => {
    return schemes
      .filter(s => s.id !== selectedScheme?.id && s.status === 'active')
      .map(s => ({
        id: s.id,
        name: `${s.title} — ${currency}${Number(s.price).toLocaleString()}/${s.frequency === 'weekly' ? 'wk' : 'mo'} (${s.term_duration} ${s.term_unit})`,
        subtext: `Installment: ${currency}${Number(s.price).toLocaleString()} / ${s.frequency === 'weekly' ? 'week' : 'month'} • Duration: ${s.term_duration} ${s.term_unit}`,
        badge: `${currency}${Number(s.price).toLocaleString()}/${s.frequency === 'weekly' ? 'wk' : 'mo'}`
      }));
  }, [schemes, selectedScheme?.id, currency]);

  // Customer Audit History Modal State
  const [historyCustomer, setHistoryCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [customerHistoryLogs, setCustomerHistoryLogs] = useState<SchemeActivityLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Phone Copy State & Handler
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (phone?: string) => {
    if (!phone) return;
    const formatted = formatPhoneWithCountryCode(phone);
    navigator.clipboard.writeText(formatted);
    setCopiedPhone(phone);
    toast.success(`Copied: ${formatted}`);
    setTimeout(() => setCopiedPhone(null), 2000);
  };



  // Menu items for item/variant picker
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryFilterForPicker, setCategoryFilterForPicker] = useState<string>('all');

  // Banner Image Upload State
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);
  const [quickUploadSchemeId, setQuickUploadSchemeId] = useState<string | null>(null);
  const quickBannerInputRef = React.useRef<HTMLInputElement>(null);
  const [isQuickUploading, setIsQuickUploading] = useState(false);

  // Create/Edit Form State
  const initialForm: SchemeCreatePayload = {
    title: '',
    description: '',
    image_url: null,
    highlight_text: '',
    price: 500,
    frequency: 'monthly',
    term_duration: 12,
    term_unit: 'months',
    max_members: null,
    items: [],
    reward_type: 'specific_items',
    reward_categories: [],
    show_on_public_menu: true,
  };
  const [formData, setFormData] = useState<SchemeCreatePayload>(initialForm);
  const [isSubmittingScheme, setIsSubmittingScheme] = useState(false);

  // Item Picker State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedVariantName, setSelectedVariantName] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);

  // New Member Form State
  const [newMemberForm, setNewMemberForm] = useState<SchemeMemberCreatePayload>({
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    notes: '',
    initial_payment: true,
    payment_method: 'cash',
    transaction_id: '',
  });
  const [memberCountry, setMemberCountry] = useState('India');
  const [customMemberCountry, setCustomMemberCountry] = useState('');
  const [memberCountryCode, setMemberCountryCode] = useState('+91');
  const [memberStreet, setMemberStreet] = useState('');
  const [memberDistrict, setMemberDistrict] = useState('Virudhunagar (Sivakasi)');
  const [customMemberDistrict, setCustomMemberDistrict] = useState('');
  const [memberState, setMemberState] = useState('Tamil Nadu');
  const [memberPincode, setMemberPincode] = useState('');

  // Record Payment Form State
  const [paymentForm, setPaymentForm] = useState<RecordPaymentPayload>({
    installment_number: 1,
    payment_method: 'cash',
    transaction_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchSchemes();
    fetchMenuItems();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await api.get('/categories', { params: { limit: 500 } });
      if (Array.isArray(res.data)) {
        setCategories(res.data);
      }
    } catch (err) {
      // non-critical
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const initialMemberFetchDoneRef = useRef<string | null>(null);
  const inFlightMembersFetchRef = useRef<string | null>(null);

  const fetchSchemes = async () => {
    setIsLoading(true);
    try {
      const data = await schemeService.getSchemes();
      setSchemes(data);
      const targetId = schemeParam || selectedScheme?.id;
      if (targetId) {
        const updated = data.find(s => s.id === targetId);
        if (updated) setSelectedScheme(updated);
      }
    } catch (err: any) {
      toast.error('Failed to load schemes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    setIsLoadingItems(true);
    try {
      const res = await api.get('/menu-items', { params: { limit: 500 } });
      if (Array.isArray(res.data)) {
        setMenuItems(res.data);
      }
    } catch (err) {
      // non-critical
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Sync route query parameter ?scheme=<id> with selectedScheme state
  useEffect(() => {
    if (!schemes || schemes.length === 0) return;
    if (schemeParam) {
      const matching = schemes.find(s => s.id === schemeParam);
      if (matching) {
        if (selectedScheme?.id !== matching.id) {
          setSelectedScheme(matching);
        }
        if (initialMemberFetchDoneRef.current !== matching.id) {
          initialMemberFetchDoneRef.current = matching.id;
          fetchMembers(matching.id);
        }
      }
    } else {
      initialMemberFetchDoneRef.current = null;
      if (selectedScheme) {
        setSelectedScheme(null);
      }
    }
  }, [schemeParam, schemes]);

  const handleSelectScheme = async (scheme: Scheme) => {
    setSelectedScheme(scheme);
    setSearchParams({ scheme: scheme.id });
    setMemberSearch('');
    setMemberFilter('all');
    initialMemberFetchDoneRef.current = scheme.id;
    fetchMembers(scheme.id);
  };

  const handleBackToAllSchemes = () => {
    initialMemberFetchDoneRef.current = null;
    setSelectedScheme(null);
    setSearchParams({});
  };

  const fetchMembers = async (schemeId: string, search?: string) => {
    if (!schemeId) return;
    const fetchKey = `${schemeId}:${search || ''}`;
    if (inFlightMembersFetchRef.current === fetchKey) {
      return;
    }
    inFlightMembersFetchRef.current = fetchKey;
    setIsLoadingMembers(true);
    try {
      const data = await schemeService.getMembers(schemeId, search);
      setMembers(data);
    } catch (err) {
      toast.error('Failed to load scheme members');
    } finally {
      inFlightMembersFetchRef.current = null;
      setIsLoadingMembers(false);
    }
  };

  const handleOpenCreateModal = (scheme?: Scheme) => {
    setCurrentStep(1);
    if (scheme) {
      setEditingScheme(scheme);
      setFormData({
        title: scheme.title,
        description: scheme.description || '',
        image_url: scheme.image_url || null,
        highlight_text: scheme.highlight_text || '',
        price: scheme.price,
        frequency: scheme.frequency,
        term_duration: scheme.term_duration,
        term_unit: scheme.term_unit,
        max_members: scheme.max_members,
        items: scheme.items || [],
        reward_type: scheme.reward_type || 'specific_items',
        reward_categories: scheme.reward_categories || [],
        show_on_public_menu: scheme.show_on_public_menu,
      });
    } else {
      setEditingScheme(null);
      setFormData({
        ...initialForm,
        image_url: null,
        highlight_text: '',
        price: isCrackers ? 1000 : 500,
        term_duration: 12,
        term_unit: 'months',
        reward_type: 'specific_items',
        reward_categories: [],
      });
    }
    setSelectedItemId('');
    setSelectedVariantName('');
    setItemQuantity(1);
    setCategoryFilterForPicker('all');
    setIsCreateModalOpen(true);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setIsUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'banners');
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url || res.data.file_url;
      if (url) {
        setFormData(prev => ({ ...prev, image_url: url }));
        toast.success('Scheme banner uploaded successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to upload scheme banner');
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const handleTriggerQuickBannerUpload = (schemeId: string) => {
    setQuickUploadSchemeId(schemeId);
    if (quickBannerInputRef.current) {
      quickBannerInputRef.current.value = '';
      quickBannerInputRef.current.click();
    }
  };

  const handleQuickBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !quickUploadSchemeId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    const targetId = quickUploadSchemeId;
    setIsQuickUploading(true);
    const toastId = toast.loading('Uploading & applying scheme cover...');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'banners');
      const res = await api.post('/upload/image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.url || res.data.file_url;
      if (url) {
        await schemeService.updateScheme(targetId, { image_url: url } as any);
        setSchemes(prev => prev.map(s => s.id === targetId ? { ...s, image_url: url } : s));
        if (selectedScheme && selectedScheme.id === targetId) {
          setSelectedScheme(prev => prev ? { ...prev, image_url: url } : null);
        }
        toast.success('Scheme cover updated successfully!', { id: toastId });
      } else {
        toast.error('Failed to get uploaded image URL', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update scheme cover', { id: toastId });
    } finally {
      setIsQuickUploading(false);
      setQuickUploadSchemeId(null);
      if (quickBannerInputRef.current) quickBannerInputRef.current.value = '';
    }
  };

  const handleRemoveSchemeBanner = async (schemeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove the cover photo for this scheme?')) return;
    const toastId = toast.loading('Removing scheme banner...');
    try {
      await schemeService.updateScheme(schemeId, { image_url: null } as any);
      setSchemes(prev => prev.map(s => s.id === schemeId ? { ...s, image_url: null } : s));
      if (selectedScheme && selectedScheme.id === schemeId) {
        setSelectedScheme(prev => prev ? { ...prev, image_url: null } : null);
      }
      toast.success('Scheme banner removed', { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to remove scheme banner', { id: toastId });
    }
  };

  const handleAddAllCatalogItems = () => {
    if (hasActiveCustomers) {
      toast.error('Cannot modify products for a scheme with active customers.');
      return;
    }
    if (!menuItems || menuItems.length === 0) {
      toast.error('No items found in your catalog to add.');
      return;
    }
    const currentItemsMap = new Set(formData.items.map(i => `${i.item_id}_${i.variant_name || ''}`));
    const newItemsToAdd: SchemeItemInfo[] = [];

    menuItems.forEach(item => {
      const primaryImg = item.images?.find(img => img.is_primary)?.image_url || item.images?.[0]?.image_url || null;
      const itemKey = `${item.id}_`;
      if (!currentItemsMap.has(itemKey)) {
        newItemsToAdd.push({
          item_id: item.id,
          name: item.name,
          variant_name: null,
          quantity: 1,
          price: Number(item.price) || 0,
          image_url: primaryImg,
        });
        currentItemsMap.add(itemKey);
      }
    });

    if (newItemsToAdd.length === 0) {
      toast.success('All catalog items are already attached!');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItemsToAdd],
    }));
    toast.success(`Added ${newItemsToAdd.length} catalog items to scheme`);
  };

  const handleToggleCategory = (cat: { id: string; name: string }) => {
    if (hasActiveCustomers) {
      toast.error('Cannot modify categories for a scheme with active customers.');
      return;
    }
    const currentCats = formData.reward_categories || [];
    const exists = currentCats.some(c => c.id === cat.id);
    const updatedCats = exists
      ? currentCats.filter(c => c.id !== cat.id)
      : [...currentCats, { id: cat.id, name: cat.name }];

    setFormData(prev => ({
      ...prev,
      reward_categories: updatedCats,
    }));
  };

  const handleAddCategoryItems = (catId?: string) => {
    if (hasActiveCustomers) {
      toast.error('Cannot modify products for a scheme with active customers.');
      return;
    }
    const targetCategoryIds = catId 
      ? [catId] 
      : (formData.reward_categories || []).map(c => c.id);

    if (targetCategoryIds.length === 0) {
      toast.error('Please select at least one category first.');
      return;
    }

    const matchingItems = menuItems.filter(item => targetCategoryIds.includes(item.category_id));
    if (matchingItems.length === 0) {
      toast.error('No products found under selected category.');
      return;
    }

    const currentItemsMap = new Set(formData.items.map(i => `${i.item_id}_${i.variant_name || ''}`));
    const newItemsToAdd: SchemeItemInfo[] = [];

    matchingItems.forEach(item => {
      const primaryImg = item.images?.find(img => img.is_primary)?.image_url || item.images?.[0]?.image_url || null;
      const itemKey = `${item.id}_`;
      if (!currentItemsMap.has(itemKey)) {
        newItemsToAdd.push({
          item_id: item.id,
          name: item.name,
          variant_name: null,
          quantity: 1,
          price: Number(item.price) || 0,
          image_url: primaryImg,
        });
        currentItemsMap.add(itemKey);
      }
    });

    if (newItemsToAdd.length === 0) {
      toast.success('All items from selected categories are already in the list!');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItemsToAdd],
    }));
    toast.success(`Added ${newItemsToAdd.length} products to scheme`);
  };

  const handleClearAttachedItems = () => {
    if (hasActiveCustomers) {
      toast.error('Cannot modify products for a scheme with active customers.');
      return;
    }
    setFormData(prev => ({ ...prev, items: [] }));
    toast.success('Cleared attached products list');
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.title.trim()) {
        toast.error('Please enter scheme title');
        return false;
      }
    }
    if (step === 2 && !hasActiveCustomers) {
      if (!formData.price || formData.price <= 0) {
        toast.error('Installment amount must be greater than zero');
        return false;
      }
      if (!formData.term_duration || formData.term_duration <= 0) {
        toast.error('Term duration must be at least 1');
        return false;
      }
    }
    return true;
  };

  const handleAddItemToScheme = () => {
    if (hasActiveCustomers) {
      toast.error('Cannot add products to a scheme with active customers.');
      return;
    }
    if (!selectedItemId) {
      toast.error('Please select an item');
      return;
    }
    const item = menuItems.find(i => i.id === selectedItemId);
    if (!item) return;

    const existingIdx = formData.items.findIndex(
      i => i.item_id === item.id && (i.variant_name || '') === (selectedVariantName || '')
    );

    const primaryImg = item.images?.find(img => img.is_primary)?.image_url || item.images?.[0]?.image_url || null;
    const selectedVariant = item.variants?.find(v => v.name === selectedVariantName);
    const itemPrice = selectedVariant ? Number(selectedVariant.price) : (Number(item.price) || 0);

    if (existingIdx >= 0) {
      const updated = [...formData.items];
      updated[existingIdx].quantity += itemQuantity;
      setFormData({ ...formData, items: updated });
    } else {
      const newItem: SchemeItemInfo = {
        item_id: item.id,
        name: item.name,
        variant_name: selectedVariantName || null,
        quantity: itemQuantity,
        price: itemPrice,
        image_url: primaryImg,
      };
      setFormData({ ...formData, items: [...formData.items, newItem] });
    }

    setSelectedItemId('');
    setSelectedVariantName('');
    setItemQuantity(1);
    toast.success(`Added ${item.name}${selectedVariantName ? ` (${selectedVariantName})` : ''} to scheme items`);
  };

  const handleRemoveItem = (index: number) => {
    if (hasActiveCustomers) {
      toast.error('Cannot remove products from a scheme with active customers.');
      return;
    }
    const updated = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: updated });
  };

  const handleSubmitScheme = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter scheme title');
      setCurrentStep(1);
      return;
    }
    if (!hasActiveCustomers) {
      if (formData.price <= 0) {
        toast.error('Installment price must be greater than zero');
        setCurrentStep(2);
        return;
      }
      if (formData.term_duration <= 0) {
        toast.error('Term duration must be at least 1');
        setCurrentStep(2);
        return;
      }
    }

    setIsSubmittingScheme(true);
    try {
      if (editingScheme) {
        // If scheme has active customers, strictly allow only title and description (and show_on_public_menu)
        const updatePayload: Partial<SchemeCreatePayload> = hasActiveCustomers
          ? {
              title: formData.title.trim(),
              description: formData.description?.trim() || null,
              image_url: formData.image_url || null,
              highlight_text: formData.highlight_text?.trim() || null,
              show_on_public_menu: formData.show_on_public_menu,
            }
          : {
              ...formData,
              title: formData.title.trim(),
              description: formData.description?.trim() || null,
              image_url: formData.image_url || null,
              highlight_text: formData.highlight_text?.trim() || null,
            };

        await schemeService.updateScheme(editingScheme.id, updatePayload as any);
        toast.success('Scheme updated successfully');
      } else {
        await schemeService.createScheme({
          ...formData,
          title: formData.title.trim(),
          description: formData.description?.trim() || undefined,
          image_url: formData.image_url || null,
          highlight_text: formData.highlight_text?.trim() || null,
        });
        toast.success('Scheme created successfully');
      }
      setIsCreateModalOpen(false);
      fetchSchemes();
      if (selectedScheme && editingScheme && selectedScheme.id === editingScheme.id) {
        fetchMembers(selectedScheme.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save scheme');
    } finally {
      setIsSubmittingScheme(false);
    }
  };

  const handleDeleteScheme = async () => {
    if (!schemeToDelete) return;
    setIsDeleting(true);
    try {
      await schemeService.deleteScheme(schemeToDelete.id);
      toast.success('Scheme deleted');
      setSchemeToDelete(null);
      if (selectedScheme?.id === schemeToDelete.id) {
        handleBackToAllSchemes();
      }
      fetchSchemes();
    } catch (err) {
      toast.error('Failed to delete scheme');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAddMemberModal = () => {
    setNewMemberForm({
      customer_name: '',
      customer_phone: '',
      customer_address: '',
      notes: '',
      initial_payment: true,
      payment_method: 'cash',
      transaction_id: '',
    });
    setMemberCountry('India');
    setCustomMemberCountry('');
    setMemberCountryCode('+91');
    setMemberStreet('');
    setMemberDistrict(DISTRICTS_BY_STATE['Tamil Nadu']?.[0] || 'Virudhunagar (Sivakasi)');
    setCustomMemberDistrict('');
    setMemberState('Tamil Nadu');
    setMemberPincode('');
    setCustomerAutoFilled(false);
    setAlreadyEnrolledMember(null);
    setIsLookingUpCustomer(false);
    setIsAddMemberModalOpen(true);
  };

  const handleCustomerPhoneChange = async (digits: string, countryCode = memberCountryCode) => {
    setNewMemberForm(prev => ({ ...prev, customer_phone: digits }));

    // 1. Instant client-side check against loaded scheme members list
    const cleanDigits = digits.replace(/\D/g, '');
    const last10 = cleanDigits.slice(-10);
    const localExisting = members.find(m => {
      const mClean = (m.customer_phone || '').replace(/\D/g, '');
      if (cleanDigits.length >= 7 && mClean === cleanDigits) return true;
      if (last10 && last10.length === 10 && mClean.endsWith(last10)) return true;
      return false;
    });

    if (localExisting) {
      setAlreadyEnrolledMember({
        member_number: localExisting.member_number,
        name: localExisting.customer_name,
      });
      setNewMemberForm(prev => ({
        ...prev,
        customer_name: localExisting.customer_name || prev.customer_name,
      }));
      setCustomerAutoFilled(true);
    } else {
      setAlreadyEnrolledMember(null);
    }

    // 2. Server lookup across customers and scheme membership
    const expectedLength = countryCode === '+91' ? 10 : 7;
    if (digits.length >= expectedLength) {
      const fullPhone = `${countryCode}${digits}`;
      setIsLookingUpCustomer(true);
      try {
        const res = await schemeService.lookupCustomer(fullPhone, selectedScheme?.id);
        if (res && res.found) {
          if (res.name) {
            setNewMemberForm(prev => ({
              ...prev,
              customer_name: res.name || prev.customer_name,
            }));
            setCustomerAutoFilled(true);
          }
          if (res.address && !memberStreet) {
            setMemberStreet(cleanAddressDisplay(res.address));
          }
          if (res.is_already_enrolled) {
            setAlreadyEnrolledMember({
              member_number: res.enrolled_member_number,
              name: res.enrolled_member_name || res.name,
            });
          }
        }
      } catch (err) {
        // silent fail on non-critical lookup
      } finally {
        setIsLookingUpCustomer(false);
      }
    } else {
      if (!localExisting) {
        setCustomerAutoFilled(false);
        setAlreadyEnrolledMember(null);
      }
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme) return;
    if (!newMemberForm.customer_name.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    const cleanPhone = newMemberForm.customer_phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }

    // Prevent duplicate enrollment if customer already exists in this scheme
    if (alreadyEnrolledMember) {
      toast.error(`This customer is already enrolled in this scheme${alreadyEnrolledMember.member_number ? ` (Passbook #${alreadyEnrolledMember.member_number})` : ''}. A customer cannot be added more than once.`);
      return;
    }

    const localDup = members.find(m => {
      const mClean = (m.customer_phone || '').replace(/\D/g, '');
      if (cleanPhone.length >= 7 && mClean === cleanPhone) return true;
      const l10 = cleanPhone.slice(-10);
      if (l10 && l10.length === 10 && mClean.endsWith(l10)) return true;
      return false;
    });
    if (localDup) {
      toast.error(`Customer is already enrolled as Member #${localDup.member_number || 'N/A'} (${localDup.customer_name}).`);
      return;
    }

    const finalPhone = memberCountryCode ? `${memberCountryCode}${cleanPhone}` : `+91${cleanPhone}`;
    const effectiveCountry = memberCountry === 'Other' ? customMemberCountry.trim() : memberCountry.trim();
    const effectiveDistrict = memberCountry === 'India'
      ? (memberDistrict === 'Other / Custom District' ? customMemberDistrict.trim() : memberDistrict.trim())
      : memberDistrict.trim();

    const addressParts = [
      memberStreet.trim(),
      effectiveDistrict,
      memberState.trim() ? (memberPincode.trim() ? `${memberState.trim()} - ${memberPincode.trim()}` : memberState.trim()) : memberPincode.trim(),
      effectiveCountry && effectiveCountry !== 'India' ? effectiveCountry : ''
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    setIsSubmittingMember(true);
    try {
      await schemeService.addMember(selectedScheme.id, {
        ...newMemberForm,
        customer_phone: finalPhone,
        customer_address: fullAddress || undefined,
      });
      toast.success('Member enrolled successfully!');
      setIsAddMemberModalOpen(false);
      await Promise.all([
        fetchMembers(selectedScheme.id),
        fetchSchemes(),
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to enroll member');
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleOpenPaymentModal = (member: SchemeMember, targetInstallmentNum?: number) => {
    // Determine next pending installment
    const firstPending = member.installment_schedule.find(i => !i.is_paid);
    const nextNum = targetInstallmentNum || (firstPending ? firstPending.installment_number : member.paid_installments + 1);

    setPaymentForm({
      installment_number: nextNum,
      payment_method: 'cash',
      transaction_id: '',
      notes: '',
    });
    setPaymentModalData({ member, nextInstallment: nextNum });
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheme || !paymentModalData) return;

    setIsSubmittingPayment(true);
    try {
      await schemeService.recordPayment(selectedScheme.id, paymentModalData.member.id, paymentForm);
      toast.success(`Installment #${paymentForm.installment_number} marked as Paid!`);
      setPaymentModalData(null);
      await Promise.all([
        fetchMembers(selectedScheme.id),
        fetchSchemes(),
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Delete Member Handlers (with Customer OTP security)
  const handleOpenDeleteMemberModal = (member: SchemeMember) => {
    setMemberToDelete(member);
    setDeleteOtpData(null);
    setDeleteOtpCode('');
    setDeleteReason('');
  };

  const handleSendDeleteOtp = async () => {
    if (!selectedScheme || !memberToDelete) return;
    setIsSendingDeleteOtp(true);
    try {
      const res = await schemeService.sendMemberDeleteOtp(selectedScheme.id, memberToDelete.id);
      setDeleteOtpData(res);
      toast.success(res.message || 'OTP sent to customer phone');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP to customer');
    } finally {
      setIsSendingDeleteOtp(false);
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!selectedScheme || !memberToDelete) return;
    const hasPayments = memberToDelete.paid_installments > 0;
    if (hasPayments) {
      if (!deleteOtpData?.verification_id) {
        toast.error('Please click "Send OTP to Customer Phone" first');
        return;
      }
      if (!deleteOtpCode || deleteOtpCode.trim().length !== 6) {
        toast.error('Please enter the 6-digit customer OTP sent to the customer phone');
        return;
      }
    }
    if (!deleteReason.trim()) {
      toast.error('Reason / Settlement notes are required');
      return;
    }

    setIsSubmittingDeleteMember(true);
    try {
      await schemeService.deleteMember(selectedScheme.id, memberToDelete.id, {
        otp: deleteOtpCode.trim() || undefined,
        verification_id: deleteOtpData?.verification_id || undefined,
        reason: deleteReason.trim(),
      });
      toast.success(`Member ${memberToDelete.customer_name} removed`);
      setMemberToDelete(null);
      setDeleteOtpData(null);
      await Promise.all([
        fetchMembers(selectedScheme.id),
        fetchSchemes(),
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete member');
    } finally {
      setIsSubmittingDeleteMember(false);
    }
  };

  // Transfer Member Handlers (Switch Scheme)
  const handleOpenTransferModal = (member: SchemeMember) => {
    setMemberToTransfer(member);
    const otherSchemes = schemes.filter(s => s.id !== selectedScheme?.id && s.status === 'active');
    setTransferTargetSchemeId(otherSchemes.length > 0 ? otherSchemes[0].id : '');
    setTransferNotes('');
  };

  const handleConfirmTransfer = async () => {
    if (!selectedScheme || !memberToTransfer || !transferTargetSchemeId) {
      toast.error('Please select a target scheme');
      return;
    }
    if (!transferNotes.trim()) {
      toast.error('Transfer notes / reason is required');
      return;
    }
    setIsSubmittingTransfer(true);
    try {
      await schemeService.transferMember(selectedScheme.id, memberToTransfer.id, {
        target_scheme_id: transferTargetSchemeId,
        notes: transferNotes.trim(),
      });
      const targetScheme = schemes.find(s => s.id === transferTargetSchemeId);
      toast.success(`Transferred ${memberToTransfer.customer_name} to ${targetScheme?.title || 'new scheme'}!`);
      setMemberToTransfer(null);
      await Promise.all([
        fetchMembers(selectedScheme.id),
        fetchSchemes(),
      ]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to transfer member');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleOpenCustomerHistory = async (name: string, phone: string) => {
    setHistoryCustomer({ name, phone });
    setIsLoadingHistory(true);
    try {
      const logs = await schemeService.getCustomerHistory(phone);
      setCustomerHistoryLogs(logs);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to fetch customer scheme history');
      setCustomerHistoryLogs([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };



  // Filter members by search and status
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (memberFilter === 'paid') {
        const currentCycleIdx = selectedScheme?.stats?.paid_this_cycle_count !== undefined ? 1 : 1;
        // Member has paid up to current expectation or is completed
        return m.paid_installments > 0;
      }
      if (memberFilter === 'pending') {
        return m.paid_installments < m.total_installments;
      }
      return true;
    });
  }, [members, memberFilter]);

  const getPublicSchemesUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const identifier = shop?.slug || shop?.id || '';
    return `${origin}/shop/${identifier}/schemes`;
  };

  const getIndividualSchemeUrl = (scheme: Scheme) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const identifier = shop?.slug || shop?.id || '';
    return `${origin}/shop/${identifier}/schemes?scheme=${scheme.id}`;
  };

  const handleCopyAllSchemesLink = () => {
    const url = getPublicSchemesUrl();
    navigator.clipboard.writeText(url);
    toast.success('Public schemes link copied to clipboard!');
  };

  const handleOpenPublicSchemesInNewTab = () => {
    const url = getPublicSchemesUrl();
    window.open(url, '_blank');
  };

  const handleCopySchemeLink = (scheme: Scheme) => {
    const url = getIndividualSchemeUrl(scheme);
    navigator.clipboard.writeText(url);
    const shortTitle = scheme.title.length > 25 ? scheme.title.slice(0, 25).trim() + '...' : scheme.title;
    toast.success(`Copied link for "${shortTitle}"!`);
  };

  const handleOpenSchemeInNewTab = (scheme: Scheme) => {
    const url = getIndividualSchemeUrl(scheme);
    window.open(url, '_blank');
  };

  // Filtered menu items for item picker
  const filteredMenuItems = useMemo(() => {
    if (!categoryFilterForPicker || categoryFilterForPicker === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.category_id === categoryFilterForPicker);
  }, [menuItems, categoryFilterForPicker]);

  // Selected item object for variant dropdown
  const currentSelectedItem = menuItems.find(i => i.id === selectedItemId);

  const menuItemOptions: Option[] = useMemo(() => {
    return filteredMenuItems.map(item => {
      const primaryImg = item.images?.find(img => img.is_primary)?.image_url || item.images?.[0]?.image_url;
      const hasVariants = item.variants && item.variants.length > 0;
      return {
        id: item.id,
        name: item.name,
        subtext: hasVariants ? `${item.variants.length} variants available` : `${currency}${item.price}`,
        icon: primaryImg ? (
          <img src={primaryImg} alt="" className="w-5 h-5 rounded-md object-cover" />
        ) : undefined,
      };
    });
  }, [filteredMenuItems, currency]);

  const variantOptions: Option[] = useMemo(() => {
    if (!currentSelectedItem) return [];
    const baseOpt: Option = {
      id: '',
      name: `Base / Standard (${currency}${currentSelectedItem.price})`,
      subtext: `Price: ${currency}${currentSelectedItem.price}`,
    };
    if (!currentSelectedItem.variants?.length) return [baseOpt];
    return [
      baseOpt,
      ...currentSelectedItem.variants.map(v => ({
        id: v.name,
        name: `${v.name} (${currency}${v.price})`,
        subtext: `Variant Price: ${currency}${v.price}`,
      })),
    ];
  }, [currentSelectedItem, currency]);

  const paymentMethodOptions: Option[] = useMemo(() => [
    { id: 'cash', name: 'Cash Received', subtext: 'Direct cash collection at counter' },
    { id: 'upi', name: 'UPI / QR Code', subtext: 'Google Pay, PhonePe, Paytm, etc.' },
    { id: 'card', name: 'Card Swipe (POS)', subtext: 'Debit or Credit card' },
    { id: 'online', name: 'Online / Net Banking', subtext: 'Digital transfer' },
  ], []);

  const installmentOptions: Option[] = useMemo(() => {
    if (!paymentModalData?.member?.installment_schedule) return [];
    return paymentModalData.member.installment_schedule.map(inst => ({
      id: String(inst.installment_number),
      name: `#${inst.installment_number} - ${inst.label}`,
      disabled: inst.is_paid,
      subtext: inst.is_paid ? 'Already Paid' : `Due: ${currency}${inst.amount}`,
    }));
  }, [paymentModalData, currency]);

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Bar Header Actions Portal */}
      <HeaderActions>
        {selectedScheme ? (
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap py-0.5">
            <button
              onClick={handleBackToAllSchemes}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Back to All Schemes"
            >
              <ArrowLeft size={14} className="shrink-0" />
              <span className="hidden xl:inline">All Schemes</span>
              <span className="xl:hidden">Back</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopySchemeLink(selectedScheme)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Copy shareable customer link for this scheme"
            >
              <Share2 size={13} className="text-muted-foreground shrink-0" />
              <span className="hidden xl:inline">Share</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenSchemeInNewTab(selectedScheme)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Preview customer view in new tab"
            >
              <ExternalLink size={13} className="text-muted-foreground shrink-0" />
              <span className="hidden xl:inline">Preview</span>
            </button>

            <button
              type="button"
              onClick={() => handleTriggerQuickBannerUpload(selectedScheme.id)}
              disabled={isQuickUploading && quickUploadSchemeId === selectedScheme.id}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Upload or Change Scheme Cover Banner"
            >
              {isQuickUploading && quickUploadSchemeId === selectedScheme.id ? (
                <Loader2 size={13} className="animate-spin text-amber-500 shrink-0" />
              ) : (
                <Camera size={13} className="text-muted-foreground shrink-0" />
              )}
              <span className="hidden 2xl:inline">Cover</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal(selectedScheme)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Edit Scheme Details"
            >
              <Edit3 size={14} className="shrink-0" />
              <span className="hidden xl:inline">Edit</span>
            </button>

            <button
              onClick={() => {
                const hasCustomers = (selectedScheme.stats?.total_members || 0) > 0 || members.length > 0;
                if (hasCustomers) {
                  toast.error('Cannot delete scheme with active customers enrolled. You can mark it as closed instead.');
                  return;
                }
                setSchemeToDelete(selectedScheme);
              }}
              title={((selectedScheme.stats?.total_members || 0) > 0 || members.length > 0) ? "Cannot delete scheme with active customers" : "Delete Scheme"}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs whitespace-nowrap shrink-0 ${
                ((selectedScheme.stats?.total_members || 0) > 0 || members.length > 0)
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 cursor-pointer"
              }`}
            >
              <Trash2 size={14} className="shrink-0" />
              <span className="hidden 2xl:inline">Delete</span>
            </button>

            <button
              onClick={handleOpenAddMemberModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
              title="Enroll Customer into this Scheme"
            >
              <Plus size={14} className="shrink-0" />
              <span className="hidden sm:inline">Enroll Member</span>
              <span className="sm:hidden">Enroll</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap py-0.5">
            <button
              type="button"
              onClick={handleCopyAllSchemesLink}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Copy shareable link for all public savings schemes"
            >
              <Share2 size={13} className="text-primary shrink-0" />
              <span className="hidden md:inline">Share Schemes</span>
              <span className="md:hidden">Share</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPublicSchemesInNewTab}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
              title="Open public customer schemes view in new tab"
            >
              <ExternalLink size={13} className="text-muted-foreground shrink-0" />
              <span className="hidden lg:inline">Preview Store</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus size={15} className="shrink-0" />
              <span className="hidden sm:inline">Create Scheme</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        )}
      </HeaderActions>

      {/* Notice if savings schemes disabled in settings */}
      {!isSchemeEnabledShop(shop?.category, shop?.settings) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Savings Schemes are currently disabled for your store storefront.</p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">Customers cannot see or join schemes on your digital menu. You can re-enable this anytime in Store Settings.</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1.5 shadow-xs transition-all w-fit"
          >
            Go to Settings
          </Link>
        </div>
      )}

      {/* Main Content: Schemes List or Selected Scheme Details */}
      {!selectedScheme ? (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-56 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : schemes.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center w-full space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Coins size={32} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">No Schemes Created Yet</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Launch a Diwali cracker scheme or New Year bakery box savings scheme. Customers contribute weekly or monthly and get reward products upon completion.
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-600 text-white rounded-xl font-bold text-xs shadow-md shadow-primary/20 cursor-pointer"
              >
                <Plus size={16} />
                <span>Create Your First Scheme</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {schemes.map(scheme => {
                const stats = scheme.stats;
                const membersCount = stats?.total_members || 0;
                const isCapped = scheme.max_members !== null && scheme.max_members !== undefined;
                const percentFilled = isCapped ? Math.min(100, Math.round((membersCount / scheme.max_members!) * 100)) : null;
                const hasCustomers = membersCount > 0;
                const primaryImage = scheme.image_url || scheme.items?.find(it => it.image_url)?.image_url;
                const highlightLines = (scheme.highlight_text || '').split('\n').map(l => l.trim()).filter(Boolean);

                return (
                  <div
                    key={scheme.id}
                    onClick={() => handleSelectScheme(scheme)}
                    className="group relative bg-card border border-border/80 hover:border-primary/60 rounded-xl overflow-hidden shadow-xs hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    {/* Top Media / Banner Section (Authentic Menu Card Cover Style) */}
                    <div className="relative w-full h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/20 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-slate-900 border-b border-border/60">
                      {primaryImage ? (
                        <div
                          className="relative w-full h-full group/cardimg cursor-zoom-in"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLightboxImage(primaryImage);
                            setLightboxTitle(scheme.title);
                          }}
                          title="Click to view banner in full view"
                        >
                          <img
                            src={primaryImage}
                            alt={scheme.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                          />
                          <div className="absolute top-2.5 left-2.5 z-20 opacity-0 group-hover/cardimg:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/20">
                            <Maximize2 size={11} className="text-amber-400" />
                            <span>Full View</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
                          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-400/25 blur-2xl" />
                          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-orange-500/20 blur-2xl" />
                          <Coins size={80} className="absolute -right-4 -bottom-4 text-amber-500/10 dark:text-amber-400/5 rotate-12" />
                          <Gift size={64} className="absolute -left-4 -top-4 text-orange-500/10 dark:text-orange-400/5 -rotate-12" />
                          <div className="relative z-10 w-14 h-14 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-md shadow-md border border-amber-300/40 dark:border-amber-700/40 flex items-center justify-center text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                            <Coins size={28} />
                          </div>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25 pointer-events-none" />

                      {/* Quick Banner Actions on Card */}
                      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
                        {scheme.image_url && (
                          <button
                            type="button"
                            onClick={(e) => handleRemoveSchemeBanner(scheme.id, e)}
                            title="Remove custom banner cover"
                            className="px-2 py-1 rounded-xl bg-rose-600/85 hover:bg-rose-600 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-md border border-rose-400/30 cursor-pointer active:scale-95"
                          >
                            <Trash2 size={11} className="text-white" />
                            <span>Remove</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerQuickBannerUpload(scheme.id);
                          }}
                          title="Upload / Change scheme cover banner"
                          className="px-2.5 py-1 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md border border-white/20 cursor-pointer active:scale-95"
                        >
                          <Camera size={12} className="text-white" />
                          <span>{scheme.image_url ? 'Change Cover' : 'Upload Cover'}</span>
                        </button>
                      </div>

                      {/* Top Badges & Actions */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 z-20">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 text-amber-900 dark:text-amber-200 border border-amber-300/70 dark:border-amber-700/70 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <Calendar size={10} className="text-amber-600 dark:text-amber-400" />
                            {scheme.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                          </span>
                          <span className={`backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs ${
                            scheme.show_on_public_menu ? 'bg-blue-500/90 text-white' : 'bg-slate-700/90 text-white'
                          }`}>
                            {scheme.show_on_public_menu ? 'Public' : 'Private'}
                          </span>
                          <span className={`backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold capitalize shadow-xs ${
                            scheme.status === 'active' ? 'bg-emerald-500/90 text-white' : 'bg-slate-600/90 text-white'
                          }`}>
                            {scheme.status}
                          </span>
                        </div>

                        {/* Quick Edit, Delete & Share Actions */}
                        <div className="backdrop-blur-md bg-white/95 dark:bg-slate-900/95 p-0.5 rounded-xl border border-border/60 flex items-center gap-0.5 shadow-xs shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerQuickBannerUpload(scheme.id);
                            }}
                            title="Change Scheme Cover Photo"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Camera size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySchemeLink(scheme);
                            }}
                            title="Copy shareable customer link for this scheme"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Share2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSchemeInNewTab(scheme);
                            }}
                            title="Open customer view in new tab"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCreateModal(scheme);
                            }}
                            title="Edit Scheme"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasCustomers) {
                                toast.error('Cannot delete scheme with active customers enrolled. You can mark it as closed instead.');
                                return;
                              }
                              setSchemeToDelete(scheme);
                            }}
                            title={hasCustomers ? "Cannot delete scheme with active customers" : "Delete Scheme"}
                            className={`p-1.5 rounded-lg transition-colors ${
                              hasCustomers
                                ? "text-muted-foreground/35 hover:text-muted-foreground/50 cursor-not-allowed"
                                : "text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            }`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Single-line Ribbon on Banner */}
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
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3 bg-card">
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-black text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug break-words break-all">
                            {scheme.title}
                          </h3>
                          {scheme.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed break-words">
                              {scheme.description}
                            </p>
                          )}
                        </div>

                        {/* Highlights breakdown (compact with max 2 lines + expand toggle) */}
                        {renderHighlightBenefits(scheme.highlight_text, true, 2)}

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 dark:bg-slate-800/40 border border-border/60">
                          <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Installment
                            </span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="font-mono font-black text-base text-primary">
                                {currency}{scheme.price.toLocaleString()}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                / {scheme.frequency === 'weekly' ? 'wk' : 'mo'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right border-l border-border/60 pl-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Term Duration
                            </span>
                            <div className="flex items-baseline justify-end gap-1 mt-0.5">
                              <span className="font-black text-base text-foreground">
                                {scheme.term_duration} {scheme.term_unit}
                              </span>
                            </div>
                          </div>

                          <div className="col-span-2 pt-2 border-t border-border/50 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Store size={12} className="text-primary" />
                              <span>Reward Mode:</span>
                            </span>
                            <span className="font-bold text-foreground">
                              {scheme.reward_type === 'all_items' ? 'All Store Items' : scheme.reward_type === 'category' ? 'Category Scheme' : scheme.reward_type === 'monetary_fund' ? 'Direct Fund' : `${scheme.items?.length || 0} Products Hamper`}
                            </span>
                          </div>

                          <div className="col-span-2 flex items-center justify-between text-[11px] pt-1 border-t border-border/30">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Users size={12} className="text-muted-foreground" />
                              <span>Enrolled Members:</span>
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {membersCount} {isCapped ? `/ ${scheme.max_members}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar if capped */}
                        {percentFilled !== null && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                              <span>Capacity</span>
                              <span>{percentFilled}% Filled</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${percentFilled}%` }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 mt-1 border-t border-border flex items-center justify-between text-xs">
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>{currency}{(stats?.total_collected || 0).toLocaleString()} Collected</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-bold group-hover:translate-x-1 transition-transform">
                          <span>Manage</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Selected Scheme Dashboard & Member Roster */
        <div className="space-y-6">
          {/* Scheme Banner Hero Card with Quick Cover Edit */}
          <div className="relative rounded-xl border border-border shadow-xs bg-card group overflow-hidden">
            <div className="relative h-44 sm:h-52 w-full rounded-xl overflow-hidden bg-gradient-to-r from-amber-700 via-orange-600 to-amber-900">
              {selectedScheme.image_url || selectedScheme.items?.find((it) => it.image_url)?.image_url ? (
                <div
                  className="relative w-full h-full group/hero cursor-zoom-in"
                  onClick={() => {
                    const heroImg = selectedScheme.image_url || selectedScheme.items?.find((it) => it.image_url)?.image_url;
                    if (heroImg) {
                      setLightboxImage(heroImg);
                      setLightboxTitle(selectedScheme.title);
                    }
                  }}
                  title="Click to view banner in full view"
                >
                  <img
                    src={selectedScheme.image_url || selectedScheme.items?.find((it) => it.image_url)?.image_url || ''}
                    alt={selectedScheme.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  <div className="absolute top-3 left-3 z-20 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md border border-white/20">
                    <Maximize2 size={13} className="text-primary" />
                    <span>Full View</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 dark:from-slate-900 dark:via-amber-950/20 dark:to-slate-900">
                  <div className="w-16 h-16 rounded-xl bg-white/80 dark:bg-card/80 shadow-md flex items-center justify-center border border-primary/20">
                    <Coins size={32} className="text-primary" />
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

              {/* Hero Scheme Meta Overlay */}
              <div className="absolute bottom-3.5 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6 text-white pointer-events-none">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-xs">
                    {selectedScheme.frequency} Scheme
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedScheme.status === 'active'
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-slate-500/90 text-white'
                  }`}>
                    {selectedScheme.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                  {selectedScheme.show_on_public_menu && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/90 text-white">
                      Public QR Menu
                    </span>
                  )}
                  {selectedScheme.reward_type && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 backdrop-blur-xs text-white">
                      {selectedScheme.reward_type === 'all_items' ? 'All Store Items' : selectedScheme.reward_type === 'category' ? 'Category Scheme' : selectedScheme.reward_type === 'monetary_fund' ? 'Direct Fund' : `${selectedScheme.items?.length || 0} Reward Items`}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm">
                  {selectedScheme.title}
                </h2>
                {selectedScheme.description && (
                  <p className="text-xs text-white/80 line-clamp-1 max-w-2xl mt-0.5">
                    {selectedScheme.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions at Top-Right (Hidden on Mobile to keep banner uncluttered; handled in structured card below) */}
            <div className="hidden sm:flex absolute top-3 right-3 z-30 flex-col items-end gap-2">
              {/* Banner Upload / Change Buttons */}
              <div className="flex items-center gap-2">
                {selectedScheme.image_url && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveSchemeBanner(selectedScheme.id, e)}
                    className="px-3 py-1.5 bg-rose-600/85 hover:bg-rose-600 backdrop-blur-md text-white border border-rose-400/30 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Remove custom banner cover"
                  >
                    <Trash2 size={13} />
                    <span>Remove Banner</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleTriggerQuickBannerUpload(selectedScheme.id)}
                  disabled={isQuickUploading && quickUploadSchemeId === selectedScheme.id}
                  className="px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="Upload or Change Scheme Banner Image"
                >
                  {isQuickUploading && quickUploadSchemeId === selectedScheme.id ? (
                    <Loader2 size={13} className="animate-spin text-primary" />
                  ) : (
                    <Camera size={13} className="text-white" />
                  )}
                  <span>{selectedScheme.image_url ? 'Change Banner' : 'Upload Banner'}</span>
                </button>
              </div>

              {/* View Rewards Button & Modal Trigger */}
              <div className="relative" ref={rewardsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsRewardsModalOpen(true)}
                  className="px-3 py-1.5 bg-primary/95 hover:bg-primary backdrop-blur-md text-white border border-primary/30 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                  title="View scheme rewards"
                >
                  <Gift size={13} />
                  <span>View Rewards ({selectedScheme.items?.length || selectedScheme.reward_categories?.length || 0})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Structured Scheme Action Toolbar (Phones & Tablets < lg) */}
          <div className="lg:hidden bg-card border border-border/80 rounded-xl p-3 shadow-2xs space-y-2.5">
            {/* Top Subrow: Back button and Scheme Badges */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <button
                type="button"
                onClick={handleBackToAllSchemes}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold transition-all cursor-pointer"
              >
                <ArrowLeft size={13} className="text-primary" />
                <span>All Schemes</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {selectedScheme.frequency.toUpperCase()}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedScheme.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20'
                }`}>
                  {selectedScheme.status === 'active' ? 'Active' : 'Closed'}
                </span>
              </div>
            </div>

            {/* 2-Column Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOpenCreateModal(selectedScheme)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Edit3 size={13} className="text-primary" />
                <span>Edit Scheme</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRewardsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Gift size={13} />
                <span>Rewards ({selectedScheme.items?.length || selectedScheme.reward_categories?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => handleTriggerQuickBannerUpload(selectedScheme.id)}
                disabled={isQuickUploading && quickUploadSchemeId === selectedScheme.id}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                {isQuickUploading && quickUploadSchemeId === selectedScheme.id ? (
                  <Loader2 size={13} className="animate-spin text-primary" />
                ) : (
                  <Camera size={13} className="text-muted-foreground" />
                )}
                <span>{selectedScheme.image_url ? 'Change Banner' : 'Upload Banner'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopySchemeLink(selectedScheme)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-background hover:bg-muted text-foreground border border-border rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Share2 size={13} className="text-primary" />
                <span>Share Link</span>
              </button>
            </div>
          </div>

          {/* 1. STATS & ANALYTICS KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Total Members
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Users size={15} />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-foreground font-mono">
                    {selectedScheme.stats?.total_members || members.length || 0}
                  </span>
                  {selectedScheme.max_members ? (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">/ {selectedScheme.max_members}</span>
                  ) : (
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">enrolled</span>
                  )}
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 truncate">
                  Active customer passbooks
                </span>
              </div>
            </div>

            <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-xs hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Total Collected
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Wallet size={15} />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {currency}{(selectedScheme.stats?.total_collected || 0).toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 truncate">
                  Total installment revenue
                </span>
              </div>
            </div>

            <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-xs hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  Paid This Cycle
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
                    {selectedScheme.stats?.paid_this_cycle_count || 0}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">members</span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 truncate">
                  Up-to-date installments
                </span>
              </div>
            </div>

            <div className="bg-card border border-border p-3 sm:p-4 rounded-xl shadow-xs hover:border-orange-500/40 transition-all flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Pending This Cycle
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                  <Clock size={15} />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black text-orange-600 dark:text-orange-400 font-mono">
                    {selectedScheme.stats?.pending_this_cycle_count || 0}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">members</span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground block mt-0.5 truncate">
                  Due for payment collection
                </span>
              </div>
            </div>
          </div>

          {/* 4. MEMBERS MANAGEMENT & PASSBOOK ROSTER */}
          <div className="space-y-4">
            {/* Sticky Filter & Action Toolbar (Fixed when hitting top, matching Menus page) */}
            <div className="sticky top-[-12px] sm:top-[-16px] lg:top-[-20px] z-20 bg-background/95 backdrop-blur-md py-2 sm:py-2.5 -mx-3 px-3 sm:-mx-4 sm:px-4 lg:-mx-5 lg:px-5 border-b border-border/80 transition-all">
              <div className="bg-card p-2.5 sm:p-3 rounded-xl border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search customer by name, phone, or passbook #..."
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      if (selectedScheme) fetchMembers(selectedScheme.id, e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border rounded-lg focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all placeholder:text-muted-foreground/60 shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="flex bg-muted/80 p-1 rounded-lg text-xs font-semibold border border-border/60">
                    <button
                      onClick={() => setMemberFilter('all')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                        memberFilter === 'all' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({members.length})
                    </button>
                    <button
                      onClick={() => setMemberFilter('paid')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                        memberFilter === 'paid' ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Paid ({members.filter(m => m.paid_installments > 0).length})
                    </button>
                    <button
                      onClick={() => setMemberFilter('pending')}
                      className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                        memberFilter === 'pending' ? 'bg-card text-primary shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Due ({members.filter(m => m.paid_installments < m.total_installments).length})
                    </button>
                  </div>

                  <button
                    onClick={handleOpenAddMemberModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Enroll Member</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Members Roster / Empty State */}
            {isLoadingMembers ? (
              <div className="bg-card border border-border rounded-xl p-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2 shadow-xs">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading member records...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-8 sm:p-12 text-center space-y-6 max-w-xl mx-auto shadow-xs">
                <div className="relative mx-auto w-16 h-16 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-inner">
                  <Users size={30} />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black shadow-xs">
                    +
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-base sm:text-lg font-black text-foreground">
                    {memberSearch ? 'No Members Match Your Search' : 'No Members Enrolled Yet'}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
                    {memberSearch
                      ? `No customers match "${memberSearch}". Clear the search to view all members.`
                      : 'Enroll your first customer to activate their monthly installment passbook, issue payment receipts, and track maturity delivery.'}
                  </p>
                </div>

                {!memberSearch && (
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleOpenAddMemberModal}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-md shadow-primary/25 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus size={15} />
                      <span>Enroll First Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedScheme && handleCopySchemeLink(selectedScheme)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-background hover:bg-muted border border-border rounded-lg text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                    >
                      <Share2 size={14} className="text-primary" />
                      <span>Copy Customer Share Link</span>
                    </button>
                  </div>
                )}

                {/* 3-Step Scheme Guidance Box */}
                {!memberSearch && (
                  <div className="pt-4 border-t border-border/60 text-left grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 block">
                        Step 1: Enroll
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Register customer name, mobile number, and address at counter or via public link.
                      </p>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 block">
                        Step 2: Collect
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Record periodic installments via Cash, UPI/QR, Card, or Net Banking.
                      </p>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1">
                      <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 block">
                        Step 3: Deliver
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        At full term, customer claims their guaranteed cracker box or store freedom hamper!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredMembers.map(member => {
                  const percentPaid = Math.round((member.paid_installments / member.total_installments) * 100);
                  const remainingInstallments = Math.max(0, member.total_installments - member.paid_installments);
                  const nextDueNumber = member.paid_installments + 1;
                  const isCompleted = member.status === 'completed' || member.paid_installments >= member.total_installments;

                  return (
                    <div
                      key={member.id}
                      className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-all space-y-3.5"
                    >
                      {/* Member Info Row */}
                      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-3 border-b border-border/60">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-base text-foreground leading-tight">{member.customer_name}</h4>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                              {member.member_number}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-primary/10 text-primary border border-primary/25'
                            }`}>
                              {member.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5 font-mono font-medium text-foreground bg-muted/40 hover:bg-muted/70 px-2 py-0.5 rounded-md transition-colors group">
                              <Phone size={12} className="text-primary shrink-0" />
                              <span>{formatPhoneWithCountryCode(member.customer_phone)}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyPhone(member.customer_phone);
                                }}
                                title="Copy phone number"
                                aria-label="Copy phone number"
                                className="p-0.5 rounded hover:bg-background text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              >
                                {copiedPhone === member.customer_phone ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </span>
                            <span>•</span>
                            <span>Joined: {new Date(member.joined_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {member.customer_address && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-sm" title={cleanAddressDisplay(member.customer_address)}>{cleanAddressDisplay(member.customer_address)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action: Record Payment, Transfer, Delete, History (Never overflows or gets cut off) */}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full 2xl:w-auto 2xl:justify-end shrink-0 pt-1 sm:pt-0">
                          {/* Secondary Management Row (Equal 3-col grid on mobile, inline on desktop) */}
                          <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-1.5 w-full sm:w-auto">
                            {/* Change Scheme Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenTransferModal(member)}
                              title="Transfer customer to another scheme"
                              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer hover:border-primary/50"
                            >
                              <ArrowRightLeft size={13} className="text-primary shrink-0" />
                              <span className="2xl:hidden">Change</span>
                              <span className="hidden 2xl:inline">Change Scheme</span>
                            </button>

                            {/* Customer History Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenCustomerHistory(member.customer_name, member.customer_phone)}
                              title="View customer scheme & payment audit timeline"
                              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all cursor-pointer hover:border-slate-400"
                            >
                              <History size={13} className="text-slate-500 shrink-0" />
                              <span>History</span>
                            </button>

                            {/* Delete Member Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteMemberModal(member)}
                              title={member.paid_installments > 0 ? "Delete Member (Requires Customer OTP)" : "Delete accidental enrollment"}
                              className="flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100/80 transition-all cursor-pointer text-xs font-semibold"
                            >
                              <Trash2 size={13} className="shrink-0" />
                              <span>Delete</span>
                            </button>
                          </div>

                          {/* Primary Action Button: Full width on mobile, inline on desktop */}
                          {!isCompleted ? (
                            <button
                              onClick={() => handleOpenPaymentModal(member, nextDueNumber)}
                              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer hover:scale-102 active:scale-95 whitespace-nowrap shrink-0"
                            >
                              <span className="font-bold text-xs leading-none shrink-0">{currency}</span>
                              <span>Record Due #{nextDueNumber} ({currency}{selectedScheme.price.toLocaleString()})</span>
                            </button>
                          ) : (
                            <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold whitespace-nowrap">
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Completed 🎉</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Overall Progress Bar Section (Inner borders removed, reduced radius) */}
                      <div className="bg-muted/30 rounded-lg p-3 sm:p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">
                            {member.paid_installments} of {member.total_installments} Installments Paid
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            {percentPaid}% Complete
                          </span>
                        </div>

                        <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600 transition-all duration-500 rounded-full"
                            style={{ width: `${percentPaid}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                          <span>
                            Paid: <strong className="text-foreground font-mono">{currency}{(member.paid_installments * selectedScheme.price).toLocaleString()}</strong> of {currency}{(member.total_installments * selectedScheme.price).toLocaleString()}
                          </span>
                          <span className="font-bold text-primary">
                            {remainingInstallments > 0 ? (
                              `⏳ ${remainingInstallments} ${selectedScheme.frequency === 'weekly' ? 'weeks' : 'months'} remaining`
                            ) : (
                              'All installments paid! Ready for gift box'
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Installments Breakdown Grid (Spacious, Same as Public Menu Pass) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Installments Breakdown ({selectedScheme.frequency})
                          </span>
                          {!isCompleted && (
                            <span className="text-[11px] text-primary font-medium hidden sm:inline">
                              Tap due card to record payment (Next Due: #{nextDueNumber})
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                          {member.installment_schedule.map(inst => {
                            const isPaid = inst.is_paid;
                            const isNextDue = !isPaid && inst.installment_number === nextDueNumber;
                            const isFutureDue = !isPaid && inst.installment_number > nextDueNumber;

                            return (
                              <button
                                key={inst.installment_number}
                                type="button"
                                disabled={isPaid || isCompleted}
                                onClick={() => {
                                  if (!isPaid && !isCompleted) {
                                    handleOpenPaymentModal(member, inst.installment_number);
                                  }
                                }}
                                className={`p-2.5 sm:p-3 rounded-lg border text-center flex flex-col items-center justify-between min-h-[90px] transition-all text-left relative ${
                                  isPaid
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200 cursor-default'
                                    : isCompleted
                                      ? 'bg-muted/30 border-border opacity-60 cursor-not-allowed'
                                      : isNextDue
                                        ? 'bg-primary/10 border-primary dark:border-primary/70 text-foreground ring-2 ring-primary/40 shadow-xs hover:bg-primary/15 cursor-pointer hover:scale-102'
                                        : 'bg-background border-border text-foreground hover:border-primary/60 hover:bg-muted/40 cursor-pointer hover:scale-102'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isPaid ? (
                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                  ) : isNextDue ? (
                                    <CreditCard size={13} className="text-primary shrink-0 animate-pulse" />
                                  ) : (
                                    <Clock size={13} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-bold text-xs">
                                    {selectedScheme.frequency === 'weekly' ? `W#${inst.installment_number}` : `#${inst.installment_number}`}
                                  </span>
                                </div>

                                <span className={`text-[9.5px] font-mono font-bold uppercase px-2 py-0.5 rounded-md ${
                                  isPaid
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                    : isNextDue
                                      ? 'bg-primary text-white shadow-2xs'
                                      : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isPaid ? 'PAID' : isNextDue ? 'PAY NOW' : 'DUE'}
                                </span>

                                {isPaid ? (
                                  <div className="mt-1 text-center w-full">
                                    {inst.paid_at && (
                                      <span className="text-[8.5px] text-emerald-700 dark:text-emerald-300 font-mono block leading-tight">
                                        {formatPaidDateTime(inst.paid_at)}
                                      </span>
                                    )}
                                    <span className="text-[8px] text-emerald-600/80 dark:text-emerald-400/80 uppercase font-semibold block mt-0.5">
                                      {inst.payment_method || 'CASH'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="mt-1 text-center w-full">
                                    <span className="text-[10px] font-mono font-bold text-muted-foreground block">
                                      {currency}{selectedScheme.price.toLocaleString()}
                                    </span>
                                    {isFutureDue && (
                                      <span className="text-[8px] text-amber-600 dark:text-amber-400 block font-medium">
                                        Pays #{nextDueNumber}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            );
                          })}
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

      {/* INCLUDED REWARD PRODUCTS MODAL (DESKTOP) */}
      {selectedScheme && (
        <Modal
          isOpen={isRewardsModalOpen}
          onClose={() => setIsRewardsModalOpen(false)}
          title={
            selectedScheme.reward_type === 'category'
              ? `Eligible Reward Categories (${selectedScheme.reward_categories?.length || 0})`
              : `Included Reward Products (${selectedScheme.items?.length || 0})`
          }
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Gift size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    {selectedScheme.reward_type === 'category'
                      ? 'Approved Reward Categories'
                      : 'Fixed Hamper Bundle'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedScheme.reward_type === 'category'
                      ? 'Scheme maturity value can be redeemed across these categories'
                      : 'Products included in scheme completion hamper'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 self-start sm:self-auto shrink-0">
                {selectedScheme.reward_type === 'category' ? 'Category Scheme' : 'Fixed Hamper Bundle'}
              </span>
            </div>

            {selectedScheme.items && selectedScheme.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
                {selectedScheme.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-muted/40 hover:bg-muted/70 rounded-lg border border-border/60 transition-all"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-lg shrink-0 border border-border/40"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Gift size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-[10px] text-primary font-semibold block truncate">
                          {item.variant_name}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedScheme.reward_categories && selectedScheme.reward_categories.length > 0 ? (
              <div className="flex flex-wrap gap-2 py-2">
                {selectedScheme.reward_categories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center gap-1.5"
                  >
                    <Tag size={12} className="text-primary" />
                    <span>{cat.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No reward items configured for this scheme.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CREATE / EDIT SCHEME MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingScheme ? 'Edit Savings Scheme' : 'Create Savings Scheme (Fund)'}
        className="sm:max-w-2xl lg:max-w-3xl"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted cursor-pointer transition-colors text-xs"
              >
                Cancel
              </button>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  className="flex items-center gap-1 px-3.5 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted cursor-pointer transition-colors text-xs"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {editingScheme && currentStep < 3 && (
                <button
                  type="button"
                  onClick={() => handleSubmitScheme()}
                  disabled={isSubmittingScheme}
                  className="px-4 py-2 border border-primary/40 hover:bg-primary/10 text-primary rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              )}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep(currentStep)) {
                      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
                    }
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all active:scale-95"
                >
                  <span>Next Step</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmitScheme()}
                  disabled={isSubmittingScheme}
                  className="px-6 py-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmittingScheme ? 'Saving Scheme...' : editingScheme ? 'Save Changes' : 'Create Scheme'}
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 text-xs p-1">
          {/* Step Indicator Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-2">
            {[
              { step: 1, title: 'Overview', desc: 'Title & Visibility' },
              { step: 2, title: 'Installment Plan', desc: 'Pricing & Terms' },
              { step: 3, title: 'Reward Products', desc: 'Items & Review' }
            ].map((s, idx) => {
              const isActive = currentStep === s.step;
              const isCompleted = currentStep > s.step;
              return (
                <React.Fragment key={s.step}>
                  {idx > 0 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      currentStep >= s.step ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (s.step < currentStep || validateStep(currentStep)) {
                        setCurrentStep(s.step as 1 | 2 | 3);
                      }
                    }}
                    className={`flex items-center gap-2 group transition-all cursor-pointer text-left ${
                      isActive ? 'opacity-100' : isCompleted ? 'opacity-90' : 'opacity-40 hover:opacity-75'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isActive
                        ? 'bg-primary text-white ring-4 ring-primary/20 shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <Check size={14} /> : s.step}
                    </div>
                    <div className="hidden sm:block">
                      <div className={`text-xs font-bold leading-tight ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        {s.desc}
                      </div>
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Active Customer Restriction Notice */}
          {hasActiveCustomers && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200">
              <Lock size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <span className="font-bold">Active Customer Protections:</span> This scheme currently has{' '}
                <strong className="underline">{editingScheme?.stats?.total_members || 1} enrolled member(s)</strong>.
                Pricing, duration, capacity, and reward products are strictly locked to protect customer agreements.
                Only the <strong>Scheme Title</strong>, <strong>Description</strong>, and <strong>Banner Cover</strong> can be updated.
              </div>
            </div>
          )}

          {/* STEP 1: SCHEME OVERVIEW & VISIBILITY */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-lg p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b border-border/60">
                  <Coins size={16} className="text-primary" />
                  <span>Scheme Overview</span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary ml-auto border border-primary/25">
                    {categorySchemeConfig.tagBadge}
                  </span>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1.5">
                    {categorySchemeConfig.titleLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={categorySchemeConfig.titlePlaceholder}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground text-xs sm:text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder={categorySchemeConfig.descriptionPlaceholder}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground text-xs focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs transition-all resize-none"
                  />
                </div>

                {/* Scheme Banner Cover Image Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-foreground block text-xs">
                      Scheme Banner Cover (Optional)
                    </label>
                    {formData.image_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: null })}
                        className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <X size={12} />
                        <span>Remove Banner</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={handleBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {formData.image_url ? (
                    <div className="relative rounded-lg overflow-hidden border border-border group h-36 bg-slate-900 shadow-2xs">
                      <img
                        src={formData.image_url}
                        alt="Scheme Banner"
                        onClick={() => {
                          setLightboxImage(formData.image_url);
                          setLightboxTitle(formData.title || 'Scheme Banner');
                        }}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                        title="Click to view full image"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxImage(formData.image_url);
                            setLightboxTitle(formData.title || 'Scheme Banner');
                          }}
                          className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-slate-700 cursor-pointer"
                        >
                          <Maximize2 size={13} />
                          <span>View Full</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => bannerFileInputRef.current?.click()}
                          disabled={isUploadingBanner}
                          className="px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-slate-100 cursor-pointer"
                        >
                          {isUploadingBanner ? <Loader2 size={13} className="animate-spin text-primary" /> : <Camera size={13} />}
                          <span>Change Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image_url: null })}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-rose-700 cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !isUploadingBanner && bannerFileInputRef.current?.click()}
                      className="border-2 border-dashed border-border hover:border-primary/60 rounded-lg p-4 text-center cursor-pointer transition-all bg-muted/20 hover:bg-primary/5 group"
                    >
                      {isUploadingBanner ? (
                        <div className="flex flex-col items-center justify-center py-3 text-muted-foreground gap-2">
                          <Loader2 size={22} className="animate-spin text-primary" />
                          <span className="text-xs font-semibold">Uploading banner...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-2 text-muted-foreground group-hover:text-primary transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                            <UploadCloud size={18} />
                          </div>
                          <p className="text-xs font-bold text-foreground mb-0.5">
                            Upload Scheme Banner Cover
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            PNG, JPG, WEBP up to 10MB (recommended 1200x500 or 16:9)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-foreground">
                      Key Highlights & Benefits (Optional)
                    </label>
                    <span className="text-[11px] text-muted-foreground">One perk per line</span>
                  </div>
                  <textarea
                    rows={3}
                    value={formData.highlight_text || ''}
                    onChange={(e) => setFormData({ ...formData, highlight_text: e.target.value })}
                    placeholder={
                      isCrackers 
                        ? "e.g.\n10% Extra Cracker Bonus on Diwali\nFree Home Delivery across Tamil Nadu\nGuaranteed Gift Box Worth ₹1,200\nPriority Festival Dispatch"
                        : isBakery
                        ? "e.g.\nFree Celebration Cake on Birthday\n15% Festive Sweets Hamper Discount\nPriority Festival Box Collection"
                        : "e.g.\n10% Bonus Savings Perk on Completion\nFree Delivery on Final Box\nExclusive Festival Hamper Included"
                    }
                    className="w-full px-3.5 py-2.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Public Menu Visibility Toggle */}
              <div className="bg-card border border-border/80 rounded-lg p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Eye size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-foreground block">Show on Public QR Menu</span>
                    <span className="text-xs text-muted-foreground block mt-0.5 max-w-md">
                      Displays a floating scheme badge on your digital menu beside filters so patrons can discover, join, and check their scheme passes.
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.show_on_public_menu}
                    onChange={(e) => setFormData({ ...formData, show_on_public_menu: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-2xs"></div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: INSTALLMENT PLAN & SCHEDULE */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-lg p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Calendar size={16} className="text-primary" />
                    <span>Installment Plan & Term Schedule</span>
                  </div>
                  {hasActiveCustomers && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                      <Lock size={11} />
                      <span>Locked (Active Members)</span>
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-2">Contribution Frequency *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={hasActiveCustomers}
                      onClick={() => setFormData({ ...formData, frequency: 'monthly', term_unit: 'months' })}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        formData.frequency === 'monthly'
                          ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.frequency === 'monthly' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-foreground">Monthly Scheme</span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">Installment paid once each month</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={hasActiveCustomers}
                      onClick={() => setFormData({ ...formData, frequency: 'weekly', term_unit: 'weeks' })}
                      className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        formData.frequency === 'weekly'
                          ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-2xs'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.frequency === 'weekly' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs sm:text-sm block text-foreground">Weekly Scheme</span>
                        <span className="text-[11px] text-muted-foreground block mt-0.5">Installment paid once each week</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-foreground">Installment Amount ({currency}) *</label>
                      {hasActiveCustomers && <Lock size={12} className="text-muted-foreground" />}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-muted-foreground font-mono">{currency}</span>
                      <input
                        type="number"
                        min="1"
                        required
                        disabled={hasActiveCustomers}
                        placeholder={categorySchemeConfig.pricePlaceholder}
                        value={formData.price || ''}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                        className={`w-full pl-8 pr-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground font-mono text-xs sm:text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs ${
                          hasActiveCustomers ? 'opacity-60 cursor-not-allowed bg-muted/40' : ''
                        }`}
                      />
                    </div>
                    {!hasActiveCustomers && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[500, 1000, 2000, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setFormData({ ...formData, price: amt })}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                              formData.price === amt 
                                ? 'bg-primary/10 text-primary border-primary/30 font-bold' 
                                : 'bg-muted/50 hover:bg-muted text-muted-foreground border-transparent'
                            }`}
                          >
                            {currency}{amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-foreground">Term Duration ({formData.term_unit}) *</label>
                      {hasActiveCustomers && <Lock size={12} className="text-muted-foreground" />}
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      disabled={hasActiveCustomers}
                      value={formData.term_duration || ''}
                      onChange={(e) => setFormData({ ...formData, term_duration: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground font-mono text-xs sm:text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed bg-muted/40' : ''
                      }`}
                    />
                    {!hasActiveCustomers && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {formData.frequency === 'monthly' ? (
                          <>
                            {[6, 10, 12, 15].map(months => (
                              <button
                                key={months}
                                type="button"
                                onClick={() => setFormData({ ...formData, term_duration: months })}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                  formData.term_duration === months 
                                    ? 'bg-primary/10 text-primary border-primary/30 font-bold' 
                                    : 'bg-muted/50 hover:bg-muted text-muted-foreground border-transparent'
                                }`}
                              >
                                {months === 12 ? '1 Year (12M)' : `${months} Months`}
                              </button>
                            ))}
                          </>
                        ) : (
                          <>
                            {[12, 26, 52].map(wks => (
                              <button
                                key={wks}
                                type="button"
                                onClick={() => setFormData({ ...formData, term_duration: wks })}
                                className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                  formData.term_duration === wks 
                                    ? 'bg-primary/10 text-primary border-primary/30 font-bold' 
                                    : 'bg-muted/50 hover:bg-muted text-muted-foreground border-transparent'
                                }`}
                              >
                                {wks === 52 ? '52 Weeks (1Y)' : `${wks} Weeks`}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Calculation Banner */}
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-primary" />
                    <span className="text-xs font-semibold text-foreground">Total Scheme Maturity Value:</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-primary">
                    {currency}{((formData.price || 0) * (formData.term_duration || 0)).toLocaleString()}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-foreground">Maximum Members Capacity</label>
                    {hasActiveCustomers && <Lock size={12} className="text-muted-foreground" />}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      disabled={hasActiveCustomers}
                      placeholder="Leave blank for Unlimited Members"
                      value={formData.max_members || ''}
                      onChange={(e) => setFormData({ ...formData, max_members: e.target.value ? Number(e.target.value) : null })}
                      className={`flex-1 px-3.5 py-2.5 bg-background border border-border rounded-lg text-foreground font-mono text-xs sm:text-sm focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary shadow-2xs ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed bg-muted/40' : ''
                      }`}
                    />
                    {!hasActiveCustomers && formData.max_members !== null && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, max_members: null })}
                        className="px-3.5 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Set Unlimited
                      </button>
                    )}
                  </div>
                  {!hasActiveCustomers && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {[null, 50, 100, 250].map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => setFormData({ ...formData, max_members: val })}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                            formData.max_members === val 
                              ? 'bg-primary/10 text-primary border-primary/30 font-bold' 
                              : 'bg-muted/50 hover:bg-muted text-muted-foreground border-transparent'
                          }`}
                        >
                          {val === null ? 'Unlimited' : `${val} Members`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REWARD PRODUCTS & SUMMARY */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-lg p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-primary" />
                    <div>
                      <span className="font-bold text-sm text-foreground block">
                        {categorySchemeConfig.itemsSectionTitle}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {categorySchemeConfig.itemsSectionSubtitle}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {formData.reward_type === 'all_items' ? 'All Items' : formData.reward_type === 'category' ? 'Category Scheme' : 'Individual Items'}
                    </span>
                    {formData.items.length > 0 && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-mono border border-primary/25">
                        {formData.items.length} Products Attached
                      </span>
                    )}
                  </div>
                </div>

                {hasActiveCustomers ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs text-muted-foreground">
                    <Lock size={14} className="text-primary shrink-0" />
                    <span>Reward products and modes cannot be added, modified, or removed while customers are actively enrolled.</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 3-WAY REWARD PRODUCT MODE SELECTOR */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-2">
                        Reward Products Mode *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Option 1: All Items */}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, reward_type: 'all_items' }))}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            formData.reward_type === 'all_items'
                              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-xs'
                              : 'border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.reward_type === 'all_items'
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <Store size={16} />
                            </div>
                            {formData.reward_type === 'all_items' && (
                              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">All Items</span>
                            <span className="text-[11px] text-muted-foreground block line-clamp-2 mt-0.5">
                              Entire store catalog eligible for scheme redemption
                            </span>
                          </div>
                        </button>

                        {/* Option 2: Category Selection */}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, reward_type: 'category' }))}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            formData.reward_type === 'category'
                              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-xs'
                              : 'border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              formData.reward_type === 'category'
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <Tag size={16} />
                            </div>
                            {formData.reward_type === 'category' && (
                              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">Category Selection</span>
                            <span className="text-[11px] text-muted-foreground block line-clamp-2 mt-0.5">
                              Redemption valid for chosen menu categories
                            </span>
                          </div>
                        </button>

                        {/* Option 3: Individual Item Selection */}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, reward_type: 'specific_items' }))}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            (formData.reward_type === 'specific_items' || !formData.reward_type)
                              ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30 shadow-xs'
                              : 'border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              (formData.reward_type === 'specific_items' || !formData.reward_type)
                                ? 'bg-primary text-white'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <Gift size={16} />
                            </div>
                            {(formData.reward_type === 'specific_items' || !formData.reward_type) && (
                              <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">Individual Items</span>
                            <span className="text-[11px] text-muted-foreground block line-clamp-2 mt-0.5">
                              Pick specific products and fixed quantities
                            </span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC CONTENT PER SELECTED MODE */}
                    {formData.reward_type === 'all_items' ? (
                      /* ALL ITEMS PANEL */
                      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <Store size={18} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-foreground">
                              All Store Catalog Items Included
                            </h4>
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                              Customers enrolled in this scheme can redeem their accumulated fund against any product across your entire store catalog upon maturity.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-primary/20">
                          <button
                            type="button"
                            onClick={handleAddAllCatalogItems}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-lg text-xs font-bold shadow-xs shadow-primary/20 transition-all cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>Add All {menuItems.length} Catalog Items to List</span>
                          </button>
                          {formData.items.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAttachedItems}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>Clear List (Open Store Redemption)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : formData.reward_type === 'category' ? (
                      /* CATEGORY SELECTION PANEL */
                      <div className="bg-muted/20 border border-border/60 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Tag size={16} className="text-primary" />
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-foreground">
                                Select Eligible Categories
                              </h4>
                              <p className="text-[11px] text-muted-foreground">
                                Select one or more categories that customers can redeem from upon scheme completion.
                              </p>
                            </div>
                          </div>
                          {(formData.reward_categories?.length || 0) > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25">
                              {formData.reward_categories?.length} Selected
                            </span>
                          )}
                        </div>

                        {/* Category chips list */}
                        {categories.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {categories.map((cat) => {
                              const isSelected = (formData.reward_categories || []).some(c => c.id === cat.id);
                              const catItemCount = menuItems.filter(i => i.category_id === cat.id).length;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => handleToggleCategory({ id: cat.id, name: cat.name })}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-primary text-white border-primary shadow-2xs shadow-primary/20'
                                      : 'bg-background hover:bg-muted text-foreground border-border/80'
                                  }`}
                                >
                                  {isSelected ? <Check size={13} className="shrink-0" /> : <Tag size={13} className="shrink-0 text-muted-foreground" />}
                                  <span>{cat.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {catItemCount}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border/60">
                            {isLoadingCategories ? 'Loading store categories...' : 'No categories found in store. Create categories under Categories menu first.'}
                          </div>
                        )}

                        {/* Quick action to add all items from selected categories */}
                        {(formData.reward_categories?.length || 0) > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                            <button
                              type="button"
                              onClick={() => handleAddCategoryItems()}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold border border-primary/30 transition-all cursor-pointer"
                            >
                              <Plus size={13} />
                              <span>Add All Items From Selected Categories to List</span>
                            </button>
                            {formData.items.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearAttachedItems}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={13} />
                                <span>Clear Items List</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* INDIVIDUAL ITEMS SELECTION PANEL */
                      <div className="space-y-3 bg-muted/20 p-4 rounded-lg border border-border/60">
                        {/* Optional quick category filter if categories exist */}
                        {categories.length > 0 && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            <span className="text-[11px] font-bold text-muted-foreground shrink-0 mr-1">Filter Category:</span>
                            <button
                              type="button"
                              onClick={() => setCategoryFilterForPicker('all')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                                categoryFilterForPicker === 'all'
                                  ? 'bg-primary text-white border-primary'
                                  : 'bg-background hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              All ({menuItems.length})
                            </button>
                            {categories.map(cat => {
                              const count = menuItems.filter(i => i.category_id === cat.id).length;
                              if (count === 0) return null;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => setCategoryFilterForPicker(cat.id)}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer shrink-0 ${
                                    categoryFilterForPicker === cat.id
                                      ? 'bg-primary text-white border-primary'
                                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                                  }`}
                                >
                                  {cat.name} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-foreground block mb-1.5">
                              Choose Product / Item *
                            </label>
                            <SearchableSelect
                              options={menuItemOptions}
                              value={selectedItemId}
                              onChange={(val) => {
                                setSelectedItemId(val);
                                setSelectedVariantName('');
                              }}
                              placeholder={categorySchemeConfig.itemPickerPlaceholder}
                              showSearch={true}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-foreground block mb-1.5">
                              Product Variant
                            </label>
                            {currentSelectedItem && currentSelectedItem.variants && currentSelectedItem.variants.length > 0 ? (
                              <SearchableSelect
                                options={variantOptions}
                                value={selectedVariantName}
                                onChange={(val) => setSelectedVariantName(val)}
                                placeholder="Select Variant"
                                showSearch={false}
                                className="w-full"
                              />
                            ) : (
                              <div className="px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-lg text-muted-foreground text-xs flex items-center justify-between min-h-[42px]">
                                <span>Standard Variant</span>
                                {currentSelectedItem && (
                                  <span className="font-mono font-bold text-foreground">{currency}{currentSelectedItem.price}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">Quantity:</span>
                            <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                                className="px-2.5 py-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={itemQuantity}
                                onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value)))}
                                className="w-12 text-center text-xs font-mono font-bold text-foreground focus:outline-hidden"
                              />
                              <button
                                type="button"
                                onClick={() => setItemQuantity(itemQuantity + 1)}
                                className="px-2.5 py-1.5 hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddItemToScheme}
                            disabled={!selectedItemId}
                            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-sm shadow-primary/20 transition-all cursor-pointer active:scale-95"
                          >
                            <Plus size={14} />
                            <span>Add Product to Scheme</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* List of chosen items */}
                {formData.items.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Attached Scheme Box Products ({formData.items.length})
                      </div>
                      {!hasActiveCustomers && (
                        <button
                          type="button"
                          onClick={handleClearAttachedItems}
                          className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border text-xs shadow-2xs hover:border-primary/30 transition-all">
                          <div className="flex items-center gap-3 truncate">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-9 h-9 object-cover rounded-md shrink-0 border border-border/60" />
                            ) : (
                              <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Gift size={18} />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm truncate">{item.name}</span>
                                {item.variant_name && (
                                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                                    {item.variant_name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">
                                {currency}{item.price.toLocaleString()} each • Qty: {item.quantity} • Subtotal: {currency}{(item.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {!hasActiveCustomers && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Remove product"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 border border-dashed border-border/80 rounded-lg bg-muted/10">
                    <Gift size={24} className="mx-auto text-muted-foreground/60 mb-1" />
                    <p className="text-xs text-muted-foreground font-semibold">
                      {formData.reward_type === 'all_items'
                        ? 'All Store Products Qualify'
                        : formData.reward_type === 'category'
                        ? (formData.reward_categories?.length || 0) > 0
                          ? `Valid for all products in ${formData.reward_categories?.length} selected categories.`
                          : 'Please select eligible categories above.'
                        : 'No reward products attached.'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formData.reward_type === 'all_items'
                        ? 'Redemption will cover any item in your catalog upon maturity, or you can add specific items above.'
                        : formData.reward_type === 'category'
                        ? 'Customers can redeem any products within approved categories upon completing their installments.'
                        : 'Scheme will operate as a direct monetary savings fund without bundled gift products.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Scheme Summary Card */}
              <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Scheme Summary Review
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background border border-primary/30 text-primary">
                    Mode: {formData.reward_type === 'all_items' ? 'All Items' : formData.reward_type === 'category' ? `Category (${formData.reward_categories?.length || 0})` : `Individual (${formData.items.length})`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Installment</span>
                    <span className="font-bold font-mono text-foreground">{currency}{formData.price?.toLocaleString()} / {formData.frequency === 'weekly' ? 'wk' : 'mo'}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Term</span>
                    <span className="font-bold text-foreground">{formData.term_duration} {formData.term_unit}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Maturity Value</span>
                    <span className="font-bold font-mono text-primary">{currency}{((formData.price || 0) * (formData.term_duration || 0)).toLocaleString()}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Capacity</span>
                    <span className="font-bold text-foreground">{formData.max_members ? `${formData.max_members} Members` : 'Unlimited'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ENROLL MEMBER MODAL */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Enroll Scheme Member"
        description="Register customer passbook & activate installment schedule"
        size="lg"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="text-[11px] text-muted-foreground hidden sm:block">
              {newMemberForm.initial_payment ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>First installment ({currency}{selectedScheme?.price.toLocaleString()}) collected</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Passbook enrolled without initial deposit</span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="enroll-member-form"
                disabled={isSubmittingMember || !!alreadyEnrolledMember}
                className={`px-5 py-2 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
                  alreadyEnrolledMember 
                    ? 'bg-amber-600/80 cursor-not-allowed opacity-90' 
                    : 'bg-primary hover:bg-primary-600 disabled:opacity-50 shadow-md shadow-primary/20 cursor-pointer active:scale-95'
                }`}
              >
                {alreadyEnrolledMember ? (
                  <>
                    <Ban size={14} />
                    <span>Already Enrolled</span>
                  </>
                ) : isSubmittingMember ? (
                  <span>Enrolling Member...</span>
                ) : (
                  <>
                    <span>Enroll Member</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <form id="enroll-member-form" onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
          {/* Scheme Summary Context Card */}
          {selectedScheme && (
            <div className="relative overflow-hidden rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 sm:p-3.5 text-xs">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 text-primary shadow-xs">
                    <Coins size={16} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-black tracking-wider text-primary block">
                      Target Scheme
                    </span>
                    <h4 className="font-bold text-foreground text-sm truncate">
                      {selectedScheme.title}
                    </h4>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/25">
                  {selectedScheme.frequency === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-primary/15 text-center">
                <div className="bg-background/80 dark:bg-background/50 backdrop-blur-xs rounded-lg py-1.5 px-2 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Installment</span>
                  <span className="font-mono font-bold text-primary text-xs">
                    {currency}{selectedScheme.price.toLocaleString()}
                  </span>
                </div>
                <div className="bg-background/80 dark:bg-background/50 backdrop-blur-xs rounded-lg py-1.5 px-2 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Term Duration</span>
                  <span className="font-bold text-foreground text-xs">
                    {selectedScheme.term_duration} {selectedScheme.term_unit}
                  </span>
                </div>
                <div className="bg-background/80 dark:bg-background/50 backdrop-blur-xs rounded-lg py-1.5 px-2 border border-border/60">
                  <span className="text-[10px] text-muted-foreground block font-medium">Total Maturity</span>
                  <span className="font-mono font-bold text-foreground text-xs">
                    {currency}{(selectedScheme.price * selectedScheme.term_duration).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Customer Profile */}
          <div className="p-3.5 rounded-lg bg-card border border-border/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-foreground pb-2 border-b border-border/60">
              <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <User size={12} />
              </div>
              <span>Customer Information</span>
            </div>

            <div className="space-y-3">
              {/* 1. Mobile Number First */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  {isLookingUpCustomer && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-medium">
                      <Loader2 size={10} className="animate-spin" />
                      Checking customer...
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="w-[110px] shrink-0">
                    <SearchableSelect
                      options={COUNTRY_CODES.map(c => ({
                        id: c.code,
                        name: `${c.flag} ${c.code}`,
                        subtext: c.country
                      }))}
                      value={memberCountryCode}
                      onChange={(val) => {
                        setMemberCountryCode(val);
                        if (newMemberForm.customer_phone) {
                          handleCustomerPhoneChange(newMemberForm.customer_phone, val);
                        }
                      }}
                      placeholder="+91"
                      showSearch={false}
                      className="w-full text-xs"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="tel"
                      required
                      maxLength={memberCountryCode === '+91' ? 10 : 15}
                      placeholder={memberCountryCode === '+91' ? '9876543210' : 'Mobile number'}
                      value={newMemberForm.customer_phone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Customer Full Name Second (Auto-filled if customer exists) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  {customerAutoFilled && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={10} />
                      Existing Member Found
                    </span>
                  )}
                </div>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sivarajan K"
                    value={newMemberForm.customer_name}
                    onChange={(e) => {
                      setNewMemberForm({ ...newMemberForm, customer_name: e.target.value });
                      setCustomerAutoFilled(false);
                    }}
                    className={`w-full pl-9 pr-3 py-2 bg-background border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all ${
                      customerAutoFilled ? 'border-emerald-500/60 bg-emerald-50/20' : 'border-border'
                    }`}
                  />
                </div>
              </div>

              {/* Duplicate Warning Banner */}
              {alreadyEnrolledMember && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      Already Enrolled in this Scheme
                    </p>
                    <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                      {alreadyEnrolledMember.name ? <strong className="font-semibold">{alreadyEnrolledMember.name}</strong> : 'This customer'} is already registered as an active member of this scheme
                      {alreadyEnrolledMember.member_number ? (
                        <> with Passbook <strong>#{alreadyEnrolledMember.member_number}</strong></>
                      ) : null}. A customer cannot be added more than once to the same scheme.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Address Details */}
          <div className="p-3.5 rounded-lg bg-card border border-border/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2 font-bold text-xs text-foreground">
                <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin size={12} />
                </div>
                <span>Delivery & Verification Address</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">For Passbook & Maturity</span>
            </div>

            {/* Country Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Country
              </label>
              <SearchableSelect
                options={COUNTRY_OPTIONS.map(c => ({
                  id: c.id,
                  name: `${c.flag} ${c.name}`
                }))}
                value={memberCountry}
                onChange={(val) => {
                  setMemberCountry(val);
                  const matched = COUNTRY_OPTIONS.find(c => c.id === val);
                  if (matched && matched.code) {
                    setMemberCountryCode(matched.code);
                  }
                }}
                placeholder="Select Country"
                showSearch={true}
                className="w-full text-xs"
              />
            </div>

            {memberCountry === 'Other' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Specify Country Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter country name"
                  value={customMemberCountry}
                  onChange={(e) => setCustomMemberCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                />
              </div>
            )}

            {memberCountry === 'India' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    State
                  </label>
                  <SearchableSelect
                    options={INDIAN_STATES.map(s => ({ id: s, name: s }))}
                    value={memberState}
                    onChange={(val) => {
                      setMemberState(val);
                      const dists = DISTRICTS_BY_STATE[val] || ['Other / Custom District'];
                      setMemberDistrict(dists[0]);
                    }}
                    placeholder="Select State"
                    showSearch={true}
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    District / City
                  </label>
                  <SearchableSelect
                    options={(DISTRICTS_BY_STATE[memberState] || ['Other / Custom District']).map(d => ({ id: d, name: d }))}
                    value={memberDistrict}
                    onChange={(val) => setMemberDistrict(val)}
                    placeholder="Select District"
                    showSearch={true}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    State / Province
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dubai, California, Selangor"
                    value={memberState}
                    onChange={(e) => setMemberState(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    City / Town
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Downtown, City Area"
                    value={memberDistrict}
                    onChange={(e) => setMemberDistrict(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>
            )}

            {memberCountry === 'India' && memberDistrict === 'Other / Custom District' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Specify District / City Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="Enter district name"
                    value={customMemberDistrict}
                    onChange={(e) => setCustomMemberDistrict(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Full Address (Door No, Street, Area)
              </label>
              <textarea
                rows={2}
                placeholder="Door #, Street, Landmark"
                value={memberStreet}
                onChange={(e) => setMemberStreet(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs resize-none placeholder:text-muted-foreground/60"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                {memberCountry === 'India' ? 'Pincode (Optional)' : 'Postal / ZIP Code (Optional)'}
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder={memberCountry === 'India' ? 'e.g. 626123' : 'e.g. 90210'}
                value={memberPincode}
                onChange={(e) => setMemberPincode(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-xs placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Section 3: Initial Installment Collection */}
          <div className="p-3.5 rounded-lg bg-card border border-border/80 shadow-xs space-y-3">
            <div 
              className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-border/60"
              onClick={() => setNewMemberForm({ ...newMemberForm, initial_payment: !newMemberForm.initial_payment })}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-2xs ${
                  newMemberForm.initial_payment ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  <Wallet size={16} />
                </div>
                <div>
                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <span>Record Initial Installment Payment</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">
                    Collect & receipt first payment during registration
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer pointer-events-none">
                <input
                  type="checkbox"
                  checked={newMemberForm.initial_payment}
                  onChange={() => {}}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-primary shadow-2xs"></div>
              </label>
            </div>

            {newMemberForm.initial_payment ? (
              <div className="space-y-3 pt-1">
                {/* Due Breakdown Card */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                      Initial Installment Due
                    </span>
                    <span className="text-base sm:text-lg font-black font-mono text-primary leading-none block">
                      {currency}{selectedScheme?.price.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 inline-block">
                      Installment #1 of {selectedScheme?.term_duration} {selectedScheme?.term_unit}
                    </span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Passbook activated immediately
                    </span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Initial Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'cash', label: 'Cash', icon: Coins },
                      { id: 'upi', label: 'UPI / QR', icon: QrCode },
                      { id: 'card', label: 'Card', icon: CreditCard },
                      { id: 'online', label: 'Online / Bank', icon: Building2 },
                    ].map(method => {
                      const Icon = method.icon;
                      const isSelected = newMemberForm.payment_method === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setNewMemberForm({ ...newMemberForm, payment_method: method.id })}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-background hover:bg-muted text-foreground border-border/80'
                          }`}
                        >
                          <Icon size={14} className={isSelected ? 'text-white' : 'text-primary'} />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Transaction Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Receipt / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref ID, Cash Receipt #, or counter remark..."
                    value={newMemberForm.transaction_id || ''}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, transaction_id: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-muted/30 border border-dashed border-border/70 rounded-lg text-center text-[11px] text-muted-foreground">
                First installment will not be collected right now. Customer can pay later via the passbook roster.
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* RECORD INSTALLMENT PAYMENT MODAL */}
      <Modal
        isOpen={Boolean(paymentModalData)}
        onClose={() => setPaymentModalData(null)}
        title="Record Installment Payment"
        description="Verify passbook installment & generate payment receipt"
      >
        {paymentModalData && selectedScheme && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            {/* Customer & Scheme Summary Card */}
            <div className="rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 text-primary shadow-2xs">
                    <User size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-foreground text-sm leading-tight truncate">
                        {paymentModalData.member.customer_name}
                      </h4>
                      {paymentModalData.member.member_number && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                          {paymentModalData.member.member_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mt-0.5">
                      <Phone size={11} className="text-primary shrink-0" />
                      <span>{formatPhoneWithCountryCode(paymentModalData.member.customer_phone)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(paymentModalData.member.customer_phone)}
                        className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Copy phone"
                        aria-label="Copy phone"
                      >
                        {copiedPhone === paymentModalData.member.customer_phone ? (
                          <Check size={11} className="text-emerald-500" />
                        ) : (
                          <Copy size={11} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Installment Due
                  </span>
                  <span className="font-mono font-black text-primary text-base sm:text-lg leading-tight block">
                    {currency}{selectedScheme.price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Structured Meta Row */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-primary/15">
                <div className="flex items-center gap-1.5 text-muted-foreground truncate max-w-[60%]">
                  <span className="font-medium">Scheme:</span>
                  <strong className="text-foreground font-semibold truncate">{selectedScheme.title}</strong>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                  <span className="font-medium">Passbook:</span>
                  <strong className="font-mono text-foreground font-bold">
                    {paymentModalData.member.paid_installments} of {paymentModalData.member.total_installments} Paid
                  </strong>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Installment Schedule *
              </label>
              <SearchableSelect
                options={installmentOptions}
                value={String(paymentForm.installment_number)}
                onChange={(val) => setPaymentForm({ ...paymentForm, installment_number: Number(val) })}
                placeholder="Select Installment Number"
                showSearch={false}
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Coins },
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'online', label: 'Online / Bank', icon: Building2 },
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentForm.payment_method === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, payment_method: method.id })}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border-border/80'
                      }`}
                    >
                      <Icon size={14} className={isSelected ? 'text-white' : 'text-primary'} />
                      <span>{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Transaction Ref / Notes (Optional)
              </label>
              <div className="relative">
                <Receipt size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="UPI Ref ID, cash receipt number, remarks..."
                  value={paymentForm.transaction_id || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                className="px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-primary/20 text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isSubmittingPayment ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <span>Confirm Payment</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE MEMBER MODAL (WITH CUSTOMER OTP PROTECTION) */}
      <Modal
        isOpen={Boolean(memberToDelete)}
        onClose={() => {
          setMemberToDelete(null);
          setDeleteOtpData(null);
          setDeleteOtpCode('');
          setDeleteReason('');
        }}
        title="Remove Member from Scheme"
        description="Safeguard against fraud and accidental member deletion"
      >
        {memberToDelete && selectedScheme && (
          <div className="space-y-4 text-xs">
            {/* Customer & Scheme Summary Card */}
            <div className="rounded-lg border border-border/80 bg-muted/30 p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                    <User size={15} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm leading-tight">
                      {memberToDelete.customer_name}
                    </h4>
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                      <Phone size={10} className="text-primary shrink-0" />
                      <span>{formatPhoneWithCountryCode(memberToDelete.customer_phone)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(memberToDelete.customer_phone)}
                        className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Copy phone"
                        aria-label="Copy phone"
                      >
                        {copiedPhone === memberToDelete.customer_phone ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      </button>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-medium">Scheme</span>
                  <span className="font-bold text-foreground text-xs">{selectedScheme.title}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px]">
                <span className="text-muted-foreground">Paid Installments:</span>
                <span className="font-mono font-bold text-foreground">
                  {memberToDelete.paid_installments} of {memberToDelete.total_installments} ({currency}{(memberToDelete.paid_installments * selectedScheme.price).toLocaleString()} collected)
                </span>
              </div>
            </div>

            {/* Anti-Fraud OTP Safeguard (Mandatory if payments made) */}
            {memberToDelete.paid_installments > 0 ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <ShieldAlert size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Customer OTP Verification Required</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                    This customer has paid <strong>{memberToDelete.paid_installments} installments</strong> ({currency}{(memberToDelete.paid_installments * selectedScheme.price).toLocaleString()}). To prevent unauthorized deletion and ensure customer consent, an SMS OTP must be verified by the customer before removing this record.
                  </p>

                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={isSendingDeleteOtp}
                      onClick={handleSendDeleteOtp}
                      className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                    >
                      {isSendingDeleteOtp ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound size={12} />
                          <span>{deleteOtpData ? 'Resend OTP to Customer' : 'Send OTP to Customer Phone'}</span>
                        </>
                      )}
                    </button>
                    {deleteOtpData && (
                      <span className="block mt-1.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400">
                        ✓ OTP dispatched to {deleteOtpData.customer_phone_masked}. Valid for 10 minutes.
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Enter Customer 6-Digit OTP *
                  </label>
                  <div className="relative">
                    <KeyRound size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      disabled={!deleteOtpData}
                      placeholder={deleteOtpData ? 'e.g. 123456' : "Click 'Send OTP to Customer Phone' first..."}
                      value={deleteOtpCode}
                      onChange={(e) => setDeleteOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-8 pr-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono font-bold tracking-widest text-sm placeholder:text-muted-foreground/60 placeholder:font-normal placeholder:tracking-normal focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <span className={`text-[10px] mt-1 block ${deleteOtpData ? 'text-muted-foreground' : 'text-amber-600 font-medium'}`}>
                    {deleteOtpData
                      ? 'Ask the customer for the verification code sent to their registered mobile.'
                      : '⚠️ You must click "Send OTP to Customer Phone" above before entering the code.'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reason / Settlement Notes <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Customer cancelled & received ₹3,000 cash refund..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                <span className="font-bold text-foreground text-xs block">Accidental Enrollment (0 Payments)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  No installment payments have been made for this member. You can safely remove this enrollment immediately without customer OTP.
                </p>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Reason / Deletion Notes <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accidental enrollment or incorrect customer details..."
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setMemberToDelete(null);
                  setDeleteOtpData(null);
                }}
                className="px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingDeleteMember || !deleteReason.trim() || (memberToDelete.paid_installments > 0 && (!deleteOtpData || deleteOtpCode.trim().length !== 6))}
                onClick={handleConfirmDeleteMember}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-rose-600/20 text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                {isSubmittingDeleteMember ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Verifying & Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>{memberToDelete.paid_installments > 0 ? 'Verify OTP & Delete' : 'Confirm Delete Enrollment'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* TRANSFER MEMBER MODAL (SWITCH SCHEME) */}
      <Modal
        isOpen={Boolean(memberToTransfer)}
        onClose={() => setMemberToTransfer(null)}
        title="Change Customer Scheme"
        description="Transfer this customer to another scheme without losing payment history"
      >
        {memberToTransfer && selectedScheme && (() => {
          const destinationSchemes = schemes.filter(s => s.id !== selectedScheme.id && s.status === 'active');
          const selectedTarget = schemes.find(s => s.id === transferTargetSchemeId);
          const currentPrice = Number(selectedScheme.price);
          const targetPrice = selectedTarget ? Number(selectedTarget.price) : 0;
          const paidCount = memberToTransfer.paid_installments;
          const currentPaidTotal = paidCount * currentPrice;
          const newSchemeEquivalent = paidCount * targetPrice;
          const diff = newSchemeEquivalent - currentPaidTotal;
          const refundAmount = Math.abs(diff);

          return (
            <div className="space-y-4 text-xs">
              {/* Member Info */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{memberToTransfer.customer_name}</h4>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground mt-0.5">
                      <Phone size={10} className="text-primary shrink-0" />
                      <span>{formatPhoneWithCountryCode(memberToTransfer.customer_phone)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(memberToTransfer.customer_phone)}
                        className="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Copy phone"
                        aria-label="Copy phone"
                      >
                        {copiedPhone === memberToTransfer.customer_phone ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-medium">Current Scheme</span>
                    <span className="font-bold text-primary text-xs">{selectedScheme.title}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/10 text-[11px]">
                  <span className="text-muted-foreground">Paid Installments:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {memberToTransfer.paid_installments} Paid ({currency}{(memberToTransfer.paid_installments * selectedScheme.price).toLocaleString()})
                  </span>
                </div>
              </div>

              {/* Target Scheme Choosable Dropdown */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Destination Scheme *
                </label>
                {destinationSchemes.length === 0 ? (
                  <div className="p-3 bg-muted/30 border border-border rounded-lg text-center text-muted-foreground text-[11px]">
                    No other active schemes found in your store to transfer into.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <SearchableSelect
                      options={destinationSchemeOptions}
                      value={transferTargetSchemeId}
                      onChange={(newSchemeId) => setTransferTargetSchemeId(newSchemeId)}
                      placeholder="Choose destination scheme..."
                      showSearch={destinationSchemeOptions.length > 5}
                      className="w-full"
                    />

                    {/* Selected Destination Scheme Info Card */}
                    {selectedTarget && (
                      <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between shadow-2xs">
                        <div>
                          <div className="font-bold text-xs text-foreground">
                            {selectedTarget.title}
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground block mt-0.5">
                            {selectedTarget.frequency === 'weekly' ? 'Weekly' : 'Monthly'} • Duration: {selectedTarget.term_duration} {selectedTarget.term_unit}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block font-medium">Installment</span>
                          <span className="font-bold text-primary text-xs font-mono">
                            {currency}{Number(selectedTarget.price).toLocaleString()} / {selectedTarget.frequency === 'weekly' ? 'wk' : 'mo'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price Comparison & Balance Collection / Refund Notice */}
              {transferTargetSchemeId && selectedTarget && memberToTransfer.paid_installments > 0 && (
                <>
                  {diff > 0 && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                        <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Higher Scheme Selected — Balance Collection Required</span>
                      </div>
                      <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                        Customer previously paid <strong className="font-mono">{currency}{currentPaidTotal.toLocaleString()}</strong> ({paidCount} installment{paidCount > 1 ? 's' : ''} @ {currency}{currentPrice.toLocaleString()}). In '{selectedTarget.title}', {paidCount} installment{paidCount > 1 ? 's' : ''} equal <strong className="font-mono">{currency}{newSchemeEquivalent.toLocaleString()}</strong>.
                      </p>
                      <div className="pt-1 text-xs font-bold text-amber-900 dark:text-amber-100 flex flex-wrap items-center gap-1.5 bg-amber-500/15 rounded-md px-2.5 py-1.5 border border-amber-500/20">
                        <span>👉 Please ensure you have collected the remaining difference of</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{currency}{diff.toLocaleString()}</span>
                        <span>from the customer.</span>
                      </div>
                    </div>
                  )}

                  {diff < 0 && (
                    <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-xs">
                        <Info size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Lower Scheme Selected — Refund / Adjustment Notice</span>
                      </div>
                      <p className="text-[11px] text-blue-900/90 dark:text-blue-200/90 leading-relaxed">
                        Customer previously paid <strong className="font-mono">{currency}{currentPaidTotal.toLocaleString()}</strong> ({paidCount} installment{paidCount > 1 ? 's' : ''} @ {currency}{currentPrice.toLocaleString()}). In '{selectedTarget.title}', {paidCount} installment{paidCount > 1 ? 's' : ''} equal <strong className="font-mono">{currency}{newSchemeEquivalent.toLocaleString()}</strong>.
                      </p>
                      <div className="pt-1 text-xs font-bold text-blue-900 dark:text-blue-100 flex flex-wrap items-center gap-1.5 bg-blue-500/15 rounded-md px-2.5 py-1.5 border border-blue-500/20">
                        <span>👉 Please ensure you have refunded the remaining amount of</span>
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-black">{currency}{refundAmount.toLocaleString()}</span>
                        <span>to the customer (or adjusted it as store credit).</span>
                      </div>
                    </div>
                  )}

                  {diff === 0 && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                      <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Same Installment Price ({currency}{currentPrice.toLocaleString()}). The {paidCount} paid installment{paidCount > 1 ? 's' : ''} will transfer evenly with zero price difference.</span>
                    </div>
                  )}
                </>
              )}

              {/* Note */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Transfer Notes <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Switched due to accidental enrollment in Scheme 1..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setMemberToTransfer(null)}
                  className="px-4 py-2 border border-border rounded-lg text-foreground font-semibold hover:bg-muted text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingTransfer || !transferTargetSchemeId || !transferNotes.trim()}
                  onClick={handleConfirmTransfer}
                  className="px-5 py-2 bg-primary hover:bg-primary-600 disabled:opacity-50 text-white rounded-lg font-bold shadow-md shadow-primary/20 text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Transferring...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft size={13} />
                      <span>Confirm Scheme Transfer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* CUSTOMER SCHEME AUDIT HISTORY MODAL */}
      <Modal
        isOpen={Boolean(historyCustomer)}
        onClose={() => setHistoryCustomer(null)}
        title="Customer Scheme Passbook & Audit History"
        description={historyCustomer ? `${historyCustomer.name} (${formatPhoneWithCountryCode(historyCustomer.phone)})` : ''}
      >
        {historyCustomer && (
          <div className="space-y-4 text-xs">
            {isLoadingHistory ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span>Loading activity history...</span>
              </div>
            ) : customerHistoryLogs.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground bg-muted/20 border border-border/70 rounded-lg">
                <Clock size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                <span className="font-semibold block text-sm text-foreground">No historical records found</span>
                <span className="text-[11px] block mt-1">Actions like enrollments, payments, transfers, and cancellations will appear here.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {customerHistoryLogs.map((log) => {
                  const isEnroll = log.action_type === 'ENROLLED';
                  const isPayment = log.action_type === 'PAYMENT_RECORDED';
                  const isTransfer = log.action_type === 'TRANSFERRED';
                  const isDelete = log.action_type === 'DELETED';

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-lg border transition-all space-y-1.5 ${
                        isDelete
                          ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20'
                          : isTransfer
                            ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20'
                            : isPayment
                              ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
                              : 'border-border/80 bg-muted/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isDelete
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : isTransfer
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : isPayment
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-muted text-foreground'
                            }`}
                          >
                            {isDelete ? 'Cancelled / Deleted' : isTransfer ? 'Scheme Transferred' : isPayment ? 'Payment Recorded' : 'Enrolled'}
                          </span>
                          {log.otp_verified && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                              <ShieldCheck size={10} />
                              <span>OTP Verified</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(log.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between gap-2">
                        <h5 className="font-bold text-foreground text-xs">
                          {isTransfer ? (
                            <span>{log.from_scheme_title} ➔ {log.to_scheme_title}</span>
                          ) : (
                            <span>{log.scheme_title}</span>
                          )}
                        </h5>
                        {log.amount !== null && log.amount !== undefined && (
                          <span className={`font-mono font-bold text-xs ${isDelete ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isDelete ? `Refunded: ${currency}${log.amount.toLocaleString()}` : `${currency}${log.amount.toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      {log.notes && (
                        <p className="text-[11px] text-muted-foreground/90 italic">
                          "{log.notes}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                        {log.member_number && <span>Pass: <strong className="font-mono text-foreground">{log.member_number}</strong></span>}
                        {log.paid_installments !== null && log.paid_installments !== undefined && (
                          <span>Paid: <strong className="font-mono text-foreground">{log.paid_installments}</strong> / {log.total_installments || 12}</span>
                        )}
                        {log.installment_number && (
                          <span>Installment: <strong className="font-mono text-foreground">#{log.installment_number}</strong></span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setHistoryCustomer(null)}
                className="px-4 py-2 border border-border rounded-xl text-foreground font-semibold hover:bg-muted text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(schemeToDelete)}
        onClose={() => setSchemeToDelete(null)}
        onConfirm={handleDeleteScheme}
        title="Delete Scheme"
        message={`Are you sure you want to delete "${schemeToDelete?.title}"? All enrolled members and payment history will be permanently removed.`}
        confirmText="Delete Scheme"
        isLoading={isDeleting}
      />
      {/* Mobile Square FAB to Create Scheme */}
      <SquareFAB
        icon={Plus}
        onClick={() => handleOpenCreateModal()}
        title="Create Scheme"
        visible={Boolean(!selectedScheme && !isCreateModalOpen && !isAddMemberModalOpen && !schemeToDelete && !paymentModalData && !memberToDelete && !memberToTransfer && !historyCustomer)}
      />

      {/* Hidden file input for quick 1-click banner cover upload on cards/details */}
      <input
        type="file"
        ref={quickBannerInputRef}
        onChange={handleQuickBannerFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Lightbox for Scheme Banner Full View */}
      <Lightbox
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage || ''}
        altText={lightboxTitle}
      />
    </div>
  );
}
