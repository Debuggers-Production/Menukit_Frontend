import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { Users, ShieldCheck, Smartphone, Plus, Search, Lock, RefreshCw, AlertCircle, Trophy, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { CountryCodeSelect, COUNTRY_CODES } from '@/components/ui/CountryCodeSelect';
import { membershipService, MembershipAnalytics, Member } from '@/services/memberships';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { SquareFAB } from '@/components/ui/SquareFAB';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { Skeleton } from '@/components/ui/Skeleton';
import { api } from '@/services/api';
import { HeaderActions } from '@/components/HeaderActions';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';

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
    setHeaderTitle('Members');
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', mobile_number: '' });
  const [countryCode, setCountryCode] = useState('+91');
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

  const isDuplicateNumber = useMemo(() => {
    const cleanDigits = formData.mobile_number.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 6) return false;
    const fullMobile = `${countryCode}${cleanDigits}`;
    const last10 = cleanDigits.slice(-10);
    return membersList.some((m) => {
      const existingDigits = (m.customer?.mobile_number || '').replace(/\D/g, '');
      const existingLast10 = existingDigits.slice(-10);
      return (
        existingDigits === cleanDigits ||
        (last10.length >= 10 && existingLast10 === last10) ||
        m.customer?.mobile_number === fullMobile
      );
    });
  }, [formData.mobile_number, countryCode, membersList]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop?.id) return;

    const cleanDigits = formData.mobile_number.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 6) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    if (isDuplicateNumber) {
      toast.error('This mobile number is already registered as a member in your shop');
      return;
    }

    const fullMobile = `${countryCode}${cleanDigits}`;

    setIsSubmitting(true);
    try {
      await membershipService.addMember(shop.id, formData.name, fullMobile);
      toast.success('Member verified and added successfully!');
      setIsAddModalOpen(false);
      setFormData({ name: '', mobile_number: '' });
      setCountryCode('+91');
      fetchAnalyticsSummary();
      loadMembersData(0, true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };



  const isModuleLocked = isLocked || (subStatus && (subStatus.is_expired || (!subStatus.is_all_access && Array.isArray(subStatus.active_modules) && !subStatus.active_modules.includes('member-details') && !subStatus.active_modules.includes('member-count'))));

  return (
    <div className="space-y-4 w-full animate-fade-in pb-20">
      {/* Top Header Actions */}
      <HeaderActions>
        <div className="flex items-center gap-2">
          {activeTab === 'existing' && !isDetailsLocked && (
            <Button
              onClick={() => {
                setFormData({ name: '', mobile_number: '' });
                setCountryCode('+91');
                setIsAddModalOpen(true);
              }}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-semibold h-8 gap-1 shadow-2xs"
            >
              <Plus size={13} /> Add Member
            </Button>
          )}

        </div>
      </HeaderActions>

      {/* Module Lock Banner */}
      {isModuleLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">Customer Insights & Member Modules Locked</h4>
              <p className="text-[11px] text-muted-foreground">Subscribe to Member Count / Details modules or renew your plan to access customer data.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/subscription')} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-bold rounded-md h-8">
            Unlock Modules →
          </Button>
        </div>
      )}

      {/* Analytics KPI Cards (Boxy Subtle Curves) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <div className="bg-card border border-border/80 rounded-lg p-3 sm:p-4 shadow-2xs transition-all hover:border-indigo-500/30">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Members</span>
            <Users size={14} className="text-indigo-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-heading">
            {analytics?.total_members ?? 0}
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-lg p-3 sm:p-4 shadow-2xs transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Verified</span>
            <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-heading">
            {analytics?.manually_added ?? 0}
          </div>
        </div>

        <div className="bg-card border border-border/80 rounded-lg p-3 sm:p-4 shadow-2xs transition-all hover:border-amber-500/30">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Auto Registered</span>
            <Smartphone size={14} className="text-amber-500 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-heading">
            {analytics?.auto_registered ?? 0}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <Card className="shadow-2xs overflow-hidden border-border/80 rounded-lg bg-card">
        {/* Sticky Controls & Filter Toolbar */}
        <div className="sticky top-[-14px] sm:top-[-20px] lg:top-[-24px] z-20 bg-background/95 backdrop-blur-md p-3 sm:p-3.5 border-b border-border/80 -mx-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Custom Segmented Tab Switcher */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-md border border-border/60 max-w-fit">
              <button
                type="button"
                onClick={() => { setActiveTab('existing'); setSelectedCustomerIds([]); }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'existing'
                    ? 'bg-background text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Existing</span>
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                  {analytics?.manually_added ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('new'); setSelectedCustomerIds([]); }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'new'
                    ? 'bg-background text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>New</span>
                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                  {analytics?.auto_registered ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('repeated'); setSelectedCustomerIds([]); }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'repeated'
                    ? 'bg-background text-foreground shadow-2xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Repeated</span>
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono text-[10px] font-bold">
                  {analytics?.repeated_count ?? 0}
                </span>
              </button>
            </div>

            {/* Action Buttons & Min Visits filter */}
            <div className="flex items-center gap-2">
              {activeTab === 'repeated' && (
                <div className="flex items-center gap-1 bg-background px-2.5 py-1 rounded-md border border-border text-xs h-8">
                  <span className="text-muted-foreground font-semibold text-[11px]">Min Visits:</span>
                  <select
                    value={minVisits}
                    onChange={(e) => setMinVisits(Number(e.target.value))}
                    className="bg-transparent font-bold text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value={2}>2+</option>
                    <option value={3}>3+</option>
                    <option value={5}>5+</option>
                  </select>
                </div>
              )}

              {activeTab === 'new' && !isDetailsLocked && membersList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md border border-border bg-background transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs h-8"
                  >
                    <input
                      type="checkbox"
                      checked={membersList.length > 0 && selectedCustomerIds.length === membersList.length}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer pointer-events-none accent-emerald-600"
                    />
                    <span>{selectedCustomerIds.length === membersList.length ? 'Deselect All' : 'Select All'}</span>
                  </button>

                  <Button
                    onClick={() => handleBatchConvert()}
                    disabled={isConverting}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold gap-1.5 shadow-2xs h-8"
                  >
                    <ShieldCheck size={13} />
                    {selectedCustomerIds.length > 0
                      ? `Verify & Add (${selectedCustomerIds.length})`
                      : `Verify & Add All (${analytics?.auto_registered ?? membersList.length})`}
                  </Button>
                </div>
              )}

              {activeTab === 'existing' && !isDetailsLocked && (
                <Button
                  onClick={() => {
                    setFormData({ name: '', mobile_number: '' });
                    setIsAddModalOpen(true);
                  }}
                  size="sm"
                  className="sm:hidden bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-semibold gap-1 shadow-2xs h-8"
                >
                  <Plus size={13} /> Add
                </Button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search member by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8 pr-3 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-medium text-foreground placeholder:text-muted-foreground transition-all"
            />
          </div>

          {/* Active selection banner for New tab */}
          {activeTab === 'new' && selectedCustomerIds.length > 0 && (
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-1.5 mt-2 text-xs animate-fade-in">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>{selectedCustomerIds.length} customer{selectedCustomerIds.length > 1 ? 's' : ''} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerIds([])}
                  className="text-emerald-600 dark:text-emerald-400 underline font-normal ml-1.5 hover:text-emerald-700 cursor-pointer text-[11px]"
                >
                  Clear
                </button>
              </div>
              <Button
                size="sm"
                onClick={() => handleBatchConvert()}
                disabled={isConverting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-2.5 rounded-md shadow-2xs"
              >
                <ShieldCheck size={12} /> Verify Selected ({selectedCustomerIds.length})
              </Button>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          {isDetailsLocked ? (
            <div className="p-8 text-center space-y-3">
              <Lock size={28} className="mx-auto text-amber-500" />
              <h4 className="font-bold text-sm text-foreground">Member Details Module Required</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">Subscribe to the Member Details module to view individual member customer phone numbers and profiles.</p>
              <Button onClick={() => navigate('/subscription')} size="sm" className="bg-primary text-white text-xs font-bold rounded-md">Upgrade Now</Button>
            </div>
          ) : isLoading && membersList.length === 0 ? (
            <div className="p-5 space-y-2.5">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : membersList.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users size={28} className="mx-auto text-muted-foreground" />
              <h4 className="font-bold text-foreground text-sm">No Members Found</h4>
              <p className="text-xs text-muted-foreground">
                {debouncedSearch ? `No records match "${debouncedSearch}".` : 'No customers recorded in this list yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    {activeTab === 'new' && (
                      <th className="py-2.5 px-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={membersList.length > 0 && selectedCustomerIds.length === membersList.length}
                          onChange={handleToggleSelectAll}
                          className="w-3.5 h-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          title={selectedCustomerIds.length === membersList.length ? 'Deselect all' : 'Select all'}
                        />
                      </th>
                    )}
                    <th className="py-2.5 px-3.5">Name</th>
                    <th className="py-2.5 px-3.5">Mobile Number</th>
                    <th className="py-2.5 px-3.5">Joined Date</th>
                    <th className="py-2.5 px-3.5">Time</th>
                    <th className="py-2.5 px-3.5 text-center">Visits</th>
                    {activeTab === 'new' && <th className="py-2.5 px-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {membersList.map((m, index) => {
                    const isSelected = selectedCustomerIds.includes(m.id);
                    return (
                    <tr
                      key={`${m.id}-${index}`}
                      className={`hover:bg-muted/50 transition-colors ${
                        isSelected ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      {activeTab === 'new' && (
                        <td className="py-2.5 px-3.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(m.id)}
                            className="w-3.5 h-3.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-3.5 font-bold text-foreground">
                        {m.name || 'Unnamed Customer'}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-muted-foreground">
                        {m.mobile_number}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] whitespace-nowrap font-semibold text-foreground">
                        {new Date(m.joined_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center gap-1 font-sans">
                          <Clock size={11} className="text-muted-foreground shrink-0" />
                          <span>
                            {new Date(m.joined_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-bold">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-muted text-foreground border border-border min-w-[22px]">
                          {m.visit_count ?? 1}
                        </span>
                      </td>
                      {activeTab === 'new' && (
                        <td className="py-2.5 px-3.5 text-right">
                          <Button
                            onClick={() => handleConvertToMember(m.id)}
                            disabled={isConverting}
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 px-2 font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-md"
                          >
                            Verify & Add
                          </Button>
                        </td>
                      )}
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

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setFormData({ name: '', mobile_number: '' });
          setCountryCode('+91');
        }}
        title="Add New Verified Member"
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
            <div className="flex items-center gap-2">
              <CountryCodeSelect
                value={countryCode}
                onChange={setCountryCode}
                heightClass="h-9"
                className="rounded-md"
              />
              <div className="flex-1">
                <Input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                  required
                  className={`text-xs font-mono ${isDuplicateNumber ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                />
              </div>
            </div>
            {isDuplicateNumber && (
              <p className="text-[11px] text-destructive font-semibold mt-1.5 flex items-center gap-1 animate-in fade-in duration-200">
                <span>⚠️ This mobile number is already registered as a member in your shop.</span>
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setFormData({ name: '', mobile_number: '' });
                setCountryCode('+91');
              }}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isDuplicateNumber} size="sm" className="bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? 'Saving...' : 'Save Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reusable Square FAB for Add Member */}
      <SquareFAB
        icon={Plus}
        onClick={() => {
          setFormData({ name: '', mobile_number: '' });
          setCountryCode('+91');
          setIsAddModalOpen(true);
        }}
        title="Add Member"
        visible={!isAddModalOpen && !isDetailsLocked}
      />
    </div>
  );
}
