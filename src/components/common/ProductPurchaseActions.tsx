"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addProductToCart } from "@/store/cart-store";
import { setCheckoutOrder } from "@/store/checkout-store";
import { getProductVariants } from "@/data/products";
import type { Product, ProductVariant } from "@/types/product";

export default function ProductPurchaseActions({ product }: { product: Product }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const variants = getProductVariants(product);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0].id);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  const getCartItem = (variant: ProductVariant) => ({
    id: `${product.id}:${variant.id}`,
    name: product.name,
    price: variant.price,
    image: product.image,
    variantLabel: variant.label,
    baseQuantity: variant.baseQuantity,
  });

  const addToCart = () => {
    addProductToCart(getCartItem(selectedVariant));
    setAdded(true);
  };

  const buyNow = () => {
    setCheckoutOrder([{ ...getCartItem(selectedVariant), qty: 1 }]);
    router.push("/checkout");
  };

  return (
    <div className="mt-7">
      {variants.length > 1 ? (
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-[#6D341B]">Chọn quy cách bán</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={selectedVariant.id === variant.id}
                onClick={() => {
                  setSelectedVariantId(variant.id);
                  setAdded(false);
                }}
                className={`rounded-xl border px-3 py-3 text-left transition ${selectedVariant.id === variant.id ? "border-[#814C2E] bg-[#F3DFC1] ring-1 ring-[#814C2E]" : "border-[#CFAE91] bg-[#FAF2E0] hover:border-[#CFAE91]"}`}
              >
                <span className="block text-sm font-bold text-[#6D341B]">{variant.label}</span>
                <span className="mt-1 block text-sm font-black text-[#CA6941]">{variant.price.toLocaleString("vi-VN")} ₫</span>
                <span className="mt-1 block text-[11px] text-[#736D46]">{variant.baseQuantity} {product.unit}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      <p className="mb-3 mt-4 text-lg font-black text-[#CA6941]">
        {selectedVariant.price.toLocaleString("vi-VN")} ₫ <span className="text-sm font-medium text-[#736D46]">/ {selectedVariant.label}</span>
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          className="flex-1 rounded-full bg-[#814C2E] px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] text-white shadow-[0_12px_24px_rgba(31,122,61,0.2)] transition hover:bg-[#6D341B] active:scale-[0.99]"
        >
          {added ? "Đã thêm vào giỏ ✓" : `Thêm ${selectedVariant.label} vào giỏ`}
        </button>
        <button
          type="button"
          onClick={buyNow}
          className="flex-1 rounded-full border border-[#CFAE91] bg-[#FAF2E0] px-5 py-3 text-sm font-bold uppercase tracking-[0.1em] text-[#814C2E] transition hover:bg-[#FAF2E0] active:scale-[0.99]"
        >
          Mua ngay
        </button>
      </div>
      {added ? (
        <p role="status" className="mt-3 text-center text-sm font-medium text-[#814C2E]">
          Đã thêm {product.name} ({selectedVariant.label}) vào giỏ hàng.
        </p>
      ) : null}
    </div>
  );
}
