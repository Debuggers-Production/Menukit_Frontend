import { Category, MenuItem } from '@/types';
import { MenuItemEntity } from './MenuItemEntity';

/**
 * CategoryEntity
 * OOP Domain Model representing a menu category.
 * Encapsulates items organization, availability summary, and sorting logic.
 */
export class CategoryEntity {
  public id: string;
  public shop_id: string;
  public name: string;
  public description?: string;
  public is_active: boolean;
  public sort_order: number;
  public items: MenuItemEntity[];
  public created_at?: string;
  public updated_at?: string;

  constructor(data: Partial<Category>) {
    this.id = data.id || '';
    this.shop_id = data.shop_id || '';
    this.name = data.name || '';
    this.description = data.description;
    this.is_active = data.is_active !== undefined ? Boolean(data.is_active) : true;
    this.sort_order = data.sort_order || 0;
    this.items = (data.items || []).map(item => new MenuItemEntity(item));
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  public getItemCount(): number {
    return this.items.length;
  }

  public getAvailableItemCount(): number {
    return this.items.filter(item => item.is_available).length;
  }

  public hasAvailableItems(): boolean {
    return this.getAvailableItemCount() > 0;
  }

  public matchesSearch(query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase().trim();
    return (
      this.name.toLowerCase().includes(q) ||
      (this.description ? this.description.toLowerCase().includes(q) : false) ||
      this.items.some(item => item.matchesSearch(q))
    );
  }

  public toJSON(): Category {
    return {
      id: this.id,
      shop_id: this.shop_id,
      name: this.name,
      description: this.description,
      is_active: this.is_active,
      sort_order: this.sort_order,
      items: this.items.map(item => item.toJSON()),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
