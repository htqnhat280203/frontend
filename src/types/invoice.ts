import type { CartItem } from "./cart";

export type Invoice = {
  id: string;
  items: CartItem[];
  total: number;
  paidAt: string;
  paymentMethod: string;
  status: "paid";
};