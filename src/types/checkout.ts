import type { CartItem } from "./cart";

export type CheckoutOrder = {
  id: string;
  items: CartItem[];
  createdAt: string;
};