import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { 
  ChevronLeft, 
  Store, 
  Trophy, 
  Gift, 
  ShoppingBag, 
  ChevronRight, 
  Sparkles, 
  Flame, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { api } from '@/services/api';
import { Shop } from '@/types';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { DiscountUnlockPopup } from '@/components/public/DiscountUnlockPopup';

export function CustomerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('customer_token'));
  const [showVerifyPopup, setShowVerifyPopup] = useState<boolean>(!localStorage.getItem('customer_token'));
  const [customerPhone, setCustomerPhone] = useState<string>(() => localStorage.getItem('customer_phone') || '');
  const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('customer_name') || 'Guest Customer');
  const [customerCredits, setCustomerCredits] = useState<{ creditLimit: number; availableCredit: number; usedCredit: number }>({
    creditLimit: 0,
    availableCredit: 0,
    usedCredit: 0
  });

  const [visitedShops, setVisitedShops] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [myParticipatedContests, setMyParticipatedContests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Main Tabs: 'shops' | 'rewards' | 'orders' | 'contests'
  const [activeTab, setActiveTab] = useState<'shops' | 'rewards' | 'orders' | 'contests'>('shops');
  
  // Contest Sub-Tabs: 'participated' | 'live'
  const [contestSubTab, setContestSubTab] = useState<'participated' | 'live'>('participated');

  useEffect(() => {
    async function loadCustomerProfileData() {
      setIsLoading(true);
      try {
        if (id) {
          // Fetch Shop details & active theme
          const shopRes = await api.get(`/public/shop/${id}`);
          setShop(shopRes.data);

          // Fetch full customer profile data from backend API
          const storedToken = localStorage.getItem('customer_token');
          const profileRes = await api.get(`/public/shop/${id}/customer-profile`, {
            headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {}
          });

          const data = profileRes.data;
          if (data) {
            if (data.customer) {
              setCustomerName(data.customer.name || localStorage.getItem('customer_name') || 'Customer');
              setCustomerPhone(data.customer.mobile_number || localStorage.getItem('customer_phone') || '');
              setCustomerCredits({
                creditLimit: data.customer.credit_limit || 0,
                availableCredit: data.customer.available_credit || 0,
                usedCredit: data.customer.used_credit || 0
              });
            }
            setVisitedShops(data.visited_shops || []);
            setOrders(data.orders || []);
            setDiscounts(data.rewards || []);
            setMyParticipatedContests(data.participated_contests || []);
            setContests(data.live_contests || []);
          }
        }
      } catch (err) {
        console.error("Failed to load customer profile", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCustomerProfileData();
  }, [id, token]);

  const primaryColor = shop?.theme?.primary_color || '#ea580c';

  // Group orders by shop name
  const ordersGroupedByShop = useMemo(() => {
    const groups: { [shopName: string]: any[] } = {};
    orders.forEach((o) => {
      const sName = o.shop_name || shop?.name || 'Store Network';
      if (!groups[sName]) groups[sName] = [];
      groups[sName].push(o);
    });
    return groups;
  }, [orders, shop?.name]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-20 font-sans">
      {/* Top Sticky Header */}
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-30 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(`/shop/${id}`)}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="text-center">
            <h1 className="font-extrabold text-base text-slate-900 dark:text-white leading-none">Customer Profile</h1>
          </div>

          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* TOP PROFILE HERO CARD (Matches Hand-Drawn Wireframe Layout) */}
        <div 
          className="rounded-3xl p-6 shadow-md border relative overflow-hidden transition-all"
          style={{
            backgroundColor: `${primaryColor}08`,
            borderColor: `${primaryColor}30`
          }}
        >
          {/* Wireframe Hero Stack: Avatar on left -> Name, Available Credit, Mobile Number */}
          <div className="flex items-center gap-4 relative z-10">
            <div 
              className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {customerName ? customerName.charAt(0).toUpperCase() : 'C'}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                {customerName}
              </h2>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ⭐ {customerCredits.availableCredit} Available Credits
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {customerPhone || 'Mobile Not Verified'}
              </p>
            </div>
          </div>

          {/* TOP 4 STAT BOXES (Exact Wireframe layout: Shops Visited, Total Orders, Rewards, Contest Counts) */}
          <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-center relative z-10">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Shops Visited</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {visitedShops.length || 1}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Total Orders</span>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {orders.length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Rewards Earned</span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {discounts.length}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col justify-center shadow-2xs">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block truncate">Contests</span>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {myParticipatedContests.length}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION TABS (Sticky top below header) */}
        <div className="sticky top-16 z-20 py-2 -mx-4 px-4 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-all">
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-2xl shadow-xs">
            <button
              onClick={() => setActiveTab('shops')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'shops'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Store size={14} className={activeTab === 'shops' ? 'text-emerald-500' : ''} />
              <span className="truncate">Shops Visited</span>
            </button>

            <button
              onClick={() => setActiveTab('rewards')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'rewards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Gift size={14} className={activeTab === 'rewards' ? 'text-amber-500' : ''} />
              <span className="truncate">Rewards</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingBag size={14} className={activeTab === 'orders' ? 'text-blue-500' : ''} />
              <span className="truncate">Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('contests')}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                activeTab === 'contests'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Trophy size={14} className={activeTab === 'contests' ? 'text-purple-500' : ''} />
              <span className="truncate">Contests</span>
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          {/* TAB 1: SHOPS VISITED */}
          {activeTab === 'shops' && (
            <motion.div
              key="shops"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Visited Stores ({visitedShops.length})</h3>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Store History
                </span>
              </div>

              {visitedShops.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Store size={36} className="mx-auto text-slate-400 opacity-50" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Visited Stores Yet</h4>
                  <p className="text-xs text-slate-500">Scan QR codes or order from partner shops to build your history!</p>
                </div>
              ) : (
                visitedShops.map((vs) => (
                  <div 
                    key={vs.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {vs.logo_url ? (
                          <img src={vs.logo_url} alt={vs.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          vs.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{vs.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{vs.total_orders} Orders</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600">₹{vs.total_spent.toFixed(0)} Spent</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/shop/${vs.id}`)}
                      className="px-3.5 py-2 rounded-xl text-white font-extrabold text-xs shadow-sm flex items-center gap-1 shrink-0 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span>Menu</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* TAB 2: REWARDS */}
          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">
                  Claimed Customer Rewards ({discounts.length})
                </h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles size={14} /> Available Now
                </span>
              </div>

              {discounts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <Gift size={36} className="mx-auto text-slate-400 opacity-60" />
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Claimed Rewards Yet</h4>
                  <p className="text-xs text-slate-500">Join contests or become a store member to earn & claim rewards!</p>
                </div>
              ) : (
                discounts.map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-2xl p-5 border shadow-2xs space-y-3 bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/80 text-amber-900 dark:text-amber-200"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">{r.rewardType || 'Shop Discount'} • {r.shopName || 'Store Network'}</span>
                        <h4 className="font-black text-base mt-0.5">{r.title}</h4>
                        <p className="text-xs opacity-90 font-medium mt-0.5">{r.description}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border shadow-2xs">
                        {r.status || 'READY TO USE'}
                      </span>
                    </div>

                    {r.code && (
                      <div className="flex items-center justify-between pt-2 border-t border-current/10 text-xs">
                        <div>
                          <span className="opacity-70 text-[10px] uppercase font-bold block">Coupon Code</span>
                          <span className="font-mono font-black tracking-wider text-sm">{r.code}</span>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(r.code);
                            toast.success(`Coupon code ${r.code} copied!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-xs shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          Copy Code
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* TAB 3: ORDERS (Grouped with proper separation based on Shops) */}
          {activeTab === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Shop Orders ({orders.length})</h3>
                {orders.length > 0 && (
                  <button 
                    onClick={() => navigate(`/shop/${id}/orders`)}
                    className="text-xs font-extrabold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <span>View All Live</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {Object.keys(ordersGroupedByShop).length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <ShoppingBag size={40} className="mx-auto text-slate-400 opacity-60" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">No Orders Yet</h4>
                    <p className="text-xs text-slate-500 mt-1">Browse our menu and place your first order!</p>
                  </div>
                  <button
                    onClick={() => navigate(`/shop/${id}`)}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                Object.entries(ordersGroupedByShop).map(([shopNameGroup, shopOrders]) => (
                  <div key={shopNameGroup} className="space-y-3">
                    {/* Shop Separation Header */}
                    <div className="flex items-center gap-2 pt-1 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Store size={16} className="text-orange-500" />
                      <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                        {shopNameGroup} ({shopOrders.length})
                      </h4>
                    </div>

                    {shopOrders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">#{o.id.slice(0, 8).toUpperCase()}</span>
                            <h5 className="font-extrabold text-xs text-slate-700 dark:text-slate-300">{shopNameGroup}</h5>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            o.order_status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                            o.order_status === 'accepted' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                            o.order_status === 'rejected' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {o.order_status === 'accepted' ? 'PREPARING' : o.order_status?.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                          {o.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between font-medium">
                              <span>{item.name} x{item.quantity}</span>
                              <span className="font-mono text-slate-900 dark:text-white">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">₹{Number(o.total_amount).toFixed(2)}</span>
                          <button
                            onClick={() => navigate(`/shop/${id}/order/${o.id}`)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition-colors cursor-pointer"
                          >
                            Track Status
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </motion.div>
          )}

          {/* TAB 4: CONTESTS (With 2 Sub-Tabs: Participated and Live) */}
          {activeTab === 'contests' && (
            <motion.div
              key="contests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Contest 2 Sub-Tabs Bar */}
              <div className="flex bg-slate-200/70 dark:bg-slate-800/70 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setContestSubTab('participated')}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    contestSubTab === 'participated'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Participated ({myParticipatedContests.length})
                </button>
                <button
                  onClick={() => setContestSubTab('live')}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    contestSubTab === 'live'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Live Ongoing ({contests.length})
                </button>
              </div>

              {/* Sub-Tab 1: Participated Contests */}
              {contestSubTab === 'participated' && (
                <div className="space-y-3">
                  {myParticipatedContests.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                      <Trophy size={32} className="mx-auto text-slate-400 opacity-50" />
                      <h4 className="font-extrabold text-xs text-slate-700 dark:text-slate-300">No Joined Contests Yet</h4>
                      <p className="text-[11px] text-slate-500">Switch to the "Live Ongoing" tab above to join active contest challenges!</p>
                    </div>
                  ) : (
                    myParticipatedContests.map((c) => (
                      <div
                        key={c.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.shopName || shop?.name}</span>
                            <h4 className="font-black text-base text-slate-900 dark:text-white mt-0.5">{c.title}</h4>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.statusCls || 'bg-amber-100 text-amber-800'}`}>
                            {c.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Rank</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">#{c.rank} / {c.totalParticipants}</span>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase">Score</span>
                            <span className="font-black text-slate-900 dark:text-white text-sm">{c.pointsScore}</span>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 block uppercase">Reward</span>
                            <span className="font-black text-amber-600 dark:text-amber-400 text-[11px] truncate block">{c.rewardWon}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Live Ongoing Contests */}
              {contestSubTab === 'live' && (
                <div className="space-y-3">
                  {contests.length === 0 ? (
                    <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl p-5 border border-amber-200/80 dark:border-amber-900/40 text-center space-y-2">
                      <Trophy size={32} className="mx-auto text-amber-500" />
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Live Contests Hub</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300">Join food sprint challenges and win free meal vouchers!</p>
                      <button
                        onClick={() => navigate(`/shop/${id}/contest`)}
                        className="px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Join Contest Hub
                      </button>
                    </div>
                  ) : (
                    contests.map((contest: any) => (
                      <div
                        key={contest.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            🎁 {contest.prize_description || 'Free Food Reward'}
                          </span>
                          <h4 className="font-black text-sm text-slate-900 dark:text-white mt-0.5">{contest.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{contest.description || 'Participate and score points to win!'}</p>
                        </div>
                        <button
                          onClick={() => navigate(`/shop/${id}/contest`)}
                          className="px-4 py-2 rounded-xl text-white font-extrabold text-xs shadow-md shrink-0 cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Participate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Verification Sheet Modal */}
      {showVerifyPopup && (
        <DiscountUnlockPopup
          shopId={id || ''}
          initialStep="mobile"
          onClose={() => setShowVerifyPopup(false)}
          onUnlock={() => {
            setShowVerifyPopup(false);
            setToken(localStorage.getItem('customer_token'));
            setCustomerPhone(localStorage.getItem('customer_phone') || '');
            setCustomerName(localStorage.getItem('customer_name') || 'Customer');
            toast.success("Mobile number verified successfully!");
          }}
        />
      )}
    </div>
  );
}
