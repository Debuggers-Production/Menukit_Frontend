import { api } from './api';

export interface BroadcastCampaign {
  id: string;
  shop_id: string;
  title: string;
  message: string;
  image_url?: string | null;
  target_audience: 'all' | 'new' | 'min_visits';
  min_visits?: number | null;
  status: 'DRAFT' | 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';
  scheduled_at?: string | null;
  sent_at?: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at?: string | null;
}

export interface BroadcastCreatePayload {
  title?: string;
  message: string;
  image_url?: string | null;
  target_audience: 'all' | 'new' | 'min_visits';
  min_visits?: number;
  scheduled_at?: string | null;
}


export interface AudienceCountResponse {
  count: number;
  target_audience: string;
  min_visits?: number | null;
}

export interface BroadcastCampaignListResponse {
  items: BroadcastCampaign[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface BroadcastListParams {
  search?: string;
  date_filter?: string;
  page?: number;
  page_size?: number;
}

export const broadcastService = {
  getAudienceCount: async (target_audience: string, min_visits: number = 2): Promise<AudienceCountResponse> => {
    const res = await api.post('/broadcasts/audience-count', {
      target_audience,
      min_visits,
    });
    return res.data;
  },

  createCampaign: async (payload: BroadcastCreatePayload): Promise<BroadcastCampaign> => {
    const res = await api.post('/broadcasts', payload);
    return res.data;
  },

  listCampaigns: async (params?: BroadcastListParams): Promise<BroadcastCampaignListResponse> => {
    const res = await api.get('/broadcasts', { params });
    // Handle both wrapped and direct array if legacy
    if (Array.isArray(res.data)) {
      return {
        items: res.data,
        total: res.data.length,
        page: 1,
        page_size: res.data.length,
        has_more: false,
      };
    }
    return res.data;
  },

  cancelCampaign: async (campaignId: string): Promise<void> => {
    await api.delete(`/broadcasts/${campaignId}`);
  },

  sendTestMessage: async (phone_number: string, message: string, image_url?: string | null): Promise<any> => {
    const res = await api.post('/broadcasts/test-send', {
      phone_number,
      message,
      image_url,
    });
    return res.data;
  },

  getMediaLibrary: async (): Promise<string[]> => {
    const res = await api.get('/broadcasts/media-library');
    return res.data;
  },

  deleteMediaLibraryImage: async (imageUrl: string): Promise<void> => {
    await api.delete('/broadcasts/media-library', { data: { image_url: imageUrl } });
  },

  deleteUploadedImage: async (imageUrl: string): Promise<void> => {
    await api.delete('/upload/image', { data: { image_url: imageUrl } });
  },


  getCredits: async (): Promise<{ available_credits: number; cost_per_message: number }> => {
    const res = await api.get('/broadcasts/credits');
    return res.data;
  },

  createTopupOrder: async (credits: number): Promise<any> => {
    const res = await api.post('/broadcasts/credits/topup-order', { credits });
    return res.data;
  },

  verifyTopup: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    credits: number;
  }): Promise<any> => {
    const res = await api.post('/broadcasts/credits/verify-topup', payload);
    return res.data;
  },
};



