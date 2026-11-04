import { Order, OrderItem, OrderStatus, PaymentStatus, PaymentMethod } from '@/types';

/**
 * OrderEntity
 * OOP Domain Model representing a customer or merchant order.
 * Encapsulates order calculations, status checks, lifecycle validations, and formatting.
 */
export class OrderEntity {
  public id: string;
  public shop_id: string;
  public order_number: number;
  public order_type: string;
  public status: OrderStatus;
  public payment_status: PaymentStatus;
  public payment_method?: PaymentMethod;
  public customer_name?: string;
  public customer_mobile?: string;
  public table_number?: string;
  public token_number?: string;
  public delivery_address?: string;
  public items: OrderItem[];
  public subtotal: number;
  public tax_amount: number;
  public discount_amount: number;
  public delivery_fee: number;
  public total_amount: number;
  public notes?: string;
  public created_at: string;
  public updated_at: string;

  constructor(data: Partial<Order>) {
    this.id = data.id || '';
    this.shop_id = data.shop_id || '';
    this.order_number = data.order_number || 0;
    this.order_type = data.order_type || 'dine_in';
    this.status = (data.status as OrderStatus) || 'pending';
    this.payment_status = (data.payment_status as PaymentStatus) || 'unpaid';
    this.payment_method = data.payment_method;
    this.customer_name = data.customer_name;
    this.customer_mobile = data.customer_mobile;
    this.table_number = data.table_number;
    this.token_number = data.token_number;
    this.delivery_address = data.delivery_address;
    this.items = data.items || [];
    this.subtotal = data.subtotal || 0;
    this.tax_amount = data.tax_amount || 0;
    this.discount_amount = data.discount_amount || 0;
    this.delivery_fee = data.delivery_fee || 0;
    this.total_amount = data.total_amount || 0;
    this.notes = data.notes;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // --- Domain Logic & Calculations ---

  public getTotalItemCount(): number {
    return this.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }

  public isPending(): boolean {
    return this.status === 'pending';
  }

  public isAccepted(): boolean {
    return this.status === 'accepted';
  }

  public isPreparing(): boolean {
    return this.status === 'preparing' || this.status === 'in_kitchen';
  }

  public isReady(): boolean {
    return this.status === 'ready' || this.status === 'packed';
  }

  public isCompleted(): boolean {
    return this.status === 'completed' || this.status === 'delivered';
  }

  public isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  public isPaid(): boolean {
    return this.payment_status === 'paid';
  }

  public isUnpaid(): boolean {
    return this.payment_status === 'unpaid';
  }

  public canCancel(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  public canTransitionTo(nextStatus: OrderStatus): boolean {
    if (this.isCancelled() || this.isCompleted()) return false;
    return true;
  }

  public getElapsedTimeMinutes(): number {
    const created = new Date(this.created_at).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / (1000 * 60)));
  }

  public getFormattedTime(): string {
    try {
      const date = new Date(this.created_at);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  public getFormattedDate(): string {
    try {
      const date = new Date(this.created_at);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  }

  public getCleanDeliveryAddress(): string {
    if (!this.delivery_address) return '';
    return this.delivery_address.replace(/\s*\[loc=.*?\]/, '').trim();
  }

  public getStatusTheme(): { color: string; label: string; bg: string } {
    switch (this.status) {
      case 'pending':
        return { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/60', label: 'Pending' };
      case 'accepted':
        return { color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-950/60', label: 'Accepted' };
      case 'preparing':
      case 'in_kitchen':
        return { color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-950/60', label: 'Preparing' };
      case 'ready':
      case 'packed':
        return { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/60', label: 'Ready' };
      case 'completed':
      case 'delivered':
        return { color: 'text-slate-700 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800', label: 'Completed' };
      case 'cancelled':
        return { color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/60', label: 'Cancelled' };
      default:
        return { color: 'text-slate-600', bg: 'bg-slate-100', label: this.status };
    }
  }

  public toJSON(): Order {
    return {
      id: this.id,
      shop_id: this.shop_id,
      order_number: this.order_number,
      order_type: this.order_type as any,
      status: this.status,
      payment_status: this.payment_status,
      payment_method: this.payment_method,
      customer_name: this.customer_name,
      customer_mobile: this.customer_mobile,
      table_number: this.table_number,
      token_number: this.token_number,
      delivery_address: this.delivery_address,
      items: this.items,
      subtotal: this.subtotal,
      tax_amount: this.tax_amount,
      discount_amount: this.discount_amount,
      delivery_fee: this.delivery_fee,
      total_amount: this.total_amount,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}
