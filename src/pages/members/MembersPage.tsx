import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Users, ShieldCheck, Smartphone, Plus, Edit2, Search, Lock, RefreshCw, AlertCircle, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { membershipService, MembershipAnalytics, Member } from '@/services/memberships';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';

const PAGE_SIZE = 20;

export function MembersPage() {
  const navigate = useNavigate();
  const { shop } = useShopStore();
  const [shopId, setShopId] = useState<string | null>(shop?.id || null);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isDetailsLocked, setIsDetailsLocked] = useState(false);

  const { setTitle: setHeaderTitle } = useHeaderStore();

  useEffect(() => {
    setHeaderTitle('Members & Verified Customers', 'Manage your exclusive member base and view analytics.');
  }, [setHeaderTitle]);

  useEffect(() => {
    api.get('/subscription/current').then(res => setSubStatus(res.data)).catch(console.error);
  }, []);

  const [analytics, setAnalytics] = useState<MembershipAnalytics | null>(null);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  const [activeTab, setActiveTab] = useState<'existing' | 'new' | 'repeated'>('existing');
  const [minVisits, setMinVisits] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', mobile_number: '' });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial Summary Analytics Fetch
  const fetchAnalyticsSummary = async (targetShopId?: string) => {
    const id = targetShopId || shopId || shop?.id;
    if (!id) return;
    try {
      const data = await membershipService.getAnalytics(id);
      setAnalytics(data);
      setIsLocked(false);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsLocked(true);
      } else {
        console.error('Failed to load membership analytics', err);
      }
    }
  };

  // Paginated Members List Fetch
  const loadMembersData = useCallback(async (currentSkip: number, reset: boolean = false) => {
    const id = shopId || shop?.id;
    if (!id) return;

    if (reset) {
      setIsLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const res = await membershipService.getPaginatedMembers(
        id,
        activeTab,
        currentSkip,
        PAGE_SIZE,
        debouncedSearch.trim() || undefined,
        minVisits
      );

      setHasMore(res.has_more);
      setSkip(currentSkip);
      setIsDetailsLocked(false);

      if (reset) {
        setMembersList(res.items || []);
        setSelectedCustomerIds([]);
      } else {
        setMembersList((prev) => [...prev, ...(res.items || [])]);
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsDetailsLocked(true);
      } else {
        console.error('Failed to load paginated members', err);
        toast.error('Failed to load members list');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [shopId, shop?.id, activeTab, debouncedSearch, minVisits]);

  useEffect(() => {
    const init = async () => {
      let id = shop?.id;
      if (!id) {
        try {
          const shopRes = await api.get('/shops/me');
          if (shopRes.data?.id) {
            id = shopRes.data.id;
            setShopId(id);
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setShopId(id);
      }
      if (id) {
        Promise.all([
          fetchAnalyticsSummary(id),
          loadMembersData(0, true)
        ]);
      }
    };
    init();
  }, [shop?.id, loadMembersData]);

  // Fetch paginated data whenever tab, debounced search, or minVisits changes
  useEffect(() => {
    const id = shopId || shop?.id;
    if (id) {
      loadMembersData(0, true);
    }
  }, [shopId, shop?.id, activeTab, debouncedSearch, minVisits, loadMembersData]);

  const handleLoadMore = () => {
    if (hasMore && !isFetchingMore && !isLoading) {
      const nextSkip = skip + PAGE_SIZE;
      loadMembersData(nextSkip, false);
    }
  };

  const handleConvertToMember = async (memberId: string) => {
    if (!shop?.id) return;
    setIsConverting(true);
    try {
      await membershipService.convertToMember(shop.id, memberId);
      toast.success('Customer converted to verified member!');
      setSelectedCustomerIds(prev => prev.filter(id => id !== memberId));
      fetchAnalyticsSummary();
      loadMembersData(0, true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to convert customer');
    } finally {
      setIsConverting(false);
    }
  };

  const handleBatchConvert = async (specificIds?: string[]) => {
    if (!shop?.id) return;
    const idsToConvert = specificIds || (selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined);
    setIsConverting(true);
    try {
      const res = await membershipService.batchConvertMembers(shop.id, idsToConvert);
      toast.success(res.message || 'Customers verified and added successfully!');
      setSelectedCustomerIds([]);
      fetchAnalyticsSummary();
      loadMembersData(0, true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to verify and add members');
    } finally {
      setIsConverting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedCustomerIds.length === membersList.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(membersList.map(m => m.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;

    if (!formData.mobile_number.trim() || formData.mobile_number.length < 10) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMemberId) {
        await membershipService.editMember(shop.id, editingMemberId, formData.name, formData.mobile_number);
        toast.success('Member updated successfully!');
        setIsEditModalOpen(false);
      } else {
        await membershipService.addMember(shop.id, formData.name, formData.mobile_number);
        toast.success('Member verified and added successfully!');
        setIsAddModalOpen(false);
      }
      setFormData({ name: '', mobile_number: '' });
      setEditingMemberId(null);
      fetchAnalyticsSummary();
      loadMembersData(0, true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (editingMemberId ? 'Failed to update member' : 'Failed to add member'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!shop?.id || !memberToDelete) return;
    setIsDeleting(true);
    try {
      await membershipService.deleteMember(shop.id, memberToDelete);
      toast.success('Member removed successfully');
      fetchAnalyticsSummary();
      loadMembersData(0, true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteAll = async (type: 'existing' | 'new' | 'all') => {
    if (!shop?.id) return;
    setIsDeletingAll(true);
    try {
      await membershipService.deleteAllMembers(shop.id, type);
      fetchAnalyticsSummary();
      loadMembersData(0, true);
      setShowDeleteAllConfirm(false);
      toast.success(
        type === 'existing' ? 'All verified members deleted' :
        type === 'new' ? 'All new customers deleted' :
        'All members deleted successfully'
      );
    } catch {
      toast.error('Failed to delete members');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openEditModal = (member: Member) => {
    setEditingMemberId(member.id);
    setFormData({ name: member.name || '', mobile_number: member.mobile_number });
    setIsEditModalOpen(true);
  };

  const isModuleLocked = isLocked || (subStatus && (subStatus.is_expired || (!subStatus.is_all_access && Array.isArray(subStatus.active_modules) && !subStatus.active_modules.includes('member-details') && !subStatus.active_modules.includes('member-count'))));

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-24 lg:pb-12">
      {/* Module Lock Banner */}
      {isModuleLocked && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-2 border-amber-200 dark:border-amber-800/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white">Customer Insights & Member Modules Locked</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Subscribe to Member Count / Details modules or renew your subscription to access member data.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/subscription')} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-extrabold uppercase tracking-wider">
            Unlock Modules →
          </Button>
        </div>
      )}

      {/* Analytics Cards (Lightweight Count Metrics) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 dark:from-indigo-950/20 dark:to-slate-900 dark:border-indigo-900/30">
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Total Members</CardTitle>
            <Users size={16} className="text-indigo-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 sm:pt-2">
            <div className="text-xl sm:text-3xl font-black text-indigo-950 dark:text-indigo-200">
              {analytics?.total_members ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 dark:from-emerald-950/20 dark:to-slate-900 dark:border-emerald-900/30">
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Manually Verified</CardTitle>
            <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 sm:pt-2">
            <div className="text-xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-200">
              {analytics?.manually_added ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100 dark:from-amber-950/20 dark:to-slate-900 dark:border-amber-900/30">
          <CardHeader className="p-3 sm:p-4 pb-0 sm:pb-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
            <CardTitle className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 leading-tight">Auto Registered</CardTitle>
            <Smartphone size={16} className="text-amber-500 shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 sm:pt-2">
            <div className="text-xl sm:text-3xl font-black text-amber-950 dark:text-amber-200">
              {analytics?.auto_registered ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="shadow-xs overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Custom Tab Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl max-w-fit">
              <button
                onClick={() => { setActiveTab('existing'); setSelectedCustomerIds([]); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'existing'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Existing
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {analytics?.manually_added ?? 0}
                </span>
              </button>


              <button
                onClick={() => { setActiveTab('new'); setSelectedCustomerIds([]); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'new'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                New
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {analytics?.auto_registered ?? 0}
                </span>
              </button>

              <button
                onClick={() => { setActiveTab('repeated'); setSelectedCustomerIds([]); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'repeated'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Repeated
                <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {analytics?.repeated_count ?? 0}
                </span>
              </button>
            </div>

            {/* Action Buttons & Min Visits filter */}
            <div className="flex items-center gap-2">
              {activeTab === 'repeated' && (
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500 font-bold text-[11px]">Min Visits:</span>
                  <select
                    value={minVisits}
                    onChange={(e) => setMinVisits(Number(e.target.value))}
                    className="bg-transparent font-black text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value={2}>2+</option>
                    <option value={3}>3+</option>
                    <option value={5}>5+</option>
                  </select>
                </div>
              )}

              {activeTab === 'new' && !isDetailsLocked && membersList.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <input
                      type="checkbox"
                      checked={membersList.length > 0 && selectedCustomerIds.length === membersList.length}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer pointer-events-none accent-emerald-600"
                    />
                    <span>{selectedCustomerIds.length === membersList.length ? 'Deselect All' : 'Select All'}</span>
                  </button>

                  <Button
                    onClick={() => handleBatchConvert()}
                    disabled={isConverting}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs transition-all"
                  >
                    <ShieldCheck size={14} />
                    {selectedCustomerIds.length > 0
                      ? `Verify & Add (${selectedCustomerIds.length})`
                      : `Verify & Add All (${analytics?.auto_registered ?? membersList.length})`}
                  </Button>
                </div>
              )}

              {activeTab === 'existing' && !isDetailsLocked && (
                <Button
                  onClick={() => {
                    setEditingMemberId(null);
                    setFormData({ name: '', mobile_number: '' });
                    setIsAddModalOpen(true);
                  }}
                  size="sm"
                  className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
                >
                  <Plus size={14} /> Add Member
                </Button>
              )}
            </div>
          </div>

          {/* API Search Input */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search member by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-primary font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* Active selection banner for New tab */}
          {activeTab === 'new' && selectedCustomerIds.length > 0 && (
            <div className="flex items-center justify-between bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-3.5 py-2 mt-2.5 text-xs animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-bold">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>{selectedCustomerIds.length} customer{selectedCustomerIds.length > 1 ? 's' : ''} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds([])}
                  className="text-emerald-600 dark:text-emerald-400 underline font-normal ml-1.5 hover:text-emerald-700 cursor-pointer text-[11px]"
                >
                  Clear selection
                </button>
              </div>
              <Button
                size="sm"
                onClick={() => handleBatchConvert()}
                disabled={isConverting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-3 rounded-lg shadow-xs"
              >
                <ShieldCheck size={13} /> Verify & Add Selected ({selectedCustomerIds.length})
              </Button>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {isDetailsLocked ? (
            <div className="p-8 text-center space-y-3">
              <Lock size={32} className="mx-auto text-amber-500" />
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Member Details Module Required</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Subscribe to the Member Details module to view individual member customer phone numbers and profiles.</p>
              <Button onClick={() => navigate('/subscription')} size="sm" className="bg-primary text-white text-xs font-extrabold">Upgrade Now</Button>
            </div>
          ) : isLoading && membersList.length === 0 ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          ) : membersList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users size={32} className="mx-auto text-slate-400" />
              <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No Members Found</h4>
              <p className="text-xs text-slate-400">
                {debouncedSearch ? `No records match "${debouncedSearch}".` : 'No customers recorded in this list yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    {activeTab === 'new' && (
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={membersList.length > 0 && selectedCustomerIds.length === membersList.length}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          title={selectedCustomerIds.length === membersList.length ? 'Deselect all' : 'Select all'}
                        />
                      </th>
                    )}
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Mobile Number</th>
                    <th className="py-3 px-4">Joined On</th>
                    <th className="py-3 px-4">Time</th>
                    {activeTab === 'repeated' && <th className="py-3 px-4 text-center">Visits</th>}
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                  {membersList.map((m, index) => {
                    const isSelected = selectedCustomerIds.includes(m.id);
                    return (
                    <tr
                      key={`${m.id}-${index}`}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {activeTab === 'new' && (
                        <td className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(m.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {m.name || 'Unnamed Customer'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {m.mobile_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                        {new Date(m.joined_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 font-sans">
                          <Clock size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {new Date(m.joined_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>
                      {activeTab === 'repeated' && (
                        <td className="py-3 px-4 text-center font-extrabold text-indigo-600 dark:text-indigo-400">
                          {m.visit_count ?? 0}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        {activeTab === 'new' ? (
                          <Button
                            onClick={() => handleConvertToMember(m.id)}
                            disabled={isConverting}
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 px-2.5 font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          >
                            Verify & Add
                          </Button>
                        ) : activeTab === 'existing' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(m)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Member"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* API Infinite Scroll Trigger */}
              <InfiniteScrollTrigger
                onIntersect={handleLoadMore}
                isLoading={isFetchingMore}
                hasMore={hasMore}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setEditingMemberId(null);
          setFormData({ name: '', mobile_number: '' });
        }}
        title={editingMemberId ? 'Edit Member Details' : 'Add New Verified Member'}
      >
        <form onSubmit={handleAddMember} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name</label>
            <Input
              type="text"
              placeholder="e.g. Siva Rajan"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
            <Input
              type="tel"
              placeholder="e.g. 9876543210"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              required
              className="text-xs font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setEditingMemberId(null);
              }}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm" className="bg-primary text-white">
              {isSubmitting ? 'Saving...' : editingMemberId ? 'Update Member' : 'Save Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* FAB for Add Member (Mobile) */}
      {!isAddModalOpen && !isEditModalOpen && !isDetailsLocked && createPortal(
        <button
          onClick={() => {
            setEditingMemberId(null);
            setFormData({ name: '', mobile_number: '' });
            setIsAddModalOpen(true);
          }}
          className="lg:hidden fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-600 hover:scale-105 shadow-xl flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
          title="Add Member"
        >
          <Plus size={24} />
        </button>,
        document.body
      )}
    </div>
  );
}
