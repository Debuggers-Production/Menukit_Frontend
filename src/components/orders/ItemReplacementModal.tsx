import { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertCircle, ArrowRight, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useShopStore } from '@/store/shopStore';
import { MenuItem } from '@/types';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

interface ItemReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
  itemToReplace: any | null;
  onReplaced: (updatedOrder: any) => void;
  onPromptKot?: (order: any, previousItem?: any, newItem?: any) => void;
}

const REPLACEMENT_REASONS = [
  { id: 'Customer changed item preference', name: 'Customer changed item preference' },
  { id: 'Item out of stock / ingredient unavailable', name: 'Item out of stock / ingredient unavailable' },
  { id: 'Different portion or spice level requested', name: 'Different portion or spice level requested' },
  { id: 'Chef recommendation / Kitchen change', name: 'Chef recommendation / Kitchen change' },
  { id: 'Billing / entry error', name: 'Billing / entry error' },
  { id: 'custom', name: 'Other / Custom Reason...' },
];

export function ItemReplacementModal({
  isOpen,
  onClose,
  order,
  itemToReplace,
  onReplaced,
  onPromptKot,
}: ItemReplacementModalProps) {
  const { menuItems, categories } = useShopStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>(REPLACEMENT_REASONS[0].id);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryOptions = useMemo(() => [
    { id: 'all', name: 'All Categories' },
    ...(categories || []).map((c: any) => ({ id: c.id, name: c.name }))
  ], [categories]);

  // Sync default quantity when itemToReplace changes
  useMemo(() => {
    if (itemToReplace) {
      setQuantity(itemToReplace.quantity || 1);
      setSelectedMenuItem(null);
      setSearchQuery('');
      setReason(REPLACEMENT_REASONS[0].id);
      setCustomReason('');
    }
  }, [itemToReplace]);

  const availableItems = useMemo(() => {
    return (menuItems || []).filter((it: MenuItem) => {
      if (it.is_available === false) return false;
      if (selectedCategory !== 'all' && it.category_id !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (it.name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  if (!itemToReplace || !order) return null;

  const oldTotal = Number(itemToReplace.price || 0) * Number(itemToReplace.quantity || 1);
  const newUnitPrice = Number(selectedMenuItem?.price || 0);
  const newTotal = newUnitPrice * quantity;
  const priceDiff = newTotal - oldTotal;

  const handleSubmit = async () => {
    if (!selectedMenuItem) {
      toast.error('Please select a replacement menu item');
      return;
    }
    if (quantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const finalReason = reason === 'custom' ? (customReason.trim() || 'Item replaced') : reason;

    setIsSubmitting(true);
    const toastId = toast.loading('Replacing item on order...');
    try {
      const payload = {
        new_menu_item_id: selectedMenuItem.id,
        name: selectedMenuItem.name,
        quantity: quantity,
        price: Number(selectedMenuItem.price || 0),
        variant_info: null,
        addons_info: null,
        reason: finalReason,
      };

      const res = await api.post(`/orders/${order.id}/items/${itemToReplace.id}/replace`, payload);
      const updatedOrder = res.data;
      toast.success(`Item replaced with ${selectedMenuItem.name}`, { id: toastId });
      onReplaced(updatedOrder);
      onClose();

      if (onPromptKot) {
        const cancelledPrevItem = {
          ...itemToReplace,
          is_cancelled: true,
          cancellation_reason: finalReason,
        };
        const newlyAddedItem = (updatedOrder.items || []).find((it: any) => !it.is_cancelled && it.menu_item_id === selectedMenuItem.id) || {
          menu_item_id: selectedMenuItem.id,
          name: selectedMenuItem.name,
          quantity: quantity,
          price: Number(selectedMenuItem.price || 0),
          category_id: selectedMenuItem.category_id,
        };
        onPromptKot(updatedOrder, cancelledPrevItem, newlyAddedItem);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to replace item', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Replace Order Item"
      className="max-w-2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Source Item Context Banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Item To Be Replaced:
            </span>
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{itemToReplace.name}</span>
              <span className="text-xs px-1.5 py-0.5 bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 rounded font-black">
                ×{itemToReplace.quantity || 1}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Total</span>
            <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
              ₹{oldTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Step 1: Search & Filter Replacement Menu Items */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search replacement item by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="w-44 shrink-0">
              <SearchableSelect
                options={categoryOptions}
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                placeholder="All Categories"
                showSearch={false}
                className="h-9 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-2 max-h-48 overflow-y-auto space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
            {availableItems.length > 0 ? (
              availableItems.map((item: MenuItem) => {
                const isSelected = selectedMenuItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedMenuItem(item)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.food_type === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <span className="font-bold truncate">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold">₹{Number(item.price || 0).toFixed(2)}</span>
                      {isSelected && <Check size={14} className="shrink-0" />}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                No matching menu items found
              </div>
            )}
          </div>
        </div>

        {/* Selected Item Controls */}
        {selectedMenuItem && (
          <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Replacement</span>
                <div className="font-bold text-sm text-primary flex items-center gap-1.5">
                  <span>{selectedMenuItem.name}</span>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    (₹{Number(selectedMenuItem.price || 0).toFixed(2)}/pc)
                  </span>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Qty:</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center hover:bg-slate-200"
                >
                  -
                </button>
                <span className="font-black text-xs font-mono min-w-4 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            {/* Price Difference Indicator */}
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="text-slate-500">
                <span>Old: ₹{oldTotal.toFixed(2)}</span>
                <span className="mx-1.5">→</span>
                <span>New: ₹{newTotal.toFixed(2)}</span>
              </div>
              <div className="font-bold font-mono">
                {priceDiff === 0 ? (
                  <span className="text-slate-500">No price change</span>
                ) : priceDiff > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">+₹{priceDiff.toFixed(2)} (Bill Increases)</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400">-₹{Math.abs(priceDiff).toFixed(2)} (Bill Decreases)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reason Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Replacement Reason
          </label>
          <SearchableSelect
            options={REPLACEMENT_REASONS}
            value={reason}
            onChange={(val) => setReason(val)}
            placeholder="Select replacement reason..."
            showSearch={false}
            className="h-9 rounded-lg text-xs"
          />

          {reason === 'custom' && (
            <Input
              placeholder="Enter custom replacement reason..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="text-xs h-9 mt-1"
              autoFocus
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-9"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={!selectedMenuItem}
            isLoading={isSubmitting}
            onClick={handleSubmit}
            className="text-xs h-9 font-bold bg-primary hover:bg-primary-600 text-white"
            leftIcon={<RefreshCw size={14} />}
          >
            Confirm & Replace Item
          </Button>
        </div>
      </div>
    </Modal>
  );
}
