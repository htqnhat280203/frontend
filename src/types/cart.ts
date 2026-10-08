export type CartItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  image: string;
  variantLabel?: string;
  baseQuantity?: number;
};