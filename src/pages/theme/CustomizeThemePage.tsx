import { useState, useEffect, useRef } from 'react';
import { 
  Palette, Check, Save, Smartphone, Monitor, Layers, Sliders, Sparkles, X, Minimize2, Maximize2, Flame, AppWindow, ZoomIn, ZoomOut 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useShopStore } from '@/store/shopStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useHeaderStore } from '@/store/useHeaderStore';

export function CustomizeThemePage() {
  const { shop, updateTheme } = useShopStore();
  const [isSaving, setIsSaving] = useState(false);
  const setHeaderTitle = useHeaderStore((state) => state.setTitle);

  useEffect(() => {
    setHeaderTitle('Customize Theme');
  }, [setHeaderTitle]);
  
  // Navigation Tabs State
  const [activeTab, setActiveTab] = useState<'branding' | 'geometry' | 'visibility'>('branding');

  // Floating Window States
  const [isPiPOpen, setIsPiPOpen] = useState(true);
  const [isPiPMinimized, setIsPiPMinimized] = useState(false);
  const [isPiPLarge, setIsPiPLarge] = useState(false);
  
  // Draggable Coordinates State
  const [position, setPosition] = useState({ x: window.innerWidth - 200, y: window.innerHeight - 340 });
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; posX: number; posY: number }>({
    isDragging: false, startX: 0, startY: 0, posX: window.innerWidth - 200, posY: window.innerHeight - 340
  });

  // Customization Configuration States
  const [themeScope, setThemeScope] = useState<'public' | 'app' | 'all'>('public');
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [discountCardStyle, setDiscountCardStyle] = useState<'modern' | 'minimal' | 'gradient' | 'solid'>('modern');
  const [menuItemStyle, setMenuItemStyle] = useState<'default' | 'elevated' | 'flat'>('default');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [borderRadius, setBorderRadius] = useState<'sharp' | 'smooth' | 'pill'>('smooth');

  useEffect(() => {
    if (shop?.theme) {
      setThemeScope(shop.theme.theme_scope || 'public');
      setPrimaryColor(shop.theme.primary_color || '#f97316');
      setDiscountCardStyle(shop.theme.discount_card_style || 'modern');
      setMenuItemStyle((shop.theme.menu_item_style || 'default') as any);
      setFontFamily(shop.theme.font_family || 'Inter');
      setBorderRadius((shop.theme as any).border_radius || 'smooth');
    }
  }, [shop?.theme]);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 180),
        y: Math.min(prev.y, window.innerHeight - 320)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Draggable Handler System
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    
    dragRef.current.isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragRef.current.startX = clientX;
    dragRef.current.startY = clientY;
    dragRef.current.posX = position.x;
    dragRef.current.posY = position.y;

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!dragRef.current.isDragging) return;
    if ('touches' in e) e.preventDefault();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;

    const currentWidth = isPiPMinimized ? 130 : 160;
    const currentHeight = isPiPMinimized ? 36 : 270;

    const nextX = Math.max(10, Math.min(dragRef.current.posX + deltaX, window.innerWidth - currentWidth - 10));
    const nextY = Math.max(10, Math.min(dragRef.current.posY + deltaY, window.innerHeight - currentHeight - 10));

    setPosition({ x: nextX, y: nextY });
  };

  const endDrag = () => {
    dragRef.current.isDragging = false;
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', handleDrag);
    document.removeEventListener('touchend', endDrag);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTheme({
        theme_scope: themeScope,
        primary_color: primaryColor,
        secondary_color: '#1e293b',
        discount_card_style: discountCardStyle,
        menu_item_style: menuItemStyle,
        font_family: fontFamily,
        /* border_radius: borderRadius */
      });
      toast.success('Theme updated successfully!');
    } catch {
      toast.error('Failed to save theme settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setThemeScope('public');
    setPrimaryColor('#f97316');
    setDiscountCardStyle('modern');
    setMenuItemStyle('default');
    setFontFamily('Inter');
    setBorderRadius('smooth');
  };

  const colorPresets = ['#f97316', '#3b82f6', '#e11d48', '#10b981', '#8b5cf6', '#000000'];
  const fontOptions = ['Inter', 'Outfit', 'Poppins', 'Jakarta Sans'];

  const radiusClasses = {
    sharp: 'rounded-none',
    smooth: 'rounded-lg',
    pill: 'rounded-2xl'
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-6 pb-28 min-h-[calc(100vh-7rem)] animate-fade-in relative select-none">
      
      {/* ================= HEADER APPLICATION HEADER CONTROLS ================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 shadow-xs gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            Studio Customization Suite
          </h1>
          <p className="text-xs text-slate-500">Configure layout engines, border properties, typography, and brand palettes.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Button 
            variant="outline"
            onClick={handleReset}
            className="flex-1 sm:flex-none border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 gap-2 text-xs font-semibold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Reset
          </Button>
          {!isPiPOpen && (
            <Button 
              variant="outline" 
              onClick={() => { setIsPiPOpen(true); setIsPiPMinimized(false); }}
              className="flex-1 sm:flex-none h-11 px-4 gap-2 text-xs font-semibold uppercase tracking-wider"
            >
              <Smartphone size={15} />
              Open Preview
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="flex-1 sm:flex-none h-11 px-5 gap-2 text-xs font-semibold uppercase tracking-wider shadow-sm"
          >
            <Save size={15} />
            {isSaving ? 'Saving...' : 'Publish Theme'}
          </Button>
        </div>
      </div>

      {/* ================= SYSTEM WORKSPACE TABS STRUCTURE ================= */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Navigation Sidebar Controls */}
        <div className="flex flex-row md:flex-col gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto md:overflow-x-visible shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === 'branding' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Palette size={14} />
            Identity & Branding
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('geometry')}
            className={`flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === 'geometry' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sliders size={14} />
            Visual Geometry
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('visibility')}
            className={`flex items-center justify-center md:justify-start gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-1 md:flex-none ${
              activeTab === 'visibility' 
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers size={14} />
            Scope Visibility
          </button>
        </div>

        {/* Dynamic Context Card Content Panes */}
        <div className="md:col-span-3">
          
          {/* TAB 1: BRANDING & TYPOGRAPHY */}
          {activeTab === 'branding' && (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-fade-in">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Palette size={16} /> Identity & Core Branding
                </CardTitle>
                <CardDescription>Adjust font hierarchies and primary actionable visual styles.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Brand Accent</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {colorPresets.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        className={`w-10 h-10 rounded-full transition-transform hover:scale-105 flex items-center justify-center ${primaryColor === color ? 'ring-4 ring-slate-900 dark:ring-slate-100 ring-offset-2 shadow-sm' : 'border border-slate-200 dark:border-slate-800'}`}
                        style={{ backgroundColor: color }}
                      >
                        {primaryColor === color && <Check size={16} className="text-white drop-shadow-xs" />}
                      </button>
                    ))}
                    <div className="relative w-10 h-10 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-900 group cursor-pointer overflow-hidden">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                      <Palette size={16} className="text-slate-400 group-hover:text-slate-600" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-400 ml-auto bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded">
                      {primaryColor}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Global Font Layout Family</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fontOptions.map(font => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setFontFamily(font)}
                        className={`p-3 text-left border rounded-xl text-xs font-medium flex items-center justify-between ${fontFamily === font ? 'border-slate-900 dark:border-slate-100 bg-slate-50/50 dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800'}`}
                        style={{ fontFamily: font }}
                      >
                        <span>{font}</span>
                        <span className="text-[10px] opacity-40">Aa</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: VISUAL GEOMETRY */}
          {activeTab === 'geometry' && (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-fade-in">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sliders size={16} /> Visual Geometry Models
                </CardTitle>
                <CardDescription>Determine layout architectures and component spacing contours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Card Edge Contour (Border Radius)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sharp', 'smooth', 'pill'] as const).map(radius => (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => setBorderRadius(radius)}
                        className={`py-2 px-3 text-xs font-medium border capitalize rounded-lg ${borderRadius === radius ? 'border-slate-900 dark:border-slate-100 bg-slate-50/50 dark:bg-slate-900 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                      >
                        {radius}
                  </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Discount Feed Layout Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'modern', label: 'Modern Blend' },
                      { id: 'minimal', label: 'Outline Hairline' },
                      { id: 'gradient', label: 'Luminous Blend' },
                      { id: 'solid', label: 'Full Brand Ink' }
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setDiscountCardStyle(style.id as any)}
                        className={`p-3 border rounded-xl text-xs font-medium text-center ${discountCardStyle === style.id ? 'border-slate-900 dark:border-slate-100 bg-slate-50/50 dark:bg-slate-900 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-500'}`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: SCOPE ENVIRONMENT VISIBILITY */}
          {activeTab === 'visibility' && (
            <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs animate-fade-in">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers size={16} /> Client Environment Scope Visibility
                </CardTitle>
                <CardDescription>Determine which app viewports deploy these styles.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'public', title: 'Public Storefront', desc: 'Customer digital menu systems', icon: Smartphone },
                    { id: 'app', title: 'Management Hub', desc: 'Internal workplace admin pages', icon: Monitor },
                    { id: 'all', title: 'Universal Mirror Sync', desc: 'Global configuration across both layers', icon: AppWindow }
                  ].map(scope => {
                    const Icon = scope.icon;
                    const isSelected = themeScope === scope.id;
                    return (
                      <button
                        key={scope.id}
                        type="button"
                        onClick={() => setThemeScope(scope.id as any)}
                        className={`p-4 border text-left rounded-xl transition-all flex items-start gap-3 relative ${isSelected ? 'border-slate-900 bg-slate-50/40 dark:border-slate-100 dark:bg-slate-900 ring-2 ring-slate-950/5' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/30'}`}
                      >
                        <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-0.5">{scope.title}</h4>
                          <p className="text-[11px] text-slate-400 leading-tight">{scope.desc}</p>
                        </div>
                        {isSelected && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* ================= MICRO-SIZED DRAGGABLE PiP PREVIEW OVERLAY ================= */}
      {isPiPOpen && (
        <div 
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          style={{ 
            position: 'fixed', 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            touchAction: 'none',
            transform: `scale(${!isPiPMinimized && isPiPLarge ? 2 : 1})`,
            transformOrigin: 'top left'
          }}
          className={`z-50 bg-slate-950 rounded-[18px] border-2 border-slate-900 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden ring-2 ring-black/5 select-none transition-shadow ${
            isPiPMinimized ? 'w-32 h-9' : 'w-[160px] h-[270px]'
          }`}
        >
          {/* Top Micro Drag Bar */}
          <div className="h-7 bg-slate-900 px-2 flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing border-b border-slate-950">
            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-0.5">
              <Smartphone size={8} className="text-primary" /> Live
            </span>
            <div className="flex items-center gap-0.5">
              {!isPiPMinimized && (
                <button 
                  type="button" 
                  onClick={() => setIsPiPLarge(!isPiPLarge)}
                  className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  title={isPiPLarge ? "Zoom Out" : "Zoom In"}
                >
                  {isPiPLarge ? <ZoomOut size={8} /> : <ZoomIn size={8} />}
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title={isPiPMinimized ? "Expand Mini-View" : "Minimize Window"}
              >
                {isPiPMinimized ? <Maximize2 size={8} /> : <Minimize2 size={8} />}
              </button>
              <button 
                type="button" 
                onClick={() => setIsPiPOpen(false)}
                className="p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
              >
                <X size={8} />
              </button>
            </div>
          </div>

          {/* Miniaturized Application Canvas */}
          <div 
            className={`flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 bg-slate-50 dark:bg-slate-950 ${
              isPiPMinimized ? 'hidden' : 'block'
            }`}
            style={{ fontFamily: fontFamily }}
          >
            {/* Logo Bar Header */}
            <div className={`p-1.5 border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-3xs ${radiusClasses[borderRadius]}`}>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 flex items-center justify-center text-white font-black text-[6px] shrink-0 transition-all" style={{ backgroundColor: primaryColor, borderRadius: borderRadius === 'sharp' ? '0px' : borderRadius === 'pill' ? '999px' : '4px' }}>
                  {shop?.name?.slice(0, 2).toUpperCase() || 'MK'}
                </div>
                <h3 className="text-[7px] font-bold text-slate-800 dark:text-slate-100 truncate">{shop?.name || 'Menukit'}</h3>
              </div>
            </div>

            {/* Simulated CTA Layout */}
            <button
              type="button"
              className={`w-full py-1 text-[7px] font-bold text-white shadow-3xs flex items-center justify-center gap-0.5 transition-all ${radiusClasses[borderRadius]}`}
              style={{ backgroundColor: primaryColor }}
            >
              <Flame size={7} />
              Instant Action
            </button>

            {/* Custom Promo Architecture Selector */}
            <div
              className={`p-1.5 border text-[7px] font-semibold transition-all ${radiusClasses[borderRadius]} ${
                discountCardStyle === 'modern' ? 'bg-white dark:bg-slate-900 shadow-3xs border-slate-100/60 dark:border-slate-900' :
                discountCardStyle === 'minimal' ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700' :
                discountCardStyle === 'gradient' ? 'border-transparent' : 'text-white'
              }`}
              style={{
                backgroundColor: discountCardStyle === 'solid' ? primaryColor : undefined,
                backgroundImage: discountCardStyle === 'gradient' ? `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` : undefined,
                borderColor: discountCardStyle === 'gradient' ? `${primaryColor}20` : undefined
              }}
            >
              <span className="text-[6px] font-black opacity-80 block truncate">Style: {discountCardStyle}</span>
            </div>

            {/* Simulated Food Matrix Nodes */}
            <div className={`p-1 flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-3xs ${radiusClasses[borderRadius]}`}>
              <div className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 shrink-0 flex items-center justify-center text-[5px] text-slate-400">Img</div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <h5 className="text-[7px] font-bold text-slate-800 dark:text-slate-200 truncate">Combo Dish</h5>
                <span className="text-[7px] font-black" style={{ color: primaryColor }}>₹199</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}