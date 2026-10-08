export type ProductVariant = {
  id: string;
  label: string;
  baseQuantity: number;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  unit: string;
  category: string;
  description: string;
  badge?: string;
  variants?: ProductVariant[];
};

export type ProductDraft = Omit<Product, "id">;