/** Order type definitions. */

export type OrderStatus = 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled';

export interface ShippingAddress {
  id: number;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: number;
  spu_name: string;
  sku_code: string;
  spec_snapshot: { spec_name: string; spec_value: string }[];
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_no: string;
  status: OrderStatus;
  total_amount: number;
  actual_amount: number;
  currency: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  buyer_remark: string;
  items: OrderItem[];
  created_at: string;
  paid_at?: string;
  shipped_at?: string;
}
