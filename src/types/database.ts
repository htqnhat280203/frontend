import type { ProductVariant } from "./product";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};