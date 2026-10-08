import type { CartItem } from "@/types/cart";

export type { CartItem } from "@/types/cart";

export const CART_STORAGE_KEY = "huong-anh-cart";
export const CART_STORAGE_EVENT = "huong-anh-cart-changed";
export const DEFAULT_CART: CartItem[] = [
  { id: "A", name: "24 ly mì Omachi chua cay 113g", qty: 2, price: 378000, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=700&q=80" },
  { id: "B", name: "Thùng 24 ly mì không sấy 67g", qty: 2, price: 279000, image: "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=700&q=80" },
];

let cartRaw: string | null = null;
let cartSnapshot = DEFAULT_CART;

export const subscribeToCart = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(CART_STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CART_STORAGE_EVENT, onChange);
  };
};

export const getCartSnapshot = () => {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);

  if (raw !== cartRaw) {
    cartRaw = raw;
    if (raw) {
      try {
        cartSnapshot = JSON.parse(raw) as CartItem[];
      } catch {
        cartSnapshot = DEFAULT_CART;
      }
    } else {
      cartSnapshot = DEFAULT_CART;
    }
  }

  return cartSnapshot;
};

export const updateCart = (updater: (current: CartItem[]) => CartItem[]) => {
  const nextCart = updater(getCartSnapshot());
  cartRaw = JSON.stringify(nextCart);
  cartSnapshot = nextCart;
  window.localStorage.setItem(CART_STORAGE_KEY, cartRaw);
  window.dispatchEvent(new Event(CART_STORAGE_EVENT));
};

export const addProductToCart = (item: Omit<CartItem, "qty">) => {
  updateCart((current) => {
    const existing = current.find((cartItem) => cartItem.id === item.id);
    return existing
      ? current.map((cartItem) =>
          cartItem.id === existing.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
        )
      : [...current, { ...item, qty: 1 }];
  });
};
