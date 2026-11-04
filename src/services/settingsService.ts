import { BaseService } from './baseService';

export interface ShopSettingsPayload {
  name?: string;
  currency?: string;
  primary_language?: string;
  languages?: string[];
  gst_percentage?: number;
  gst_number?: string;
  fssai_number?: string;
  is_gst_enabled?: boolean;
  dine_in_enabled?: boolean;
  takeaway_enabled?: boolean;
  delivery_enabled?: boolean;
  online_payment_enabled?: boolean;
  cash_on_delivery_enabled?: boolean;
  cancellation_policy?: string;
  refund_policy?: string;
  upi_id?: string;
  [key: string]: any;
}

export class SettingsService extends BaseService {
  private static instance: SettingsService;

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  public async getShopSettings(shopId: string): Promise<any> {
    return this.get<any>(`/shops/${shopId}`);
  }

  public async updateShopSettings(shopId: string, payload: Partial<ShopSettingsPayload>): Promise<any> {
    return this.put<any>(`/shops/${shopId}`, payload);
  }

  public async updateCurrentShopSettings(payload: Partial<ShopSettingsPayload>): Promise<any> {
    return this.put<any>('/shops/me/settings', payload);
  }

  public async getPrinters(shopId: string): Promise<any[]> {
    return this.get<any[]>(`/shops/${shopId}/printers`);
  }

  public async savePrinter(shopId: string, printerData: any): Promise<any> {
    if (printerData.id) {
      return this.put<any>(`/shops/${shopId}/printers/${printerData.id}`, printerData);
    }
    return this.post<any>(`/shops/${shopId}/printers`, printerData);
  }

  public async deletePrinter(shopId: string, printerId: string): Promise<any> {
    return this.delete<any>(`/shops/${shopId}/printers/${printerId}`);
  }

  public async testPrinter(shopId: string, printerId: string): Promise<any> {
    return this.post<any>(`/shops/${shopId}/printers/${printerId}/test`);
  }
}

export const settingsService = SettingsService.getInstance();
