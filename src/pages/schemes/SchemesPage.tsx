import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, Plus, Search, Users, CheckCircle2, Clock, Calendar, 
  Trash2, Edit3, ArrowLeft, Eye, EyeOff, ShieldCheck, 
  Gift, Sparkles, ChevronRight, AlertCircle, Phone, 
  User, Check, Wallet, ArrowUpRight, Filter,
  Minus, Receipt, Info, Layers, Tag, Building2, MapPin,
  CreditCard, ArrowRight, Lock, ChevronLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  schemeService, Scheme, SchemeMember, SchemeCreatePayload, 
  SchemeMemberCreatePayload, RecordPaymentPayload, SchemeItemInfo 
} from '@/services/schemeService';
import { api } from '@/services/api';
import { MenuItem, MenuItemVariant } from '@/types';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SearchableSelect, Option } from '@/components/ui/SearchableSelect';
import { isBakeryBusiness, isFireworksBusiness } from '@/config/businessCategories';
import { 
  COUNTRY_CODES, DISTRICTS_BY_STATE, INDIAN_STATES, formatPaidDateTime 
} from '@/components/public/PublicSchemeModal';

export default function SchemesPage() {
  const { shop } = useShopStore();
  const currency = shop?.settings?.currency || '₹';
  const isBakery = isBakeryBusiness(shop?.category);
  const isCrackers = isFireworksBusiness(shop?.category);

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
  }, [isBakery, isCrackers]);

  const { setTitle } = useHeaderStore();

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [members, setMembers] = useState<SchemeMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'paid' | 'pending'>('all');

  useEffect(() => {
    if (selectedScheme) {
      setTitle(
        selectedScheme.title,
        `${currency}${selectedScheme.price.toLocaleString()} / ${selectedScheme.frequency === 'weekly' ? 'week' : 'month'} • Duration: ${selectedScheme.term_duration} ${selectedScheme.term_unit} • ${selectedScheme.status.toUpperCase()} • ${members.length} Members`
      );
    } else {
      setTitle(
        'Savings Schemes (Fund)',
        'Customer installment schemes, member enrollments & payment tracking'
      );
    }
    return () => {
      setTitle('', '');
    };
  }, [selectedScheme, members.length, setTitle]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<Scheme | null>(null);
  const [schemeToDelete, setSchemeToDelete] = useState<Scheme | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [paymentModalData, setPaymentModalData] = useState<{ member: SchemeMember; nextInstallment: number } | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Menu items for item/variant picker
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Create/Edit Form State
  const initialForm: SchemeCreatePayload = {
    title: '',
    description: '',
    price: 500,
    frequency: 'monthly',
    term_duration: 12,
    term_unit: 'months',
    max_members: null,
    items: [],
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
  });
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
  }, []);

  const fetchSchemes = async () => {
    setIsLoading(true);
    try {
      const data = await schemeService.getSchemes();
      setSchemes(data);
      if (selectedScheme) {
        const updated = data.find(s => s.id === selectedScheme.id);
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

  const handleSelectScheme = async (scheme: Scheme) => {
    setSelectedScheme(scheme);
    setMemberSearch('');
    setMemberFilter('all');
    fetchMembers(scheme.id);
  };

  const fetchMembers = async (schemeId: string, search?: string) => {
    setIsLoadingMembers(true);
    try {
      const data = await schemeService.getMembers(schemeId, search);
      setMembers(data);
    } catch (err) {
      toast.error('Failed to load scheme members');
    } finally {
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
        price: scheme.price,
        frequency: scheme.frequency,
        term_duration: scheme.term_duration,
        term_unit: scheme.term_unit,
        max_members: scheme.max_members,
        items: scheme.items || [],
        show_on_public_menu: scheme.show_on_public_menu,
      });
    } else {
      setEditingScheme(null);
      setFormData({
        ...initialForm,
        price: isCrackers ? 1000 : 500,
        term_duration: 12,
        term_unit: 'months',
      });
    }
    setSelectedItemId('');
    setSelectedVariantName('');
    setItemQuantity(1);
    setIsCreateModalOpen(true);
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
              show_on_public_menu: formData.show_on_public_menu,
            }
          : formData;

        await schemeService.updateScheme(editingScheme.id, updatePayload as any);
        toast.success('Scheme updated successfully');
      } else {
        await schemeService.createScheme(formData);
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
        setSelectedScheme(null);
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
    });
    setMemberCountryCode('+91');
    setMemberStreet('');
    setMemberDistrict(DISTRICTS_BY_STATE['Tamil Nadu']?.[0] || 'Virudhunagar (Sivakasi)');
    setCustomMemberDistrict('');
    setMemberState('Tamil Nadu');
    setMemberPincode('');
    setIsAddMemberModalOpen(true);
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

    const finalPhone = memberCountryCode === '+91' ? cleanPhone : `${memberCountryCode}${cleanPhone}`;
    const effectiveDistrict = memberDistrict === 'Other / Custom District' ? customMemberDistrict.trim() : memberDistrict.trim();

    const addressParts = [
      memberStreet.trim(),
      effectiveDistrict,
      memberState.trim() ? (memberPincode.trim() ? `${memberState.trim()} - ${memberPincode.trim()}` : memberState.trim()) : memberPincode.trim()
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
      fetchMembers(selectedScheme.id);
      fetchSchemes();
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
      fetchMembers(selectedScheme.id);
      fetchSchemes();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
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

  // Selected item object for variant dropdown
  const currentSelectedItem = menuItems.find(i => i.id === selectedItemId);

  const menuItemOptions: Option[] = useMemo(() => {
    return menuItems.map(item => {
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
  }, [menuItems, currency]);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Bar Header Actions Portal */}
      <HeaderActions>
        {selectedScheme ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedScheme(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">All Schemes</span>
            </button>

            <button
              onClick={() => handleOpenCreateModal(selectedScheme)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Edit3 size={14} />
              <span>Edit</span>
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
                ((selectedScheme.stats?.total_members || 0) > 0 || members.length > 0)
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 dark:text-rose-400 cursor-pointer"
              }`}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>

            <button
              onClick={handleOpenAddMemberModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={14} />
              <span>Enroll Member</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={15} />
            <span>Create Scheme</span>
          </button>
        )}
      </HeaderActions>

      {/* Main Content: Schemes List or Selected Scheme Details */}
      {!selectedScheme ? (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-56 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : schemes.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
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

                return (
                  <div
                    key={scheme.id}
                    onClick={() => handleSelectScheme(scheme)}
                    className="bg-card border border-border hover:border-amber-500/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                          <Coins size={20} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {scheme.show_on_public_menu ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              Public
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Private
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            scheme.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {scheme.status}
                          </span>

                          {/* Quick Edit & Delete Actions */}
                          <div className="flex items-center gap-0.5 ml-1 pl-1.5 border-l border-border/80">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreateModal(scheme);
                              }}
                              title="Edit Scheme"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
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
                      </div>

                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-amber-500 transition-colors line-clamp-1">
                          {scheme.title}
                        </h3>
                        {scheme.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{scheme.description}</p>
                        )}
                      </div>

                      <div className="bg-muted/50 p-3 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Installment:</span>
                          <span className="font-bold text-foreground">
                            {currency}{scheme.price.toLocaleString()} / {scheme.frequency === 'weekly' ? 'week' : 'month'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Term:</span>
                          <span className="font-bold text-foreground">{scheme.term_duration} {scheme.term_unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Enrolled Members:</span>
                          <span className="font-bold text-foreground">
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
                            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${percentFilled}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Included Items preview */}
                      {scheme.items?.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Gift size={12} className="text-amber-500" />
                            <span>{scheme.items.length} Reward Products Included</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 mt-3 border-t border-border flex items-center justify-between text-xs">
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {currency}{(stats?.total_collected || 0).toLocaleString()} Collected
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 font-bold group-hover:translate-x-1 transition-transform">
                        <span>Manage</span>
                        <ChevronRight size={14} />
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
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Members</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-foreground">{selectedScheme.stats?.total_members || 0}</span>
                {selectedScheme.max_members && (
                  <span className="text-xs text-muted-foreground">/ {selectedScheme.max_members} limit</span>
                )}
              </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Paid This Cycle</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {selectedScheme.stats?.paid_this_cycle_count || 0}
                </span>
                <span className="text-xs text-muted-foreground">members</span>
              </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending This Cycle</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {selectedScheme.stats?.pending_this_cycle_count || 0}
                </span>
                <span className="text-xs text-muted-foreground">members</span>
              </div>
            </div>

            <div className="bg-card border border-border p-4 rounded-xl shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Collected</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-foreground">
                  {currency}{(selectedScheme.stats?.total_collected || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Included Products Showcase */}
          {selectedScheme.items && selectedScheme.items.length > 0 && (
            <div className="bg-card border border-border p-5 rounded-2xl shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Gift size={16} className="text-amber-500" />
                <span>Included Reward Products ({selectedScheme.items.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedScheme.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border/50">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Gift size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.name}</h4>
                      {item.variant_name && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block truncate">
                          {item.variant_name}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-mono">Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members Table Section */}
          <div className="bg-card border border-border rounded-2xl shadow-xs">
            {/* Sticky Table controls */}
            <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-md p-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm rounded-t-2xl transition-all">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by customer name, phone, or member #..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    if (selectedScheme) fetchMembers(selectedScheme.id, e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-xl focus:outline-hidden focus:border-amber-500 text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex bg-muted p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setMemberFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      memberFilter === 'all' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({members.length})
                  </button>
                  <button
                    onClick={() => setMemberFilter('paid')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      memberFilter === 'paid' ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    onClick={() => setMemberFilter('pending')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      memberFilter === 'pending' ? 'bg-card text-amber-600 dark:text-amber-400 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Due
                  </button>
                </div>

                <button
                  onClick={handleOpenAddMemberModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
                >
                  <Plus size={14} />
                  <span>Enroll Member</span>
                </button>
              </div>
            </div>

            {/* Members List */}
            {isLoadingMembers ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading members...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground space-y-2">
                <Users size={28} className="mx-auto text-muted-foreground/50" />
                <p className="text-xs">No members found matching your search.</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6 space-y-4 bg-muted/15 dark:bg-slate-950/20 rounded-b-2xl">
                {filteredMembers.map(member => {
                  const percentPaid = Math.round((member.paid_installments / member.total_installments) * 100);
                  const remainingInstallments = Math.max(0, member.total_installments - member.paid_installments);
                  const nextDueNumber = member.paid_installments + 1;
                  const isCompleted = member.status === 'completed' || member.paid_installments >= member.total_installments;

                  return (
                    <div
                      key={member.id}
                      className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-amber-500/40 transition-all space-y-4"
                    >
                      {/* Member Info Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-base text-foreground leading-tight">{member.customer_name}</h4>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              {member.member_number}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                            }`}>
                              {member.status}
                            </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                                <Phone size={12} className="text-amber-500" /> {member.customer_phone}
                              </span>
                              <span>•</span>
                              <span>Joined: {new Date(member.joined_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {member.customer_address && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-sm" title={member.customer_address}>{member.customer_address}</span>
                                </>
                              )}
                            </div>
                          </div>

                        {/* Action: Record Payment */}
                        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                          {!isCompleted ? (
                            <button
                              onClick={() => handleOpenPaymentModal(member, nextDueNumber)}
                              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer hover:scale-102 active:scale-95"
                            >
                              <span className="font-bold text-xs leading-none shrink-0">{currency}</span>
                              <span>Record Due #{nextDueNumber} ({currency}{selectedScheme.price.toLocaleString()})</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold">
                              <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                              <span>Completed 🎉</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Overall Progress Bar Section (Same as Public Menu Pass) */}
                      <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 sm:p-4 space-y-2">
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
                          <span className="font-bold text-amber-600 dark:text-amber-400">
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
                            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium hidden sm:inline">
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
                                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-between min-h-[96px] transition-all text-left relative ${
                                  isPaid
                                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200 cursor-default'
                                    : isCompleted
                                      ? 'bg-muted/30 border-border opacity-60 cursor-not-allowed'
                                      : isNextDue
                                        ? 'bg-amber-500/10 border-amber-400 dark:border-amber-600/70 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400/40 shadow-xs hover:bg-amber-500/20 cursor-pointer hover:scale-102'
                                        : 'bg-background border-border text-foreground hover:border-amber-400/60 hover:bg-muted/40 cursor-pointer hover:scale-102'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {isPaid ? (
                                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                  ) : isNextDue ? (
                                    <CreditCard size={13} className="text-amber-500 shrink-0 animate-pulse" />
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
                                      ? 'bg-amber-500 text-white shadow-2xs'
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
                className="px-4 py-2 border border-border rounded-xl text-foreground font-semibold hover:bg-muted cursor-pointer transition-colors text-xs"
              >
                Cancel
              </button>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  className="flex items-center gap-1 px-3.5 py-2 border border-border rounded-xl text-foreground font-semibold hover:bg-muted cursor-pointer transition-colors text-xs"
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
                  className="px-4 py-2 border border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <span>Next Step</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmitScheme()}
                  disabled={isSubmittingScheme}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
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
                      currentStep >= s.step ? 'bg-amber-500' : 'bg-border'
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
                        ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 shadow-xs'
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
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200">
              <Lock size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="text-xs">
                <span className="font-bold">Active Customer Protections:</span> This scheme currently has{' '}
                <strong className="underline">{editingScheme?.stats?.total_members || 1} enrolled member(s)</strong>.
                Pricing, duration, capacity, and reward products are strictly locked to protect customer agreements.
                Only the <strong>Scheme Title</strong> and <strong>Description</strong> can be updated.
              </div>
            </div>
          )}

          {/* STEP 1: SCHEME OVERVIEW & VISIBILITY */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-1 border-b border-border/60">
                  <Coins size={16} className="text-amber-500" />
                  <span>Scheme Overview</span>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ml-auto border border-amber-300 dark:border-amber-700">
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
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-hidden focus:border-amber-500 shadow-2xs transition-all"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1.5">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder={categorySchemeConfig.descriptionPlaceholder}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground text-xs focus:outline-hidden focus:border-amber-500 shadow-2xs transition-all resize-none"
                  />
                </div>
              </div>

              {/* Public Menu Visibility Toggle */}
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
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
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500 shadow-2xs"></div>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: INSTALLMENT PLAN & SCHEDULE */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Calendar size={16} className="text-amber-500" />
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
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        formData.frequency === 'monthly'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.frequency === 'monthly' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
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
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        formData.frequency === 'weekly'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-2xs'
                          : 'border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${formData.frequency === 'weekly' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
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
                        className={`w-full pl-8 pr-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm focus:outline-hidden focus:border-amber-500 shadow-2xs ${
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
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              formData.price === amt 
                                ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 font-bold' 
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
                      className={`w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm focus:outline-hidden focus:border-amber-500 shadow-2xs ${
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
                                className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  formData.term_duration === months 
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 font-bold' 
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
                                className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                  formData.term_duration === wks 
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 font-bold' 
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
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-amber-500" />
                    <span className="text-xs font-semibold text-foreground">Total Scheme Maturity Value:</span>
                  </div>
                  <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
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
                      className={`flex-1 px-3.5 py-2.5 bg-background border border-border rounded-xl text-foreground font-mono text-sm focus:outline-hidden focus:border-amber-500 shadow-2xs ${
                        hasActiveCustomers ? 'opacity-60 cursor-not-allowed bg-muted/40' : ''
                      }`}
                    />
                    {!hasActiveCustomers && formData.max_members !== null && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, max_members: null })}
                        className="px-3.5 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                            formData.max_members === val 
                              ? 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 font-bold' 
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
              <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Gift size={16} className="text-amber-500" />
                    <div>
                      <span className="font-bold text-sm text-foreground block">
                        {categorySchemeConfig.itemsSectionTitle}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">
                        {categorySchemeConfig.itemsSectionSubtitle}
                      </span>
                    </div>
                  </div>
                  {formData.items.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono border border-amber-300 dark:border-amber-700">
                      {formData.items.length} Products Attached
                    </span>
                  )}
                </div>

                {hasActiveCustomers ? (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs text-muted-foreground">
                    <Lock size={14} className="text-amber-500 shrink-0" />
                    <span>Reward products cannot be added, modified, or removed while customers are actively enrolled.</span>
                  </div>
                ) : (
                  /* Clean Dropdown Selection Box */
                  <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/60">
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
                          <div className="px-3.5 py-2.5 bg-muted/40 border border-border/80 rounded-xl text-muted-foreground text-xs flex items-center justify-between min-h-[42px]">
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
                        <div className="flex items-center border border-border rounded-xl bg-background overflow-hidden shadow-2xs">
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
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Plus size={14} />
                        <span>Add Product to Scheme</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* List of chosen items */}
                {formData.items.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Attached Scheme Box Products ({formData.items.length})
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border text-xs shadow-2xs hover:border-amber-500/30 transition-all">
                          <div className="flex items-center gap-3 truncate">
                            {item.image_url ? (
                              <img src={item.image_url} alt="" className="w-9 h-9 object-cover rounded-lg shrink-0 border border-border/60" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                                <Gift size={18} />
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm truncate">{item.name}</span>
                                {item.variant_name && (
                                  <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 shrink-0">
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
                              className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors cursor-pointer shrink-0"
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
                  <div className="text-center py-5 border border-dashed border-border/80 rounded-xl bg-muted/10">
                    <Gift size={24} className="mx-auto text-muted-foreground/60 mb-1" />
                    <p className="text-xs text-muted-foreground font-semibold">No reward products attached.</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Scheme will operate as a direct monetary savings fund without bundled gift products.</p>
                  </div>
                )}
              </div>

              {/* Scheme Summary Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 space-y-2.5">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  Scheme Summary Review
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Installment</span>
                    <span className="font-bold font-mono text-foreground">{currency}{formData.price?.toLocaleString()} / {formData.frequency === 'weekly' ? 'wk' : 'mo'}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Term</span>
                    <span className="font-bold text-foreground">{formData.term_duration} {formData.term_unit}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                    <span className="text-[10px] text-muted-foreground block">Maturity Value</span>
                    <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{currency}{((formData.price || 0) * (formData.term_duration || 0)).toLocaleString()}</span>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
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
        title={`Enroll Member: ${selectedScheme?.title || ''}`}
      >
        <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Customer Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sivarajan K"
              value={newMemberForm.customer_name}
              onChange={(e) => setNewMemberForm({ ...newMemberForm, customer_name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Mobile Number *</label>
            <div className="flex gap-2">
              <div className="w-[105px] shrink-0">
                <SearchableSelect
                  options={COUNTRY_CODES.map(c => ({
                    id: c.code,
                    name: `${c.flag} ${c.code}`,
                    subtext: c.country
                  }))}
                  value={memberCountryCode}
                  onChange={(val) => setMemberCountryCode(val)}
                  placeholder="+91"
                  showSearch={false}
                  className="w-full text-xs"
                />
              </div>
              <div className="relative flex-1">
                <input
                  type="tel"
                  required
                  maxLength={memberCountryCode === '+91' ? 10 : 15}
                  placeholder={memberCountryCode === '+91' ? 'e.g. 9876543210' : 'Mobile number'}
                  value={newMemberForm.customer_phone}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, customer_phone: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-mono focus:outline-hidden focus:border-amber-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Full Customer Address */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <MapPin size={13} className="text-amber-500" />
              <span>Customer Address Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
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
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
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

            {memberDistrict === 'Other / Custom District' && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                  Specify District / City Name *
                </label>
                <div className="relative">
                  <Building2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="Enter district name"
                    value={customMemberDistrict}
                    onChange={(e) => setCustomMemberDistrict(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-hidden text-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                Full Address (Door No, Street, Area)
              </label>
              <textarea
                rows={2}
                placeholder="Door #, Street, Landmark"
                value={memberStreet}
                onChange={(e) => setMemberStreet(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground focus:outline-hidden text-xs resize-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1 text-[11px]">
                Pincode (Optional)
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 626123"
                value={memberPincode}
                onChange={(e) => setMemberPincode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-foreground font-mono focus:outline-hidden text-xs"
              />
            </div>
          </div>

          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 p-3 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-amber-600" />
                <span>Record Initial Installment Payment</span>
              </label>
              <input
                type="checkbox"
                checked={newMemberForm.initial_payment}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, initial_payment: e.target.checked })}
                className="w-4 h-4 text-amber-500 rounded-sm"
              />
            </div>
            {newMemberForm.initial_payment && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Initial Installment Amount:</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{currency}{selectedScheme?.price.toLocaleString()}</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Initial Payment Method *</label>
                  <SearchableSelect
                    options={paymentMethodOptions}
                    value={newMemberForm.payment_method}
                    onChange={(val) => setNewMemberForm({ ...newMemberForm, payment_method: val })}
                    placeholder="Select Payment Method"
                    showSearch={false}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-foreground font-semibold hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingMember}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {isSubmittingMember ? 'Enrolling...' : 'Enroll Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD INSTALLMENT PAYMENT MODAL */}
      <Modal
        isOpen={Boolean(paymentModalData)}
        onClose={() => setPaymentModalData(null)}
        title={`Record Payment: ${paymentModalData?.member.customer_name || ''}`}
      >
        {paymentModalData && selectedScheme && (
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
            <div className="bg-muted/40 p-3 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-bold text-foreground">{paymentModalData.member.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mobile:</span>
                <span className="font-mono text-foreground">{paymentModalData.member.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {currency}{selectedScheme.price.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Installment Number *</label>
              <SearchableSelect
                options={installmentOptions}
                value={String(paymentForm.installment_number)}
                onChange={(val) => setPaymentForm({ ...paymentForm, installment_number: Number(val) })}
                placeholder="Select Installment Number"
                showSearch={false}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Payment Method *</label>
              <SearchableSelect
                options={paymentMethodOptions}
                value={paymentForm.payment_method}
                onChange={(val) => setPaymentForm({ ...paymentForm, payment_method: val })}
                placeholder="Select Payment Method"
                showSearch={false}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-200 block mb-1">Transaction Ref / Notes (Optional)</label>
              <input
                type="text"
                placeholder="UPI Ref ID, receipt number, notes..."
                value={paymentForm.transaction_id || ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setPaymentModalData(null)}
                className="px-4 py-2 border border-border rounded-xl text-foreground font-semibold hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {isSubmittingPayment ? 'Saving...' : 'Confirm Payment'}
              </button>
            </div>
          </form>
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
    </div>
  );
}
