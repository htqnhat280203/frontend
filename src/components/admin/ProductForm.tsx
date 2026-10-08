"use client";
import React, { useEffect, useState } from "react";
import { Product } from "./ProductList";

interface ProductFormProps {
  initialProduct?: Partial<Product>;
  onSubmit: (product: Omit<Product, "id">) => void;
  onCancel: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ initialProduct = {}, onSubmit, onCancel }) => {
  const [name, setName] = useState(initialProduct.name ?? "");
  const [price, setPrice] = useState(initialProduct.price ?? 0);
  const [description, setDescription] = useState(initialProduct.description ?? "");
  const [image, setImage] = useState(initialProduct.image ?? "");
  const [barcode, setBarcode] = useState(initialProduct.barcode ?? "");
  const [stock, setStock] = useState(initialProduct.stock ?? 0);

  useEffect(() => {
    setName(initialProduct.name ?? "");
    setPrice(initialProduct.price ?? 0);
    setDescription(initialProduct.description ?? "");
    setImage(initialProduct.image ?? "");
    setBarcode(initialProduct.barcode ?? "");
    setStock(initialProduct.stock ?? 0);
  }, [initialProduct]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, price, description, image, barcode, stock });
  };

  return (
    <form className="space-y-4 p-4 bg-[#FAF2E0] rounded shadow" onSubmit={handleSubmit}>
      <div>
        <label className="block font-medium">Tên hàng</label>
        <input className="w-full border px-2 py-1 rounded" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <label className="block font-medium">Giá</label>
        <input type="number" className="w-full border px-2 py-1 rounded" value={price} onChange={e => setPrice(Number(e.target.value))} required min={0} />
      </div>
      <div>
        <label className="block font-medium">Barcode</label>
        <input className="w-full border px-2 py-1 rounded" value={barcode} onChange={e => setBarcode(e.target.value)} />
      </div>
      <div>
        <label className="block font-medium">Tồn kho</label>
        <input type="number" className="w-full border px-2 py-1 rounded" value={stock} onChange={e => setStock(Number(e.target.value))} min={0} />
      </div>
      <div>
        <label className="block font-medium">Mô tả</label>
        <textarea className="w-full border px-2 py-1 rounded" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="block font-medium">Hình ảnh (URL)</label>
        <input className="w-full border px-2 py-1 rounded" value={image} onChange={e => setImage(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Lưu</button>
        <button type="button" className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>Huỷ</button>
      </div>
    </form>
  );
};

export default ProductForm;
