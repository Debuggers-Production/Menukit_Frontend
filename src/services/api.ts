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

  const promise = (originalGet as (<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>) => Promise<R>))<T, R, D>(url, config)
    .finally(() => {
      // Clear once completed
      setTimeout(() => {
        inflightGetRequests.delete(dedupeKey);
      }, 50);
    });

  inflightGetRequests.set(dedupeKey, promise as unknown as Promise<AxiosResponse<any>>);
  return promise;
};

function setRequestAuthHeader(config: any, token: string) {
  if (!config) return;
  if (!config.headers) {
    config.headers = {};
  }
  if (typeof config.headers.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['authorization'] = `Bearer ${token}`;
  }
}

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // If it's a public endpoint, attach the customer token if available
    if (config.url?.startsWith('/public') || config.url?.startsWith('/customers')) {
      const customerToken = localStorage.getItem('customer_token');
      if (customerToken && customerToken !== 'undefined' && customerToken !== 'null') {
        setRequestAuthHeader(config, customerToken);
      }
    } else {
      // Otherwise, attach the admin access token
      const token = localStorage.getItem('access_token');
      if (token && token !== 'undefined' && token !== 'null') {
        setRequestAuthHeader(config, token);
      }
      
      const shopId = localStorage.getItem('current_shop_id');
      if (shopId && shopId !== 'undefined' && shopId !== 'null' && shopId.trim() !== '') {
        if (typeof config.headers?.set === 'function') {
          config.headers.set('X-Shop-Id', shopId);
        } else {
          config.headers['X-Shop-Id'] = shopId;
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// In-flight refresh token mutex & queued subscribers
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Safely format FastAPI validation error arrays/objects or arbitrary nested error details
 * into human-readable strings so they never crash React when rendered as children.
 */
export function formatErrorDetail(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);

  if (Array.isArray(val)) {
    return (
      val
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            // FastAPI validation error item: { loc: ['body', 'email'], msg: '...', type: '...' }
            const field =
              Array.isArray(item.loc) && item.loc.length > 0
                ? item.loc[item.loc.length - 1]
                : '';
            const msg = item.msg || item.message || JSON.stringify(item);
            if (field && typeof field === 'string' && field !== 'body') {
              return `${field}: ${msg}`;
            }
            return msg;
          }
          return String(item ?? '');
        })
        .filter(Boolean)
        .join(', ') || 'Validation error'
    );
  }

  if (typeof val === 'object') {
    return val.msg || val.message || val.detail || JSON.stringify(val);
  }

  return String(val);
}

export function normalizeErrorResponse(error: any): void {
  if (!error || !error.response || !error.response.data) return;
  const data = error.response.data;

  // Normalize detail if it's an array or object
  if (data.detail !== undefined && typeof data.detail !== 'string') {
    data.detail = formatErrorDetail(data.detail);
  }

  // Normalize message if it's an array or object
  if (data.message !== undefined && typeof data.message !== 'string') {
    data.message = formatErrorDetail(data.message);
  }
}

// Response interceptor for token refresh & global error normalization
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Normalize FastAPI 422 error detail/message arrays/objects into readable strings globally
    normalizeErrorResponse(error);

    const originalRequest = error?.config;
    
    // If no config or not a 401 Unauthorized, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = (originalRequest.url || '').toLowerCase();

    // Endpoints that should NEVER trigger a token refresh
    const isExcludedEndpoint = 
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/verify-otp') ||
      requestUrl.includes('/auth/send-otp') ||
      requestUrl.startsWith('/public') ||
      requestUrl.startsWith('/customers');

    if (isExcludedEndpoint) {
      return Promise.reject(error);
    }

    // Prevent duplicate retry loops on the exact same request
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // If another request is currently refreshing the token, wait for it
    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            setRequestAuthHeader(originalRequest, token);
            resolve(api(originalRequest));
          },
          reject: (err: any) => {
            reject(err);
          },
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken || refreshToken === 'undefined' || refreshToken === 'null') {
        throw new Error('No refresh token available');
      }

      // Request new tokens from backend using plain axios to avoid interceptor recursion
      const res = await axios.post(
        `${BASE_URL}/api/v1/auth/refresh`,
        { refresh_token: refreshToken },
        { timeout: 30_000 }
      );

      const { access_token, refresh_token: new_refresh_token } = res.data || {};

      if (!access_token) {
        throw new Error('No access token returned from refresh endpoint');
      }

      // Save new tokens in localStorage
      localStorage.setItem('access_token', access_token);
      if (new_refresh_token && new_refresh_token !== 'undefined' && new_refresh_token !== 'null') {
        localStorage.setItem('refresh_token', new_refresh_token);
      }

      // Update default authorization header for subsequent requests
      if (api.defaults.headers.common) {
        (api.defaults.headers.common as any)['Authorization'] = `Bearer ${access_token}`;
      }

      // Notify and retry all parallel requests that were queued while refreshing
      processQueue(null, access_token);

      // Retry the initial request that triggered the refresh
      setRequestAuthHeader(originalRequest, access_token);
      return api(originalRequest);
    } catch (refreshError) {
      normalizeErrorResponse(refreshError);
      // Reject all queued requests with the refresh error
      processQueue(refreshError, null);

      // Clear invalid credentials
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      // Only redirect to login if the user is on an admin/protected page
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/login') && !pathname.startsWith('/shop')) {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
