import { BaseService } from './baseService';
import { DiscountEntity } from '@/models/DiscountEntity';
import { Discount } from '@/types';

export class DiscountService extends BaseService {
  private static instance: DiscountService;

  public static getInstance(): DiscountService {
    if (!DiscountService.instance) {
      DiscountService.instance = new DiscountService();
    }
    return DiscountService.instance;
  }

  public async getDiscounts(shopId: string): Promise<DiscountEntity[]> {
    const raw = await this.get<Discount[]>(`/shops/${shopId}/discounts`);
    return (raw || []).map(d => new DiscountEntity(d));
  }

  public async createDiscount(shopId: string, data: Partial<Discount>): Promise<DiscountEntity> {
    const raw = await this.post<Discount>(`/shops/${shopId}/discounts`, data);
    return new DiscountEntity(raw);
  }

  public async updateDiscount(shopId: string, discountId: string, data: Partial<Discount>): Promise<DiscountEntity> {
    const raw = await this.put<Discount>(`/shops/${shopId}/discounts/${discountId}`, data);
    return new DiscountEntity(raw);
  }

  public async deleteDiscount(shopId: string, discountId: string): Promise<any> {
    return this.delete<any>(`/shops/${shopId}/discounts/${discountId}`);
  }

  public async toggleDiscount(shopId: string, discountId: string, isActive: boolean): Promise<DiscountEntity> {
    const raw = await this.patch<Discount>(`/shops/${shopId}/discounts/${discountId}/status`, { is_active: isActive });
    return new DiscountEntity(raw);
  }
}

export const discountService = DiscountService.getInstance();
