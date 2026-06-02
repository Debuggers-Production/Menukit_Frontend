import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus, Tag, Trash2, Edit2, ToggleLeft, ToggleRight, Calendar, Percent,
  DollarSign, ShoppingBag, Layers, Clock, CheckCircle2, AlertCircle, Timer, Sparkles, X
} from 'lucide-react';
import { api } from '@/services/api';
import { Discount, Category, MenuItem } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

type DiscountStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

function getDiscountStatus(d: Discount): DiscountStatus {
  if (!d.is_active) return 'inactive';
  const now = new Date();
  if (d.start_date && new Date(d.start_date) > now) return 'scheduled';
  if (d.end_date && new Date(d.end_date) < now) return 'expired';
  return 'active';
}

const STATUS_CONFIG: Record<DiscountStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: 'Active',
    color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    icon: <CheckCircle2 size={12} />,
  },
  scheduled: {
    label: 'Scheduled',
    color: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    icon: <Timer size={12} />,
  },
  expired: {
    label: 'Expired',
    color: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    icon: <AlertCircle size={12} />,
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    icon: <AlertCircle size={12} />,
  },
};

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Default form ────────────────────────────────────────────────────────────

const defaultForm = {
  title: '',
  description: '',
  discount_type: 'percentage' as 'percentage' | 'flat',
  discount_value: '',
  applies_to: 'all' as 'all' | 'category' | 'items',
  target_ids: [] as string[],
  start_date: '',
  end_date: '',
  is_active: true,
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // Always load categories and items — these are needed for the modal selectors
      const [catRes, itemRes] = await Promise.all([
        api.get('/categories'),
        api.get('/menu-items'),
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
    } catch {
      toast.error('Failed to load categories and items');
    } finally {
      setIsLoading(false);
    }

    // Load discounts separately — if this fails (e.g. migration not run), the page still works
    try {
      const discRes = await api.get('/discounts');
      setDiscounts(discRes.data);
    } catch {
      // Silently ignore — discounts table may not exist yet
    }
  };


  // ── Modal helpers ──────────────────────────────────────────────────────────

  const openModal = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        title: discount.title,
        description: discount.description || '',
        discount_type: discount.discount_type,
        discount_value: discount.discount_value,
        applies_to: discount.applies_to,
        target_ids: discount.target_ids || [],
        start_date: discount.start_date
          ? new Date(discount.start_date).toISOString().slice(0, 16)
          : '',
        end_date: discount.end_date
          ? new Date(discount.end_date).toISOString().slice(0, 16)
          : '',
        is_active: discount.is_active,
      });
    } else {
      setEditingDiscount(null);
      setFormData(defaultForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.discount_value) {
      toast.error('Please fill required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        description: formData.description || null,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null,
        target_ids: formData.applies_to === 'all' ? null : formData.target_ids,
      };

      if (editingDiscount) {
        await api.put(`/discounts/${editingDiscount.id}`, payload);
        toast.success('Discount updated');
      } else {
        await api.post('/discounts', payload);
        toast.success('Discount created');
      }

      setIsModalOpen(false);
      fetchAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save discount');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!discountToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/discounts/${discountToDelete}`);
      toast.success('Discount deleted');
      setDiscounts(discounts.filter(d => d.id !== discountToDelete));
      setDiscountToDelete(null);
    } catch {
      toast.error('Failed to delete discount');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (d: Discount) => {
    try {
      await api.put(`/discounts/${d.id}`, { is_active: !d.is_active });
      setDiscounts(discounts.map(x => x.id === d.id ? { ...x, is_active: !x.is_active } : x));
      toast.success(d.is_active ? 'Discount deactivated' : 'Discount activated');
    } catch {
      toast.error('Failed to update discount');
    }
  };

  const toggleTargetId = (id: string) => {
    setFormData(prev => ({
      ...prev,
      target_ids: prev.target_ids.includes(id)
        ? prev.target_ids.filter(t => t !== id)
        : [...prev.target_ids, id],
    }));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const activeCount = discounts.filter(d => getDiscountStatus(d) === 'active').length;
  const scheduledCount = discounts.filter(d => getDiscountStatus(d) === 'scheduled').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Tag className="text-primary" size={24} />
            Discounts & Offers
          </h2>
          <p className="text-slate-500 mt-1">Create promotions that appear as banners on your public menu.</p>
        </div>
        <Button onClick={() => openModal()} className="shrink-0">
          <Plus size={18} className="mr-2" /> New Offer
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: discounts.length, color: 'bg-slate-50 border-slate-200', textColor: 'text-slate-900' },
          { label: 'Active Now', value: activeCount, color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-700' },
          { label: 'Scheduled', value: scheduledCount, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 sm:p-4 text-center ${s.color}`}>
            <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Discount List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : discounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="text-primary" size={28} />
            </div>
            <h3 className="text-lg font-semibold mb-1">No discounts yet</h3>
            <p className="text-slate-500 text-sm max-w-xs mb-6">
              Create your first offer — it'll appear as a prominent banner when customers scan your QR code.
            </p>
            <Button onClick={() => openModal()}>
              <Plus size={16} className="mr-2" /> Create First Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {discounts.map(d => {
            const status = getDiscountStatus(d);
            const statusCfg = STATUS_CONFIG[status];

            return (
              <Card
                key={d.id}
                className={`transition-all hover:shadow-md ${status === 'expired' || status === 'inactive' ? 'opacity-70' : ''}`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      d.discount_type === 'percentage' ? 'bg-primary/10 text-primary' : 'bg-violet-50 text-violet-600'
                    }`}>
                      {d.discount_type === 'percentage' ? <Percent size={20} /> : <DollarSign size={20} />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{d.title}</h3>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>
                      </div>

                      {d.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-1">{d.description}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          {d.discount_type === 'percentage'
                            ? <><Percent size={11} /> {d.discount_value}% off</>
                            : <><DollarSign size={11} /> ₹{d.discount_value} off</>
                          }
                        </span>
                        <span className="flex items-center gap-1">
                          {d.applies_to === 'all' && <><ShoppingBag size={11} /> All items</>}
                          {d.applies_to === 'category' && <><Layers size={11} /> {(d.target_ids?.length || 0)} categor{(d.target_ids?.length || 0) === 1 ? 'y' : 'ies'}</>}
                          {d.applies_to === 'items' && <><Tag size={11} /> {(d.target_ids?.length || 0)} item{(d.target_ids?.length || 0) === 1 ? '' : 's'}</>}
                        </span>
                        {(d.start_date || d.end_date) && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {d.start_date ? formatDateTime(d.start_date) : 'Now'}
                            {' → '}
                            {d.end_date ? formatDateTime(d.end_date) : 'No end'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleActive(d)}
                        className={`p-2 rounded-lg transition-colors ${
                          d.is_active
                            ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                        }`}
                        title={d.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {d.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => openModal(d)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDiscountToDelete(d.id)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? 'Edit Offer' : 'Create New Offer'}
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Title */}
          <Input
            label="Offer Title *"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Weekend Special 20% Off"
            required
          />

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Description (shown on banner)
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Enjoy 20% off on all items this weekend only!"
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900 min-h-[80px] resize-y"
            />
          </div>

          {/* Discount Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Discount Type *</label>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                {(['percentage', 'flat'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: type })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      formData.discount_type === type
                        ? 'bg-white shadow text-slate-900 dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type === 'percentage' ? <Percent size={13} /> : <DollarSign size={13} />}
                    {type === 'percentage' ? '% Off' : 'Flat Off'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label={formData.discount_type === 'percentage' ? 'Percentage (%) *' : 'Amount (₹) *'}
              type="number"
              step="0.01"
              min="0"
              max={formData.discount_type === 'percentage' ? '100' : undefined}
              value={formData.discount_value}
              onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
              placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
              required
            />
          </div>

          {/* Applies To */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Applies To</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              {([
                { v: 'all', label: 'All Items', icon: <ShoppingBag size={13} /> },
                { v: 'category', label: 'Categories', icon: <Layers size={13} /> },
                { v: 'items', label: 'Items', icon: <Tag size={13} /> },
              ] as const).map(opt => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setFormData({ ...formData, applies_to: opt.v, target_ids: [] })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    formData.applies_to === opt.v
                      ? 'bg-white shadow text-slate-900 dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>

            {/* Category selector */}
            {formData.applies_to === 'category' && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-500">No categories found</p>
                ) : categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleTargetId(cat.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.target_ids.includes(cat.id)
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/50'
                    }`}
                  >
                    {formData.target_ids.includes(cat.id) && <X size={10} />}
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Item selector */}
            {formData.applies_to === 'items' && (
              <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                {menuItems.length === 0 ? (
                  <p className="text-xs text-slate-500">No items found</p>
                ) : menuItems.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                      formData.target_ids.includes(item.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.target_ids.includes(item.id)}
                      onChange={() => toggleTargetId(item.id)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{item.name}</span>
                    <span className="ml-auto text-xs text-slate-400">₹{item.price}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} /> Start Date
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock size={13} /> End Date
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Enable Offer</p>
              <p className="text-xs text-slate-500">Publish this offer to the public menu now</p>
            </div>
            <div
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${formData.is_active ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${formData.is_active ? 'translate-x-6' : ''}`} />
            </div>
          </label>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingDiscount ? 'Update Offer' : 'Create Offer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={!!discountToDelete}
        onClose={() => setDiscountToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Discount"
        message="This offer will be permanently removed and will no longer appear on your public menu."
        confirmText="Delete"
        isLoading={isDeleting}
      />
    </div>
  );
}
