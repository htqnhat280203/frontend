"use client";

import { useRef, useState } from "react";
import { createVietQrUrl, paymentMethods } from "@/data/payment";
import type { PaymentMethod } from "@/types/payment";

type PaymentQrCarouselProps = {
  amount: number;
  reference: string;
  onMethodChange?: (method: PaymentMethod) => void;
};

export default function PaymentQrCarousel({
  amount,
  reference,
  onMethodChange,
}: PaymentQrCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const method = paymentMethods[activeIndex];

  const selectMethod = (nextIndex: number) => {
    const wrappedIndex = (nextIndex + paymentMethods.length) % paymentMethods.length;
    if (wrappedIndex === activeIndex) return;
    setActiveIndex(wrappedIndex);
    onMethodChange?.(paymentMethods[wrappedIndex]);
  };

  return (
    <section aria-label="Chọn phương thức thanh toán">
      <div className="mb-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#736D46]">Phương thức thanh toán</p>
        <h3 className="mt-1 text-xl font-black text-[#814C2E]">{method.label}</h3>
        <div className="mt-2 flex items-center justify-center gap-2" role="tablist" aria-label="Phương thức thanh toán">
          {paymentMethods.map((paymentMethod, index) => (
            <button
              key={paymentMethod.id}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Chọn ${paymentMethod.label}`}
              onClick={() => selectMethod(index)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${activeIndex === index ? "bg-[#F3DFC1] text-[#814C2E]" : "bg-transparent text-[#736D46] hover:text-[#814C2E]"}`}
            >
              {paymentMethod.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => selectMethod(activeIndex - 1)}
          aria-label="Phương thức thanh toán trước"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#CFAE91] bg-[#FAF2E0] text-lg font-bold text-[#814C2E] transition hover:border-[#CFAE91] hover:text-[#814C2E]"
        >‹</button>
        <div
          className="flex h-60 w-60 max-w-[calc(100vw-8rem)] touch-pan-y select-none items-center justify-center overflow-hidden rounded-2xl border border-[#CFAE91] bg-[#ffff] p-2 cursor-grab active:cursor-grabbing sm:h-64 sm:w-64"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            swipeStartX.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const startX = swipeStartX.current;
            swipeStartX.current = null;
            if (startX === null) return;
            const distance = event.clientX - startX;
            if (Math.abs(distance) > 45) {
              selectMethod(activeIndex + (distance < 0 ? 1 : -1));
            }
          }}
          onPointerCancel={() => { swipeStartX.current = null; }}
          onDragStart={(event) => event.preventDefault()}
        >
          {method.type === "bank" ? (
            <img
              key={method.id}
              src={createVietQrUrl(amount, reference, method.account)}
              alt={`Mã QR ${method.account.bankName} thanh toán ${amount.toLocaleString("vi-VN")} đồng`}
              className="h-full w-full select-none object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center rounded-xl bg-[#ffff] px-5 text-center">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#814C2E]">Thanh toán khi nhận hàng</span>
              <span className="mt-3 text-4xl font-black text-[#814C2E]">{amount.toLocaleString("vi-VN")} ₫</span>
              <span className="mt-3 text-sm leading-5 text-[#814C2E]">Đưa tiền mặt cho nhân viên khi nhận đơn.</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => selectMethod(activeIndex + 1)}
          aria-label="Phương thức thanh toán tiếp theo"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#CFAE91] bg-[#FAF2E0] text-lg font-bold text-[#814C2E] transition hover:border-[#CFAE91] hover:text-[#814C2E]"
        >›</button>
      </div>

      <div className="mt-4 space-y-2 rounded-2xl bg-[#ffff] p-4 text-left text-sm">
        {method.type === "bank" ? <><div className="flex justify-between gap-3"><span className="text-[#736D46]">Ngân hàng</span><strong>{method.account.bankName}</strong></div><div className="flex justify-between gap-3"><span className="text-[#736D46]">Số tài khoản</span><strong>{method.account.accountNumber}</strong></div><div className="flex justify-between gap-3"><span className="text-[#736D46]">Chủ tài khoản</span><strong className="text-right">{method.account.accountName}</strong></div></> : <div className="flex justify-between gap-3"><span className="text-[#736D46]">Phương thức</span><strong>Tiền mặt khi nhận hàng</strong></div>}
        <div className="flex justify-between gap-3 border-t border-[#CFAE91] pt-2"><span className="text-[#736D46]">Số tiền</span><strong className="text-[#CA6941]">{amount.toLocaleString("vi-VN")} ₫</strong></div>
        {method.type === "bank" ? <div className="flex justify-between gap-3"><span className="text-[#736D46]">Nội dung</span><strong>{reference}</strong></div> : null}
      </div>
    </section>
  );
}