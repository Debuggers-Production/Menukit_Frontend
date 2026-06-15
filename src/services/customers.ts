import { api } from './api';

export interface OTPVerifyResponse {
  is_global_customer: boolean;
  is_member: boolean;
  is_strict_member: boolean;
  customer_name?: string | null;
  access_token?: string | null;
}

export interface Customer {
  id: string;
  name: string | null;
  mobile_number: string;
  created_at: string;
}

export const customerService = {
  verifyMobile: async (mobile_number: string): Promise<{ message: string }> => {
    const response = await api.post('/customers/verify-mobile', { mobile_number });
    return response.data;
  },

  verifyOtp: async (mobile_number: string, code: string, shop_id?: string): Promise<OTPVerifyResponse> => {
    const response = await api.post('/customers/verify-otp', { mobile_number, code, shop_id });
    return response.data;
  },

  register: async (name: string, mobile_number: string, shop_id?: string, otp_code?: string): Promise<Customer> => {
    const response = await api.post('/customers/register', { name, mobile_number, shop_id, otp_code });
    return response.data;
  }
};
