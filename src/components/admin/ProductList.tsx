"use client";
import React from "react";

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  barcode: string;
  stock: number;
};

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

const ProductList: React.FC<ProductListProps> = ({ products, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="min-w-full bg-[#FAF2E0] border border-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 border">Hình ảnh</th>
            <th className="px-4 py-2 border">Tên hàng</th>
            <th className="px-4 py-2 border">Giá</th>
            <th className="px-4 py-2 border">Barcode</th>
            <th className="px-4 py-2 border">Tồn kho</th>
            <th className="px-4 py-2 border">Mô tả</th>
            <th className="px-4 py-2 border">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                Không có sản phẩm nào.
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td className="border px-2 py-1">
                  <img src={product.image} alt={product.name} className="w-16 h-16 object-cover" />
                </td>
                <td className="border px-2 py-1">{product.name}</td>
                <td className="border px-2 py-1">{product.price.toLocaleString()}₫</td>
                <td className="border px-2 py-1">{product.barcode}</td>
                <td className="border px-2 py-1">{product.stock}</td>
                <td className="border px-2 py-1">{product.description}</td>
                <td className="border px-2 py-1">
                  <button className="bg-blue-500 text-white px-2 py-1 rounded mr-2" onClick={() => onEdit(product)}>Sửa</button>
                  <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => onDelete(product.id)}>Xoá</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProductList;
