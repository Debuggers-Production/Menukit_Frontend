import { api } from './api';

export interface MembershipAnalytics {
  total_members: number;
  manually_added: number;
  auto_registered: number;
  repeated_count?: number;
}

export interface Member {
  id: string;
  name: string | null;
  mobile_number: string;
  joined_at: string;
  is_retailer_added?: boolean;
  visit_count?: number;
}

export interface RepeatedCustomer extends Member {
  visit_count: number;
}

export interface PaginatedMembersResponse {
  total_count: number;
  has_more: boolean;
  skip: number;
  limit: number;
  tab: string;
  items: Member[];
}

export const membershipService = {
  addMember: async (shop_id: string, name: string, mobile_number: string): Promise<{ message: string; customer_id: string }> => {
    const response = await api.post(`/memberships/retailer/${shop_id}/add`, { name, mobile_number });
    return response.data;
  },

  getAnalytics: async (shop_id: string): Promise<MembershipAnalytics> => {
    const response = await api.get(`/memberships/retailer/${shop_id}/analytics`);
    return response.data;
  },

  getPaginatedMembers: async (
    shop_id: string,
    tab: 'existing' | 'new' | 'repeated' = 'existing',
    skip: number = 0,
    limit: number = 20,
    search?: string,
    min_visits: number = 2
  ): Promise<PaginatedMembersResponse> => {
    const response = await api.get(`/memberships/retailer/${shop_id}/members-list`, {
      params: { tab, skip, limit, search, min_visits }
    });
    return response.data;
  },

  logEvent: async (shop_id: string, event_type: string, customer_id?: string): Promise<{ status: string }> => {
    const response = await api.post(`/memberships/events`, { event_type, customer_id }, {
      params: { shop_id }
    });
    return response.data;
  },

  getMembers: async (shop_id: string): Promise<Member[]> => {
    const response = await api.get(`/memberships/retailer/${shop_id}/members`);
    return response.data;
  },

  getAutoRegisteredMembers: async (shop_id: string): Promise<Member[]> => {
    const response = await api.get(`/memberships/retailer/${shop_id}/auto-registered`);
    return response.data;
  },

  getRepeatedCustomers: async (shop_id: string, min_visits: number = 2): Promise<RepeatedCustomer[]> => {
    const response = await api.get(`/memberships/retailer/${shop_id}/repeated`, {
      params: { min_visits }
    });
    return response.data;
  },

  convertToMember: async (shop_id: string, customer_id: string): Promise<{ message: string }> => {
    const response = await api.post(`/memberships/retailer/${shop_id}/members/${customer_id}/convert`);
    return response.data;
  },

  batchConvertMembers: async (shop_id: string, customer_ids?: string[]): Promise<{ message: string; converted_count: number }> => {
    const response = await api.post(`/memberships/retailer/${shop_id}/members/batch-convert`, { customer_ids });
    return response.data;
  },

  editMember: async (shop_id: string, customer_id: string, name: string, mobile_number: string): Promise<{ message: string }> => {
    const response = await api.put(`/memberships/retailer/${shop_id}/members/${customer_id}`, { name, mobile_number });
    return response.data;
  },

  deleteMember: async (shop_id: string, customer_id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/memberships/retailer/${shop_id}/members/${customer_id}`);
    return response.data;
  },

  deleteAllMembers: async (shop_id: string, type: 'existing' | 'new' | 'all' = 'all'): Promise<{ message: string }> => {
    const response = await api.delete(`/memberships/retailer/${shop_id}/all`, { params: { type } });
    return response.data;
  }
};
