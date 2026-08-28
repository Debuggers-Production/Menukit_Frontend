import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { api } from '@/services/api';
import { Plus, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Shop {
  id: string;
  name: string;
}

import logo from "@/assets/menukit-logo.svg";

export function ShopSwitcherDropdown() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateNew = location.state?.createNew === true && location.pathname === '/shop-setup';
  
  const [ownedShops, setOwnedShops] = useState<Shop[]>([]);
  const [staffShops, setStaffShops] = useState<Shop[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await api.get('/shops/my-shops');
        setOwnedShops(res.data.owned || []);
        setStaffShops(res.data.employed || []);
        const currentShopId = localStorage.getItem('current_shop_id');
        const allShops = [...(res.data.owned || []), ...(res.data.employed || [])];
        
        if (currentShopId) {
          const found = allShops.find(s => s.id === currentShopId);
          if (found) setActiveShop(found);
        } else if (allShops.length > 0) {
          setActiveShop(allShops[0]);
          localStorage.setItem('current_shop_id', allShops[0].id);
        }
      } catch (e) {
        console.error('Failed to fetch shops', e);
      }
    };
    fetchShops();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (shop: Shop) => {
    localStorage.setItem('current_shop_id', shop.id);
    setActiveShop(shop);
    setIsOpen(false);
    window.location.href = '/dashboard';
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-1 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <img src={logo} alt="Menukit Logo" className="h-7 sm:h-8 w-auto object-contain shrink-0" />
          <div className="min-w-0 text-left flex flex-col items-start justify-center">
            <span className="font-heading font-black text-xs sm:text-[14px] leading-tight text-slate-900 dark:text-white truncate max-w-[110px] sm:max-w-[140px]">
              {isCreateNew ? 'New Shop' : activeShop?.name || 'Select Shop'}
            </span>
            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Merchant Portal</span>
          </div>
        </div>
        <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1.5" />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 min-w-[230px] w-max max-w-[280px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[100] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
          <div className="overflow-y-auto custom-scrollbar max-h-[60vh]">
            {ownedShops.length > 0 && (
              <div className="py-2">
                <h4 className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  My Shops
                </h4>
                {ownedShops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => handleSelect(shop)}
                    className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className={cn(
                      "text-[13px] truncate",
                      activeShop?.id === shop.id ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"
                    )}>
                      {shop.name}
                    </span>
                    {activeShop?.id === shop.id && <Check size={14} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {staffShops.length > 0 && (
              <div className="py-2 border-t border-slate-100 dark:border-slate-700/50">
                <h4 className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Shared With Me
                </h4>
                {staffShops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => handleSelect(shop)}
                    className="w-full text-left px-4 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className={cn(
                      "text-[13px] truncate",
                      activeShop?.id === shop.id ? "font-bold text-slate-900 dark:text-white" : "font-medium text-slate-600 dark:text-slate-300"
                    )}>
                      {shop.name}
                    </span>
                    {activeShop?.id === shop.id && <Check size={14} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
            
            {staffShops.length === 0 && (
              <div className="py-2 border-t border-slate-100 dark:border-slate-700/50">
                <h4 className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Shared With Me
                </h4>
                <div className="px-4 py-1 text-[13px] text-slate-400 italic font-medium">
                  No shared shops
                </div>
              </div>
            )}
          </div>

          {ownedShops.length === 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/shop-setup', { state: { createNew: true } });
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Shop</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
