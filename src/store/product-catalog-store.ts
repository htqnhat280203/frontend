import { products } from "@/data/products";
import type { Product, ProductDraft } from "@/types/product";

export const CUSTOM_PRODUCTS_KEY = "huong-anh-custom-products";
export const PRODUCT_OVERRIDES_KEY = "huong-anh-product-overrides";
export const DELETED_PRODUCTS_KEY = "huong-anh-deleted-products";
export const PRODUCT_STORAGE_EVENT = "huong-anh-products-changed";

export type { ProductDraft } from "@/types/product";

const parseJson = <T,>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getProductCatalog = () => {
  if (typeof window === "undefined") {
    return products;
  }

  const customProducts = parseJson<Product[]>(
    window.localStorage.getItem(CUSTOM_PRODUCTS_KEY),
    []
  );
  const overrides = parseJson<Record<string, ProductDraft>>(
    window.localStorage.getItem(PRODUCT_OVERRIDES_KEY),
    {}
  );
  const deletedIds = new Set(
    parseJson<string[]>(window.localStorage.getItem(DELETED_PRODUCTS_KEY), [])
  );

  return [...products, ...customProducts]
    .filter((product) => !deletedIds.has(product.id))
    .map((product) => ({ ...product, ...overrides[product.id] }));
};

export const saveProductCatalogChange = () => {
  window.dispatchEvent(new Event(PRODUCT_STORAGE_EVENT));
};
