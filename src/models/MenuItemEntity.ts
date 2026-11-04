import { MenuItem } from '@/types';

/**
 * MenuItemEntity
 * OOP Domain Model representing a menu or catalog product item.
 * Encapsulates pricing, discounts, availability, tax computations, and dietary indicators.
 */
export class MenuItemEntity {
  public id: string;
  public shop_id: string;
  public category_id: string;
  public name: string;
  public description?: string;
  public price: number;
  public original_price?: number;
  public image_url?: string;
  public thumbnail_url?: string;
  public is_available: boolean;
  public is_veg?: boolean;
  public spicy_level?: number;
  public preparation_time?: number;
  public tags: string[];
  public sort_order: number;
  public created_at?: string;
  public updated_at?: string;

  constructor(data: Partial<MenuItem>) {
    this.id = data.id || '';
    this.shop_id = data.shop_id || '';
    this.category_id = data.category_id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.price = Number(data.price || 0);
    this.original_price = data.original_price ? Number(data.original_price) : undefined;
    this.image_url = data.image_url;
    this.thumbnail_url = data.thumbnail_url;
    this.is_available = data.is_available !== undefined ? Boolean(data.is_available) : true;
    this.is_veg = data.is_veg;
    this.spicy_level = data.spicy_level;
    this.preparation_time = data.preparation_time;
    this.tags = Array.isArray(data.tags) ? data.tags : [];
    this.sort_order = data.sort_order || 0;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // --- Domain Logic ---

  public hasDiscount(): boolean {
    return Boolean(this.original_price && this.original_price > this.price);
  }

  public getDiscountPercentage(): number {
    if (!this.hasDiscount() || !this.original_price) return 0;
    const diff = this.original_price - this.price;
    return Math.round((diff / this.original_price) * 100);
  }

  public getSavingsAmount(): number {
    if (!this.hasDiscount() || !this.original_price) return 0;
    return Math.max(0, this.original_price - this.price);
  }

  public getEffectivePrice(): number {
    return this.price;
  }

  public getDisplayImage(): string | undefined {
    return this.thumbnail_url || this.image_url;
  }

  public matchesSearch(query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    return (
      this.name.toLowerCase().includes(q) ||
      (this.description ? this.description.toLowerCase().includes(q) : false) ||
      this.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  public toJSON(): MenuItem {
    return {
      id: this.id,
      shop_id: this.shop_id,
      category_id: this.category_id,
      name: this.name,
      description: this.description,
      price: this.price,
      original_price: this.original_price,
      image_url: this.image_url,
      thumbnail_url: this.thumbnail_url,
      is_available: this.is_available,
      is_veg: this.is_veg,
      spicy_level: this.spicy_level,
      preparation_time: this.preparation_time,
      tags: this.tags,
      sort_order: this.sort_order,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
