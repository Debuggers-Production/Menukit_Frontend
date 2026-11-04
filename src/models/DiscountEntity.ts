import { Discount } from '@/types';

/**
 * DiscountEntity
 * OOP Domain Model representing promotions, discounts, BOGO, and coupon rules.
 */
export class DiscountEntity {
  public id: string;
  public shop_id: string;
  public name: string;
  public code?: string;
  public discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item';
  public value: number;
  public min_order_amount?: number;
  public max_discount_amount?: number;
  public applies_to: 'all' | 'categories' | 'items';
  public category_ids?: string[];
  public item_ids?: string[];
  public is_active: boolean;
  public start_date?: string;
  public end_date?: string;
  public usage_limit?: number;
  public usage_count: number;
  public created_at?: string;

  constructor(data: Partial<Discount>) {
    this.id = data.id || '';
    this.shop_id = data.shop_id || '';
    this.name = data.name || '';
    this.code = data.code;
    this.discount_type = (data.discount_type as any) || 'percentage';
    this.value = Number(data.value || 0);
    this.min_order_amount = data.min_order_amount ? Number(data.min_order_amount) : undefined;
    this.max_discount_amount = data.max_discount_amount ? Number(data.max_discount_amount) : undefined;
    this.applies_to = (data.applies_to as any) || 'all';
    this.category_ids = data.category_ids;
    this.item_ids = data.item_ids;
    this.is_active = data.is_active !== undefined ? Boolean(data.is_active) : true;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.usage_limit = data.usage_limit;
    this.usage_count = data.usage_count || 0;
    this.created_at = data.created_at;
  }

  public isExpired(): boolean {
    if (!this.end_date) return false;
    return new Date(this.end_date).getTime() < Date.now();
  }

  public isStarted(): boolean {
    if (!this.start_date) return true;
    return new Date(this.start_date).getTime() <= Date.now();
  }

  public isValidNow(): boolean {
    return this.is_active && this.isStarted() && !this.isExpired();
  }

  public calculateSavings(orderSubtotal: number): number {
    if (!this.isValidNow()) return 0;
    if (this.min_order_amount && orderSubtotal < this.min_order_amount) return 0;

    let savings = 0;
    if (this.discount_type === 'percentage') {
      savings = (orderSubtotal * this.value) / 100;
    } else if (this.discount_type === 'fixed') {
      savings = this.value;
    }

    if (this.max_discount_amount && savings > this.max_discount_amount) {
      savings = this.max_discount_amount;
    }

    return Math.min(savings, orderSubtotal);
  }

  public toJSON(): Discount {
    return {
      id: this.id,
      shop_id: this.shop_id,
      name: this.name,
      code: this.code,
      discount_type: this.discount_type,
      value: this.value,
      min_order_amount: this.min_order_amount,
      max_discount_amount: this.max_discount_amount,
      applies_to: this.applies_to,
      category_ids: this.category_ids,
      item_ids: this.item_ids,
      is_active: this.is_active,
      start_date: this.start_date,
      end_date: this.end_date,
      usage_limit: this.usage_limit,
      usage_count: this.usage_count,
      created_at: this.created_at
    };
  }
}
