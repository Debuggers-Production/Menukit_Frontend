import { api } from './api';
import { Contest, ContestParticipation, ContestComment } from '@/types/contest';

export const contestService = {
  // Vendor endpoints
  createContest: async (data: {
    title: string;
    description?: string;
    reward_type: 'instant_cashback' | 'free_food' | 'discount' | 'offer';
    reward_value?: string;
    contest_type: 'drawing' | 'kavithai';
    applies_to: 'all' | 'items';
    target_ids?: string[];
    ranking_criterion?: 'likes' | 'comments' | 'shares' | 'all';
    min_participants?: number;
    min_likes?: number;
    min_comments?: number;
    min_shares?: number;
  }): Promise<Contest> => {
    const response = await api.post('/contests', data);
    return response.data;
  },

  getShopContests: async (shopId: string): Promise<Contest[]> => {
    const response = await api.get(`/contests/shop/${shopId}`);
    return response.data;
  },

  cancelContest: async (contestId: string): Promise<Contest> => {
    const response = await api.post(`/contests/${contestId}/cancel`);
    return response.data;
  },

  deleteContest: async (contestId: string): Promise<any> => {
    const response = await api.delete(`/contests/${contestId}`);
    return response.data;
  },

  // Customer endpoints
  getActiveContest: async (shopId: string): Promise<Contest | null> => {
    const response = await api.get(`/contests/active/shop/${shopId}`);
    return response.data;
  },

  getCredits: async (token: string): Promise<number> => {
    const response = await api.get('/contests/credits', { params: { token } });
    return response.data;
  },

  payContest: async (mobileNumber: string, shopId: string): Promise<{ order_id: string; base_amount: number; pg_fee: number; gst_on_fee: number; final_total: number; amount: number; currency: string; mock_mode: boolean; key: string }> => {
    const response = await api.post('/contests/pay', { mobile_number: mobileNumber, shop_id: shopId });
    return response.data;
  },

  verifyPayContest: async (data: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string; link_id?: string; mobile_number: string }): Promise<{ customer_id: string; credits: number }> => {
    const response = await api.post('/contests/pay/verify', data);
    return response.data;
  },

  participate: async (contestId: string, token: string, contentType: 'drawing' | 'kavithai'): Promise<ContestParticipation> => {
    const response = await api.post(`/contests/${contestId}/participate`, null, {
      params: { token, content_type: contentType }
    });
    return response.data;
  },

  toggleTimer: async (participationId: string, token: string, start: boolean): Promise<ContestParticipation> => {
    const response = await api.post(`/contests/participations/${participationId}/timer`, null, {
      params: { token, start }
    });
    return response.data;
  },

  submitEntry: async (participationId: string, token: string, data: { text_content?: string; media_url?: string }): Promise<ContestParticipation> => {
    const response = await api.post(`/contests/participations/${participationId}/submit`, data, {
      params: { token }
    });
    return response.data;
  },

  cancelParticipation: async (participationId: string, token: string): Promise<boolean> => {
    const response = await api.post(`/contests/participations/${participationId}/cancel`, null, {
      params: { token }
    });
    return response.data;
  },

  likeParticipation: async (participationId: string, token: string): Promise<boolean> => {
    const response = await api.post(`/contests/participations/${participationId}/like`, null, {
      params: { token }
    });
    return response.data;
  },

  getParticipations: async (contestId: string): Promise<ContestParticipation[]> => {
    const response = await api.get(`/contests/${contestId}/participations`);
    return response.data;
  },

  addComment: async (participationId: string, token: string, text: string): Promise<ContestComment> => {
    const response = await api.post(`/contests/participations/${participationId}/comments`, { text }, {
      params: { token }
    });
    return response.data;
  },

  getComments: async (participationId: string, token?: string): Promise<ContestComment[]> => {
    const response = await api.get(`/contests/participations/${participationId}/comments`, {
      params: token ? { token } : undefined
    });
    return response.data;
  },

  likeComment: async (commentId: string, token: string): Promise<boolean> => {
    const response = await api.post(`/contests/comments/${commentId}/like`, null, {
      params: { token }
    });
    return response.data;
  },

  getGlobalParticipantsCount: async (): Promise<number> => {
    const response = await api.get('/contests/global-participants-count');
    return response.data;
  },

  getAllParticipations: async (): Promise<any[]> => {
    const response = await api.get('/contests/all-participations');
    return response.data;
  },

  getContestStats: async (): Promise<{ reels_count: number; winners_count: number }> => {
    const response = await api.get('/contests/stats');
    return response.data;
  }
};
