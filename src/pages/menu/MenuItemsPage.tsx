import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, Filter, Image as ImageIcon, Star, Flame, LayoutGrid, List, Sparkles, Wand2, Loader2, MessageSquare, Check, RefreshCw, Code, ChevronLeft, ChevronRight, Store, Globe, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { api } from '@/services/api';
import { useShopStore } from '@/store/shopStore';
import { MenuItem, MenuItemVariant, MenuItemAddon } from '@/types';
import { ReviewSummary } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useHeaderStore } from '@/store/useHeaderStore';
import { HeaderActions } from '@/components/HeaderActions';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Lightbox } from '@/components/ui/Lightbox';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { compressImage } from '@/utils/imageCompression';
import { GripVertical } from 'lucide-react';
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
 rectSortingStrategy,
 verticalListSortingStrategy,
 useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { usePermissions } from '@/hooks/usePermissions';

const SortableMenuItem = ({ children, item }: { children: React.ReactNode, item: MenuItem }) => {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: item.id });

 const style = {
 transform: CSS.Transform.toString(transform),
 transition,
 zIndex: isDragging ? 10 : 1,
 position: 'relative'as const,
 };

 return (
 <div ref={setNodeRef} style={style} className={`h-full ${isDragging ? 'opacity-50': ''}`}>
 <div className="absolute top-2 left-2 z-30 touch-none cursor-grab active:cursor-grabbing p-1 bg-background/80 dark:bg-black/50 backdrop-blur-sm rounded-md text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
 <GripVertical size={16} />
 </div>
 {children}
 </div>
 );
};
export function MenuItemsPage() {
 const { menuItems, setMenuItems, categories, setCategories, shop } = useShopStore();
 const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
 const { canWrite } = usePermissions('menu_items');
 const [isLoading, setIsLoading] = useState(() => safeMenuItems.length === 0);
 
 // Pagination
 const [skip, setSkip] = useState(0);
 const [hasMore, setHasMore] = useState(true);
 const [isLoadingMore, setIsLoadingMore] = useState(false);
 const limit = 100;
 
 // Filters
 const [activeTab, setActiveTab] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [specialFilter, setSpecialFilter] = useState<'all'| 'available'| 'not_available'| 'bestseller'| 'chef_special'>('all');
 const [isFabOpen, setIsFabOpen] = useState(false);
 
 // Modal state
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [currentStep, setCurrentStep] = useState(1);
 const [viewMode, setViewMode] = useState<'grid'| 'list'>('grid');
 const [lightboxImage, setLightboxImage] = useState<string | null>(null);

 const [itemToDelete, setItemToDelete] = useState<string | null>(null);
 const [imageToDelete, setImageToDelete] = useState<{itemId: string, imageId: string} | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);
 const [isDeletingAll, setIsDeletingAll] = useState(false);
 const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
 const [autoImageLoadingId, setAutoImageLoadingId] = useState<string | null>(null);
 const [reviewsModal, setReviewsModal] = useState<{ item: MenuItem; summary: ReviewSummary | null } | null>(null);
 const [isLoadingReviews, setIsLoadingReviews] = useState(false);
 
 const [pendingImages, setPendingImages] = useState<File[]>([]);
 const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
 const [searchImagesModal, setSearchImagesModal] = useState<{ item?: MenuItem, name: string, urls: string[] } | null>(null);
 const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
 const [isSavingVariant, setIsSavingVariant] = useState(false);

 // Infinite scroll sentinel
 const sentinelRef = useRef<HTMLDivElement>(null);
 
 const defaultForm = {
 category_id: '',
 name: '',
 description: '',
 price: '',
 offer_price: '',
 online_price: '',
 online_offer_price: '',
 food_types: ['veg'],
 is_bestseller: false,
 is_highlighted: false,
 is_available: true,
 variants: [] as MenuItemVariant[],
 addons: [] as MenuItemAddon[],
 allow_ice_preference: false,
 available_days: [] as string[],
 available_time_presets: [] as string[],
 custom_time_from: '',
 custom_time_to: ''
 };
 const [formData, setFormData] = useState(defaultForm);

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

 useEffect(() => {
 fetchData(true);
 }, [activeTab, searchQuery, specialFilter]);

 const { setTitle } = useHeaderStore();

 useEffect(() => {
 setTitle('Menu Items', 'Add and manage your menus.');
 }, [setTitle]);

 // Infinite scroll: observe sentinel element
 const handleObserver = useCallback(
 (entries: IntersectionObserverEntry[]) => {
 const [entry] = entries;
 if (entry.isIntersecting && hasMore && !isLoadingMore && !isLoading) {
 fetchData(false);
 }
 },
 [hasMore, isLoadingMore, isLoading]
 );

 useEffect(() => {
 const sentinel = sentinelRef.current;
 if (!sentinel) return;
 const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
 observer.observe(sentinel);
 return () => observer.disconnect();
 }, [handleObserver]);

 const fetchData = async (reset = false) => {
 const currentSkip = reset ? 0 : skip;
 if (reset) {
 setIsLoading(true);
 setHasMore(true);
 } else {
 setIsLoadingMore(true);
 }

 try {
 const queryParams = new URLSearchParams({
 skip: currentSkip.toString(),
 limit: limit.toString(),
 });

 if (activeTab !== 'all') {
 queryParams.append('category_id', activeTab);
 }
 if (searchQuery.trim()) {
 queryParams.append('search', searchQuery.trim());
 }
 if (specialFilter !== 'all') {
 queryParams.append('status', specialFilter);
 }

 const [catRes, itemRes] = await Promise.all([
 reset ? api.get('/categories') : Promise.resolve(null),
 api.get(`/menu-items?${queryParams.toString()}`)
 ]);
 
 if (catRes && Array.isArray(catRes.data)) setCategories(catRes.data);
 
 const newItems = Array.isArray(itemRes?.data) ? itemRes.data : [];
 if (newItems.length < limit) {
 setHasMore(false);
 }
 
 if (reset) {
 setMenuItems(newItems);
 setSkip(limit);
 } else {
 setMenuItems(prev => [...(Array.isArray(prev) ? prev : []), ...newItems]);
 setSkip(currentSkip + limit);
 }
 } catch (error) {
 toast.error('Failed to load menu items');
 } finally {
 setIsLoading(false);
 setIsLoadingMore(false);
 }
 };

 const handleViewReviews = async (item: MenuItem) => {
 setReviewsModal({ item, summary: null });
 setIsLoadingReviews(true);
 try {
 const res = await api.get(`/menu-items/${item.id}/reviews`);
 setReviewsModal({ item, summary: res.data });
 } catch {
 toast.error('Failed to load reviews');
 setReviewsModal(null);
 } finally {
 setIsLoadingReviews(false);
 }
 };

 const handleSearchImages = async (item?: MenuItem) => {
 const itemName = item ? item.name : formData.name;
 if (!itemName.trim()) {
 toast.error('Please enter a menu name first to search for images.');
 return;
 }
 const currentId = item ? item.id : 'new';
 if (autoImageLoadingId) return;
 setAutoImageLoadingId(currentId);
 try {
 const res = await api.get(`/menu-items/search-images-by-name?q=${encodeURIComponent(itemName)}`);
 const urls = res.data.urls || [];
 if (urls.length === 0) {
 toast.error('No images found for this item.');
 } else {
 setSearchImagesModal({ item, name: itemName, urls });
 setSelectedImageUrls([]);
 }
 } catch (err: any) {
 toast.error('Could not find an image. Try again.');
 } finally {
 setAutoImageLoadingId(null);
 }
 };

 const handleConfirmImageSelection = async () => {
 if (!searchImagesModal || selectedImageUrls.length === 0) return;
 
 setIsSavingVariant(true);
 try {
 const targetItem = searchImagesModal.item || editingItem;
 
 if (targetItem) {
 let newImages: any[] = [];
 let hasError = false;
 let errorMsg = '';
 
 for (const url of selectedImageUrls) {
 try {
 const res = await api.post(`/menu-items/${targetItem.id}/save-image-url`, { url });
 newImages.push(res.data);
 } catch (e: any) {
 hasError = true;
 errorMsg = e?.response?.data?.detail || 'Failed to process images.';
 break;
 }
 }
 
 if (newImages.length > 0) {
 setMenuItems(safeMenuItems.map(m => {
 if (m.id === targetItem.id) {
 const currentImages = m.images || [];
 return { 
 ...m, 
 image_url: currentImages.length === 0 && newImages.length > 0 ? newImages[0].image_url : m.image_url, 
 thumbnail_url: currentImages.length === 0 && newImages.length > 0 ? newImages[0].thumbnail_url : m.thumbnail_url,
 images: [...currentImages, ...newImages] 
 };
 }
 return m;
 }));
 if (editingItem && editingItem.id === targetItem.id) {
 setEditingItem(prev => {
 if (!prev) return prev;
 return { ...prev, images: [...(prev.images || []), ...newImages] };
 });
 }
 }
 
 if (hasError) {
 if (errorMsg.includes("Could not download") || errorMsg.includes("Failed to save image")) {
 toast.error("That image couldn't be downloaded. Please choose a different image or hit Regenerate.");
 } else {
 toast.error(errorMsg);
 }
 } else {
 toast.success(`Successfully saved ${newImages.length} image(s)!`);
 }
 } else {
 setPendingImageUrls([...pendingImageUrls, ...selectedImageUrls]);
 toast.success(`Added ${selectedImageUrls.length} image(s) to selection`);
 }
 setSearchImagesModal(null);
 } finally {
 setIsSavingVariant(false);
 }
 };

 const handleDragEnd = async (event: DragEndEvent) => {
 const { active, over } = event;

 if (active.id !== over?.id) {
 const oldIndex = filteredItems.findIndex((item) => item.id === active.id);
 const newIndex = filteredItems.findIndex((item) => item.id === over?.id);
 
 if (oldIndex !== -1 && newIndex !== -1) {
 const newFilteredItems = arrayMove(filteredItems, oldIndex, newIndex);
 
 const newMenuItems = safeMenuItems.map(i => ({ ...i }));
 newFilteredItems.forEach((item, index) => {
 const globalItem = newMenuItems.find(i => i.id === item.id);
 if (globalItem) {
 globalItem.display_order = index;
 }
 });
 setMenuItems(newMenuItems);
 
 const order = newFilteredItems.map((item, index) => ({
 id: item.id,
 display_order: index,
 }));
 
 api.put('/menu-items/reorder/batch', { order }).catch(() => {
 toast.error('Failed to reorder items');
 fetchData(true);
 });
 }
 }
 };

 const filteredItems = [...safeMenuItems].sort((a, b) => {
 if (a.is_highlighted && !b.is_highlighted) return -1;
 if (!a.is_highlighted && b.is_highlighted) return 1;
 return (a.display_order || 0) - (b.display_order || 0);
 });

 const openModal = (item?: MenuItem) => {
 if (categories.length === 0) {
 toast.error('Please create a category first');
 return;
 }

 if (item) {
 setEditingItem(item);
 setFormData({
 category_id: item.category_id,
 name: item.name,
 description: item.description || '',
 price: item.price,
 offer_price: item.offer_price || '',
 online_price: item.online_price || item.price || '',
 online_offer_price: item.online_offer_price || item.offer_price || '',
 food_types: item.food_types || [],
 is_bestseller: item.is_bestseller,
 is_highlighted: item.is_highlighted,
 is_available: item.is_available,
 variants: item.variants || [],
 addons: item.addons || [],
 allow_ice_preference: item.allow_ice_preference || false,
 available_days: item.available_days || [],
 available_time_presets: item.available_time_presets || [],
 custom_time_from: item.custom_time_from || '',
 custom_time_to: item.custom_time_to || ''
 });
 } else {
 setEditingItem(null);
 setFormData({ 
 ...defaultForm, 
 category_id: activeTab !== 'all'? activeTab : categories[0]?.id || ''
 });
 }
 setPendingImages([]);
 setPendingImageUrls([]);
 setCurrentStep(1);
 setIsModalOpen(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 
 const hasVariants = formData.variants && formData.variants.length > 0;
 const basePrice = hasVariants ? formData.variants[0].price : formData.price;
 const baseOfferPrice = hasVariants ? formData.variants[0].offer_price : formData.offer_price;
 const baseOnlinePrice = hasVariants ? (formData.variants[0].online_price || formData.variants[0].price) : (formData.online_price || formData.price);
 const baseOnlineOfferPrice = hasVariants ? (formData.variants[0].online_offer_price || formData.variants[0].offer_price) : (formData.online_offer_price || formData.offer_price);
 
 if (currentStep < 4) {
 if (currentStep === 1 && (!formData.name.trim() || !formData.category_id)) {
 toast.error('Please fill required fields');
 return;
 }
 if (currentStep === 2 && !basePrice) {
 toast.error('Please provide a regular price or add variants');
 return;
 }
 setCurrentStep(prev => prev + 1);
 return;
 }

 if (!formData.name.trim() || !basePrice || !formData.category_id) {
 toast.error('Please fill required fields');
 return;
 }
 
 setIsSubmitting(true);
 try {
 const processedVariants = formData.variants.map(v => ({
 ...v,
 online_price: v.online_price || v.price,
 online_offer_price: v.online_offer_price || v.offer_price || null,
 }));

 const payload = {
 ...formData,
 price: parseFloat(basePrice),
 offer_price: baseOfferPrice ? parseFloat(baseOfferPrice) : null,
 online_price: baseOnlinePrice ? parseFloat(baseOnlinePrice) : parseFloat(basePrice),
 online_offer_price: baseOnlineOfferPrice ? parseFloat(baseOnlineOfferPrice) : (baseOfferPrice ? parseFloat(baseOfferPrice) : null),
 variants: processedVariants,
 };

 if (editingItem) {
 await api.put(`/menu-items/${editingItem.id}`, payload);
 toast.success('Menu updated');
 } else {
 const res = await api.post('/menu-items', payload);
 
 if (pendingImages.length > 0) {
 toast.loading('Uploading images...', { id: 'upload-toast'});
 for (let i = 0; i < pendingImages.length; i++) {
 const fd = new FormData();
 
 // Compress the image before uploading
 const compressedFile = await compressImage(pendingImages[i]);
 
 fd.append('file', compressedFile);
 fd.append('folder', 'items');
 fd.append('item_id', res.data.id);
 fd.append('is_primary', i === 0 ? 'true': 'false');
 try {
 await api.post('/upload/image', fd, {
 headers: { 'Content-Type': 'multipart/form-data'}
 });
 } catch (err) {
 console.error('Failed to upload image', err);
 }
 }
 toast.dismiss('upload-toast');
 }
 
 if (pendingImageUrls.length > 0) {
 toast.loading('Saving selected images...', { id: 'save-url-toast'});
 for (let i = 0; i < pendingImageUrls.length; i++) {
 try {
 await api.post(`/menu-items/${res.data.id}/save-image-url`, { url: pendingImageUrls[i] });
 } catch (err) {
 console.error('Failed to save image url', err);
 }
 }
 setPendingImages([]);
 setPendingImageUrls([]);
 toast.dismiss('save-url-toast');
 }
 
 toast.success('Menu created');
 }
 setPendingImages([]);
 setPendingImageUrls([]);
 setIsModalOpen(false);
 fetchData(true);
 } catch (error: any) {
 toast.error(error.response?.data?.detail || 'Failed to save item');
 } finally {
 setIsSubmitting(false);
 }
 };

 const confirmDeleteItem = async () => {
 if (!itemToDelete) return;
 setIsDeleting(true);
 try {
 await api.delete(`/menu-items/${itemToDelete}`);
 toast.success('Item deleted');
 setMenuItems(safeMenuItems.filter(i => i.id !== itemToDelete));
 setItemToDelete(null);
 } catch (error) {
 toast.error('Failed to delete item');
 } finally {
 setIsDeleting(false);
 }
 };

 const handleDelete = (id: string) => {
 setItemToDelete(id);
 };

 const handleQuickToggle = async (item: MenuItem, field: 'is_available'| 'is_bestseller'| 'is_highlighted') => {
 try {
 const newValue = !item[field];
 await api.put(`/menu-items/${item.id}`, { [field]: newValue });
 setMenuItems(safeMenuItems.map(i => i.id === item.id ? { ...i, [field]: newValue } : i));
 } catch (error) {
 toast.error(`Failed to update ${field}`);
 }
 };

 const [itemOtpCode, setItemOtpCode] = useState('');
 const [isSendingItemOtp, setIsSendingItemOtp] = useState(false);

 const handleOpenDeleteAllModal = async () => {
 setIsSendingItemOtp(true);
 try {
 await api.post('/categories/request-deletion-otp?target=menu_items');
 toast.success('Deletion OTP sent to your registered email');
 setItemOtpCode('');
 setShowDeleteAllConfirm(true);
 } catch (error: any) {
 toast.error(error.response?.data?.detail || 'Failed to send OTP email');
 } finally {
 setIsSendingItemOtp(false);
 }
 };

 const handleDeleteAll = async () => {
 if (!itemOtpCode || itemOtpCode.length < 6) {
 return toast.error('Please enter valid 6-digit OTP code');
 }
 setIsDeletingAll(true);
 try {
 await api.delete(`/menu-items/all?code=${encodeURIComponent(itemOtpCode.trim())}`);
 setMenuItems([]);
 setShowDeleteAllConfirm(false);
 setItemOtpCode('');
 toast.success('All menu items deleted successfully');
 } catch (error: any) {
 toast.error(error.response?.data?.detail || 'Invalid or expired OTP');
 } finally {
 setIsDeletingAll(false);
 }
 };

 return (
 <div className="space-y-6 max-w-6xl mx-auto w-full animate-fade-in">
 
  {canWrite && (
  <HeaderActions>
  <Button size="sm" onClick={() => openModal()} leftIcon={<Plus size={16} />}>
  New Menu Item
  </Button>
  </HeaderActions>
  )}

 {/* Filters & Tabs */}
 <div className="sticky top-[-16px] sm:top-[-24px] lg:top-[-32px] z-20 bg-[#f8fafc]/90 backdrop-blur-md pb-4 pt-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border mb-6 space-y-3">
 {/* Category Pills Row */}
 <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide no-scrollbar w-full items-center">
 <button
 onClick={() => setActiveTab('all')}
 className={`px-4 py-2 rounded-full whitespace-nowrap text-xs sm:text-sm font-medium transition-colors shrink-0 ${
 activeTab === 'all'
 ? 'bg-slate-900 text-white dark:bg-muted dark:text-foreground'
 : 'bg-background text-muted-foreground hover:bg-muted border border-border '
 }`}
 >
 All Items ({categories.reduce((acc, cat) => acc + (cat.item_count || 0), 0)})
 </button>
 {categories.map(cat => (
 <button
 key={cat.id}
 onClick={() => setActiveTab(cat.id)}
 className={`px-4 py-2 rounded-full whitespace-nowrap text-xs sm:text-sm font-medium transition-colors shrink-0 ${
 activeTab === cat.id 
 ? 'bg-slate-900 text-white dark:bg-muted dark:text-foreground'
 : 'bg-background text-muted-foreground hover:bg-muted border border-border '
 }`}
 >
 {cat.name} ({cat.item_count || 0})
 </button>
 ))}
 </div>
 
 {/* Search, Filter & View Mode Controls Row */}
 <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between w-full">
 <div className="flex-1 max-w-md">
 <Input
 leftIcon={<Search size={18} />}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search items by name..."
 className="w-full bg-background"
 />
 </div>
 
 <div className="flex items-center gap-2 shrink-0">
 <div className="w-44 sm:w-48">
 <SearchableSelect
 options={[
 { id: 'all', name: 'All Statuses', icon: <LayoutGrid size={15} className="text-muted-foreground" /> },
 { id: 'available', name: 'Available', icon: <CheckCircle2 size={15} className="text-emerald-500" /> },
 { id: 'not_available', name: 'Not Available', icon: <XCircle size={15} className="text-rose-500" /> },
 { id: 'bestseller', name: 'Bestsellers', icon: <Flame size={15} className="text-amber-500" /> },
 { id: 'chef_special', name: 'Chef Special', icon: <Star size={15} className="text-primary" /> },
 ]}
 value={specialFilter}
 onChange={(val) => setSpecialFilter(val as any)}
 showSearch={false}
 placeholder="Filter items"
 className="h-10 border-border bg-background text-foreground text-sm font-medium rounded-lg shadow-sm"
 />
 </div>
 <div className="flex bg-background border border-border rounded-lg p-1 shrink-0 gap-1">
 <button
 onClick={() => setViewMode('grid')}
 className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid'? 'bg-muted text-foreground ': 'text-muted-foreground hover:text-muted-foreground'}`}
 title="Grid View"
 >
 <LayoutGrid size={16} />
 </button>
 <button
 onClick={() => setViewMode('list')}
 className={`p-1.5 rounded-md transition-colors ${viewMode === 'list'? 'bg-muted text-foreground ': 'text-muted-foreground hover:text-muted-foreground'}`}
 title="List View"
 >
 <List size={16} />
 </button>
 {safeMenuItems.length > 0 && canWrite && (
 <button
 onClick={handleOpenDeleteAllModal}
 disabled={isSendingItemOtp}
 className="p-1.5 rounded-md transition-colors text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
 title="Delete All Items"
 >
 {isSendingItemOtp ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
 </button>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Items Grid */}
 {isLoading ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
 </div>
 ) : filteredItems.length === 0 ? (
 <Card className="border-dashed">
 <CardContent className="flex flex-col items-center justify-center py-16 text-center">
 <Filter className="w-12 h-12 text-slate-300 mb-4" />
 <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
 <p className="text-muted-foreground max-w-sm mb-6">
 {searchQuery ? `No menus match"${searchQuery}"` :"You haven't added any menus to this category yet."}
 </p>
 {categories.length > 0 && canWrite ? (
 <Button onClick={() => openModal()} variant="secondary">Add First Menu</Button>
 ) : categories.length === 0 ? (
 <p className="text-sm text-primary font-medium">Please create a category first to add menus.</p>
 ) : null}
 </CardContent>
 </Card>
 ) : (
 <DndContext 
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragEnd={handleDragEnd}
 >
 <SortableContext 
 items={filteredItems.map(i => i.id)}
 strategy={viewMode === 'grid'? rectSortingStrategy : verticalListSortingStrategy}
 >
 <div className={`grid gap-4 ${viewMode === 'grid'? 'grid-cols-2 lg:grid-cols-3': 'grid-cols-1'}`}>
 {filteredItems.map(item => {
 const categoryName = categories.find(c => c.id === item.category_id)?.name || 'Unknown';
 
 return (
 <SortableMenuItem key={item.id} item={item} >
 <Card className={`flex ${viewMode === 'grid'? 'flex-col': 'flex-row'} overflow-hidden transition-all hover:shadow-md ${!item.is_available ? 'opacity-70 grayscale-[30%]': ''}`}>
 <div className={`${viewMode === 'grid'? 'h-32': 'w-32 sm:w-40 shrink-0'} bg-muted relative`}>
 {item.image_url ? (
 <div className="relative w-full h-full group/img">
 <img 
 src={item.image_url} 
 alt={item.name} 
 className="w-full h-full object-cover cursor-pointer"
 onClick={() => setLightboxImage(item.image_url!)}
 />
 <div className="absolute inset-0 m-auto flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity duration-200 bg-black/20">
 {canWrite && (
 <div className="flex gap-3">
 <button
 onClick={(e) => {
 e.stopPropagation();
 openModal(item);
 }}
 className="w-10 h-10 bg-background hover:bg-muted text-foreground rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
 title="Edit Item"
 >
 <Edit2 size={18} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(item.id);
 }}
 className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/20 transition-transform hover:scale-105"
 title="Delete Item"
 >
 <Trash2 size={18} />
 </button>
 </div>
 )}
 </div>
 </div>
 ) : (
 <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/50 text-slate-300 group/noimg">
 <ImageIcon size={24} className="group-hover/noimg:opacity-0 transition-opacity duration-200" />
 <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover/noimg:opacity-100 transition-all duration-200 bg-black/40 rounded-t-xl z-10">
 {canWrite && (
 <div className="flex gap-3">
 <button
 onClick={(e) => {
 e.stopPropagation();
 openModal(item);
 }}
 className="w-10 h-10 bg-background hover:bg-muted text-foreground rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
 title="Edit Item"
 >
 <Edit2 size={18} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(item.id);
 }}
 className="w-10 h-10 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/20 transition-transform hover:scale-105"
 title="Delete Item"
 >
 <Trash2 size={18} />
 </button>
 </div>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation();
 handleSearchImages(item);
 }}
 disabled={autoImageLoadingId === item.id}
 className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-600 text-white rounded-full text-xs font-semibold shadow-md"
 title="Auto-find an image for this item"
 >
 {autoImageLoadingId === item.id ? (
 <>
 <Loader2 size={14} className="animate-spin" />
 <span>Searching...</span>
 </>
 ) : (
 <>
 <Wand2 size={14} />
 <span>Find Image</span>
 </>
 )}
 </button>
 </div>
 </div>
 )}
 {/* Tags */}
 <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
 {item.is_highlighted && (
 <div className="bg-primary text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center animate-pulse">
 <Flame size={10} className="mr-0.5" /> Chef's Special
 </div>
 )}
 {item.is_bestseller && (
 <div className="bg-amber-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center">
 <Star size={10} className="mr-0.5 fill-white" /> Bestseller
 </div>
 )}
 </div>
 
 {/* Veg/Non-veg mark */}
 <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
 {item.food_types?.map((type) => (
 <div key={type} className="bg-background/90 backdrop-blur-sm p-0.5 rounded shadow-sm">
 {type === 'veg'? (
 <span className="w-3 h-3 border border-green-600 rounded-[2px] flex items-center justify-center" title="Veg">
 <span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span>
 </span>
 ) : type === 'egg'? (
 <span className="w-3 h-3 border border-yellow-600 rounded-[2px] flex items-center justify-center" title="Egg">
 <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
 </span>
 ) : type === 'drink'? (
 <span className="w-3 h-3 border border-blue-600 rounded-[2px] flex items-center justify-center" title="Drink">
 <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
 </span>
 ) : type === 'dessert'? (
 <span className="w-3 h-3 border border-pink-500 rounded-[2px] flex items-center justify-center" title="Dessert">
 <span className="w-1.5 h-1.5 bg-pink-500 rounded-[1px]"></span>
 </span>
 ) : type === 'non-veg'? (
 <span className="w-3 h-3 border border-red-600 rounded-[2px] flex items-center justify-center" title="Non-Veg">
 <span className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-transparent border-b-red-600"></span>
 </span>
 ) : null}
 </div>
 ))}
 </div>
 </div>
 
 <CardContent className={`flex-1 flex flex-col ${viewMode === 'grid'? 'p-3 sm:p-4': 'p-3 sm:p-4'}`}>
 <div className="flex justify-between items-start mb-1">
 <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-1" title={item.name}>{item.name}</h3>
 <div className="flex flex-col items-end">
 <span className="font-bold text-sm sm:text-base text-primary whitespace-nowrap">₹{item.offer_price || item.price}</span>
 {item.offer_price && (
 <span className="text-xs text-muted-foreground line-through">₹{item.price}</span>
 )}
 {Boolean(item.online_price || item.online_offer_price) && (shop?.settings?.delivery_enabled || shop?.settings?.takeaway_enabled) && (
 <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60 mt-0.5 flex items-center gap-1" title="Online Delivery Price">
 <Truck size={11} /> Online: ₹{item.online_offer_price || item.online_price}
 </span>
 )}
 </div>
 </div>
 
 <p className="text-xs text-primary-600 dark:text-primary-400 mb-1 sm:mb-2">{categoryName}</p>
 
 <p className={`text-xs text-muted-foreground line-clamp-2 ${viewMode === 'grid'? 'mb-3 sm:mb-4': 'mb-2 sm:mb-3'} flex-1`}>
 {item.description || 'No description provided.'}
 </p>
 
 <div className="pt-2 sm:pt-3 mt-auto border-t border-border flex flex-wrap gap-2 justify-between items-center">
 <div className="flex items-center gap-1.5 flex-wrap">
 <button
 onClick={() => handleQuickToggle(item, 'is_available')}
 className={`text-xs px-2 py-1 rounded font-medium transition-colors whitespace-nowrap ${
 item.is_available 
 ? 'bg-success/20 text-success hover:bg-green-200 '
 : 'bg-muted text-muted-foreground hover:bg-slate-200 '
 }`}
 >
 {item.is_available ? 'Available': 'Not Available'}
 </button>
 <button
 onClick={() => handleQuickToggle(item, 'is_bestseller')}
 className={`p-1.5 rounded transition-colors shrink-0 ${
 item.is_bestseller 
 ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30'
 : 'bg-muted text-muted-foreground hover:bg-slate-200 '
 }`}
 title="Toggle Bestseller"
 >
 <Star size={14} className={item.is_bestseller ? 'fill-amber-600': ''} />
 </button>
 <button
 onClick={() => handleQuickToggle(item, 'is_highlighted')}
 className={`p-1.5 rounded transition-colors shrink-0 ${
 item.is_highlighted 
 ? 'bg-primary/20 text-primary hover:bg-primary/30'
 : 'bg-muted text-muted-foreground hover:bg-slate-200 '
 }`}
 title="Toggle Highlight"
 >
 <Flame size={14} className={item.is_highlighted ? 'fill-primary': ''} />
 </button>
 </div>
 
 <div className="flex items-center gap-1 flex-wrap shrink-0">
 {/* Rating badge */}
 {item.average_rating && item.average_rating > 0 ? (
 <button
 onClick={() => handleViewReviews(item)}
 className="p-1.5 flex items-center gap-0.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded transition-colors text-xs font-semibold shrink-0"
 title="View Reviews"
 >
 <Star size={12} className="fill-amber-500" />
 {item.average_rating.toFixed(1)}
 <span className="opacity-60 text-[10px]">({item.review_count})</span>
 </button>
 ) : (
 <button
 onClick={() => handleViewReviews(item)}
 className="p-1.5 text-muted-foreground hover:bg-muted rounded transition-colors shrink-0"
 title="View Reviews"
 >
 <MessageSquare size={14} />
 </button>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 </SortableMenuItem>
 );
 })}
 </div>
 </SortableContext>
 </DndContext>
 )}

 {/* Infinite scroll sentinel */}
 <div ref={sentinelRef} className="w-full" />
 {isLoadingMore && (
 <div className="flex justify-center py-6">
 <Loader2 className="animate-spin text-primary" size={24} />
 </div>
 )}

 {/* Add/Edit Modal */}
 <Modal 
 isOpen={isModalOpen} 
 onClose={() => setIsModalOpen(false)}
 title={editingItem ?"Edit Menu" :"Add New Menu"}
 className="max-w-xl"
 footer={
 <div className="flex justify-between items-center w-full">
 <Button 
 variant="secondary" 
 size="sm"
 type="button" 
 onClick={() => {
 if (currentStep > 1) setCurrentStep(currentStep - 1);
 else setIsModalOpen(false);
 }}
 leftIcon={currentStep > 1 ? <ChevronLeft size={14} /> : undefined}
 >
 {currentStep > 1 ? 'Back': 'Cancel'}
 </Button>
 
 {currentStep < 4 ? (
 <Button 
 type="button"
 size="sm"
 onClick={(e) => {
 e.preventDefault();
 if (!formData.name.trim() || !formData.category_id) {
 toast.error('Please fill in Menu Name and Category');
 return;
 }
 setCurrentStep(currentStep + 1);
 }}
 >
 Next Step <ChevronRight size={14} className="ml-1" />
 </Button>
 ) : (
 <Button 
 type="button" 
 size="sm"
 onClick={handleSubmit} 
 isLoading={isSubmitting}
 >
 Save Menu
 </Button>
 )}
 </div>
 }
 >
 <div className="space-y-4">
 {/* Step Indicator */}
 <div className="flex items-center justify-between mb-4 relative max-w-sm mx-auto">
 <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-10" />
 
 {[1, 2, 3, 4].map(step => {
 const isClickable = !!editingItem;
 return (
 <button 
 key={step} 
 type="button"
 onClick={() => isClickable && setCurrentStep(step)}
 disabled={!isClickable}
 className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
 currentStep >= step 
 ? 'bg-primary text-white ring-4 ring-white dark:ring-slate-950'
 : 'bg-slate-200 text-muted-foreground ring-4 ring-white dark:ring-slate-950'
 } ${isClickable ? 'cursor-pointer hover:scale-105 shadow-sm': 'cursor-default'}`}
 >
 {step}
 </button>
 );
 })}
 </div>

 <div className="space-y-5">
 {currentStep === 1 && (
 <div className="space-y-4 animate-fade-in">
 <Input
 label="Menu Name *"
 value={formData.name}
 onChange={(e) => setFormData({...formData, name: e.target.value})}
 placeholder="e.g. Chicken Biryani"
 required
 />
 
 <div className="space-y-1.5 text-left">
 <label className="text-sm font-medium text-foreground">Category *</label>
 <SearchableSelect
 options={categories.map(c => ({ id: c.id, name: c.name }))}
 value={formData.category_id}
 onChange={(val) => setFormData({...formData, category_id: val})}
 placeholder="Select a category"
 />
 </div>

 <div className="space-y-1.5 text-left">
 <label className="text-sm font-medium text-foreground">Description</label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({...formData, description: e.target.value})}
 placeholder="Short description of ingredients..."
 className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-y"
 />
 </div>
 </div>
 )}

 {currentStep === 2 && (
 <div className="space-y-4 animate-fade-in">
 {formData.variants.length === 0 && (
 <div className="space-y-3">
 <div className="bg-muted/50 /40 p-3.5 rounded-xl border border-border /60">
 <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
 <Store size={14} className="text-muted-foreground" /> In-Store / Standard Price
 </div>
 <div className="grid grid-cols-2 gap-3">
 <Input
 label="Regular Price *"
 type="number"
 step="0.01"
 value={formData.price}
 onChange={(e) => {
 const val = e.target.value;
 const prevPrice = formData.price;
 setFormData(prev => ({
 ...prev,
 price: val,
 online_price: (!prev.online_price || prev.online_price === prevPrice) ? val : prev.online_price
 }));
 }}
 placeholder="0.00"
 required
 />
 <Input
 label="Offer Price (Opt)"
 type="number"
 step="0.01"
 value={formData.offer_price}
 onChange={(e) => {
 const val = e.target.value;
 const prevOffer = formData.offer_price;
 setFormData(prev => ({
 ...prev,
 offer_price: val,
 online_offer_price: (!prev.online_offer_price || prev.online_offer_price === prevOffer) ? val : prev.online_offer_price
 }));
 }}
 placeholder="0.00"
 />
 </div>
 </div>

 <div className="bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
 <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Globe size={14} /> Online Delivery Price (Delivery Orders Only)</span>
 <span className="text-[10px] font-normal text-muted-foreground">Defaults to In-Store price if left blank</span>
 </div>
 <div className="grid grid-cols-2 gap-3 mt-2">
 <Input
 label="Online Price"
 type="number"
 step="0.01"
 value={formData.online_price}
 onChange={(e) => setFormData({...formData, online_price: e.target.value})}
 placeholder={formData.price ||"0.00"}
 />
 <Input
 label="Online Offer Price"
 type="number"
 step="0.01"
 value={formData.online_offer_price}
 onChange={(e) => setFormData({...formData, online_offer_price: e.target.value})}
 placeholder={formData.offer_price ||"0.00"}
 />
 </div>
 </div>
 </div>
 )}
 
 <div className="space-y-3 pt-2">
 <div className="flex justify-between items-center">
 <label className="text-sm font-medium text-foreground">Variants (e.g. Sizes)</label>
 <button 
 type="button" 
 onClick={() => setFormData({...formData, variants: [...formData.variants, { name: '', price: '', offer_price: '', online_price: '', online_offer_price: ''}]})}
 className="text-xs text-primary hover:text-primary-600 font-medium flex items-center"
 >
 <Plus size={14} className="mr-1"/> Add Variant
 </button>
 </div>
 {formData.variants.map((v, idx) => (
 <div key={idx} className="flex gap-2 items-start bg-muted/50 p-3 rounded-lg border border-border">
 <div className="flex-1 space-y-3">
 <Input 
 label="Variant Name" 
 placeholder="e.g. 500ml" 
 value={v.name} 
 onChange={(e) => {
 const newV = [...formData.variants];
 newV[idx].name = e.target.value;
 setFormData({...formData, variants: newV});
 }} 
 required 
 />
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 <Input 
 label="Price *" 
 type="number" 
 step="0.01" 
 placeholder="0.00" 
 value={v.price} 
 onChange={(e) => {
 const val = e.target.value;
 const newV = [...formData.variants];
 const prevP = newV[idx].price;
 newV[idx].price = val;
 if (!newV[idx].online_price || newV[idx].online_price === prevP) {
 newV[idx].online_price = val;
 }
 setFormData({...formData, variants: newV});
 }} 
 required 
 />
 <Input 
 label="Offer Price" 
 type="number" 
 step="0.01" 
 placeholder="0.00" 
 value={v.offer_price || ''} 
 onChange={(e) => {
 const val = e.target.value;
 const newV = [...formData.variants];
 const prevOp = newV[idx].offer_price;
 newV[idx].offer_price = val || null;
 if (!newV[idx].online_offer_price || newV[idx].online_offer_price === prevOp) {
 newV[idx].online_offer_price = val || null;
 }
 setFormData({...formData, variants: newV});
 }} 
 />
 <Input 
 label="Online Price" 
 type="number" 
 step="0.01" 
 placeholder={v.price ||"0.00"} 
 value={v.online_price || ''} 
 onChange={(e) => {
 const newV = [...formData.variants];
 newV[idx].online_price = e.target.value || null;
 setFormData({...formData, variants: newV});
 }} 
 />
 <Input 
 label="Online Offer" 
 type="number" 
 step="0.01" 
 placeholder={v.offer_price ||"0.00"} 
 value={v.online_offer_price || ''} 
 onChange={(e) => {
 const newV = [...formData.variants];
 newV[idx].online_offer_price = e.target.value || null;
 setFormData({...formData, variants: newV});
 }} 
 />
 </div>
 </div>
 <button 
 type="button" 
 onClick={() => {
 const newV = [...formData.variants];
 newV.splice(idx, 1);
 setFormData({...formData, variants: newV});
 }}
 className="p-1.5 text-muted-foreground hover:text-destructive mt-6"
 >
 <Trash2 size={16} />
 </button>
 </div>
 ))}
 </div>


 <div className="pt-4 border-t border-border">
 <div className="flex justify-between items-center mb-3">
 <div>
 <h4 className="text-sm font-medium text-foreground">Add-ons (Optional)</h4>
 <p className="text-xs text-muted-foreground">Optional extras that increase the price (e.g. Extra Cheese +20)</p>
 </div>
 <Button 
 type="button" 
 variant="secondary" 
 size="sm"
 onClick={() => setFormData({
 ...formData, 
 addons: [...formData.addons, { name: '', price: ''}]
 })}
 >
 <Plus size={16} className="mr-1.5" /> Add Option
 </Button>
 </div>
 
 {formData.addons.map((addon, idx) => (
 <div key={`addon-${idx}`} className="flex gap-3 items-start mb-3 bg-muted/50 p-3 rounded-xl border border-border">
 <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div>
 <label className="text-xs font-medium text-muted-foreground mb-1 block">Add-on Name</label>
 <Input 
 placeholder="e.g. With Ice" 
 value={addon.name} 
 onChange={(e) => {
 const newA = [...formData.addons];
 newA[idx].name = e.target.value;
 setFormData({...formData, addons: newA});
 }} 
 required 
 />
 </div>
 <div>
 <label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Price</label>
 <Input 
 type="number" 
 step="0.01" 
 placeholder="0.00" 
 value={addon.price} 
 onChange={(e) => {
 const newA = [...formData.addons];
 newA[idx].price = e.target.value;
 setFormData({...formData, addons: newA});
 }} 
 required 
 />
 </div>
 </div>
 <button 
 type="button" 
 onClick={() => {
 const newA = [...formData.addons];
 newA.splice(idx, 1);
 setFormData({...formData, addons: newA});
 }}
 className="p-1.5 text-muted-foreground hover:text-destructive mt-6"
 >
 <Trash2 size={16} />
 </button>
 </div>
 ))}
 </div>

 <div className="space-y-1.5 text-left pt-2">
 <label className="text-sm font-medium text-foreground">Dietary Type</label>
 <div className="flex bg-muted p-1 rounded-xl h-auto flex-wrap gap-1">
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('veg') ? formData.food_types.filter(t => t !== 'veg') : [...formData.food_types, 'veg']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('veg') ? 'bg-background text-success shadow-sm dark:bg-slate-700 ': 'text-muted-foreground hover:text-foreground'}`}
 >
 <span className="w-3 h-3 border border-green-600 rounded-[2px] flex items-center justify-center shrink-0"><span className="w-1.5 h-1.5 bg-green-600 rounded-full"></span></span> Veg
 </button>
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('non-veg') ? formData.food_types.filter(t => t !== 'non-veg') : [...formData.food_types, 'non-veg']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('non-veg') ? 'bg-background text-red-700 shadow-sm dark:bg-slate-700 dark:text-red-400': 'text-muted-foreground hover:text-foreground'}`}
 >
 <span className="w-3 h-3 border border-red-600 rounded-[2px] flex items-center justify-center shrink-0"><span className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[5px] border-transparent border-b-red-600"></span></span> Non-Veg
 </button>
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('egg') ? formData.food_types.filter(t => t !== 'egg') : [...formData.food_types, 'egg']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('egg') ? 'bg-background text-yellow-600 shadow-sm dark:bg-slate-700 dark:text-yellow-400': 'text-muted-foreground hover:text-foreground'}`}
 >
 <span className="w-3 h-3 border border-yellow-500 rounded-[2px] flex items-center justify-center shrink-0"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span></span> Egg
 </button>
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('drink') ? formData.food_types.filter(t => t !== 'drink') : [...formData.food_types, 'drink']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('drink') ? 'bg-background text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400': 'text-muted-foreground hover:text-foreground'}`}
 >
 <span className="w-3 h-3 border border-blue-500 rounded-full flex items-center justify-center shrink-0"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span></span> Drink
 </button>
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('dessert') ? formData.food_types.filter(t => t !== 'dessert') : [...formData.food_types, 'dessert']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('dessert') ? 'bg-background text-pink-600 shadow-sm dark:bg-slate-700 dark:text-pink-400': 'text-muted-foreground hover:text-foreground'}`}
 >
 <span className="w-3 h-3 border border-pink-500 rounded-sm flex items-center justify-center shrink-0"><span className="w-1.5 h-1.5 bg-pink-500 rounded-[1px]"></span></span> Dessert
 </button>
 <button
 type="button"
 onClick={() => setFormData({...formData, food_types: formData.food_types.includes('none') ? formData.food_types.filter(t => t !== 'none') : [...formData.food_types, 'none']})}
 className={`flex-1 min-w-[80px] p-2 rounded-lg text-sm font-medium transition-colors flex flex-col sm:flex-row items-center justify-center gap-1.5 ${formData.food_types.includes('none') ? 'bg-background text-foreground shadow-sm dark:bg-slate-700 ': 'text-muted-foreground hover:text-foreground'}`}
 >
 None
 </button>
 </div>
 
 {formData.food_types.includes('drink') && (
 <div className="pt-3">
 <Switch
 checked={formData.allow_ice_preference}
 onChange={(c) => setFormData({...formData, allow_ice_preference: c})}
 label="Allow Ice Preference"
 description="Ask customer for With/Without Ice"
 className="p-3 border border-border rounded-xl hover:bg-muted/50 /50"
 />
 </div>
 )}
 </div>
 </div>
 )}

 {currentStep === 3 && (
 <div className="space-y-4 animate-fade-in">
 <div className="grid grid-cols-1 gap-4">
 <Switch
 checked={formData.is_available}
 onChange={(c) => setFormData({...formData, is_available: c})}
 label="Item is Available"
 description="Toggle off to mark as out of stock"
 className="p-3 border border-border rounded-xl hover:bg-muted/50 /50"
 />
 <Switch
 checked={formData.is_bestseller}
 onChange={(c) => setFormData({...formData, is_bestseller: c})}
 label={<span className="flex items-center"><Star size={14} className="text-amber-500 mr-1" /> Mark as Bestseller</span>}
 description="Adds a badge for popular items"
 className="p-3 border border-border rounded-xl hover:bg-muted/50 /50"
 />
 <Switch
 checked={formData.is_highlighted}
 onChange={(c) => setFormData({...formData, is_highlighted: c})}
 label={<span className="flex items-center"><Flame size={14} className="text-primary mr-1" /> Highlight Item</span>}
 description="Shows at the top with special effects"
 className="p-3 border border-border rounded-xl hover:bg-muted/50 /50"
 />
 </div>

 <div className="p-4 bg-muted/50 rounded-xl border border-border mt-4 text-sm">
 <div className="flex justify-between items-center mb-3">
 <span className="flex items-center font-medium text-foreground">
 <ImageIcon size={16} className="mr-2 text-muted-foreground"/> Product Images
 </span>
 <div className="flex gap-2 items-center">
 <button
 type="button"
 onClick={() => handleSearchImages(editingItem || undefined)}
 disabled={autoImageLoadingId === (editingItem?.id || 'new')}
 className="flex items-center gap-1.5 text-xs font-medium bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
 >
 {autoImageLoadingId === (editingItem?.id || 'new') ? (
 <Loader2 size={14} className="animate-spin" />
 ) : (
 <Wand2 size={14} />
 )}
 Auto-find
 </button>
 {(!editingItem ? (pendingImages.length + pendingImageUrls.length) : (editingItem.images?.length || 0)) < 4 ? (
 <label className="cursor-pointer text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 px-3 py-1.5 rounded-full transition-colors">
 Upload New
 <input 
 type="file" 
 accept="image/*"
 className="hidden"
 onChange={async (e) => {
 const file = e.target.files?.[0];
 if (!file) return;
 
 if (editingItem) {
 if (editingItem.images && editingItem.images.length >= 4) {
 toast.error('Maximum 4 images allowed per item');
 return;
 }
 
 const compressedFile = await compressImage(file);
 const fd = new FormData();
 fd.append('file', compressedFile);
 fd.append('folder', 'items');
 fd.append('item_id', editingItem.id);
 fd.append('is_primary', (!editingItem.images || editingItem.images.length === 0) ? 'true': 'false');
 
 try {
 const toastId = toast.loading('Uploading image...');
 await api.post('/upload/image', fd, {
 headers: { 'Content-Type': 'multipart/form-data'}
 });
 toast.success('Image uploaded successfully', { id: toastId });
 fetchData(true);
 const res = await api.get(`/menu-items/${editingItem.id}`);
 setEditingItem(res.data);
 } catch (error: any) {
 toast.error(error.response?.data?.detail || 'Failed to upload image');
 }
 } else {
 if (pendingImages.length >= 4) {
 toast.error('Maximum 4 images allowed per item');
 return;
 }
 setPendingImages([...pendingImages, file]);
 }
 }}
 />
 </label>
 ) : (
 <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
 Limit Reached (4/4)
 </span>
 )}
 </div>
 </div>
 
 {editingItem && editingItem.images && editingItem.images.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {editingItem.images.map(img => (
 <div key={img.id} className="w-full h-24 rounded-lg overflow-hidden border border-border relative group">
 <img 
 src={img.image_url} 
 alt="" 
 className="w-full h-full object-cover cursor-pointer" 
 onClick={() => setLightboxImage(img.image_url)}
 />
 <div className="absolute inset-0 bg-black/40 lg:bg-black/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 {!img.is_primary && (
 <button
 type="button"
 onClick={async () => {
 try {
 await api.put(`/menu-items/${editingItem.id}/images/${img.id}/primary`);
 toast.success('Primary image updated');
 const res = await api.get(`/menu-items/${editingItem.id}`);
 setEditingItem(res.data);
 fetchData(true);
 } catch (err) {
 toast.error('Failed to update primary image');
 }
 }}
 className="p-1.5 bg-background/20 hover:bg-background/40 rounded text-white"
 title="Set as Primary"
 >
 <Star size={14} />
 </button>
 )}
 <button
 type="button"
 onClick={() => {
 setImageToDelete({ itemId: editingItem.id, imageId: img.id });
 }}
 className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded text-white"
 title="Delete Image"
 >
 <Trash2 size={14} />
 </button>
 </div>
 {img.is_primary && (
 <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
 Primary
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (!editingItem && (pendingImages.length > 0 || pendingImageUrls.length > 0)) ? (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {pendingImages.map((file, idx) => (
 <div key={`file-${idx}`} className="w-full h-24 rounded-lg overflow-hidden border border-border relative group">
 <img 
 src={URL.createObjectURL(file)} 
 alt="" 
 className="w-full h-full object-cover" 
 />
 <div className="absolute inset-0 bg-black/40 lg:bg-black/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <button
 type="button"
 onClick={() => {
 setPendingImages(pendingImages.filter((_, i) => i !== idx));
 }}
 className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded text-white"
 title="Delete Image"
 >
 <Trash2 size={14} />
 </button>
 </div>
 {idx === 0 && pendingImageUrls.length === 0 && (
 <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
 Primary
 </div>
 )}
 </div>
 ))}
 {pendingImageUrls.map((url, idx) => (
 <div key={`url-${idx}`} className="w-full h-24 rounded-lg overflow-hidden border border-border relative group">
 <img 
 src={url} 
 alt="" 
 className="w-full h-full object-cover" 
 />
 <div className="absolute inset-0 bg-black/40 lg:bg-black/60 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
 <button
 type="button"
 onClick={() => {
 setPendingImageUrls(pendingImageUrls.filter((_, i) => i !== idx));
 }}
 className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded text-white"
 title="Delete Image"
 >
 <Trash2 size={14} />
 </button>
 </div>
 {idx === 0 && pendingImages.length === 0 && (
 <div className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
 Primary
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
 No images uploaded yet.
 </div>
 )}
 </div>
 </div>
 )}

 {currentStep === 4 && (
 <div className="space-y-6 animate-fade-in">
 <div>
 <h4 className="text-sm font-medium text-foreground mb-3">Available Days</h4>
 <p className="text-xs text-muted-foreground mb-3">Leave all unchecked if available every day.</p>
 <div className="flex flex-wrap gap-2">
 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
 const isSelected = formData.available_days.includes(day);
 return (
 <button
 key={day}
 type="button"
 onClick={() => {
 if (isSelected) {
 setFormData({ ...formData, available_days: formData.available_days.filter(d => d !== day) });
 } else {
 setFormData({ ...formData, available_days: [...formData.available_days, day] });
 }
 }}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
 isSelected 
 ? 'bg-primary border-primary text-white'
 : 'bg-background border-border text-muted-foreground hover:border-border '
 }`}
 >
 {day}
 </button>
 );
 })}
 </div>
 </div>

 <div className="pt-4 border-t border-border">
 <h4 className="text-sm font-medium text-foreground mb-3">Timing Presets</h4>
 <p className="text-xs text-muted-foreground mb-3">Leave all unchecked if available all day.</p>
 <div className="flex flex-wrap gap-2">
 {[
 { id: 'Early Morning', label: 'Early Morning (04:00 - 08:00)'},
 { id: 'Morning', label: 'Morning (08:00 - 12:00)'},
 { id: 'Afternoon', label: 'Afternoon (12:00 - 16:00)'},
 { id: 'Evening', label: 'Evening (16:00 - 20:00)'},
 { id: 'Night', label: 'Night (20:00 - 00:00)'},
 { id: 'Mid-night', label: 'Mid-night (00:00 - 04:00)'}
 ].map(preset => {
 const isSelected = formData.available_time_presets.includes(preset.id);
 return (
 <button
 key={preset.id}
 type="button"
 onClick={() => {
 if (isSelected) {
 setFormData({ ...formData, available_time_presets: formData.available_time_presets.filter(p => p !== preset.id) });
 } else {
 setFormData({ ...formData, available_time_presets: [...formData.available_time_presets, preset.id] });
 }
 }}
 className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
 isSelected 
 ? 'bg-primary border-primary text-white'
 : 'bg-background border-border text-muted-foreground hover:border-border '
 }`}
 >
 {preset.label}
 </button>
 );
 })}
 </div>
 </div>

 <div className="pt-4 border-t border-border flex gap-4">
 <div className="flex-1">
 <label className="block text-sm font-medium text-foreground mb-1.5">Custom Time From</label>
 <input 
 type="time" 
 value={formData.custom_time_from} 
 onChange={e => setFormData({ ...formData, custom_time_from: e.target.value })}
 className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
 />
 </div>
 <div className="flex-1">
 <label className="block text-sm font-medium text-foreground mb-1.5">Custom Time To</label>
 <input 
 type="time" 
 value={formData.custom_time_to} 
 onChange={e => setFormData({ ...formData, custom_time_to: e.target.value })}
 className="w-full bg-muted/50 border border-border rounded-xl px-4 py-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
 />
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </Modal>

 <ConfirmModal
 isOpen={!!itemToDelete}
 onClose={() => setItemToDelete(null)}
 onConfirm={confirmDeleteItem}
 title="Delete Menu Item"
 message="Are you sure you want to delete this menu? This action cannot be undone."
 confirmText="Delete Menu"
 isLoading={isDeleting}
 />

 <ConfirmModal
 isOpen={!!imageToDelete}
 onClose={() => setImageToDelete(null)}
 onConfirm={async () => {
 if (!imageToDelete) return;
 setIsDeleting(true);
 try {
 await api.delete(`/menu-items/${imageToDelete.itemId}/images/${imageToDelete.imageId}`);
 toast.success('Image deleted');
 const res = await api.get(`/menu-items/${imageToDelete.itemId}`);
 setEditingItem(res.data);
 fetchData(true);
 setImageToDelete(null);
 } catch (err) {
 toast.error('Failed to delete image');
 } finally {
 setIsDeleting(false);
 }
 }}
 title="Delete Image"
 message="Are you sure you want to delete this image?"
 confirmText="Delete Image"
 isLoading={isDeleting}
 />

 <Modal
 isOpen={showDeleteAllConfirm}
 onClose={() => {
 if (!isDeletingAll) {
 setShowDeleteAllConfirm(false);
 setItemOtpCode('');
 }
 }}
 title="Delete All Menu Items"
 className="max-w-md"
 >
 <div className="space-y-4 pt-2">
 <div className="p-3.5 rounded-xl bg-destructive/10 dark:bg-red-950/40 border border-destructive/20 text-red-700 dark:text-red-300 text-xs sm:text-sm font-semibold leading-relaxed">
 ⚠️ WARNING: DELETING ALL MENU ITEMS WILL PERMANENTLY ERASE EVERY MENU ITEM FROM YOUR SHOP. THIS ACTION CANNOT BE UNDONE.
 </div>

 <p className="text-xs sm:text-sm text-muted-foreground">
 A 6-digit deletion verification OTP code has been sent to your email address. Enter the code below to confirm deletion:
 </p>

 <div>
 <label className="block text-xs font-semibold text-foreground mb-1.5">
 Enter 6-Digit Email OTP
 </label>
 <Input
 value={itemOtpCode}
 onChange={(e) => setItemOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
 setItemOtpCode('');
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
 disabled={itemOtpCode.length < 6}
 className="flex-1 font-bold"
 >
 Confirm Delete All
 </Button>
 </div>
 </div>
 </Modal>

 <Lightbox 
 isOpen={!!lightboxImage}
 onClose={() => setLightboxImage(null)}
 imageUrl={lightboxImage || ''}
 />

 {/* Reviews Modal */}
 <Modal
 isOpen={!!reviewsModal}
 onClose={() => setReviewsModal(null)}
 title={reviewsModal?.item ? `Reviews for ${reviewsModal.item.name}` :"Reviews"}
 className="max-w-md"
 >
 <div className="mt-4">
 {isLoadingReviews ? (
 <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
 <Loader2 size={32} className="animate-spin mb-4" />
 <p>Loading reviews...</p>
 </div>
 ) : reviewsModal?.summary ? (
 <div className="space-y-6">
 {reviewsModal.summary.total_reviews === 0 ? (
 <div className="text-center py-12 bg-muted/50 rounded-xl border border-dashed border-border">
 <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-muted-foreground mb-3" />
 <p className="text-muted-foreground font-medium">No reviews yet</p>
 <p className="text-sm text-muted-foreground mt-1">Customers haven't reviewed this item yet.</p>
 </div>
 ) : (
 <>
 <div className="flex items-center gap-6 p-4 bg-muted/50 rounded-xl border border-border">
 <div className="flex flex-col items-center">
 <span className="text-4xl font-bold text-foreground">
 {reviewsModal.summary.average_rating.toFixed(1)}
 </span>
 <div className="flex mt-1">
 {[1, 2, 3, 4, 5].map(s => (
 <Star key={s} size={14} className={s <= Math.round(reviewsModal.summary!.average_rating) ? 'fill-amber-400 text-amber-400': 'text-slate-200 dark:text-foreground fill-slate-200 dark:fill-slate-700'} />
 ))}
 </div>
 <span className="text-xs text-muted-foreground mt-1">{reviewsModal.summary.total_reviews} reviews</span>
 </div>

 <div className="flex-1 space-y-1.5">
 {[5, 4, 3, 2, 1].map(star => {
 const count = reviewsModal.summary!.rating_distribution[star] || 0;
 const pct = reviewsModal.summary!.total_reviews ? Math.round((count / reviewsModal.summary!.total_reviews) * 100) : 0;
 return (
 <div key={star} className="flex items-center gap-2">
 <span className="text-xs w-3 text-muted-foreground shrink-0">{star}</span>
 <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
 <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
 <div
 className="h-full bg-amber-400 rounded-full transition-all duration-500"
 style={{ width: `${pct}%` }}
 />
 </div>
 <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
 </div>
 );
 })}
 </div>
 </div>

 <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
 <h3 className="font-semibold text-sm text-foreground sticky top-0 bg-background/90 dark:bg-slate-950/90 backdrop-blur pb-2">Recent Reviews</h3>
 {reviewsModal.summary.reviews.map(rev => (
 <div key={rev.id} className="bg-muted/50 /50 rounded-xl p-3 border border-border">
 <div className="flex items-center justify-between mb-2">
 <span className="text-sm font-semibold text-foreground">
 {rev.reviewer_name}
 </span>
 <div className="flex items-center gap-2">
 <div className="flex">
 {[1, 2, 3, 4, 5].map(s => (
 <Star key={s} size={12} className={s <= rev.rating ? 'fill-amber-400 text-amber-400': 'text-slate-200 dark:text-foreground fill-slate-200 dark:fill-slate-700'} />
 ))}
 </div>
 <span className="text-xs text-muted-foreground">{rev.created_at}</span>
 </div>
 </div>
 {rev.comment && (
 <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{rev.comment}</p>
 )}
 </div>
 ))}
 </div>
 </>
 )}
 </div>
 ) : null}
 </div>
 </Modal>

 {/* Search Images Modal */}
 <Modal
 isOpen={!!searchImagesModal}
 onClose={() => !isSavingVariant && setSearchImagesModal(null)}
 title="Select Images"
 className="max-w-2xl"
 >
 <div className="mt-4">
 <p className="text-sm text-muted-foreground mb-4 flex flex-wrap justify-between gap-2">
 <span className="flex-1 min-w-[200px]">Select the best images for <strong className="text-foreground">{searchImagesModal?.name}</strong>. (Max 4 total)</span>
 <span className="font-semibold text-primary whitespace-nowrap">{(editingItem ? (editingItem.images?.length || 0) : (pendingImages.length + pendingImageUrls.length)) + selectedImageUrls.length}/4</span>
 </p>

 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1 custom-scrollbar">
 {searchImagesModal?.urls.map((url, idx) => {
 const isSelected = selectedImageUrls.includes(url);
 return (
 <div 
 key={idx} 
 className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group bg-muted border-2 transition-all duration-200 ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-1': 'border-transparent'}`}
 onClick={() => {
 const totalSelected = (editingItem ? (editingItem.images?.length || 0) : (pendingImages.length + pendingImageUrls.length)) + selectedImageUrls.length;
 if (isSelected) {
 setSelectedImageUrls(selectedImageUrls.filter(u => u !== url));
 } else {
 if (totalSelected >= 4) {
 toast.error('Maximum 4 images allowed per item');
 return;
 }
 setSelectedImageUrls([...selectedImageUrls, url]);
 }
 }}
 >
 <img 
 src={url} 
 alt="Variant" 
 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
 referrerPolicy="no-referrer"
 onError={(e) => {
 const parent = e.currentTarget.parentElement;
 if (parent) parent.style.display = 'none';
 if (isSelected) setSelectedImageUrls(prev => prev.filter(u => u !== url));
 }}
 />
 {isSelected && (
 <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
 <div className="bg-primary text-white p-1 rounded-full shadow-lg scale-110 transition-transform">
 <Check size={24} strokeWidth={3} />
 </div>
 </div>
 )}
 {!isSelected && (
 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
 <div className="bg-background/90 text-foreground p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-75 group-hover:scale-100 shadow-xl">
 <Plus size={20} />
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 
 <div className="mt-6 flex flex-wrap-reverse items-center justify-end gap-3">
 <Button 
 variant="secondary" 
 className="w-full sm:w-auto mr-auto"
 onClick={async () => {
 try {
 setIsSavingVariant(true);
 const res = await api.get(`/menu-items/search-images-by-name?q=${encodeURIComponent(searchImagesModal?.name || '')}`);
 setSearchImagesModal({ item: searchImagesModal?.item, name: searchImagesModal?.name || '', urls: res.data.urls });
 } catch (error) {
 toast.error('Failed to regenerate images');
 } finally {
 setIsSavingVariant(false);
 }
 }}
 disabled={isSavingVariant}
 >
 <RefreshCw size={16} className="mr-2" /> Regenerate
 </Button>
 <Button variant="secondary" className="w-full sm:w-auto flex-1" onClick={() => setSearchImagesModal(null)} disabled={isSavingVariant}>
 Cancel
 </Button>
 <Button className="w-full sm:w-auto flex-[2]" onClick={handleConfirmImageSelection} disabled={isSavingVariant || selectedImageUrls.length === 0}>
 {isSavingVariant ? <Loader2 size={16} className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
 {selectedImageUrls.length > 0 ? `Add ${selectedImageUrls.length} Image(s)` : 'Select Images'}
 </Button>
 </div>
 
 {isSavingVariant && (
 <div className="absolute inset-0 bg-background/50 dark:bg-slate-950/50 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-10">
 <Loader2 size={32} className="animate-spin text-primary mb-3" />
 <p className="text-sm font-medium text-foreground shadow-sm">Downloading & Saving...</p>
 </div>
 )}
 </div>
 </Modal>

 {/* FIXED FAB */}
 {canWrite && (
 <div className="fixed bottom-20 lg:bottom-8 right-4 lg:right-8 z-50 flex flex-col items-end gap-3">
 {/* Expanded Actions */}
 <div
 className={`flex flex-col items-end gap-3 transition-all duration-300 ${
 isFabOpen
 ? 'opacity-100 translate-y-0 scale-100'
 : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
 }`}
 >

 <div className="flex items-center gap-3">
 <span className="bg-background px-3 py-2 rounded-lg shadow text-xs font-medium">
 AI Bulk Upload
 </span>

 <button
 onClick={() => {
 setIsFabOpen(false);
 window.location.href = '/bulk-upload';
 }}
 className="w-12 h-12 rounded-full bg-background shadow-lg flex items-center justify-center hover:scale-105 transition-transform text-amber-500"
 >
 <Sparkles size={20} />
 </button>
 </div>

 <div className="flex items-center gap-3">
 <span className="bg-background px-3 py-2 rounded-lg shadow text-xs font-medium">
 Add Menu
 </span>

 <button
 onClick={() => {
 setIsFabOpen(false);
 openModal();
 }}
 className="w-12 h-12 rounded-full bg-primary shadow-lg flex items-center justify-center hover:scale-105 transition-transform text-white"
 >
 <Plus size={24} />
 </button>
 </div>
 </div>

 {/* Main FAB Toggle */}
 <button
 onClick={() => setIsFabOpen(!isFabOpen)}
 className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 ${
 isFabOpen ? 'bg-slate-800 rotate-45': 'bg-primary hover:scale-105'
 }`}
 >
 <Plus size={24} />
 </button>
 </div>
 )}

 {/* FAB for Add Item (Mobile) */}
 {canWrite && !isModalOpen && createPortal(
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
