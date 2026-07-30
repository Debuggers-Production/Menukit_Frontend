import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus, Trophy, Award, Sparkles, Heart, RefreshCw, Download, ChevronLeft, ChevronRight, X, Search, User, Phone, ExternalLink, Flame, ShieldAlert, CheckCircle2, XCircle, Eye, MessageSquare, Palette, PenTool, Medal, Gift, AlertCircle
} from 'lucide-react';
import { useShopStore } from '@/store/shopStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { contestService } from '@/services/contestService';
import { Contest, ContestParticipation } from '@/types/contest';
import { api } from '@/services/api';
import { BottomSheet } from '@/components/ui/BottomSheet';

export function ContestsPage() {
  const { shop, setShop, menuItems, setMenuItems, categories, setCategories } = useShopStore();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [participationsMap, setParticipationsMap] = useState<Record<string, ContestParticipation[]>>({});
  const [loadingParticipations, setLoadingParticipations] = useState<Record<string, boolean>>({});

  // Active Tab: 'ongoing' | 'completed' | 'cancelled'
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'cancelled'>('ongoing');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rewardType, setRewardType] = useState<'free_food' | 'combo_price' | 'discount' | 'price_dropping'>('discount');
  const [rewardValue, setRewardValue] = useState('');
  const [contestType, setContestType] = useState<'drawing' | 'kavithai'>('drawing');
  const [appliesTo, setAppliesTo] = useState<'all' | 'items' | 'categories'>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [rankingCriterion, setRankingCriterion] = useState<'likes' | 'comments' | 'shares' | 'all'>('likes');
  const [minParticipants, setMinParticipants] = useState<number>(5);
  const [minLikes, setMinLikes] = useState<number>(10);
  const [minComments, setMinComments] = useState<number>(5);
  const [minShares, setMinShares] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);

  // Custom Dropdown & Wizard States
  const [currentStep, setCurrentStep] = useState(1);
  const [comboName, setComboName] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [itemDroppedPrices, setItemDroppedPrices] = useState<Record<string, string>>({});
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);
  const [selectedContestForModal, setSelectedContestForModal] = useState<Contest | null>(null);
  const [submissionsSearchQuery, setSubmissionsSearchQuery] = useState('');
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [selectedParticipation, setSelectedParticipation] = useState<ContestParticipation | null>(null);
  const [cancelConfirmContestId, setCancelConfirmContestId] = useState<string | null>(null);

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  const handleCancelContest = (contestId: string) => {
    setCancelConfirmContestId(contestId);
  };

  const confirmCancelContest = async () => {
    if (!cancelConfirmContestId) return;
    const contestId = cancelConfirmContestId;
    setCancelConfirmContestId(null);

    try {
      await contestService.cancelContest(contestId);
      toast.success('Contest cancelled & customer credits refunded!');
      loadContests();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to cancel contest');
    }
  };

  const handleStepClick = (stepNum: number) => {
    if (stepNum > 1 && !title.trim()) {
      toast.error('Please enter a contest title first');
      return;
    }
    setCurrentStep(stepNum);
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (!shop) {
          const shopRes = await api.get('/shops/me');
          if (shopRes.data && shopRes.data.id) {
            setShop(shopRes.data);
          } else {
            setLoading(false);
          }
        } else {
          loadContests();
        }
      } catch (err) {
        console.error("Failed to load shop", err);
        setLoading(false);
      }
    };
    init();
  }, [shop, setShop]);

  useEffect(() => {
    if (shop?.id) {
      if (menuItems.length === 0) {
        api.get('/menu-items').then((res) => {
          setMenuItems(res.data || []);
        }).catch(err => {
          console.error("Failed to load menu items", err);
        });
      }
      if (categories.length === 0) {
        api.get('/categories').then((res) => {
          setCategories(res.data || []);
        }).catch(err => {
          console.error("Failed to load categories", err);
        });
      }
    }
  }, [shop?.id, menuItems.length, categories.length, setMenuItems, setCategories]);

  const loadContests = async () => {
    if (!shop?.id) return;
    try {
      setLoading(true);
      const data = await contestService.getShopContests(shop.id);
      setContests(data);
      
      // Load participations for contests
      data.forEach(c => {
        loadParticipations(c.id);
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load contests');
    } finally {
      setLoading(false);
    }
  };

  const loadParticipations = async (contestId: string) => {
    setLoadingParticipations(prev => ({ ...prev, [contestId]: true }));
    try {
      const data = await contestService.getParticipations(contestId);
      setParticipationsMap(prev => ({ ...prev, [contestId]: data }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingParticipations(prev => ({ ...prev, [contestId]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a contest title');
      return;
    }
    
    setSubmitting(true);
    try {
      let finalRewardValue = rewardValue;
      if (rewardType === 'free_food') {
        if (selectedItems.length === 0) {
          toast.error('Please select the free food items in Step 3');
          setSubmitting(false);
          return;
        }
        const freeNames = selectedItems.map(itemId => {
          const item = menuItems.find(it => it.id.toString() === itemId.toString());
          return item ? item.name : 'Food Item';
        });
        finalRewardValue = `Free: Choose any 1 from ${freeNames.join(' or ')}`;
      } else if (rewardType === 'combo_price') {
        const itemNames = selectedItems.map(itemId => {
          const item = menuItems.find(it => it.id.toString() === itemId.toString());
          return item ? item.name : '';
        }).filter(Boolean);

        if (itemNames.length > 0) {
          finalRewardValue = `${comboName} (${itemNames.join(' + ')}) for ₹${comboPrice}`;
        } else {
          finalRewardValue = `${comboName} for ₹${comboPrice}`;
        }
      } else if (rewardType === 'price_dropping') {
        if (selectedItems.length === 0) {
          toast.error('Please select the price drop items in Step 3');
          setSubmitting(false);
          return;
        }
        const dropDescriptions = selectedItems.map(itemId => {
          const item = menuItems.find(it => it.id.toString() === itemId.toString());
          const price = itemDroppedPrices[itemId] || '99';
          return `${item ? item.name : 'Item'} dropped to ₹${price}`;
        });
        finalRewardValue = `Price Drop: ${dropDescriptions.join(', ')}`;
      }

      await contestService.createContest({
        title,
        description,
        reward_type: rewardType,
        reward_value: finalRewardValue,
        contest_type: contestType,
        applies_to: rewardType === 'free_food' ? 'items' : appliesTo,
        target_ids: (rewardType === 'free_food' || appliesTo === 'items') 
          ? selectedItems 
          : appliesTo === 'categories' 
            ? selectedCategories 
            : undefined,
        ranking_criterion: rankingCriterion,
        min_participants: Number(minParticipants) || 1,
        min_likes: Number(minLikes) || 1,
        min_comments: Number(minComments) || 0,
        min_shares: Number(minShares) || 0,
      });

      toast.success('Contest created successfully!');
      setIsModalOpen(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setRewardType('discount');
      setRewardValue('');
      setContestType('drawing');
      setAppliesTo('all');
      setSelectedItems([]);
      setComboName('');
      setComboPrice('');
      setItemDroppedPrices({});
      setRankingCriterion('likes');
      setMinParticipants(5);
      setMinLikes(10);
      setMinComments(5);
      setMinShares(3);
      setCurrentStep(1);
      
      loadContests();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create contest');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download file", error);
      toast.error("Download failed");
    }
  };

  // Filter Contests by activeTab
  const filteredContests = contests.filter(c => {
    if (activeTab === 'ongoing') {
      return c.status === 'active';
    }
    if (activeTab === 'completed') {
      return c.status === 'completed' || (c.status === 'ended' && !c.cancel_reason);
    }
    if (activeTab === 'cancelled') {
      return c.status === 'cancelled' || !!c.cancel_reason;
    }
    return true;
  });

  const calculatePartScore = (part: ContestParticipation, criterion: string = 'likes') => {
    const lk = part.likes_count || 0;
    const cm = part.comments_count || 0;
    if (criterion === 'comments') return cm;
    if (criterion === 'all') return lk + (cm * 2);
    return lk; // default 'likes'
  };

  const getSubmissionsContent = (contest: Contest) => {
    const criterion = contest.ranking_criterion || 'likes';
    const participations = (participationsMap[contest.id] || []).filter(part => {
      const query = submissionsSearchQuery.toLowerCase();
      return (
        part.customer_name?.toLowerCase().includes(query) ||
        part.customer_phone?.toLowerCase().includes(query)
      );
    });

    // Sort by calculated score descending for ranking
    const sortedParticipations = [...participations].sort(
      (a, b) => calculatePartScore(b, criterion) - calculatePartScore(a, criterion)
    );

    return (
      <div className="space-y-4">
        {/* Contest Ranking Info Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500 uppercase tracking-wider text-[10px]">Winning Criteria Basis:</span>
          <span className="font-extrabold text-primary capitalize flex items-center gap-1.5">
            {criterion === 'likes' && <><Heart size={13} className="text-rose-500 fill-rose-500" /> Likes Based</>}
            {criterion === 'comments' && <><MessageSquare size={13} className="text-blue-500" /> Comments Based</>}
            {criterion === 'all' && <><Flame size={13} className="text-amber-500" /> All Combined (Likes + Comments)</>}
          </span>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search customer name or phone..."
            value={submissionsSearchQuery}
            onChange={(e) => setSubmissionsSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
          />
        </div>

        {/* Submissions Ranked List */}
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
          {sortedParticipations.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm font-bold uppercase tracking-wider">
              No participations found
            </div>
          ) : (
            sortedParticipations.map((part, index) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={part.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isFirst ? 'bg-amber-500/10 border-amber-400/40' :
                    isSecond ? 'bg-slate-200/50 border-slate-300 dark:bg-slate-800/40 dark:border-slate-700' :
                    isThird ? 'bg-orange-500/10 border-orange-400/30' :
                    'bg-slate-50 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {isFirst && <Trophy size={16} className="text-amber-500 shrink-0" />}
                      {isSecond && <Award size={16} className="text-slate-400 shrink-0" />}
                      {isThird && <Medal size={16} className="text-amber-700 shrink-0" />}
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        isFirst ? 'bg-amber-500 text-white' :
                        isSecond ? 'bg-slate-600 text-white' :
                        isThird ? 'bg-orange-500 text-white' :
                        'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        Rank #{index + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="flex items-center gap-1 text-[11px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200/40" title="Likes">
                        <Heart size={11} fill="currentColor" /> {part.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-black text-blue-500 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/40" title="Comments">
                        <MessageSquare size={11} /> {part.comments_count || 0}
                      </span>
                      {criterion === 'all' && (
                        <span className="flex items-center gap-1 text-[11px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-300/40">
                          <Sparkles size={11} className="text-amber-500" /> Score: {calculatePartScore(part, 'all')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center justify-between text-xs py-2 border-t border-b border-slate-150 dark:border-slate-800 my-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                      <User size={13} className="text-primary" />
                      <span>{part.customer_name || 'Anonymous Customer'}</span>
                    </div>
                    {part.customer_phone && (
                      <a
                        href={`tel:${part.customer_phone}`}
                        className="flex items-center gap-1 font-mono text-primary font-bold hover:underline"
                      >
                        <Phone size={11} /> {part.customer_phone}
                      </a>
                    )}
                  </div>

                  {/* Content / Post URL Preview */}
                  {part.content_type === 'drawing' ? (
                    <div className="mt-2 space-y-2">
                      {part.media_url ? (
                        <div
                          onClick={() => {
                            setSelectedParticipation(part);
                            setPreviewMediaUrl(part.media_url!);
                          }}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-900 flex items-center justify-center cursor-pointer hover:brightness-105 transition-all shadow-xs"
                        >
                          <img src={part.media_url} alt="Submission Reel" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 backdrop-blur-md group-hover:scale-105 transition-transform">
                              <Eye size={14} className="text-primary" /> View Reel / Image
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic py-2">No reel / image uploaded</div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs italic leading-relaxed text-slate-700 dark:text-slate-300">
                      {part.text_content}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-24 animate-fade-in">
      {/* Page Header */}
      <div className="mb-2">
        <PageHeader
          title="Contests Manager"
          subtitle="Create customer drawing or Kavithai contests with minimum targets."
        />
      </div>

      {/* 3 Main Sticky Tabs: Ongoing, Completed, Cancelled */}
      <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-[#f8fafc]/95 dark:bg-slate-950/95 backdrop-blur-md pt-3 pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200 dark:border-slate-800 mb-4 shadow-xs">
        <div className="flex overflow-x-auto gap-2 py-1 whitespace-nowrap scrollbar-hide no-scrollbar">
          {[
            { id: 'ongoing',   label: 'Ongoing Contests',  count: contests.filter(c => c.status === 'active').length, icon: Flame, color: 'text-amber-500', activeBg: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' },
            { id: 'completed', label: 'Completed Contests', count: contests.filter(c => c.status === 'completed' || (c.status === 'ended' && !c.cancel_reason)).length, icon: CheckCircle2, color: 'text-emerald-500', activeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' },
            { id: 'cancelled', label: 'Cancelled Contests', count: contests.filter(c => c.status === 'cancelled' || !!c.cancel_reason).length, icon: XCircle, color: 'text-rose-500', activeBg: 'bg-rose-600 text-white shadow-md shadow-rose-600/20' },
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? tab.activeBg
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Icon size={14} className={isSelected ? 'text-white' : tab.color} />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Grid Layout for Contests */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      ) : filteredContests.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center rounded-3xl border-dashed border-2 border-slate-200 dark:border-slate-800">
          <Trophy size={48} className="text-slate-300 dark:text-slate-700 mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base capitalize">No {activeTab} contests</h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            {activeTab === 'ongoing' ? 'Click "Create Contest" to launch a new drawing or poetry contest.' : `No ${activeTab} contests recorded.`}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContests.map((contest) => {
            const isOngoing = contest.status === 'active';
            const isCompleted = contest.status === 'completed' || (contest.status === 'ended' && !contest.cancel_reason);
            const isCancelled = contest.status === 'cancelled' || !!contest.cancel_reason;
            
            const participations = participationsMap[contest.id] || [];
            const livePartsCount = participations.length;
            const maxLikes = maxLikesCount(participations);

            const targetParts = contest.min_participants || 1;
            const targetLikes = contest.min_likes || 1;

            const partsProgress = Math.min(100, Math.round((livePartsCount / targetParts) * 100));
            const likesProgress = Math.min(100, Math.round((maxLikes / targetLikes) * 100));

            const endsDate = new Date(contest.ends_at);
            const daysLeft = Math.max(0, Math.ceil((endsDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

            return (
              <Card
                key={contest.id}
                className={`relative overflow-hidden border-l-4 rounded-2xl transition-all hover:shadow-md ${
                  isOngoing ? 'border-l-amber-500 bg-white dark:bg-slate-900' :
                  isCompleted ? 'border-l-emerald-500 bg-white dark:bg-slate-900' :
                  'border-l-rose-500 bg-slate-50/50 dark:bg-slate-900/60'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        {contest.contest_type === 'drawing' ? (
                          <><Palette size={11} className="text-purple-500" /> Drawing</>
                        ) : (
                          <><PenTool size={11} className="text-emerald-500" /> Kavithai</>
                        )}
                      </Badge>

                      <Badge className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isOngoing ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                        isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {isOngoing ? (
                          <><CheckCircle2 size={11} className="text-amber-600" /> {daysLeft}d left</>
                        ) : isCompleted ? (
                          <><Trophy size={11} className="text-emerald-600" /> Completed</>
                        ) : (
                          <><XCircle size={11} className="text-rose-600" /> Cancelled</>
                        )}
                      </Badge>
                    </div>

                    {isOngoing && (
                      <button
                        onClick={() => handleCancelContest(contest.id)}
                        className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Title & Truncated Description */}
                  <div>
                    <h3 className="font-black text-lg text-slate-850 dark:text-slate-100 truncate" title={contest.title}>
                      {contest.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {contest.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Gift Reward Banner */}
                  <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Gift size={16} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Reward Details</span>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {contest.reward_type?.replace('_', ' ')?.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    {contest.reward_value && (
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 px-3 py-1.5 rounded-lg leading-snug break-words">
                        {contest.reward_value}
                      </div>
                    )}
                  </div>

                  {/* Target Counters & Live Progress */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800 text-xs">
                    {/* Ranking Criterion Badge */}
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 pb-1 border-b border-slate-150 dark:border-slate-800">
                      <span>Ranking Basis:</span>
                      <span className="text-primary font-bold capitalize flex items-center gap-1">
                        {contest.ranking_criterion === 'likes' && <><Heart size={11} className="text-rose-500 fill-rose-500" /> Likes</>}
                        {contest.ranking_criterion === 'comments' && <><MessageSquare size={11} className="text-blue-500" /> Comments</>}
                        {contest.ranking_criterion === 'all' && <><Flame size={11} className="text-amber-500" /> All Combined</>}
                      </span>
                    </div>

                    {/* Participants target */}
                    <div>
                      <div className="flex justify-between font-bold text-[11px] mb-1">
                        <span className="text-slate-500">Participants:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {livePartsCount} / <strong className="text-primary">{targetParts} min</strong>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${partsProgress}%` }} />
                      </div>
                    </div>

                    {/* Likes target */}
                    {(contest.ranking_criterion === 'likes' || contest.ranking_criterion === 'all' || !contest.ranking_criterion) && (
                      <div>
                        <div className="flex justify-between font-bold text-[11px] mb-1">
                          <span className="text-slate-500 flex items-center gap-1"><Heart size={11} className="text-rose-500 fill-rose-500" /> Max Likes:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {maxLikes} / <strong className="text-rose-500">{targetLikes} min</strong>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${likesProgress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Comments target */}
                    {(contest.ranking_criterion === 'comments' || contest.ranking_criterion === 'all') && (
                      <div>
                        <div className="flex justify-between font-bold text-[11px] mb-1">
                          <span className="text-slate-500 flex items-center gap-1"><MessageSquare size={11} className="text-blue-500" /> Max Comments:</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {maxCommentsCount(participations)} / <strong className="text-blue-500">{contest.min_comments || 1} min</strong>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, Math.round((maxCommentsCount(participations) / (contest.min_comments || 1)) * 100))}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cancelled Reason Alert if Cancelled */}
                  {isCancelled && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <ShieldAlert size={14} className="shrink-0 text-rose-500" />
                      <span className="truncate">Reason: {contest.cancel_reason || 'Minimum targets not reached'}</span>
                    </div>
                  )}

                  {/* View Details Action */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-400">
                      {livePartsCount} entry{livePartsCount !== 1 ? 'ies' : ''}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedContestForModal(contest);
                        setSubmissionsSearchQuery('');
                        setIsSubmissionsModalOpen(true);
                      }}
                      className="font-bold text-xs gap-1 cursor-pointer"
                    >
                      <span>View Joined Details</span>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentStep(1);
        }}
        title="Create New Contest"
        footer={
          <div className="flex justify-between items-center w-full">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCurrentStep(prev => prev - 1)}
                leftIcon={<ChevronLeft size={14} />}
              >
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (currentStep === 1 && !title.trim()) {
                    toast.error('Please enter a contest title');
                    return;
                  }
                  setCurrentStep(prev => prev + 1);
                }}
                style={{ backgroundColor: primaryColor }}
              >
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                isLoading={submitting}
                style={{ backgroundColor: primaryColor }}
              >
                Launch Contest
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Step Indicator Header */}
          <div className="flex items-center justify-between mb-2 px-1">
            {[
              { step: 1, label: 'Info' },
              { step: 2, label: 'Targets' },
              { step: 3, label: 'Reward' },
              { step: 4, label: 'Items' }
            ].map((s, sIdx, sArr) => (
              <div
                key={s.step}
                onClick={() => handleStepClick(s.step)}
                className="flex items-center flex-1 last:flex-initial cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    currentStep >= s.step ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {s.step}
                  </div>
                  <span className={`text-[9px] font-black mt-1 uppercase tracking-wide ${
                    currentStep >= s.step ? 'text-primary' : 'text-slate-400'
                  }`}>{s.label}</span>
                </div>
                {sIdx < sArr.length - 1 && (
                  <div className={`h-[2px] flex-1 mx-1.5 -mt-4 transition-all ${
                    currentStep > s.step ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* STEP 1: GENERAL CONTEST INFO */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">Contest Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Draw your favorite coffee art!"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">Instructions / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary dark:text-white"
                  placeholder="e.g. Draw a beautiful coffee cup or write a kavithai about coffee..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">Contest Type</label>
                <SearchableSelect
                  options={[
                    { id: 'drawing', name: 'Drawing Contest' },
                    { id: 'kavithai', name: 'Kavithai (Poetry) Contest' }
                  ]}
                  value={contestType}
                  onChange={(val) => setContestType(val as any)}
                  showSearch={false}
                  placeholder="Select Contest Type"
                />
              </div>
            </div>
          )}

          {/* STEP 2: WINNING TARGETS & RULES */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Winning & Ranking Criteria Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">Winning & Ranking Basis</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'likes', label: 'Likes Based', desc: 'Ranked by likes', icon: Heart, iconColor: 'text-rose-500 fill-rose-500' },
                    { id: 'comments', label: 'Comments Based', desc: 'Ranked by comments', icon: MessageSquare, iconColor: 'text-blue-500' },
                    { id: 'all', label: 'All Combined', desc: 'Likes + Comments', icon: Flame, iconColor: 'text-amber-500' },
                  ].map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRankingCriterion(opt.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          rankingCriterion === opt.id
                            ? 'border-primary bg-primary/5 text-primary shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-extrabold text-xs">
                          <Icon size={14} className={opt.iconColor} />
                          <span>{opt.label}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minimum Targets Inputs */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-xs font-black text-primary uppercase tracking-wider block">Minimum Contest Targets</span>
                <p className="text-[11px] text-slate-400 font-medium leading-normal">
                  If these targets are not reached by contest end, it will automatically cancel with "Minimum targets not reached".
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Min Participants</label>
                    <Input
                      type="number"
                      min={1}
                      value={minParticipants}
                      onChange={(e) => setMinParticipants(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  {(rankingCriterion === 'likes' || rankingCriterion === 'all') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Min Likes</label>
                      <Input
                        type="number"
                        min={1}
                        value={minLikes}
                        onChange={(e) => setMinLikes(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  )}

                  {(rankingCriterion === 'comments' || rankingCriterion === 'all') && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500">Min Comments</label>
                      <Input
                        type="number"
                        min={1}
                        value={minComments}
                        onChange={(e) => setMinComments(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REWARD CONFIGURATION */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">Reward Category</label>
                <SearchableSelect
                  options={[
                    { id: 'discount', name: 'Discount Coupon' },
                    { id: 'free_food', name: 'Free Food Item' },
                    { id: 'combo_price', name: 'Combo & Price Pack' },
                    { id: 'price_dropping', name: 'Direct Price Dropping' }
                  ]}
                  value={rewardType}
                  onChange={(val) => setRewardType(val as any)}
                  showSearch={false}
                  placeholder="Select Reward Category"
                />
              </div>

              {rewardType === 'discount' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">Discount Value</label>
                  <Input
                    value={rewardValue}
                    onChange={(e) => setRewardValue(e.target.value)}
                    placeholder="e.g. 20% Off on total bill OR ₹50 Flat Off"
                  />
                </div>
              )}

              {rewardType === 'combo_price' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Combo Title</label>
                    <Input
                      value={comboName}
                      onChange={(e) => setComboName(e.target.value)}
                      placeholder="e.g. Snack Combo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">Combo Price (₹)</label>
                    <Input
                      value={comboPrice}
                      type="number"
                      onChange={(e) => setComboPrice(e.target.value)}
                      placeholder="e.g. 199"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: TARGET ITEMS */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {rewardType === 'combo_price' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                    <span className="text-xs font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider">Combo Configuration</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-1">
                      {comboName || 'Combo'} for ₹{comboPrice || '0'}
                    </p>
                  </div>

                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">Select Combo Food Items</label>
                  <SearchableSelect
                    options={menuItems.map(item => ({ id: item.id.toString(), name: `${item.name} (₹${item.price})` }))}
                    value=""
                    onChange={(selectedId) => {
                      if (selectedId && !selectedItems.includes(selectedId)) {
                        setSelectedItems(prev => [...prev, selectedId]);
                      }
                    }}
                    placeholder="Search and select combo food items..."
                  />

                  {selectedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedItems.map(itemId => {
                        const item = menuItems.find(it => it.id.toString() === itemId.toString());
                        return (
                          <span
                            key={itemId}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-700/50 rounded-full text-xs font-bold"
                          >
                            {item ? item.name : 'Food Item'}
                            <button
                              type="button"
                              onClick={() => setSelectedItems(prev => prev.filter(id => id !== itemId))}
                              className="text-amber-600 hover:text-amber-800 dark:hover:text-white cursor-pointer ml-1"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : rewardType === 'price_dropping' ? (
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                    Select Food Items & Set Dropped Prices (₹)
                  </label>
                  <SearchableSelect
                    options={menuItems.map(item => ({ id: item.id.toString(), name: `${item.name} (Original ₹${item.price})` }))}
                    value=""
                    onChange={(selectedId) => {
                      if (selectedId && !selectedItems.includes(selectedId)) {
                        setSelectedItems(prev => [...prev, selectedId]);
                        const item = menuItems.find(it => it.id.toString() === selectedId.toString());
                        if (item) {
                          setItemDroppedPrices(prev => ({ ...prev, [selectedId]: Math.floor(item.price * 0.5).toString() }));
                        }
                      }
                    }}
                    placeholder="Search food item to add to Price Drop..."
                  />

                  {selectedItems.length > 0 && (
                    <div className="space-y-2 pt-1 max-h-[220px] overflow-y-auto pr-1">
                      {selectedItems.map(itemId => {
                        const item = menuItems.find(it => it.id.toString() === itemId.toString());
                        if (!item) return null;
                        return (
                          <div
                            key={itemId}
                            className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                                {item.name}
                              </p>
                              <span className="text-[10px] text-slate-400 font-medium">
                                Original: <span className="line-through">₹{item.price}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-28 space-y-0.5">
                                <label className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 block">Dropped Price</label>
                                <Input
                                  type="number"
                                  value={itemDroppedPrices[itemId] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setItemDroppedPrices(prev => ({ ...prev, [itemId]: val }));
                                  }}
                                  placeholder="New Price"
                                  className="h-8 text-xs font-bold"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItems(prev => prev.filter(id => id !== itemId));
                                  setItemDroppedPrices(prev => {
                                    const next = { ...prev };
                                    delete next[itemId];
                                    return next;
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer mt-3"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">Applicable To</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        checked={appliesTo === 'all'}
                        onChange={() => setAppliesTo('all')}
                        className="w-4 h-4 text-primary"
                      />
                      All Food Items
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        checked={appliesTo === 'items'}
                        onChange={() => setAppliesTo('items')}
                        className="w-4 h-4 text-primary"
                      />
                      Selected Food Items
                    </label>
                  </div>

                  {appliesTo === 'items' && (
                    <div className="space-y-2">
                      <SearchableSelect
                        options={menuItems.map(item => ({ id: item.id.toString(), name: `${item.name} (₹${item.price})` }))}
                        value=""
                        onChange={(selectedId) => {
                          if (selectedId && !selectedItems.includes(selectedId)) {
                            setSelectedItems(prev => [...prev, selectedId]);
                          }
                        }}
                        placeholder="Search and select food items..."
                      />

                      {selectedItems.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2 max-h-[150px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl">
                          {selectedItems.map((itemId) => {
                            const item = menuItems.find(it => it.id.toString() === itemId.toString());
                            if (!item) return null;
                            return (
                              <div key={itemId} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-lg px-2.5 py-1 text-xs font-bold">
                                <span>{item.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems(prev => prev.filter(x => x !== itemId))}
                                  className="p-0.5 hover:bg-primary/20 rounded-full cursor-pointer text-primary"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Submissions & Joined Customers Details Modal (Desktop) */}
      <Modal
        isOpen={isSubmissionsModalOpen && window.innerWidth >= 640}
        onClose={() => {
          setIsSubmissionsModalOpen(false);
          setSelectedContestForModal(null);
        }}
        title={`Joined Details: ${selectedContestForModal?.title || 'Contest'}`}
      >
        {selectedContestForModal && getSubmissionsContent(selectedContestForModal)}
      </Modal>

      {/* Submissions & Joined Customers Details Bottom Sheet (Mobile) */}
      <BottomSheet
        isOpen={isSubmissionsModalOpen && window.innerWidth < 640}
        onClose={() => {
          setIsSubmissionsModalOpen(false);
          setSelectedContestForModal(null);
        }}
        title={`Joined Details: ${selectedContestForModal?.title || 'Contest'}`}
      >
        {selectedContestForModal && getSubmissionsContent(selectedContestForModal)}
      </BottomSheet>

      {/* Lightbox / Media Preview Modal */}
      <Modal
        isOpen={!!previewMediaUrl}
        onClose={() => setPreviewMediaUrl(null)}
        title="Submission Media / Reel Preview"
      >
        {previewMediaUrl && (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[70vh] flex items-center justify-center bg-black">
              {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(previewMediaUrl) ? (
                <video
                  controls
                  autoPlay
                  src={previewMediaUrl}
                  className="max-h-[65vh] w-full object-contain"
                />
              ) : (
                <img src={previewMediaUrl} alt="Submission Preview" className="max-h-[65vh] w-auto object-contain" />
              )}
            </div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
              {selectedParticipation && shop?.id && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/shop/${shop.id}/contest?participation_id=${selectedParticipation.id}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full text-xs font-black text-white py-2.5 rounded-xl bg-primary hover:brightness-110 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <ExternalLink size={14} /> Open Reel Page (Comments & Likes)
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Contest Cancellation Confirmation Modal */}
      <Modal
        isOpen={!!cancelConfirmContestId}
        onClose={() => setCancelConfirmContestId(null)}
        title="Cancel Contest"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle size={28} />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white">
              Are you sure you want to cancel this contest?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed max-w-sm mx-auto">
              This contest will be moved to <span className="font-bold text-rose-500">Cancelled</span> status. Any contest credits spent by participants will be <span className="font-bold text-emerald-600 dark:text-emerald-400">automatically refunded</span> to their account balances.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setCancelConfirmContestId(null)}
              className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Keep Contest Active
            </button>
            <button
              onClick={confirmCancelContest}
              className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              Yes, Cancel Contest
            </button>
          </div>
        </div>
      </Modal>

      {/* Circular Floating Action Button (FAB) */}
      <button
        onClick={() => {
          const hasActiveContest = contests.some(c => c.status === 'active');
          if (hasActiveContest) {
            toast.error('You already have an active contest running! Please wait for it to complete or cancel it first.');
            return;
          }
          setIsModalOpen(true);
        }}
        className="fixed bottom-20 right-5 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-full text-white shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-white/20"
        style={{ backgroundColor: primaryColor }}
        title="Create Contest"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function maxLikesCount(participations: ContestParticipation[]): number {
  if (!participations || participations.length === 0) return 0;
  return Math.max(...participations.map(p => p.likes_count || 0));
}

function maxCommentsCount(participations: ContestParticipation[]): number {
  if (!participations || participations.length === 0) return 0;
  return Math.max(...participations.map(p => p.comments_count || 0));
}

function maxSharesCount(participations: ContestParticipation[]): number {
  if (!participations || participations.length === 0) return 0;
  return Math.max(...participations.map(p => p.shares_count || 0));
}
