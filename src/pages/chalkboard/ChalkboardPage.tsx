import React, { useState, useEffect } from 'react';
import { 
  Save, Eye, CheckCircle2, AlertCircle, RotateCcw,
  Check, Store, MessageSquareQuote, Minimize2, Maximize2, X, Type
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { useHeaderStore } from '@/store/useHeaderStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChalkboardModal } from '@/components/chalkboard/ChalkboardModal';
import { resolveChalkboardMessage } from '@/components/chalkboard/chalkboardUtils';
import { MiniAFrame } from '@/components/chalkboard/AFrameIllustration';
import { HeaderActions } from '@/components/HeaderActions';
import { HorizontalScrollContainer } from '@/components/ui/HorizontalScrollContainer';

export function ChalkboardPage() {
  const { shop, setShop } = useShopStore();
  const { setTitle: setHeaderTitle } = useHeaderStore();

  const [isEnabled] = useState<boolean>(true);
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [isMobileFloatingOpen, setIsMobileFloatingOpen] = useState<boolean>(true);
  const [isMobileFloatingMinimized, setIsMobileFloatingMinimized] = useState<boolean>(false);

  useEffect(() => {
    setHeaderTitle('Chalkboard Sign');

    const fetchChalkboard = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shops/me/chalkboard');
        if (res.data) {
          setTitle(res.data.title ?? '');
          setMessage(res.data.message ?? '');
        }
      } catch (err) {
        console.error('Failed to fetch chalkboard settings', err);
        if (shop?.chalkboard) {
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
        is_enabled: true,
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
    <div className="space-y-4 w-full pb-16 animate-fade-in">
      {/* Header Actions for Top Bar */}
      <HeaderActions>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="gap-1.5 font-semibold rounded-md border-border text-xs h-8"
          >
            <Eye size={13} />
            Preview Sign
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            size="sm"
            className="gap-1.5 font-semibold shadow-2xs rounded-md bg-primary hover:bg-primary/90 text-white text-xs h-8"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={13} />
            )}
            Save Changes
          </Button>
        </div>
      </HeaderActions>

      {/* Mobile-Only Action Bar */}
      <div className="flex sm:hidden items-center justify-between gap-2 p-2.5 bg-card rounded-lg border border-border/80 shadow-2xs">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPreviewOpen(true)}
          className="gap-1.5 font-semibold text-xs h-8 rounded-md"
        >
          <Eye size={13} />
          Preview
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          size="sm"
          className="gap-1.5 font-semibold text-xs bg-primary hover:bg-primary/90 text-white h-8 rounded-md"
        >
          {isSaving ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Form Settings */}
        <div className="lg:col-span-2 space-y-4">
          {/* Main Control Container */}
          <div className="space-y-4 bg-card border border-border/80 shadow-2xs rounded-lg p-4 sm:p-5">
            {/* Board Header Title Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Type size={14} className="text-amber-500" />
                  Board Header Title
                </label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {title.length}/30 chars
                </span>
              </div>
              <input
                type="text"
                maxLength={30}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="TODAY'S SPECIAL (Default if left empty)"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-xs sm:text-sm font-medium tracking-wide focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground"
              />
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MessageSquareQuote size={14} className="text-amber-500" />
                  Custom Chalkboard Message
                </label>
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold transition-colors ${
                  isAtCharLimit || isAtLineLimit
                    ? 'bg-destructive/10 text-destructive'
                    : message.length >= MAX_CHARS * 0.8 || lineCount >= MAX_LINES - 1
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
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
                className={`w-full p-3 rounded-md border bg-background text-foreground text-xs sm:text-sm leading-relaxed focus:outline-none focus:ring-1 resize-none transition-all placeholder:text-muted-foreground ${
                  isAtCharLimit || isAtLineLimit
                    ? 'border-destructive focus:ring-destructive'
                    : 'border-input focus:ring-primary focus:border-primary'
                }`}
              />
              {(isAtCharLimit || isAtLineLimit) && (
                <div className="flex justify-end">
                  <span className="text-destructive font-semibold text-[11px] flex items-center gap-1">
                    <AlertCircle size={12} /> Limit reached
                  </span>
                </div>
              )}
            </div>

            {/* Quick Preset Templates */}
            <div className="space-y-1.5 pt-1 border-t border-border/60">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Quick Message Templates
              </label>
              <HorizontalScrollContainer scrollAmount={220} contentClassName="flex gap-1.5 py-0.5 items-center">
                <button
                  type="button"
                  onClick={() => applyPreset("TODAY'S SPECIAL", "Welcome to our hotel!\nToday's special:\nChicken Biryani + Fresh Lime\nOnly ₹199")}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
                >
                  🍗 Special Combo
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("WEEKEND SPECIAL", "Weekend Bonanza!\nFlat 20% OFF on all Starters.\nOrder now!")}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  🔥 Weekend 20% Promo
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("CHEF'S PICK", "Chef's Recommendation:\nPaneer Butter Masala\nwith Garlic Naan")}
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
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
                  className="px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap bg-muted text-muted-foreground border border-border hover:bg-muted/80 hover:text-foreground transition-colors cursor-pointer"
                >
                  ✨ Clear (Dynamic "Hi, {`{Name}`}!")
                </button>
              </HorizontalScrollContainer>
            </div>
          </div>

          {/* Fallback Logic Explanation Card */}
          <div className="p-4 rounded-lg bg-card border border-border/80 text-foreground space-y-2.5 shadow-2xs">
            <div className="flex items-center gap-1.5 font-bold text-primary text-xs sm:text-sm">
              <AlertCircle size={15} />
              Automatic Dynamic Greeting Logic
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you leave the message field empty, the public menu resolves the greeting automatically at runtime:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-md bg-muted/40 border border-border/80 shadow-2xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5 text-[11px]">1. Custom Message</span>
                <span className="text-[11px] text-muted-foreground">Your custom text entered above is displayed on sidewalk sign.</span>
              </div>
              <div className="p-2.5 rounded-md bg-muted/40 border border-border/80 shadow-2xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5 text-[11px]">2. Logged-in User</span>
                <span className="text-[11px] text-muted-foreground">Empty message resolves to: <b className="text-foreground">"Hi, Siva!"</b></span>
              </div>
              <div className="p-2.5 rounded-md bg-muted/40 border border-border/80 shadow-2xs">
                <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5 text-[11px]">3. Guest Fallback</span>
                <span className="text-[11px] text-muted-foreground">If unauthenticated, safely displays: <b className="text-foreground">"Hi!"</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Board Miniature Preview (Sticky on desktop, hidden on mobile) */}
        <div className="hidden lg:block lg:sticky lg:top-6 self-start space-y-4">
          <Card className="border border-border/80 shadow-2xs rounded-lg overflow-hidden bg-card">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Sidewalk Sign Look</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                  Live on Menu
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 flex flex-col items-center justify-center p-5 text-center">
              <div className="w-32 h-40 drop-shadow-md hover:scale-105 transition-transform cursor-pointer" onClick={() => setIsPreviewOpen(true)}>
                <MiniAFrame className="w-full h-full" title={title} />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Physical Miniature A-Frame Sign
                </p>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Floats on the customer menu with gentle bobbing. Tapping it opens the chalkboard sign experience.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full gap-1.5 border-border text-foreground hover:bg-muted text-xs h-8 rounded-md"
              >
                <Eye size={13} />
                Test Writing Animation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Floating Preview Window (< lg) */}
      <div className="lg:hidden">
        {isMobileFloatingOpen && !isMobileFloatingMinimized ? (
          <div className="fixed bottom-20 right-3 z-40 w-52 sm:w-60 bg-card/95 backdrop-blur-md rounded-lg shadow-xl border border-border p-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
            {/* Header with Title & Controls */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="text-xs font-bold text-foreground">Sign Preview</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  {isEnabled ? 'Live' : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMobileFloatingMinimized(true)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Minimize preview"
                  aria-label="Minimize preview"
                >
                  <Minimize2 size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileFloatingOpen(false)}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Close preview"
                  aria-label="Close preview"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            {/* Board Miniature Visual */}
            <div className="flex flex-col items-center justify-center pt-1 pb-2">
              <div
                className="w-24 h-32 drop-shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                onClick={() => setIsPreviewOpen(true)}
              >
                <MiniAFrame className="w-full h-full" title={title} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-center font-medium">
                Tap sign to preview full board
              </p>
            </div>

            {/* Quick Test Animation Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="w-full h-7 text-[11px] gap-1.5 border-border text-foreground hover:bg-muted rounded-md"
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
            className="fixed bottom-20 right-3 z-40 px-3 py-1.5 rounded-md bg-card text-foreground shadow-lg border border-border backdrop-blur-md flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform animate-in fade-in cursor-pointer"
            title="Open Live Chalkboard Preview"
            aria-label="Open Live Chalkboard Preview"
          >
            <Store size={13} className="text-amber-500" />
            <span>Sign Preview</span>
            <Maximize2 size={11} className="opacity-70 ml-0.5" />
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
