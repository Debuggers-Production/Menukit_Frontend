import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { APP_CONFIG } from '../config';

// Create Axios instance with base URL
const BASE_URL = APP_CONFIG.API_URL;

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 60_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// In-flight GET request deduplication cache to prevent duplicate concurrent network calls
const inflightGetRequests = new Map<string, Promise<AxiosResponse<any>>>();

const originalGet = api.get.bind(api);
api.get = function <T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R> {
  // If skipDedupe is specified or request is not standard, use original get
  const authHeader = config?.headers?.Authorization || localStorage.getItem('customer_token') || localStorage.getItem('access_token') || '';
  const dedupeKey = `GET:${url}:${JSON.stringify(config?.params || '')}:${authHeader ? authHeader.slice(-10) : ''}`;

  const existing = inflightGetRequests.get(dedupeKey);
  if (existing) {
    return existing as unknown as Promise<R>;
  }

  const promise = originalGet<T, R, D>(url, config)
    .finally(() => {
      // Clear once completed
      setTimeout(() => {
        inflightGetRequests.delete(dedupeKey);
      }, 50);
    });

  inflightGetRequests.set(dedupeKey, promise as unknown as Promise<AxiosResponse<any>>);
  return promise;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // If it's a public endpoint, attach the customer token if available
    if (config.url?.startsWith('/public') || config.url?.startsWith('/customers')) {
      const customerToken = localStorage.getItem('customer_token');
      if (customerToken && customerToken !== 'undefined' && customerToken !== 'null') {
        config.headers.set('Authorization', `Bearer ${customerToken}`);
      }
    } else {
      // Otherwise, attach the admin access token
      const token = localStorage.getItem('access_token');
      if (token && token !== 'undefined' && token !== 'null') {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      
      const shopId = localStorage.getItem('current_shop_id');
      if (shopId && shopId !== 'undefined' && shopId !== 'null' && shopId.trim() !== '') {
        config.headers.set('X-Shop-Id', shopId);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
          throw new Error('No refresh token available');
        }
        
        // Request new access token
        const res = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { timeout: 60_000 }
        );
        
        const { access_token, refresh_token: new_refresh_token } = res.data;
        
        // Save new tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh_token);
        
        // Update authorization header on the original request and retry it
        originalRequest.headers.set('Authorization', `Bearer ${access_token}`);
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear storage and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
