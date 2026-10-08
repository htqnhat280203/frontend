"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { products } from "@/data/products";
import { getProductCatalog } from "@/store/product-catalog-store";
import type { Product, ProductDraft } from "@/types/product";
import { formatCurrency } from "@/utils/format-currency";

const emptyForm: ProductDraft = {
  name: "",
  price: 0,
  image: "",
  unit: "1 sản phẩm",
  category: "Đồ khô",
  description: "",
  variants: [],
};

const loadCatalog = async () => {
  try {
    const response = await fetch("/api/products", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load catalog");
    }

    const data = (await response.json()) as Product[];
    return Array.isArray(data) ? data : getProductCatalog();
  } catch {
    return getProductCatalog();
  }
};

export default function ProductAdminPage() {
  const [catalog, setCatalog] = useState<Product[]>(() => products);
  const [form, setForm] = useState<ProductDraft>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? catalog.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query))
      : catalog;
  }, [catalog, search]);
  const categories = useMemo(
    () => [...new Set([...catalog.map((product) => product.category), form.category])].sort(),
    [catalog, form.category]
  );

  useEffect(() => {
    let active = true;

    const syncCatalog = async () => {
      const nextCatalog = await loadCatalog();
      if (active) {
        setCatalog(nextCatalog);
      }
    };

    syncCatalog();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      image: product.image,
      unit: product.unit,
      category: product.category,
      description: product.description,
      badge: product.badge,
      variants: product.variants ?? [],
    });
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || form.price <= 0 || !form.image.trim() || !form.description.trim() || form.variants?.some((variant) => !variant.label.trim() || variant.baseQuantity <= 1 || variant.price <= 0)) {
      setMessage("Vui lòng kiểm tra thông tin sản phẩm và các quy cách bổ sung.");
      return;
    }

    try {
      if (editingId) {
        const response = await fetch(`/api/admin/products/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as Product | { error?: string };
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error ?? "Không cập nhật được sản phẩm.");
        }

        setCatalog((current) => current.map((product) => (product.id === editingId ? { ...product, ...payload } : product)));
        setMessage("Đã cập nhật sản phẩm trên database.");
      } else {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const payload = (await response.json()) as Product | { error?: string };
        if (!response.ok) {
          throw new Error((payload as { error?: string }).error ?? "Không lưu được sản phẩm.");
        }

        setCatalog((current) => [payload as Product, ...current]);
        setMessage("Đã thêm sản phẩm mới trên database.");
      }

      resetForm();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu sản phẩm.");
    }
  };

  const addVariant = () => {
    setForm((current) => ({
      ...current,
      variants: [...(current.variants ?? []), { id: `variant-${Date.now()}`, label: "Lốc 6", baseQuantity: 6, price: 0 }],
    }));
  };

  const updateVariant = (index: number, patch: Partial<NonNullable<ProductDraft["variants"]>[number]>) => {
    setForm((current) => ({
      ...current,
      variants: (current.variants ?? []).map((variant, variantIndex) => variantIndex === index ? { ...variant, ...patch } : variant),
    }));
  };

  const removeVariant = (index: number) => {
    setForm((current) => ({
      ...current,
      variants: (current.variants ?? []).filter((_, variantIndex) => variantIndex !== index),
    }));
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Bạn có chắc muốn xóa “${product.name}” không?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Không xóa được sản phẩm.");
      }

      setCatalog((current) => current.filter((item) => item.id !== product.id));
      if (editingId === product.id) resetForm();
      setMessage("Đã xóa sản phẩm trên database.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa sản phẩm.");
    }
  };

  return (
    <main className="min-h-screen bg-[#ffff] px-4 py-8 text-[#6D341B]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#814C2E]">Quản trị cửa hàng</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[#6D341B]">Quản lý sản phẩm</h1>
            <p className="mt-2 text-sm font-bold text-[#736D46]">Thêm, chỉnh sửa hoặc xóa hàng hóa đang hiển thị trên cửa hàng.</p>
          </div>
          <Link href="/" className="rounded-full border border-[#CFAE91] bg-[#FAF2E0] px-4 py-2 text-sm font-semibold text-[#814C2E]">Về cửa hàng</Link>
        </header>

        <section className="mb-6 rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#736D46]">{editingId ? "Chỉnh sửa" : "Sản phẩm mới"}</p>
              <h2 className="mt-1 text-xl font-black text-[#6D341B]">{editingId ? "Cập nhật thông tin" : "Thêm hàng hóa"}</h2>
            </div>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-full border border-[#CFAE91] px-4 py-2 text-sm font-semibold text-[#814C2E]">Hủy sửa</button> : null}
          </div>

          <form onSubmit={saveProduct}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-semibold">Tên sản phẩm<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="Dầu ăn Tường An 1L" /></label>
              <label className="text-sm font-semibold">Giá bán<input required min="1" type="number" value={form.price || ""} onChange={(event) => setForm({ ...form, price: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="45000" /></label>
              <label className="text-sm font-semibold">Đơn vị bán<input required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="1 chai" /></label>
              <label className="text-sm font-semibold">Danh mục<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] bg-[#ffff] px-3 py-3 font-normal outline-none focus:border-[#814C2E]">{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className="text-sm font-semibold">Nhãn sản phẩm<input value={form.badge ?? ""} onChange={(event) => setForm({ ...form, badge: event.target.value || undefined })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="Bán chạy (không bắt buộc)" /></label>
              <label className="text-sm font-semibold">URL hình ảnh<input required type="url" value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} className="mt-2 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="https://..." /></label>
            </div>
            <label className="mt-4 block text-sm font-semibold">Mô tả<textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[#CFAE91] px-3 py-3 font-normal outline-none focus:border-[#814C2E]" placeholder="Mô tả để khách dễ tìm kiếm và hiểu sản phẩm" /></label>
            <section className="mt-5 rounded-2xl border border-[#F3DFC1] bg-[#FAF2E0] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-bold text-[#6D341B]">Quy cách đóng gói bổ sung</h3><p className="mt-1 text-xs text-[#736D46]">Giá và số lượng quy đổi theo đơn vị gốc “{form.unit || "sản phẩm"}”.</p></div>
                <button type="button" onClick={addVariant} className="rounded-full border border-[#CFAE91] bg-[#FAF2E0] px-4 py-2 text-sm font-bold text-[#814C2E]">+ Thêm quy cách</button>
              </div>
              {(form.variants ?? []).length > 0 ? <div className="mt-4 space-y-3">{form.variants?.map((variant, index) => <div key={variant.id} className="grid gap-3 rounded-xl border border-[#CFAE91] bg-[#FAF2E0] p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-end"><label className="text-xs font-semibold text-[#814C2E]">Tên quy cách<input value={variant.label} onChange={(event) => updateVariant(index, { label: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#CFAE91] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#814C2E]" placeholder="Thùng 24 chai" /></label><label className="text-xs font-semibold text-[#814C2E]">Số đơn vị gốc<input min="2" type="number" value={variant.baseQuantity} onChange={(event) => updateVariant(index, { baseQuantity: Number(event.target.value) })} className="mt-1.5 w-full rounded-lg border border-[#CFAE91] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#814C2E]" /></label><label className="text-xs font-semibold text-[#814C2E]">Giá quy cách (VNĐ)<input min="1" type="number" value={variant.price || ""} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} className="mt-1.5 w-full rounded-lg border border-[#CFAE91] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#814C2E]" placeholder="288000" /></label><button type="button" onClick={() => removeVariant(index)} className="rounded-lg px-3 py-2.5 text-sm font-bold text-[#CA6941] hover:bg-[#F3DFC1]">Xóa</button></div>)}</div> : <p className="mt-4 text-sm text-[#736D46]">Chưa có quy cách bổ sung. Giá/đơn vị ở trên sẽ là lựa chọn bán lẻ mặc định.</p>}
            </section>
            {message ? <p className="mt-4 rounded-xl bg-[#F3DFC1] px-4 py-3 text-sm font-semibold text-[#814C2E]">{message}</p> : null}
            <button type="submit" className="mt-5 rounded-full bg-[#814C2E] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#6D341B]">{editingId ? "Lưu thay đổi" : "Thêm sản phẩm"}</button>
          </form>
        </section>

        <section className="rounded-[24px] border border-[#CFAE91] bg-[#ffff] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-xl font-black text-[#6D341B]">Danh sách hàng hóa</h2><p className="mt-1 text-sm font-bold text-[#736D46]">{catalog.length} sản phẩm đang hiển thị</p></div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-full border border-[#CFAE91] px-4 py-2.5 text-sm font-extrabold outline-none focus:border-[#814C2E] sm:w-64" placeholder="Tìm sản phẩm..." />
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[#F3DFC1] text-xs uppercase tracking-[0.12em] text-[#736D46]"><th className="pb-3">Sản phẩm</th><th className="pb-3">Danh mục</th><th className="pb-3">Giá</th><th className="pb-3 text-right">Thao tác</th></tr></thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id} className="border-b border-[#CFAE91] last:border-0">
                    <td className="py-3"><div className="flex items-center gap-3"><img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" /><div><div className="font-semibold text-[#6D341B]">{product.name}</div><div className="text-xs text-[#736D46]">{1 + (product.variants?.length ?? 0)} quy cách · đơn vị gốc: {product.unit}</div></div></div></td>
                    <td className="py-3 text-[#814C2E]">{product.category}</td>
                    <td className="py-3 font-bold text-[#CA6941]">{formatCurrency(product.price)} ₫</td>
                    <td className="py-3 text-right"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEditing(product)} className="rounded-full border border-[#CFAE91] px-3 py-1.5 text-xs font-bold text-[#814C2E] hover:bg-[#F3DFC1]">Sửa</button><button type="button" onClick={() => deleteProduct(product)} className="rounded-full border border-[#CFAE91] px-3 py-1.5 text-xs font-bold text-[#CA6941] hover:bg-[#F3DFC1]">Xóa</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProducts.length === 0 ? <p className="py-10 text-center text-sm text-[#736D46]">Không tìm thấy sản phẩm.</p> : null}
          </div>
        </section>

        <p className="mt-4 text-xs leading-5 text-[#736D46]">Dữ liệu đang được đồng bộ qua API và cơ sở dữ liệu. Khi triển khai thật, cần bổ sung đăng nhập quản trị để khóa quyền sửa/xóa.</p>
      </div>
    </main>
  );
}
