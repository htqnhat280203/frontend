import Link from "next/link";
import { notFound } from "next/navigation";
import ProductPurchaseActions from "@/components/common/ProductPurchaseActions";
import { products as fallbackProducts } from "@/data/products";
import type { Product } from "@/types/product";

const getProductById = async (id: string) => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/products`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return fallbackProducts.find((item) => item.id === id) ?? null;
    }

    const data = (await response.json()) as Product[];
    return data.find((item) => item.id === id) ?? null;
  } catch {
    return fallbackProducts.find((item) => item.id === id) ?? null;
  }
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#ffff] px-4 py-8 text-[#6D341B]">
      <div className="mx-auto max-w-6xl rounded-[28px] border border-[#d5d2d263] bg-[#ffff] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-[#d5d2d263] bg-[#ffff] px-4 py-2 text-sm font-semibold text-[#814C2E] transition hover:border-[#d5d2d263]"
          >
            ← Quay lại
          </Link>
          <span className="rounded-full bg-[#F3DFC1] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6D341B]">
            {product.category}
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[24px] border border-[#d5d2d263] bg-[#ffff] p-4">
            <img
              src={product.image}
              alt={product.name}
              className="h-[480px] w-full rounded-[18px] object-cover"
            />
          </div>

          <div className="flex flex-col justify-center">
            {product.badge ? (
              <span className="mb-3 inline-flex w-fit rounded-full bg-[#ffff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#814C2E]">
                {product.badge}
              </span>
            ) : null}

            <h1 className="text-3xl font-black tracking-[-0.05em] text-[#6D341B] lg:text-4xl">
              {product.name}
            </h1>

            <p className="mt-5 text-base leading-7 text-[#814C2E]">
              {product.description}
            </p>

            <div className="mt-6 space-y-3 rounded-[20px] border border-[#F3DFC1] bg-[#ffff] p-4">
              <div className="flex items-center justify-between text-sm text-[#814C2E]">
                <span className="font-extrabold">Thương hiệu</span>
                <span className="font-semibold text-[#6D341B]">Hương Anh Shop</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#814C2E]">
                <span className="font-extrabold">Giao hàng</span>
                <span className="font-semibold text-[#6D341B]">1-2 ngày</span>
              </div>
              <div className="flex items-center justify-between text-sm text-[#814C2E]">
                <span className="font-extrabold">Đánh giá</span>
                <span className="font-semibold text-[#6D341B]">4.8/5</span>
              </div>
            </div>

            <ProductPurchaseActions product={product} />
          </div>
        </div>
      </div>
    </main>
  );
}
