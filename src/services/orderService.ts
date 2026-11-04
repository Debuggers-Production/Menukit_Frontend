import { BaseService } from './baseService';
import { OrderEntity } from '@/models/OrderEntity';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '@/types';

export class OrderService extends BaseService {
  private static instance: OrderService;

  public static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  public async getOrders(shopId: string, params?: Record<string, any>): Promise<OrderEntity[]> {
    const rawOrders = await this.get<Order[]>(`/shops/${shopId}/orders`, { params });
    return (rawOrders || []).map(order => new OrderEntity(order));
  }

  public async getOrderById(shopId: string, orderId: string): Promise<OrderEntity> {
    const raw = await this.get<Order>(`/shops/${shopId}/orders/${orderId}`);
    return new OrderEntity(raw);
  }

  public async createOrder(shopId: string, orderData: Partial<Order>): Promise<OrderEntity> {
    const created = await this.post<Order>(`/shops/${shopId}/orders`, orderData);
    return new OrderEntity(created);
  }

  public async updateOrderStatus(shopId: string, orderId: string, status: OrderStatus): Promise<OrderEntity> {
    const updated = await this.patch<Order>(`/shops/${shopId}/orders/${orderId}/status`, { status });
    return new OrderEntity(updated);
  }

  public async updatePaymentStatus(
    shopId: string,
    orderId: string,
    paymentStatus: PaymentStatus,
    paymentMethod?: PaymentMethod,
    splitPayments?: any[]
  ): Promise<OrderEntity> {
    const updated = await this.patch<Order>(`/shops/${shopId}/orders/${orderId}/payment`, {
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      split_payments: splitPayments
    });
    return new OrderEntity(updated);
  }

  public async cancelOrder(shopId: string, orderId: string, reason?: string): Promise<OrderEntity> {
    const updated = await this.patch<Order>(`/shops/${shopId}/orders/${orderId}/cancel`, { reason });
    return new OrderEntity(updated);
  }
}

export const orderService = OrderService.getInstance();
