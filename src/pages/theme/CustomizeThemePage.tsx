import { cn } from '@/utils/cn';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { loadGoogleFont } from '@/utils/fontLoader';
import { 
  Palette, Check, Save, Smartphone, Monitor, Layers, Sliders, X, Minimize2, Maximize2, Flame, AppWindow, ZoomIn, ZoomOut, Lock, RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useShopStore } from '@/store/shopStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { api } from '@/services/api';

export function CustomizeThemePage() {
  const navigate = useNavigate();
  const { shop, updateTheme, setShop } = useShopStore();
  const [isSaving, setIsSaving] = useState(false);
  const [subStatus, setSubStatus] = useState<any>(null);
  const { setTitle: setHeaderTitle } = useHeaderStore();

  useEffect(() => {
    setHeaderTitle('Customize Theme');
    api.get('/subscription/current').then(res => setSubStatus(res.data)).catch(console.error);
    
    if (!shop) {
      api.get('/shops/me').then(res => {
        if (res.data?.id) {
          setShop(res.data);
        }
      }).catch(console.error);
    }
  }, [setHeaderTitle, shop, setShop]);

  const isLocked = subStatus && (subStatus.is_expired || (!subStatus.is_all_access && Array.isArray(subStatus.active_modules) && !subStatus.active_modules.includes('custom-theme')));

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
  const [themeScope, setThemeScope] = useState<'public' | 'app' | 'all'>('all');
  const [primaryColor, setPrimaryColor] = useState('#f97316');
  const [discountCardStyle, setDiscountCardStyle] = useState<'modern' | 'minimal' | 'gradient' | 'solid'>('modern');
  const [menuItemStyle, setMenuItemStyle] = useState<'default' | 'elevated' | 'flat'>('default');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [borderRadius, setBorderRadius] = useState<'sharp' | 'smooth' | 'pill'>('smooth');

  useEffect(() => {
    if (shop?.theme) {
      setThemeScope(shop.theme.theme_scope || 'all');
      setPrimaryColor(shop.theme.primary_color || '#f97316');
      setDiscountCardStyle(shop.theme.discount_card_style || 'modern');
      setMenuItemStyle((shop.theme.menu_item_style || 'default') as any);
      setFontFamily(shop.theme.font_family || 'Inter');
      setBorderRadius((shop.theme as any).border_radius || 'smooth');
    }
  }, [shop?.theme]);

  useEffect(() => {
    if (fontFamily) {
      loadGoogleFont(fontFamily);
    }
  }, [fontFamily]);

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
        border_radius: borderRadius,
      });
      toast.success('Theme updated successfully!');
    } catch {
      toast.error('Failed to save theme settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor('#f97316');
    setFontFamily('Inter');
    setBorderRadius('smooth');
    setThemeScope('all');
    setDiscountCardStyle('modern');
    setMenuItemStyle('default');
    toast.success('Reset to default brand theme!');
  };

  const colorPresets = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#0f172a'];
  const fontOptions = ['Inter', 'Outfit', 'Poppins', 'Jakarta Sans', 'Roboto', 'Playfair Display', 'Montserrat', 'Lato', 'Oswald', 'Raleway', 'Nunito', 'Ubuntu', 'Merriweather', 'Noto Sans', 'Bubblegum Sans', 'Fredoka'];
  const radiusClasses: Record<string, string> = {
    sharp: 'rounded-none',
    smooth: 'rounded-lg',
    pill: 'rounded-full',
    '0rem': 'rounded-none',
    '0.5rem': 'rounded-md',
    '0.75rem': 'rounded-xl',
    '1rem': 'rounded-full',
  };

  return (
    <div className="space-y-4 w-full pb-20 animate-fade-in relative">
      {/* Module Lock Banner */}
      {isLocked && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Lock size={16} />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-foreground">Custom Theme Studio Module Locked</h4>
              <p className="text-xs text-muted-foreground">Subscribe to the Custom Theme module or renew your subscription to save brand themes.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/subscription')} className="bg-primary hover:bg-primary/90 text-white shrink-0 text-xs font-bold h-8 px-3 rounded-md shadow-2xs">
            Unlock Module →
          </Button>
        </div>
      )}

      {/* Header Actions */}
      <HeaderActions>
        <div className="flex items-center gap-1.5">
          <Button 
            variant="outline"
            onClick={handleReset}
            size="sm"
            className="h-8 px-3 rounded-md border-border text-foreground gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
          >
            <RotateCcw size={13} />
            Reset
          </Button>
          {!isPiPOpen && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setIsPiPOpen(true); setIsPiPMinimized(false); }}
              className="h-8 px-3 rounded-md gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Smartphone size={13} />
              Preview Theme
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            size="sm"
            className="h-8 px-3 rounded-md gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
          >
            <Save size={13} />
            {isSaving ? 'Saving...' : 'Publish Theme'}
          </Button>
        </div>
      </HeaderActions>

      {/* Mobile-Only Action Bar */}
      <div className="flex lg:hidden items-center justify-between gap-2 p-2.5 bg-card rounded-lg border border-border/80 shadow-2xs shrink-0">
        <Button 
          variant="outline"
          onClick={handleReset}
          size="sm"
          className="h-8 px-3 rounded-md text-xs font-semibold border-border text-foreground gap-1.5"
        >
          <RotateCcw size={13} />
          Reset
        </Button>
        <div className="flex items-center gap-1.5">
          {!isPiPOpen && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => { setIsPiPOpen(true); setIsPiPMinimized(false); }}
              className="h-8 px-3 rounded-md text-xs font-semibold gap-1.5"
            >
              <Smartphone size={13} />
              Preview
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving} 
            size="sm"
            className="h-8 px-3 rounded-md text-xs font-bold shadow-2xs"
          >
            <Save size={13} />
            {isSaving ? 'Saving...' : 'Publish Theme'}
          </Button>
        </div>
      </div>

      {/* System Workspace Tabs Structure */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        
        {/* Navigation Sidebar Controls */}
        <div className="sticky top-0 z-20 md:static py-0.5">
          <div className="flex flex-row md:flex-col gap-1 p-1 bg-card rounded-lg border border-border/80 shadow-2xs overflow-x-auto md:overflow-x-visible shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-2 px-3 h-8.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none cursor-pointer",
                activeTab === 'branding' 
                  ? "bg-primary text-white shadow-2xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Palette size={13} />
              Identity & Branding
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('geometry')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-2 px-3 h-8.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none cursor-pointer",
                activeTab === 'geometry' 
                  ? "bg-primary text-white shadow-2xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sliders size={13} />
              Visual Geometry
            </button>
            
            <button
              type="button"
              onClick={() => setActiveTab('visibility')}
              className={cn(
                "flex items-center justify-center md:justify-start gap-2 px-3 h-8.5 rounded-md text-xs font-bold transition-all whitespace-nowrap flex-1 md:flex-none cursor-pointer",
                activeTab === 'visibility' 
                  ? "bg-primary text-white shadow-2xs" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers size={13} />
              Scope Visibility
            </button>
          </div>
        </div>

        {/* Dynamic Context Card Content Panes */}
        <div className="md:col-span-3">
          
          {/* TAB 1: BRANDING & TYPOGRAPHY */}
          {activeTab === 'branding' && (
            <div className="bg-card border border-border/80 rounded-lg p-5 shadow-2xs space-y-5 animate-fade-in">
              <div className="pb-3 border-b border-border/80">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Palette size={15} className="text-primary" /> Identity & Core Branding
                </h3>
                <p className="text-xs text-muted-foreground">Adjust font hierarchies and primary brand colors.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Primary Brand Accent</label>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {colorPresets.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPrimaryColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-md transition-transform hover:scale-105 flex items-center justify-center cursor-pointer shadow-2xs",
                          primaryColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "border border-border"
                        )}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {primaryColor === color && <Check size={14} className="text-white drop-shadow-xs" strokeWidth={3} />}
                      </button>
                    ))}
                    <div className="relative w-8 h-8 rounded-md border border-dashed border-border flex items-center justify-center bg-muted/40 group cursor-pointer overflow-hidden shadow-2xs" title="Custom color">
                      <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer scale-150" />
                      <Palette size={14} className="text-muted-foreground group-hover:text-foreground" />
                    </div>
                    <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground ml-auto bg-muted px-2.5 py-1 rounded-md border border-border/60">
                      {primaryColor}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/80">
                  <label className="text-xs font-bold text-foreground block">Global Font Family</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {fontOptions.map(font => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setFontFamily(font)}
                        className={cn(
                          "p-2.5 text-left border rounded-md text-xs font-semibold flex items-center justify-between transition-all cursor-pointer",
                          fontFamily === font 
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" 
                            : "border-border/80 bg-card text-foreground hover:border-border hover:bg-muted/30"
                        )}
                        style={{ fontFamily: font }}
                      >
                        <span className="truncate">{font}</span>
                        <span className="text-[10px] opacity-40 shrink-0 ml-1">Aa</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL GEOMETRY */}
          {activeTab === 'geometry' && (
            <div className="bg-card border border-border/80 rounded-lg p-5 shadow-2xs space-y-5 animate-fade-in">
              <div className="pb-3 border-b border-border/80">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sliders size={15} className="text-primary" /> Visual Geometry Models
                </h3>
                <p className="text-xs text-muted-foreground">Determine component spacing and layout contours.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground block">Card Edge Contour (Border Radius)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['sharp', 'smooth', 'pill'] as const).map(radius => (
                      <button
                        key={radius}
                        type="button"
                        onClick={() => setBorderRadius(radius)}
                        className={cn(
                          "h-8.5 px-3 text-xs font-bold border capitalize rounded-md transition-all cursor-pointer",
                          borderRadius === radius 
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" 
                            : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        {radius}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/80">
                  <label className="text-xs font-bold text-foreground block">Menu Item Card Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'default', label: 'Default' },
                      { id: 'elevated', label: 'Elevated' },
                      { id: 'flat', label: 'Flat Clean' }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMenuItemStyle(item.id as any)}
                        className={cn(
                          "h-8.5 px-3 text-xs font-bold border capitalize rounded-md transition-all cursor-pointer",
                          menuItemStyle === item.id 
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" 
                            : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/80">
                  <label className="text-xs font-bold text-foreground block">Discount Card Style</label>
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
                        className={cn(
                          "p-2.5 border rounded-md text-xs font-semibold text-center transition-all cursor-pointer",
                          discountCardStyle === style.id 
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" 
                            : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/30"
                        )}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCOPE ENVIRONMENT VISIBILITY */}
          {activeTab === 'visibility' && (
            <div className="bg-card border border-border/80 rounded-lg p-5 shadow-2xs space-y-5 animate-fade-in">
              <div className="pb-3 border-b border-border/80">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Layers size={15} className="text-primary" /> Scope Visibility
                </h3>
                <p className="text-xs text-muted-foreground">Select viewports where this theme is deployed.</p>
              </div>

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
                      className={cn(
                        "p-3.5 border text-left rounded-md transition-all flex items-start gap-3 relative cursor-pointer",
                        isSelected 
                          ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] ring-1 ring-primary/30" 
                          : "border-border/80 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-md shrink-0 border",
                        isSelected ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border"
                      )}>
                        <Icon size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground mb-0.5">{scope.title}</h4>
                        <p className="text-[11px] text-muted-foreground leading-tight">{scope.desc}</p>
                      </div>
                      {isSelected && <div className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Micro-Sized Draggable PiP Preview Overlay */}
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
          className={cn(
            "z-50 bg-card rounded-lg border border-border shadow-2xl flex flex-col overflow-hidden select-none transition-shadow",
            isPiPMinimized ? 'w-32 h-9' : 'w-[160px] h-[270px]'
          )}
        >
          {/* Top Micro Drag Bar */}
          <div className="h-7 bg-muted/60 px-2 flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing border-b border-border">
            <span className="text-[8px] text-foreground font-bold uppercase tracking-wider flex items-center gap-0.5">
              <Smartphone size={8} className="text-primary" /> Live
            </span>
            <div className="flex items-center gap-0.5">
              {!isPiPMinimized && (
                <button 
                  type="button" 
                  onClick={() => setIsPiPLarge(!isPiPLarge)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  title={isPiPLarge ? "Zoom Out" : "Zoom In"}
                >
                  {isPiPLarge ? <ZoomOut size={8} /> : <ZoomIn size={8} />}
                </button>
              )}
              <button 
                type="button" 
                onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title={isPiPMinimized ? "Expand Mini-View" : "Minimize Window"}
              >
                {isPiPMinimized ? <Maximize2 size={8} /> : <Minimize2 size={8} />}
              </button>
              <button 
                type="button" 
                onClick={() => setIsPiPOpen(false)}
                className="p-0.5 rounded text-muted-foreground hover:text-rose-500 hover:bg-muted"
              >
                <X size={8} />
              </button>
            </div>
          </div>

          {/* Miniaturized Application Canvas */}
          <div 
            className={cn(
              "flex-1 overflow-y-auto no-scrollbar p-2 space-y-2 bg-background",
              isPiPMinimized ? 'hidden' : 'block'
            )}
            style={{ fontFamily: fontFamily }}
          >
            {/* Logo Bar Header */}
            <div className={cn("p-1.5 border border-border bg-card shadow-3xs", radiusClasses[borderRadius])}>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 flex items-center justify-center text-white font-black text-[6px] shrink-0 transition-all" style={{ backgroundColor: primaryColor, borderRadius: borderRadius === 'sharp' ? '0px' : borderRadius === 'pill' ? '999px' : '4px' }}>
                  {shop?.name?.slice(0, 2).toUpperCase() || 'MK'}
                </div>
                <h3 className="text-[7px] font-bold text-foreground truncate">{shop?.name || 'Menukit'}</h3>
              </div>
            </div>

            {/* Simulated CTA Layout */}
            <button
              type="button"
              className={cn("w-full py-1 text-[7px] font-bold text-white shadow-3xs flex items-center justify-center gap-0.5 transition-all", radiusClasses[borderRadius])}
              style={{ backgroundColor: primaryColor }}
            >
              <Flame size={7} />
              Instant Action
            </button>

            {/* Custom Promo Architecture Selector */}
            <div
              className={cn("p-1.5 border text-[7px] font-semibold transition-all", radiusClasses[borderRadius],
                discountCardStyle === 'modern' ? 'bg-card shadow-3xs border-border/60' :
                discountCardStyle === 'minimal' ? 'bg-card border-border' :
                discountCardStyle === 'gradient' ? 'border-transparent' : 'text-white'
              )}
              style={{
                backgroundColor: discountCardStyle === 'solid' ? primaryColor : undefined,
                backgroundImage: discountCardStyle === 'gradient' ? `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05)` : undefined,
                borderColor: discountCardStyle === 'gradient' ? `${primaryColor}20` : undefined
              }}
            >
              <span className="text-[6px] font-black opacity-80 block truncate">Style: {discountCardStyle}</span>
            </div>

            {/* Simulated Food Matrix Nodes */}
            <div className={cn("p-1 flex items-center gap-1.5 bg-card border border-border shadow-3xs", radiusClasses[borderRadius])}>
              <div className="w-5 h-5 rounded bg-muted shrink-0 flex items-center justify-center text-[5px] text-muted-foreground">Img</div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <h5 className="text-[7px] font-bold text-foreground truncate">Combo Dish</h5>
                <span className="text-[7px] font-black" style={{ color: primaryColor }}>₹199</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
