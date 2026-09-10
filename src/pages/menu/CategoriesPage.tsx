import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, GripVertical, MenuSquare, Search, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { Category } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageContainer } from '@/components/ui/PageContainer';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { usePermissions } from '@/hooks/usePermissions';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableCategoryItem = ({
  cat,
  onToggleActive,
  onEdit,
  onDelete,
  isDeletingThis,
  canWrite
}: {
  cat: Category;
  onToggleActive: (cat: Category) => void;
  onEdit: (cat: Category) => void;
  onDelete: (id: string) => void;
  isDeletingThis?: boolean;
  canWrite: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="pb-3">
      <Card className={`transition-all ${!cat.is_active ? 'opacity-60' : ''} ${isDragging ? 'shadow-lg border-primary' : ''}`}>
        <CardContent className="p-4 flex items-center gap-4">
          {canWrite && (
            <div {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-2 -ml-2">
              <GripVertical size={20} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{cat.name}</h3>
            <p className="text-xs text-slate-500">{cat.item_count} items</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); if (canWrite) onToggleActive(cat); }}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${cat.is_active
                  ? 'bg-success/10 text-success hover:bg-success/20'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                } ${!canWrite && 'opacity-70 cursor-default'}`}
              disabled={!canWrite}
            >
              {cat.is_active ? 'Active' : 'Hidden'}
            </button>
            {canWrite && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(cat); }}
                  className="p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(cat.id); }}
                  className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                  disabled={isDeletingThis}
                >
                  {isDeletingThis ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export function CategoriesPage() {
  const { categories: rawCategories, setCategories } = useShopStore();
  const categories = Array.isArray(rawCategories) ? rawCategories : [];
  const [isLoading, setIsLoading] = useState(() => categories.length === 0);
  
  // Pagination & Search
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  
  const { canWrite } = usePermissions('menu_categories');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const [formData, setFormData] = useState({ name: '', is_active: true });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query input (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { setTitle } = useHeaderStore();

  useEffect(() => {
    setTitle(`Menu Categories ${categories.length > 0 ? `(${categories.length})` : ''}`, 'Create categories like Starters, Main Course, Drinks.');
  }, [categories.length, setTitle]);

  const fetchCategories = useCallback(async (currentSkip: number | boolean = 0, reset: boolean = false) => {
    const skipVal = typeof currentSkip === 'number' ? currentSkip : 0;
    const isReset = typeof currentSkip === 'boolean' ? currentSkip : reset;

    if (isReset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const params: any = {
        skip: skipVal,
        limit: PAGE_SIZE,
      };
      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      const res = await api.get('/categories', { params });
      const newItems: Category[] = Array.isArray(res.data) ? res.data : (res.data?.items || res.data?.categories || []);
      const serverHasMore = res.headers['x-has-more'] === 'true' || newItems.length === PAGE_SIZE;

      setHasMore(serverHasMore);
      setSkip(skipVal);

      if (isReset) {
        setCategories(newItems);
      } else {
        setCategories((prev) => [...(Array.isArray(prev) ? prev : []), ...newItems]);
      }
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [debouncedSearch, setCategories]);

  useEffect(() => {
    fetchCategories(0, true);
  }, [debouncedSearch, fetchCategories]);

  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      const nextSkip = skip + PAGE_SIZE;
      fetchCategories(nextSkip, false);
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCat(category);
      setFormData({
        name: category.name,
        is_active: category.is_active
      });
    } else {
      setEditingCat(null);
      setFormData({ name: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Category name is required');

    setIsSubmitting(true);
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, formData);
        toast.success('Category updated');
      } else {
        await api.post('/categories', { ...formData, display_order: categories.length });
        toast.success('Category created');
      }
      setIsModalOpen(false);
      fetchCategories(0, true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [singleOtpCode, setSingleOtpCode] = useState('');
  const [isSendingSingleOtp, setIsSendingSingleOtp] = useState(false);
  const [loadingTargetId, setLoadingTargetId] = useState<string | null>(null);

  const handleOpenSingleDeleteModal = async (id: string) => {
    setIsSendingSingleOtp(true);
    setLoadingTargetId(id);
    try {
      const catObj = categories.find(c => c.id === id);
      await api.post(`/categories/request-deletion-otp?target=category_${encodeURIComponent(catObj?.name || 'item')}`);
      toast.success('Deletion OTP sent to your registered email');
      setSingleOtpCode('');
      setCategoryToDelete(id);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP email');
    } finally {
      setIsSendingSingleOtp(false);
      setLoadingTargetId(null);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    if (!singleOtpCode || singleOtpCode.length < 6) {
      return toast.error('Please enter valid 6-digit OTP code');
    }
    setIsDeleting(true);
    try {
      await api.delete(`/categories/${categoryToDelete}?code=${encodeURIComponent(singleOtpCode.trim())}`);
      toast.success('Category deleted successfully');
      setCategories(categories.filter(c => c.id !== categoryToDelete));
      setCategoryToDelete(null);
      setSingleOtpCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP code');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      const newStatus = !cat.is_active;
      await api.put(`/categories/${cat.id}`, { is_active: newStatus });
      setCategories(categories.map(c => c.id === cat.id ? { ...c, is_active: newStatus } : c));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const handleOpenDeleteAllModal = async () => {
    setIsSendingOtp(true);
    try {
      await api.post('/categories/request-deletion-otp?target=categories');
      toast.success('Deletion OTP sent to your registered email');
      setOtpStep(true);
      setOtpCode('');
      setShowDeleteAllConfirm(true);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP email');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!otpCode || otpCode.length < 6) {
      return toast.error('Please enter valid 6-digit OTP code');
    }
    setIsDeletingAll(true);
    try {
      await api.delete(`/categories/all?code=${encodeURIComponent(otpCode.trim())}`);
      setCategories([]);
      setShowDeleteAllConfirm(false);
      setOtpStep(false);
      setOtpCode('');
      toast.success('All categories and their items deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid or expired OTP');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex((item) => item.id === active.id);
      const newIndex = categories.findIndex((item) => item.id === over?.id);

      const newItems = arrayMove(categories, oldIndex, newIndex);
      setCategories(newItems);

      // Prepare order payload
      const order = newItems.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      // Trigger API call to update order
      api.put('/categories/reorder/batch', { order }).catch(() => {
        toast.error('Failed to reorder categories');
        fetchCategories(0, true); // Revert on failure
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      
      <HeaderActions>
        {canWrite && (
          <Button size="sm" onClick={() => openModal()} leftIcon={<Plus size={16} />}>
            New Category
          </Button>
        )}
      </HeaderActions>

      <PageContainer className="pb-24">
        <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-background/95 backdrop-blur-md pb-4 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-6 flex gap-3">
          <div className="w-full sm:max-w-md flex-1">
            <Input
              leftIcon={<Search size={18} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full bg-background"
            />
          </div>
          {categories.length > 0 && canWrite && (
            <button
              onClick={handleOpenDeleteAllModal}
              disabled={isSendingOtp}
              className="flex items-center justify-center gap-2 px-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive font-medium text-sm transition-colors border border-destructive/20 shrink-0"
              title="Delete All Categories"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">{isSendingOtp ? 'Sending OTP...' : 'Delete All'}</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={<MenuSquare size={24} />}
            title={searchQuery ? 'No categories found' : 'No Categories Yet'}
            description={searchQuery ? 'Try adjusting your search terms.' : 'Create categories to organize your menu items (e.g. Starters, Mains, Desserts).'}
            action={
              !searchQuery && canWrite ? (
                <Button onClick={() => openModal()} className="mt-4">
                  <Plus size={16} className="mr-2" />
                  Add Category
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(categories || []).map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {(categories || []).map((cat) => (
                <SortableCategoryItem
                  key={cat.id}
                  cat={cat}
                  onToggleActive={handleToggleActive}
                  onEdit={() => openModal(cat)}
                  onDelete={handleOpenSingleDeleteModal}
                  isDeletingThis={loadingTargetId === cat.id}
                  canWrite={canWrite}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        <InfiniteScrollTrigger
          onIntersect={handleLoadMore}
          isLoading={isLoadingMore}
          hasMore={hasMore}
        />
      </PageContainer>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCat ? "Edit Category" : "Add New Category"}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button size="sm" type="button" onClick={handleSubmit} isLoading={isSubmitting}>Save Category</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Starters, Main Course"
            required
            autoFocus
          />

          <div className="pt-2">
            <Switch
              checked={formData.is_active}
              onChange={(c) => setFormData({ ...formData, is_active: c })}
              label="Visible on public menu"
              description="Turn off to hide this category from your customers"
              className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => {
          if (!isDeleting) {
            setCategoryToDelete(null);
            setSingleOtpCode('');
          }
        }}
        title="Delete Category"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold leading-relaxed">
            ⚠️ WARNING: DELETING THIS CATEGORY WILL PERMANENTLY DELETE ALL MENU ITEMS INSIDE IT. THIS ACTION CANNOT BE UNDONE.
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            A 6-digit deletion verification OTP code has been sent to your email address. Enter the code below to confirm deletion:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter 6-Digit Email OTP
            </label>
            <Input
              value={singleOtpCode}
              onChange={(e) => setSingleOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center font-mono text-lg tracking-[6px] font-bold"
              disabled={isDeleting}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setCategoryToDelete(null);
                setSingleOtpCode('');
              }}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              isLoading={isDeleting}
              disabled={singleOtpCode.length < 6}
              className="flex-1 font-bold"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteAllConfirm}
        onClose={() => {
          if (!isDeletingAll) {
            setShowDeleteAllConfirm(false);
            setOtpStep(false);
            setOtpCode('');
          }
        }}
        title="Delete All Categories"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold leading-relaxed">
            ⚠️ WARNING: DELETING ALL CATEGORIES WILL PERMANENTLY ERASE EVERY CATEGORY AND ALL MENU ITEMS INSIDE THEM. THIS ACTION CANNOT BE UNDONE.
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            A 6-digit deletion verification OTP code has been sent to your email address. Enter the code below to confirm deletion:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Enter 6-Digit Email OTP
            </label>
            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center font-mono text-lg tracking-[6px] font-bold"
              disabled={isDeletingAll}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteAllConfirm(false);
                setOtpStep(false);
                setOtpCode('');
              }}
              disabled={isDeletingAll}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAll}
              isLoading={isDeletingAll}
              disabled={otpCode.length < 6}
              className="flex-1 font-bold"
            >
              Confirm Delete All
            </Button>
          </div>
        </div>
      </Modal>

      {/* FAB for Add Category (Mobile) */}
      {!isModalOpen && createPortal(
        <button
          onClick={() => openModal()}
          className="lg:hidden fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 w-14 h-14 rounded-full bg-primary hover:bg-primary-600 hover:scale-105 shadow-xl flex items-center justify-center text-white transition-all duration-200 cursor-pointer"
        >
          <Plus size={24} />
        </button>,
        document.body
      )}
    </div>
  );
}

