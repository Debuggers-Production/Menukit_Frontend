import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Coins } from 'lucide-react';
import { api } from '@/services/api';
import { Shop } from '@/types';
import { isSchemeEnabledShop } from '@/config/businessCategories';
import { PublicSchemeModal } from '@/components/public/PublicSchemeModal';

export function PublicSchemesPage() {
  const { id, schemeId } = useParams<{ id: string; schemeId?: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    window.scrollTo(0, 0);

    const fetchShop = async () => {
      try {
        const res = await api.get(`/public/shop/${id}`);
        setShop(res.data);
      } catch (err) {
        console.error('Failed to load shop details', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (shop && !isSchemeEnabledShop(shop.category, shop.settings)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center mb-4 shadow-sm">
          <Coins size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Savings Schemes Paused</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
          Savings & festival gift schemes are currently disabled for {shop.name || 'this shop'}.
        </p>
        <button
          onClick={() => navigate(`/shop/${id}`)}
          className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          View Store Menu
        </button>
      </div>
    );
  }

  return (
    <PublicSchemeModal
      isOpen={true}
      isFullPage={true}
      onClose={() => navigate(`/shop/${id}`)}
      shopId={shop?.id || id!}
      shop={shop || undefined}
      primaryColor={shop?.brand_color || '#f97316'}
      routeSchemeId={schemeId}
    />
  );
}

export default PublicSchemesPage;
