import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Eye, PenTool, CheckCircle2, AlertCircle, RotateCcw,
  Check, Store, MessageSquareQuote, Shield, Minimize2, Maximize2, X, Type
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { ChalkboardModal } from '@/components/chalkboard/ChalkboardModal';
import { resolveChalkboardMessage } from '@/components/chalkboard/chalkboardUtils';
import { MiniAFrame } from '@/components/chalkboard/AFrameIllustration';
import { HeaderActions } from '@/components/HeaderActions';

export function ChalkboardPage() {
  const { shop, setShop } = useShopStore();
  const { setTitle: setHeaderTitle } = useHeaderStore();

  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isMobileFloatingOpen, setIsMobileFloatingOpen] = useState<boolean>(true);
  const [isMobileFloatingMinimized, setIsMobileFloatingMinimized] = useState<boolean>(false);

  useEffect(() => {
    setHeaderTitle('Chalkboard Sign', 'Configure your restaurant sidewalk A-frame chalkboard sign.');

    const fetchChalkboard = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shops/me/chalkboard');
        if (res.data) {
          setIsEnabled(res.data.is_enabled ?? true);
          setTitle(res.data.title ?? '');
          setMessage(res.data.message ?? '');
        }
      } catch (err) {
        console.error('Failed to fetch chalkboard settings', err);
        // If shop object already has it
        if (shop?.chalkboard) {
          setIsEnabled(shop.chalkboard.is_enabled ?? true);
          setTitle(shop.chalkboard.title ?? '');
          setMessage(shop.chalkboard.message ?? '');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchChalkboard();
  }, [setHeaderTitle, shop]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await api.put('/shops/me/chalkboard', {
        is_enabled: isEnabled,
        title: title.trim() ? title.trim() : null,
        message: message.trim() ? message.trim() : null,
      });

      if (shop) {
        setShop({
          ...shop,
          chalkboard: res.data,
        });
      }

      toast.success('Chalkboard settings saved successfully!');
    } catch (err: any) {
      console.error('Failed to save chalkboard settings', err);
      toast.error(err.response?.data?.detail || 'Failed to save chalkboard settings');
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (presetTitle: string, presetText: string) => {
    setTitle(presetTitle);
    setMessage(presetText);
    toast.success('Preset applied! Click Save to publish.');
  };

  const MAX_CHARS = 180;
  const MAX_LINES = 6;

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value.replace(/\r\n/g, '\n');
    let wasClipped = false;

    // Check line limit
    const lines = val.split('\n');
    if (lines.length > MAX_LINES) {
      val = lines.slice(0, MAX_LINES).join('\n');
      wasClipped = true;
    }

    // Check character limit
    if (val.length > MAX_CHARS) {
      val = val.slice(0, MAX_CHARS);
      wasClipped = true;
    }

    if (wasClipped) {
      toast.error(`Chalkboard message is limited to ${MAX_CHARS} characters and ${MAX_LINES} lines.`);
    }

    setMessage(val);
  };

  const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const currentLines = message.split('\n').length;
      if (currentLines >= MAX_LINES) {
        e.preventDefault();
        toast.error(`Maximum ${MAX_LINES} lines allowed on the chalkboard.`);
      }
    }
  };

  const lineCount = message ? message.split('\n').length : 0;
  const isAtCharLimit = message.length >= MAX_CHARS;
  const isAtLineLimit = lineCount >= MAX_LINES;

  const resolvedPreviewMessage = resolveChalkboardMessage(message, 'Siva');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header Actions for Top Bar */}
      <HeaderActions>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-1.5 font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eye size={14} />
            Preview Chalkboard
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            size="sm"
            className="gap-1.5 font-bold shadow-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Changes
          </Button>
        </div>
      </HeaderActions>

      {/* Mobile-Only Action Bar */}
      <div className="flex sm:hidden items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPreviewOpen(true)}
          className="gap-1.5 font-bold text-xs"
        >
          <Eye size={13} />
          Preview
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          size="sm"
          className="gap-1.5 font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Control Card */}
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <PenTool size={18} className="text-amber-500" />
                Chalkboard Controls
              </CardTitle>
              <CardDescription>
                Configure whether the floating A-frame sign appears on the public menu and what text it displays.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable / Disable Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                    Enable Chalkboard Sign on Public Menu
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    When active, a miniature floating A-frame sign sits beside your menu on the right.
                  </span>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={setIsEnabled}
                />
              </div>

              {/* Board Header Title Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Type size={16} className="text-amber-500" />
                    Board Header Title
                  </label>
                  <span className="text-xs text-slate-400 font-medium">
                    {title.length}/30 characters
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="TODAY'S SPECIAL (Default if left empty)"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="text-[12px] text-slate-500 dark:text-slate-400">
                  The prominent banner heading written in chalk at the top of your sidewalk board. If left blank, it automatically displays <b>&quot;TODAY&apos;S SPECIAL&quot;</b>.
                </p>
              </div>

              {/* Message Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <MessageSquareQuote size={16} className="text-amber-500" />
                    Custom Chalkboard Message
                  </label>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                    isAtCharLimit || isAtLineLimit
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
                      : message.length >= MAX_CHARS * 0.8 || lineCount >= MAX_LINES - 1
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {message.length}/{MAX_CHARS} chars • {lineCount}/{MAX_LINES} lines
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={message}
                  maxLength={MAX_CHARS}
                  onChange={handleMessageChange}
                  onKeyDown={handleMessageKeyDown}
                  placeholder={`Welcome to our hotel!\nToday's special:\nChicken Biryani + Fresh Lime\nOnly ₹199`}
                  className={`w-full p-4 rounded-2xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm leading-relaxed focus:outline-none focus:ring-2 font-sans resize-none transition-all placeholder:text-slate-400 ${
                    isAtCharLimit || isAtLineLimit
                      ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-amber-500'
                  }`}
                />
                <div className="flex items-center justify-between text-[12px] text-slate-500 dark:text-slate-400">
                  <span>Tip: Formatted for sidewalk boards (max {MAX_LINES} lines & {MAX_CHARS} characters).</span>
                  {(isAtCharLimit || isAtLineLimit) && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center gap-1">
                      <AlertCircle size={12} /> Limit reached
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Preset Templates */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                  Quick Message Templates
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("TODAY'S SPECIAL", "Welcome to our hotel!\nToday's special:\nChicken Biryani + Fresh Lime\nOnly ₹199")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                  >
                    🍗 Today's Special Combo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("WEEKEND SPECIAL", "Weekend Bonanza!\nFlat 20% OFF on all Starters.\nOrder now!")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                  >
                    🔥 Weekend 20% Promo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("CHEF'S PICK", "Chef's Recommendation:\nPaneer Butter Masala\nwith Garlic Naan")}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                  >
                    🍲 Chef's Choice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle('');
                      setMessage('');
                      toast.success('Cleared to dynamic customer greeting mode!');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    ✨ Clear (Dynamic "Hi, {`{Name}`}!")
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fallback Logic Explanation Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 text-slate-800 dark:text-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle size={17} />
              Automatic Dynamic Greeting Logic
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              If you leave the message field empty, the public menu resolves the greeting automatically at runtime:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-xs">
                <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-0.5">1. Custom Message</span>
                <span className="text-slate-500">Your custom text entered above is displayed.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-xs">
                <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-0.5">2. Logged-in User</span>
                <span className="text-slate-500">Empty message resolves to: <b className="text-slate-800 dark:text-slate-200">"Hi, Siva!"</b></span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-xs">
                <span className="font-extrabold text-amber-600 dark:text-amber-400 block mb-0.5">3. Guest Fallback</span>
                <span className="text-slate-500">If unauthenticated, safely displays: <b className="text-slate-800 dark:text-slate-200">"Hi!"</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Board Miniature Preview (Sticky on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:sticky lg:top-6 self-start space-y-6">
          <Card className="border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Sidewalk Sign Look</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {isEnabled ? 'Live on Menu' : 'Disabled'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-36 h-44 drop-shadow-xl hover:scale-105 transition-transform cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
                <MiniAFrame className="w-full h-full" title={title} />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Physical Miniature A-Frame Sign
                </p>
                <p className="text-[11px] text-slate-500">
                  Floats on the right side with a gentle bobbing animation. Tapping it opens the fullscreen chalkboard experience.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full gap-2 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <Eye size={15} />
                Test Writing Animation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Floating Preview Window (< lg) */}
      <div className="lg:hidden">
        {isMobileFloatingOpen && !isMobileFloatingMinimized ? (
          <div className="fixed bottom-20 right-3 z-40 w-52 sm:w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-500/30 dark:border-amber-500/20 p-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
            {/* Header with Title & Controls */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Sign Preview</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {isEnabled ? 'Live' : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMobileFloatingMinimized(true)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Minimize preview"
                  aria-label="Minimize preview"
                >
                  <Minimize2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileFloatingOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close preview"
                  aria-label="Close preview"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Board Miniature Visual */}
            <div className="flex flex-col items-center justify-center pt-1 pb-2">
              <div
                className="w-28 h-36 drop-shadow-xl hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                onClick={() => setIsPreviewOpen(true)}
              >
                <MiniAFrame className="w-full h-full" title={title} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 text-center font-medium">
                Tap sign to preview full board
              </p>
            </div>

            {/* Quick Test Animation Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="w-full h-7 text-[11px] gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl"
            >
              <Eye size={12} />
              Test Animation
            </Button>
          </div>
        ) : (
          /* Minimized Floating Pill Button */
          <button
            type="button"
            onClick={() => {
              setIsMobileFloatingOpen(true);
              setIsMobileFloatingMinimized(false);
            }}
            className="fixed bottom-20 right-3 z-40 px-3 py-2 rounded-full bg-slate-900/90 dark:bg-amber-500/95 text-white dark:text-slate-950 shadow-xl border border-white/20 dark:border-amber-400/40 backdrop-blur-md flex items-center gap-2 text-xs font-bold active:scale-95 transition-transform animate-in fade-in cursor-pointer"
            title="Open Live Chalkboard Preview"
            aria-label="Open Live Chalkboard Preview"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <Store size={14} />
            </div>
            <span>Sign Preview</span>
            <Maximize2 size={12} className="opacity-80 ml-0.5" />
          </button>
        )}
      </div>

      {/* Interactive Fullscreen Chalkboard Modal for Live Admin Preview */}
      <ChalkboardModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        message={resolvedPreviewMessage}
        title={title}
      />
    </div>
  );
}
