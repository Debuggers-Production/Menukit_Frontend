import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api } from '@/services/api';
import { Shop } from '@/types';
import { PublicSchemeModal } from '@/components/public/PublicSchemeModal';

export function PublicSchemesPage() {
  const { id } = useParams<{ id: string }>();
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

  return (
    <PublicSchemeModal
      isOpen={true}
      isFullPage={true}
      onClose={() => navigate(`/shop/${id}`)}
      shopId={id!}
      shop={shop || undefined}
      primaryColor={shop?.brand_color || '#f97316'}
    />
  );
}

export default PublicSchemesPage;
