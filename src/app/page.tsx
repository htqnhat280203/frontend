"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getProductVariants, products } from "@/data/products";
import type { Product } from "@/types/product";
import { isPaymentConfigured, paymentMethods } from "@/data/payment";
import type { PaymentMethod } from "@/types/payment";
import {
  addProductToCart,
  DEFAULT_CART,
  getCartSnapshot,
  subscribeToCart,
  updateCart,
} from "@/store/cart-store";
import { getProductCatalog } from "@/store/product-catalog-store";
import { setCheckoutOrder } from "@/store/checkout-store";
import type { CheckoutOrder } from "@/types/checkout";
import { savePaidInvoice } from "@/store/invoice-store";
import PaymentQrCarousel from "@/components/common/PaymentQrCarousel";
import BrandMark from "@/components/layout/BrandMark";
import { formatCurrency } from "@/utils/format-currency";

const PAGE_SIZE = 10;

const loadProductsFromApi = async () => {
  const response = await fetch("/api/products", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  const data = (await response.json()) as Product[];
  return Array.isArray(data) ? data : getProductCatalog();
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const matchesSmartSearch = (product: Product, query: string) => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return true;
  }

  const haystack = normalizeText(
    `${product.name} ${product.category} ${product.unit} ${product.description}`
  );

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((token) => haystack.includes(token));
};

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [search, setSearch] = useState("");
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => DEFAULT_CART);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<CheckoutOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]);
  const [areCategoriesExpanded, setAreCategoriesExpanded] = useState(false);
  const [productCatalog, setProductCatalog] = useState<Product[]>(() => getProductCatalog());

  useEffect(() => {
    let active = true;

    const syncCatalog = async () => {
      try {
        const nextProducts = await loadProductsFromApi();
        if (active) {
          setProductCatalog(nextProducts);
        }
      } catch {
        if (active) {
          setProductCatalog(getProductCatalog());
        }
      }
    };

    syncCatalog();
    return () => {
      active = false;
    };
  }, []);
  const categoryItems = useMemo(
    () => ["Tất cả", ...new Set(productCatalog.map((product) => product.category))],
    [productCatalog]
  );
  const visibleCategories = useMemo(() => {
    if (areCategoriesExpanded || categoryItems.length <= 5) {
      return categoryItems;
    }

    const firstCategories = categoryItems.slice(0, 5);
    if (selectedCategory !== "Tất cả" && !firstCategories.includes(selectedCategory)) {
      return [...firstCategories.slice(0, 4), selectedCategory];
    }

    return firstCategories;
  }, [areCategoriesExpanded, categoryItems, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return productCatalog.filter((product) => {
      const matchCategory =
        selectedCategory === "Tất cả" || product.category === selectedCategory;
      const matchSearch = matchesSmartSearch(product, search);
      return matchCategory && matchSearch;
    });
  }, [productCatalog, search, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (visiblePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredProducts, visiblePage]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const updateCartItem = (id: string, delta: number) => {
    updateCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const removeCartItem = (id: string) => {
    updateCart((current) => current.filter((item) => item.id !== id));
  };

  const clearCart = () => updateCart(() => []);

  const openCartPayment = () => {
    setPaymentOrder(setCheckoutOrder(cart));
    setSelectedPaymentMethod(paymentMethods[0]);
    setIsPaymentOpen(true);
  };

  const confirmCartPaymentReceived = () => {
    if (!paymentOrder) return;
    const orderTotal = paymentOrder.items.reduce((sum, item) => sum + item.price * item.qty, 0);
    savePaidInvoice({
      id: paymentOrder.id,
      items: paymentOrder.items,
      total: orderTotal,
      paidAt: new Date().toISOString(),
      paymentMethod: selectedPaymentMethod.type === "cash" ? "Tiền mặt" : `Chuyển khoản ${selectedPaymentMethod.account.bankName}`,
      status: "paid",
    });
    clearCart();
    setIsPaymentOpen(false);
    setIsCartOpen(false);
    router.push("/checkout/success");
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  if (pathname === "/") {
    return (
      <main className="min-h-screen bg-[#ffff] px-4 py-6 text-slate-800">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#d5d2d263] bg-white/90 px-5 py-4 shadow-[0_12px_30px_rgba(16,24,40,0.04)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <BrandMark size={44} />
              <div><div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Market</div><div className="text-[1.8rem] font-black leading-none text-[#6D341B]">Hương Anh</div></div>
            </div>
            <nav className="flex items-center gap-2"><Link href="/admin/products" className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#CFAE91] hover:text-[#6D341B]">Quản lý hàng</Link><Link href="/admin/debts" className="rounded-full border border-[#f0dfba] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#9b690f]">Quản lý nợ</Link></nav>
          </header>

          <section className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_1.95fr]">
            <div className="rounded-[24px] border border-[#f8f4f0] bg-white p-6 shadow-[0_12px_30px_rgba(16,24,40,0.04)] sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6D341B]">Hương Anh Market</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-900 sm:text-4xl">Cửa hàng tiện lợi cho mỗi ngày</h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Thực phẩm, đồ uống và nhu yếu phẩm được chọn lọc, giao nhanh trong khu vực Đà Nẵng.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-[#f8f4f0] p-4"><strong className="block text-lg text-[#6D341B]">08:00-22:00</strong><span className="text-slate-500">Mở cửa mỗi ngày</span></div><div className="rounded-2xl bg-[#fff8e9] p-4"><strong className="block text-lg text-[#a76700]">1-2 giờ</strong><span className="text-slate-500">Giao hàng dự kiến</span></div></div>
              <Link href="/shop" className="mt-7 inline-flex rounded-full bg-[#6D341B] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_24px_rgb(99, 76, 50)] transition hover:bg-[#CFAE91]">Mua sắm ngay <span className="ml-2">→</span></Link>
            </div>

            <div className="rounded-[24px] border border-[#f8f4f0] bg-white p-5 shadow-[0_12px_30px_rgba(16,24,40,0.04)] sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6D341B]">Được chọn nhiều</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">Best seller hôm nay</h2></div><span className="rounded-full bg-[#fff2ee] px-3 py-1.5 text-xs font-bold text-[#d94a3d]">Bán chạy</span></div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{productCatalog.slice(0, 4).map((product) => <Link key={product.id} href={`/product/${product.id}`} className="group rounded-2xl border border-[#f8f4f0] bg-[#fbfcfb] p-2 transition hover:-translate-y-0.5 hover:border-[#cfead9]"><div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f2f6f3] p-1"><img src={product.image} alt={product.name} className="h-full w-full rounded-lg object-contain transition group-hover:scale-105" /></div><p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-700">{product.name}</p><p className="mt-1 text-sm font-black text-[#6D341B]">{formatCurrency(product.price)} ₫</p></Link>)}</div>
            </div>
          </section>

          <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#f8f4f0] bg-white px-5 py-4 shadow-[0_12px_30px_rgba(16,24,40,0.04)]"><div><h2 className="font-black text-slate-900">Bạn cần quản lý cửa hàng?</h2><p className="mt-1 text-sm text-slate-500">Cập nhật hàng hóa hoặc theo dõi các khoản khách còn thiếu.</p></div><div className="flex gap-2"><Link href="/admin/products" className="rounded-full border border-[#dfe8e1] px-4 py-2 text-sm font-bold text-[#0f7a41]">Hàng hóa</Link><Link href="/admin/debts" className="rounded-full border border-[#f0dfba] px-4 py-2 text-sm font-bold text-[#9b690f]">Công nợ</Link></div></section>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#ffff] px-4 py-6 text-slate-800">
      <div className="mx-auto max-w-[1360px]">
        <header className="rounded-[20px] border border-[#f8f4f0] bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(16,24,40,0.04)] backdrop-blur-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex items-center gap-3 lg:min-w-[220px]">
              <BrandMark size={48} />

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Shop
                </div>
                {/* Màu chữ được đổi từ xanh lá sang nâu đậm */}
                <div className="text-[1.8rem] font-black leading-none text-[#5c3018]">
                  Hương Anh
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-[#f8f4f0] bg-[#e2d9d044] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-full sm:py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f4f0] text-base text-[#6D341B]">
                  📍
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Địa chỉ</div>
                  <div className="text-sm font-semibold text-slate-700">87 Phan Thao, TP. Đà Nẵng</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f4f0] text-base text-slate-600">
                  ⏱
                </div>
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Thời gian</div>
                  <div className="text-sm font-semibold text-slate-700">08:00 - 22:00</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/admin/products" className="hidden rounded-full border border-[#CFAE91] bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#d6e6dc] hover:text-[#0f7a41] lg:block">
                Quản lý hàng
              </Link>
              <Link href="/admin/debts" className="hidden rounded-full border border-[#f0dfba] bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-[#9b690f] transition hover:bg-[#fff4d9] lg:block">
                Quản lý nợ
              </Link>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#f8f4f0] bg-white text-xl text-slate-600 shadow-sm transition hover:border-[#d6e6dc] hover:text-[#0f7a41]"
                aria-label="Mở giỏ hàng"
              >
                🛒
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e85f40] px-1 text-[10px] font-black text-white">
                  {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              </button>
              <div className="rounded-full bg-[#f8f4f0] px-3 py-2 text-xs font-semibold text-[#6D341B] sm:px-4 sm:text-sm">
                Tổng thanh toán: <span className="font-black">{formatCurrency(subtotal)} ₫</span>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_1.95fr]">
          <div className="rounded-[24px] border border-[#f3f3f3] bg-white p-5 shadow-[0_12px_30px_rgba(16,24,40,0.04)] sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6D341B]">Hương Anh Market</p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900">Cửa hàng tiện lợi cho mỗi ngày</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Thực phẩm, đồ uống và nhu yếu phẩm được chọn lọc, giao nhanh trong khu vực Đà Nẵng.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#f8f4f0] p-3"><strong className="block text-lg text-[#6D341B]">08:00-22:00</strong><span className="text-slate-500">Mở cửa mỗi ngày</span></div>
              <div className="rounded-2xl bg-[#fff8e9] p-3"><strong className="block text-lg text-[#6D341B]">1-2 giờ</strong><span className="text-slate-500">Giao hàng dự kiến</span></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/admin/products" className="rounded-full bg-[#6D341B] px-4 py-2 text-sm font-bold text-white">Quản lý hàng hóa</Link>
              <Link href="/admin/debts" className="rounded-full border border-[#6D341B] bg-[#fffaf0] px-4 py-2 text-sm font-bold text-[#6D341B]">Theo dõi công nợ</Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#f8f4f0] bg-white p-5 shadow-[0_12px_30px_rgba(16,24,40,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e85f40]">Được chọn nhiều</p><h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-900">Best seller hôm nay</h2></div>
              <span className="rounded-full bg-[#fff2ee] px-3 py-1.5 text-xs font-bold text-[#d94a3d]">Bán chạy</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {productCatalog.slice(0, 4).map((product) => (
                <Link key={product.id} href={`/product/${product.id}`} className="group rounded-2xl border border-[#f3f3f3] bg-[#f8f4f03b] p-2 transition hover:-translate-y-0.5 hover:border-[#cfead9]">
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f8f4f05b] p-1"><img src={product.image} alt={product.name} className="h-full w-full rounded-lg object-contain transition group-hover:scale-105" /></div>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-700">{product.name}</p>
                  <p className="mt-1 text-sm font-black text-[#e85f40]">{formatCurrency(product.price)} ₫</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[22px] border border-[#f3f3f3] bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="mt-5 mb-5 rounded-[18px] border border-[#CFAE91] bg-[#f8f4f0] p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span className="text-base">⌕</span>
                Tìm nhanh
              </div>
              <div className="relative">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm sản phẩm..."
                  className="w-full rounded-xl border border-[#CFAE91] bg-white px-3 py-2.5 pr-10 text-sm outline-none placeholder:text-slate-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              </div>
            </div>

            <div id="shop-category-list" className="space-y-2">
              {visibleCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSelectedCategory(item)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition ${selectedCategory === item
                      ? "bg-[#f4efec] text-[#6D341B] ring-1 ring-[#CFAE91]"
                      : "text-slate-700 hover:bg-[#f8f4f0]"
                    }`}
                >
                  <span>{item}</span>
                  {selectedCategory === item && <span className="text-base">✓</span>}
                </button>
              ))}
            </div>
            {categoryItems.length > 5 ? (
              <button
                type="button"
                aria-expanded={areCategoriesExpanded}
                aria-controls="shop-category-list"
                onClick={() => setAreCategoriesExpanded((expanded) => !expanded)}
                className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#6D341B] transition hover:bg-[#f8f4f0]"
              >
                <span>{areCategoriesExpanded ? "Thu gọn danh mục" : `Danh mục khác (${categoryItems.length - 5})`}</span>
                <span aria-hidden="true">{areCategoriesExpanded ? "⌃" : "⌄"}</span>
              </button>
            ) : null}

          </aside>

          <main className="space-y-5">
            <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#f2eeea] via-[#e2c7b0] to-[#ab815d] p-5 shadow-[0_18px_40px_rgba(17,128,68,0.08)] ring-1 ring-[#ffead5dd]">
              <div className="absolute inset-y-0 right-0 w-[43%] bg-[radial-gradient(circle_at_20%_35%,rgb(99, 76, 50),transparent_28%),radial-gradient(circle_at_60%_60%,rgba(255,184,58,0.12),transparent_30%)]" />

              <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <div className="max-w-[430px] pl-2">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#CFAE91] bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#6D341B]">
                    <span className="h-2 w-2 rounded-full bg-[#f7b942]" />
                    Khuyến mãi mới
                  </div>
                  <h1 className="text-[2rem] font-black leading-[1.06] text-slate-800 sm:text-[2.4rem]">
                    Gia dụng & thực phẩm <br />
                    <span className="text-[#6D341B]">mọi ngày, tốt hơn</span>
                  </h1>
                  <p className="mt-3 max-w-[360px] text-sm leading-6 text-slate-600">
                    Sản phẩm chất lượng, giao hàng nhanh và giá cả hợp lý cho từng bữa ăn gia đình.
                  </p>
                </div>

                <div className="relative flex w-full items-end justify-between gap-3 pr-0 sm:w-auto sm:justify-start sm:gap-4 sm:pr-3">
                  <div className="rounded-[24px] border border-[#CFAE91] bg-white px-5 py-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Flash sale</div>
                    <div className="mt-2 text-[2rem] font-black text-[#6D341B]">29.000₫</div>
                    <div className="text-xs text-slate-500">Chỉ hôm nay</div>
                  </div>

                  <div className="relative flex h-[130px] w-[130px] items-center justify-center rounded-full bg-gradient-to-br from-[#ffffff] via-[#f5fbf7] to-[#dff4e7] shadow-[0_20px_40px_rgba(17,128,68,0.12)] ring-8 ring-[#edf8f1] sm:h-[180px] sm:w-[180px]">
                    <div className="absolute inset-5 rounded-full bg-[radial-gradient(circle_at_30%_30%,#CFAE91,#CFAE91%,#ec7d29_75%)] opacity-90" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl shadow-inner ring-4 ring-[#f3f9f4]">
                      🧃
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[22px] border border-[#edf1ee] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.6rem] font-black text-slate-800">Danh mục nổi bật</h2>
                <button className="rounded-full border border-[#CFAE91] bg-[#CFAE91] px-3 py-1.5 text-sm font-medium text-white transition hover:border-[#b88c6a]">
                  Xem tất cả
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {categoryItems.slice(0, 8).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelectedCategory(item)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${selectedCategory === item
                        ? "border-[#6D341B] bg-[#f9f5f0] text-[#6D341B]"
                        : "border-[#e9efeb] bg-[#f9faf9] text-slate-600 hover:border-[#dfe9e2]"
                      }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group flex min-h-[390px] flex-col rounded-[18px] border border-[#edf1ee] bg-[#fdfdfd] p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,23,42,0.06)]"
                  >
                    <Link href={`/product/${product.id}`} className="block">
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[14px] bg-[#f5f7f6] p-2">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full rounded-[10px] object-contain transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    </Link>
                    <div className="mt-3 flex flex-1 flex-col">
                      <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400">
                        {product.category}
                      </div>
                      <Link href={`/product/${product.id}`} className="block">
                        <h3 className="mt-2 line-clamp-2 min-h-[46px] text-[15px] font-semibold text-slate-700">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="mt-auto pt-3">
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <div className="text-[1.1rem] font-black text-[#eb4a34]">
                              {formatCurrency(product.price)} ₫
                            </div>
                            <div className="text-[12px] text-slate-400">{product.unit}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();

                              const baseVariant = getProductVariants(product)[0];
                              addProductToCart({
                                id: `${product.id}:${baseVariant.id}`,
                                name: product.name,
                                price: baseVariant.price,
                                image: product.image,
                                variantLabel: baseVariant.label,
                                baseQuantity: baseVariant.baseQuantity,
                              });
                            }}
                            className="rounded-full bg-[#6D341B] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#ffff] transition hover:bg-[#CFAE91]"
                          >
                            Thêm
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#efeae3] pt-4">
                <div className="text-sm text-slate-500">
                  Trang {visiblePage} / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(visiblePage - 1)}
                    disabled={visiblePage === 1}
                    className="rounded-full border border-[#e5e0d9] bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${page === visiblePage
                          ? "bg-[#6D341B] text-white"
                          : "border border-[#e5e0d9] bg-white text-slate-600"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => goToPage(visiblePage + 1)}
                    disabled={visiblePage === totalPages}
                    className="rounded-full border border-[#e5e0d9] bg-white px-3 py-1.5 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </section>
          </main>

          {isCartOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 z-40 bg-slate-900/30"
                aria-label="Đóng giỏ hàng"
              />
              <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col overflow-y-auto border-l border-[#f3f3f3] bg-[#f3f3f3] p-4 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Kiểm tra đơn hàng</p>
                    <h3 className="mt-1 text-[1.4rem] font-black text-[#6D341B]">Giỏ hàng</h3>
                  </div>
                  <button type="button" onClick={() => setIsCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-slate-400 hover:text-slate-700" aria-label="Đóng giỏ hàng">×</button>
                </div>

                <div className="flex-1 space-y-3">
                  {cart.length === 0 ? (
                    <div className="rounded-[16px] border border-dashed border-[#6D341B] bg-white p-4 text-center text-sm text-slate-500">
                      Chưa có sản phẩm nào trong giỏ hàng.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="rounded-[16px] border border-[#edf1ee] bg-white p-2.5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-medium text-slate-700">{item.name}</div>
                            {item.variantLabel ? <div className="mt-1 text-xs text-slate-500">Quy cách: {item.variantLabel}</div> : null}
                            <div className="mt-1 text-base font-black text-[#eb4a34]">{formatCurrency(item.price * item.qty)} ₫</div>
                          </div>
                          <button type="button" onClick={() => removeCartItem(item.id)} className="text-lg text-slate-400 hover:text-red-500" aria-label={`Xóa ${item.name}`}>
                            🗑
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-full border border-[#e7ece8] bg-[#f8faf8] px-2 py-1">
                            <button type="button" onClick={() => updateCartItem(item.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700">−</button>
                            <span className="min-w-[22px] text-center text-sm font-bold text-slate-700">{item.qty}</span>
                            <button type="button" onClick={() => updateCartItem(item.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700">+</button>
                          </div>
                          <div className="text-xs font-medium text-slate-500">{formatCurrency(item.price)} ₫/sp</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-[16px] border border-[#CFAE91] bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Tạm tính</span>
                    <span>{formatCurrency(subtotal)} ₫</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-lg font-bold text-slate-800">
                    <span>Tổng thanh toán</span>
                    <span>{formatCurrency(subtotal)} ₫</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={openCartPayment}
                    disabled={cart.length === 0}
                    className="w-full rounded-xl bg-[#6D341B] py-3 text-center text-base font-extrabold text-white shadow-[0_12px_24px_rgba(99, 76, 50, 0.2)] transition hover:bg-[#7c5f52] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Xác nhận & thanh toán QR
                  </button>
                  <button type="button" onClick={clearCart} className="w-full rounded-xl border border-[#f2c9c3] bg-[#f8f4f0] py-3 text-center text-base font-bold text-[#d94a3d] transition hover:bg-[#ffe7e3]">
                    Xóa hết giỏ hàng
                  </button>
                </div>
              </aside>
            </>
          ) : null}
        </div>
      </div>

      {isPaymentOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/45 px-4 py-4 sm:py-6" role="dialog" aria-modal="true" aria-label="Thanh toán bằng QR">
          <div className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl sm:p-6">
            <button type="button" onClick={() => setIsPaymentOpen(false)} className="absolute right-5 top-4 text-2xl text-slate-400 hover:text-slate-700" aria-label="Đóng">×</button>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6D341B]">Thanh toán chuyển khoản</p>
            <h2 className="mt-2 pr-8 text-2xl font-black text-slate-900">Quét mã để thanh toán</h2>

            {isPaymentConfigured ? (
              <>
                <div className="mt-4">
                  <PaymentQrCarousel
                    amount={paymentOrder?.items.reduce((sum, item) => sum + item.price * item.qty, 0) ?? subtotal}
                    reference={paymentOrder?.id ?? "HUONG ANH MARKET"}
                    onMethodChange={setSelectedPaymentMethod}
                  />
                </div>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">{selectedPaymentMethod.type === "cash" ? "Chỉ xác nhận sau khi nhân viên đã thu đủ tiền mặt." : "Chủ cửa hàng xác nhận sau khi đã kiểm tra tiền vào tài khoản."}</p>
                <button type="button" onClick={confirmCartPaymentReceived} disabled={!paymentOrder} className="mt-3 w-full rounded-full bg-[#CFAE91] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0d6938] disabled:cursor-not-allowed disabled:opacity-40">Xác nhận đã nhận tiền</button>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-[#f5d9a6] bg-[#fff8e9] p-4 text-sm leading-6 text-[#8a5a00]">
                QR chưa được cấu hình. Mở <strong>app/data/payment.ts</strong> và thay <strong>YOUR_ACCOUNT_NUMBER</strong> bằng số tài khoản thật trước khi đưa cho khách sử dụng.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

