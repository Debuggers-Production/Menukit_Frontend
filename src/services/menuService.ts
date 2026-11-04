import { BaseService } from './baseService';
import { Category, MenuItem } from '@/types';

export class MenuService extends BaseService {
  private static instance: MenuService;

  public static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }

  public async getCategories(shopId: string): Promise<Category[]> {
    return this.get<Category[]>(`/shops/${shopId}/categories`);
  }

  public async createCategory(shopId: string, data: Partial<Category>): Promise<Category> {
    return this.post<Category>(`/shops/${shopId}/categories`, data);
  }

  public async updateCategory(shopId: string, categoryId: string, data: Partial<Category>): Promise<Category> {
    return this.put<Category>(`/shops/${shopId}/categories/${categoryId}`, data);
  }

  public async deleteCategory(shopId: string, categoryId: string): Promise<any> {
    return this.delete<any>(`/shops/${shopId}/categories/${categoryId}`);
  }

  public async reorderCategories(shopId: string, orderedIds: string[]): Promise<any> {
    return this.put<any>(`/shops/${shopId}/categories/reorder`, { order: orderedIds });
  }

  public async getMenuItems(shopId: string, params?: Record<string, any>): Promise<MenuItem[]> {
    return this.get<MenuItem[]>(`/shops/${shopId}/items`, { params });
  }

  public async updateMenuItem(shopId: string, itemId: string, data: Partial<MenuItem>): Promise<MenuItem> {
    return this.put<MenuItem>(`/shops/${shopId}/items/${itemId}`, data);
  }

  public async toggleItemAvailability(shopId: string, itemId: string, isAvailable: boolean): Promise<any> {
    return this.patch<any>(`/shops/${shopId}/items/${itemId}/availability`, { is_available: isAvailable });
  }
}

export const menuService = MenuService.getInstance();

