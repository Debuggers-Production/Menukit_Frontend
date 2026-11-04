import { api } from './api';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * BaseService
 * Object-Oriented foundation for all domain services.
 * Provides unified request execution, error handling, and lifecycle hooks.
 */
export abstract class BaseService {
  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.get(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error, `GET ${url}`);
      throw error;
    }
  }

  protected async post<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, `POST ${url}`);
      throw error;
    }
  }

  protected async put<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, `PUT ${url}`);
      throw error;
    }
  }

  protected async patch<T, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.patch(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, `PATCH ${url}`);
      throw error;
    }
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await api.delete(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error, `DELETE ${url}`);
      throw error;
    }
  }

  protected handleError(error: any, context: string): void {
    const message = error?.response?.data?.detail || error?.message || 'Unknown network error';
    console.error(`[Service Error] ${context}:`, message, error);
  }
}

