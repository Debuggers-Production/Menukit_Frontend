import { BaseService } from './baseService';

export class AnalyticsService extends BaseService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async getDashboardStats(): Promise<any> {
    return this.get<any>('/analytics/dashboard');
  }

  public async getRecentActivities(search?: string): Promise<any[]> {
    const res = await this.get<any>('/analytics/activities', { params: { search: search || undefined } });
    return res?.recent_activities || [];
  }

  public async getSalesAnalytics(params: { range?: string; start_date?: string; end_date?: string }): Promise<any> {
    return this.get<any>('/analytics/sales', { params });
  }

  public async getTopSearches(): Promise<any[]> {
    const res = await this.get<any>('/analytics/top-searches');
    return res?.items || [];
  }
}

export const analyticsService = AnalyticsService.getInstance();

