import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Store, Plus, LogOut, Shield } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export function ShopSelectionPage() {
  const [shops, setShops] = useState<{ owned: any[], employed: any[] }>({ owned: [], employed: [] });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      const res = await api.get('/shops/my-shops');
      setShops(res.data);
    } catch (error) {
      console.error("Failed to fetch shops", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectShop = (shopId: string) => {
    localStorage.setItem('current_shop_id', shopId);
    navigate('/dashboard', { replace: true });
  };

  const handleCreateShop = () => {
    // If they have no shop or want to create a new one, we can navigate to shop setup
    // But currently shop_service limits to 1 owned shop. So if they already own one, we should maybe prevent it.
    if (shops.owned.length > 0) {
      alert("You already own a shop. Multi-shop ownership is coming soon!");
      return;
    }
    navigate('/shop-setup?create=true', { state: { createNew: true } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome, {user?.email}</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Select a shop to manage or create a new one.
            </p>
          </div>
          <Button variant="outline" onClick={() => logout()} className="flex items-center">
            <LogOut size={16} className="mr-2" />
            Sign out
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shops.owned.map((shop) => (
            <Card key={shop.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleSelectShop(shop.id)}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {shop.logo_url ? <img src={shop.logo_url} alt="Logo" className="w-16 h-16 rounded-full" /> : <Store size={32} />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{shop.name}</h3>
                  <div className="flex items-center justify-center mt-1 text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">
                    <Shield size={12} className="mr-1" /> Owner
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {shops.employed.map((emp) => (
            <Card key={emp.id} className="hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => handleSelectShop(emp.id)}>
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  {emp.logo_url ? <img src={emp.logo_url} alt="Logo" className="w-16 h-16 rounded-full" /> : <Store size={32} />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{emp.name}</h3>
                  <div className="flex items-center justify-center mt-1 text-xs font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                    Staff Member
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {shops.owned.length === 0 && (
            <Card className="hover:border-primary/50 transition-colors cursor-pointer border-dashed" onClick={handleCreateShop}>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 h-full min-h-[200px]">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                  <Plus size={32} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-600 dark:text-slate-300">Create New Shop</h3>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
