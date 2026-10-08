import type { CartItem } from "@/types/cart";
import type { CheckoutOrder } from "@/types/checkout";

export type { CheckoutOrder } from "@/types/checkout";

export const CHECKOUT_STORAGE_KEY = "huong-anh-checkout-order";
export const CHECKOUT_STORAGE_EVENT = "huong-anh-checkout-changed";
export const EMPTY_CHECKOUT_ORDER: CheckoutOrder | null = null;
let checkoutRaw: string | null = null;
let checkoutSnapshot: CheckoutOrder | null = EMPTY_CHECKOUT_ORDER;

export const subscribeToCheckoutOrder = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHECKOUT_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHECKOUT_STORAGE_EVENT, onChange);
  };
};

export const getCheckoutOrderSnapshot = () => {
  const raw = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);

  if (raw !== checkoutRaw) {
    checkoutRaw = raw;
    if (raw) {
      try {
        checkoutSnapshot = JSON.parse(raw) as CheckoutOrder;
      } catch {
        checkoutSnapshot = EMPTY_CHECKOUT_ORDER;
      }
    } else {
      checkoutSnapshot = EMPTY_CHECKOUT_ORDER;
    }
  }

  return checkoutSnapshot;
};

export const setCheckoutOrder = (items: CartItem[]) => {
  const order: CheckoutOrder = {
    id: `HA${Date.now()}`,
    items,
    createdAt: new Date().toISOString(),
  };
  checkoutRaw = JSON.stringify(order);
  checkoutSnapshot = order;
  window.localStorage.setItem(CHECKOUT_STORAGE_KEY, checkoutRaw);
  window.dispatchEvent(new Event(CHECKOUT_STORAGE_EVENT));
  return order;
};
