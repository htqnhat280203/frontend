import catalogData from "./products.json";
import type { Product, ProductVariant } from "@/types/product";

export type { Product, ProductDraft, ProductVariant } from "@/types/product";

export const products: Product[] = catalogData;

export const getProductVariants = (product: Product): ProductVariant[] => [
  {
    id: "base",
    label: product.unit,
    baseQuantity: 1,
    price: product.price,
  },
  ...(product.variants ?? []),
];
