import { api } from './api';

export interface SchemeItemInfo {
  item_id: string;
  name: string;
  variant_name?: string | null;
  quantity: number;
  price: number;
  image_url?: string | null;
}

export interface SchemeStats {
  total_members: number;
  paid_this_cycle_count: number;
  pending_this_cycle_count: number;
  total_collected: number;
  completion_rate_percent: number;
}

export interface Scheme {
  id: string;
  shop_id: string;
  title: string;
  description?: string | null;
  price: number;
  frequency: 'monthly' | 'weekly';
  term_duration: number;
  term_unit: string;
  max_members?: number | null;
  items: SchemeItemInfo[];
  show_on_public_menu: boolean;
  status: 'active' | 'closed' | 'completed';
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
  stats?: SchemeStats;
}

export interface SchemePayment {
  id: string;
  scheme_id: string;
  member_id: string;
  installment_number: number;
  installment_label: string;
  amount: number;
  status: string;
  payment_method: string;
  paid_at: string;
  transaction_id?: string | null;
  notes?: string | null;
}

export interface InstallmentScheduleItem {
  installment_number: number;
  label: string;
  due_date?: string | null;
  amount: number;
  is_paid: boolean;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_id?: string | null;
}

export interface SchemeMember {
  id: string;
  scheme_id: string;
  shop_id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address?: string | null;
  member_number?: string | null;
  status: 'active' | 'completed' | 'cancelled';
  joined_at: string;
  total_installments: number;
  paid_installments: number;
  notes?: string | null;
  payments: SchemePayment[];
  installment_schedule: InstallmentScheduleItem[];
}

export interface SchemeCreatePayload {
  title: string;
  description?: string;
  price: number;
  frequency: 'monthly' | 'weekly';
  term_duration: number;
  term_unit?: string;
  max_members?: number | null;
  items: SchemeItemInfo[];
  show_on_public_menu: boolean;
  status?: string;
}

export interface SchemeMemberCreatePayload {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  member_number?: string;
  notes?: string;
  initial_payment?: boolean;
  payment_method?: string;
  transaction_id?: string;
}

export interface RecordPaymentPayload {
  installment_number: number;
  installment_label?: string;
  amount?: number;
  payment_method: string;
  transaction_id?: string;
  notes?: string;
}

export interface CustomerSchemePass {
  member_id: string;
  scheme_id: string;
  scheme_title: string;
  price: number;
  frequency: string;
  term_duration: number;
  term_unit: string;
  customer_name: string;
  customer_phone: string;
  member_number?: string | null;
  status: string;
  joined_at: string;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  items: SchemeItemInfo[];
  payments: SchemePayment[];
  installment_schedule: InstallmentScheduleItem[];
}

export interface SchemePaymentInitiateResponse {
  razorpay_order_id: string;
  razorpay_key: string;
  base_total: number;
  platform_fee: number;
  pg_fee: number;
  gst_on_fee: number;
  grand_total: number;
  amount: number;
  currency: string;
  mock_mode: boolean;
}

export interface SchemePaymentVerifyPayload {
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const schemeService = {
  // Merchant API
  getSchemes: async (): Promise<Scheme[]> => {
    const res = await api.get('/schemes');
    return res.data;
  },

  getScheme: async (id: string): Promise<Scheme> => {
    const res = await api.get(`/schemes/${id}`);
    return res.data;
  },

  createScheme: async (data: SchemeCreatePayload): Promise<Scheme> => {
    const res = await api.post('/schemes', data);
    return res.data;
  },

  updateScheme: async (id: string, data: Partial<SchemeCreatePayload>): Promise<Scheme> => {
    const res = await api.put(`/schemes/${id}`, data);
    return res.data;
  },

  deleteScheme: async (id: string): Promise<void> => {
    await api.delete(`/schemes/${id}`);
  },

  getMembers: async (schemeId: string, search?: string): Promise<SchemeMember[]> => {
    const params = search ? { search } : {};
    const res = await api.get(`/schemes/${schemeId}/members`, { params });
    return res.data;
  },

  addMember: async (schemeId: string, data: SchemeMemberCreatePayload): Promise<SchemeMember> => {
    const res = await api.post(`/schemes/${schemeId}/members`, data);
    return res.data;
  },

  recordPayment: async (schemeId: string, memberId: string, data: RecordPaymentPayload): Promise<SchemeMember> => {
    const res = await api.post(`/schemes/${schemeId}/members/${memberId}/payments`, data);
    return res.data;
  },

  // Public Menu API
  getPublicSchemes: async (shopId: string): Promise<Scheme[]> => {
    const res = await api.get(`/public/shop/${shopId}/schemes`);
    return res.data;
  },

  joinPublicScheme: async (shopId: string, schemeId: string, data: SchemeMemberCreatePayload): Promise<SchemeMember> => {
    const res = await api.post(`/public/shop/${shopId}/schemes/${schemeId}/join`, data);
    return res.data;
  },

  initiateJoinPayment: async (
    shopId: string,
    schemeId: string,
    data: { customer_name: string; customer_phone: string; customer_address?: string }
  ): Promise<SchemePaymentInitiateResponse> => {
    const res = await api.post(`/public/shop/${shopId}/schemes/${schemeId}/initiate-payment`, data);
    return res.data;
  },

  verifyJoinPayment: async (
    shopId: string,
    schemeId: string,
    data: SchemePaymentVerifyPayload
  ): Promise<SchemeMember> => {
    const res = await api.post(`/public/shop/${shopId}/schemes/${schemeId}/verify-payment`, data);
    return res.data;
  },

  getMySchemeStatus: async (shopId: string, phone: string): Promise<CustomerSchemePass[]> => {
    const res = await api.get(`/public/shop/${shopId}/schemes/my-status`, { params: { phone } });
    return res.data;
  },

  initiateMemberInstallmentPayment: async (
    shopId: string,
    schemeId: string,
    memberId: string
  ): Promise<SchemePaymentInitiateResponse> => {
    const res = await api.post(`/public/shop/${shopId}/schemes/${schemeId}/members/${memberId}/initiate-payment`);
    return res.data;
  },

  verifyMemberInstallmentPayment: async (
    shopId: string,
    schemeId: string,
    memberId: string,
    data: SchemePaymentVerifyPayload
  ): Promise<CustomerSchemePass> => {
    const res = await api.post(`/public/shop/${shopId}/schemes/${schemeId}/members/${memberId}/verify-payment`, data);
    return res.data;
  },
};
