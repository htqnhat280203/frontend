import type { ProductVariant } from "./product";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProductRow = {
  id: string;
  name: string;
  price: number;
  image: string;
  unit: string;
  category: string;
  description: string;
  badge: string | null;
  variants: ProductVariant[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type DebtRow = {
  id: string;
  customer: string;
  phone: string;
  amount: number;
  due_date: string | null;
  note: string;
  status: "unpaid" | "paid";
  order_id: string | null;
  items: Json;
  created_at: string;
  updated_at: string;
};

export type InvoiceRow = {
  id: string;
  items: Json;
  total: number;
  paid_at: string;
  payment_method: string;
  status: "paid";
  created_at: string;
};

export type CustomerRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  created_at: string;
  updated_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string;
  status: "pending" | "confirmed" | "preparing" | "shipping" | "completed" | "cancelled";
  payment_status: "unpaid" | "paid";
  subtotal: number;
  discount_amount: number;
  total: number;
  promotion_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string;
  unit: string;
  variant_id: string;
  variant_label: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  status: "pending" | "paid" | "failed" | "refunded";
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionRow = {
  id: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  starts_at: string;
  ends_at: string | null;
  max_redemptions: number | null;
  redemption_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      products: Table<
        ProductRow,
        Omit<ProductRow, "created_at" | "updated_at">,
        Partial<ProductRow>
      >;
      debts: Table<DebtRow, Omit<DebtRow, "created_at" | "updated_at">>;
      invoices: Table<InvoiceRow, Omit<InvoiceRow, "created_at">>;
      customers: Table<CustomerRow, Omit<CustomerRow, "id" | "created_at" | "updated_at">>;
      orders: Table<OrderRow, Omit<OrderRow, "id" | "order_number" | "created_at" | "updated_at">>;
      order_items: Table<OrderItemRow, Omit<OrderItemRow, "id">>;
      payments: Table<PaymentRow, Omit<PaymentRow, "id" | "created_at" | "updated_at">>;
      promotions: Table<PromotionRow, Omit<PromotionRow, "id" | "created_at" | "updated_at">>;
    };
    Views: Record<string, never>;
    Functions: {
      place_order: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_email: string | null;
          p_customer_address: string;
          p_items: Json;
          p_payment_method: string;
          p_promotion_code: string | null;
          p_note: string;
        };
        Returns: {
          order_id: string;
          order_number: string;
          subtotal: number;
          discount_amount: number;
          total: number;
        }[];
      };
      admin_confirm_order_payment: {
        Args: { p_order_id: string };
        Returns: InvoiceRow;
      };
      admin_mark_order_as_debt: {
        Args: { p_order_id: string };
        Returns: DebtRow;
      };
      admin_place_order: {
        Args: {
          p_customer_name: string;
          p_customer_phone: string;
          p_customer_email: string | null;
          p_customer_address: string;
          p_items: Json;
          p_payment_method: string;
          p_promotion_code: string | null;
          p_note: string;
          p_action: "paid" | "unpaid";
        };
        Returns: {
          order_id: string;
          order_number: string;
          subtotal: number;
          discount_amount: number;
          total: number;
          payment_status: "paid" | "unpaid";
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};