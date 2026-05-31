import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Palette, LayoutTemplate, Type, Eye } from 'lucide-react';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function ThemeCustomizePage() {
  const { shop, setShop } = useShopStore();
  const [isLoading, setIsLoading] = useState(false);
  
  // Default theme if shop doesn't have one
  const defaultTheme = {
    theme: 'light',
    primary_color: '#f97316',
    secondary_color: '#1e293b',
    font_family: 'Inter',
    layout: 'grid',
    banner_style: 'hero'
  };

  const [formData, setFormData] = useState(defaultTheme);

  useEffect(() => {
    if (shop?.theme) {
      setFormData({
        theme: shop.theme.theme,
        primary_color: shop.theme.primary_color,
        secondary_color: shop.theme.secondary_color,
        font_family: shop.theme.font_family,
        layout: shop.theme.layout,
        banner_style: shop.theme.banner_style
      });
    }
  }, [shop]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.put('/shops/me/theme', formData);
      toast.success('Theme settings updated!');
      // Update store
      if (shop) {
        setShop({ ...shop, theme: res.data });
      }
    } catch (error: any) {
      toast.error('Failed to save theme settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fontOptions = ['Inter', 'Outfit', 'Roboto', 'Playfair Display', 'Poppins'];
  const colorPresets = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#eab308'];

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-8rem)] animate-fade-in">
      {/* Controls */}
      <div className="w-full lg:w-1/3 flex flex-col h-full overflow-y-auto pr-2 no-scrollbar">
        <div className="mb-6">
          <h2 className="text-2xl font-bold font-heading">Customize Theme</h2>
          <p className="text-slate-500">Design your customer-facing menu.</p>
        </div>

        <form id="theme-form" onSubmit={handleSubmit} className="space-y-6 pb-20">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center"><Palette size={16} className="mr-2"/> Colors & Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Color Mode</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleChange('theme', 'light')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.theme === 'light' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('theme', 'dark')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.theme === 'dark' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Primary Color</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {colorPresets.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleChange('primary_color', color)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.primary_color === color ? 'border-slate-900 scale-110 dark:border-white' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-sm text-slate-500 uppercase font-mono">{formData.primary_color}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center"><Type size={16} className="mr-2"/> Typography</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="text-sm font-medium mb-2 block">Font Family</label>
              <select
                value={formData.font_family}
                onChange={(e) => handleChange('font_family', e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-slate-900"
              >
                {fontOptions.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center"><LayoutTemplate size={16} className="mr-2"/> Layout Style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Menu View</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChange('layout', 'grid')}
                    className={`border-2 rounded-xl p-3 text-left transition-colors ${formData.layout === 'grid' ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-sm"></div>
                      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-sm"></div>
                    </div>
                    <span className="text-sm font-medium block text-center mt-2">Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('layout', 'list')}
                    className={`border-2 rounded-xl p-3 text-left transition-colors ${formData.layout === 'list' ? 'border-primary bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  >
                    <div className="space-y-1 mb-2">
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-sm w-full"></div>
                      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-sm w-full"></div>
                    </div>
                    <span className="text-sm font-medium block text-center mt-2">List</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="sticky bottom-0 left-0 w-full pt-4 pb-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-auto">
          <Button form="theme-form" type="submit" className="w-full" isLoading={isLoading} leftIcon={<Save size={18} />}>
            Save Theme Settings
          </Button>
        </div>
      </div>

      {/* Live Preview Pane */}
      <div className="w-full lg:w-2/3 h-[600px] lg:h-full rounded-3xl border-8 border-slate-800 bg-slate-800 overflow-hidden relative shadow-2xl flex flex-col shrink-0">
        <div className="h-6 w-full bg-slate-800 flex justify-center items-center shrink-0">
          <div className="w-20 h-4 bg-slate-900 rounded-b-xl"></div>
        </div>
        
        {/* The actual preview frame */}
        <div 
          className="flex-1 w-full bg-white overflow-y-auto no-scrollbar relative"
          style={{ 
            backgroundColor: formData.theme === 'dark' ? '#0f172a' : '#f8fafc',
            color: formData.theme === 'dark' ? '#f8fafc' : '#0f172a',
            fontFamily: formData.font_family
          }}
        >
          {/* Mock Public Header */}
          <div className="relative">
            {shop?.banner_url ? (
              <img src={shop.banner_url} alt="Banner" className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-slate-200 dark:bg-slate-800"></div>
            )}
            
            <div className="absolute -bottom-10 left-4 flex items-end">
              <div className="w-20 h-20 rounded-xl border-4 border-white dark:border-slate-900 overflow-hidden bg-white dark:bg-slate-800 shadow-md">
                {shop?.logo_url ? (
                  <img src={shop.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">Logo</div>
                )}
              </div>
            </div>
          </div>
          
          <div className="pt-14 px-4 pb-6">
            <h1 className="text-xl font-bold" style={{ color: formData.primary_color }}>
              {shop?.name || 'Restaurant Name'}
            </h1>
            <p className="text-sm opacity-70 mt-1">{shop?.description || 'Delicious food served here.'}</p>
            
            {/* Mock Search & Filter */}
            <div className="mt-6 flex gap-2">
              <div className="flex-1 h-10 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 flex items-center">
                <span className="opacity-40 text-sm">Search menu...</span>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4 overflow-x-hidden">
              <span className="px-4 py-1.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: formData.primary_color }}>All</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 opacity-70">Starters</span>
              <span className="px-4 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 opacity-70">Mains</span>
            </div>
            
            {/* Mock Items based on layout */}
            <div className="mt-6 space-y-6">
              <div>
                <h2 className="font-bold text-lg mb-3">Popular Items</h2>
                <div className={formData.layout === 'grid' ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 ${formData.layout === 'list' ? 'flex h-24' : ''}`}>
                      <div className={`bg-slate-200 dark:bg-slate-700 ${formData.layout === 'list' ? 'w-24 h-full shrink-0' : 'h-24 w-full'}`}></div>
                      <div className="p-3 flex flex-col justify-center flex-1">
                        <h3 className="font-medium text-sm">Sample Dish {i}</h3>
                        <p className="text-xs opacity-60 line-clamp-1 mt-0.5">Delicious ingredients inside.</p>
                        <span className="font-bold mt-2" style={{ color: formData.primary_color }}>₹250</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Overlay to block interaction */}
          <div className="absolute inset-0 z-10 cursor-default"></div>
          
          {/* Floating Action Button mock */}
          <div className="absolute bottom-6 right-4 z-20 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white" style={{ backgroundColor: formData.primary_color }}>
            <Eye size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
