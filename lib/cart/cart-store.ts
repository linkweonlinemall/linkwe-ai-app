import { create } from "zustand";

type CartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  stock: number | null;
  isDigital: boolean;
  store: { name: string; slug: string };
};

type CartVariant = {
  id: string;
  name: string;
  price: number | null;
  attributes: { name: string; value: string; hex?: string }[];
};

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
};

type CartStore = {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  /** Increments after add-to-cart success to drive header / tab cart icon bounce */
  cartBumpNonce: number;
  setItems: (items: CartItem[]) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setLoading: (loading: boolean) => void;
  bumpCartIcon: () => void;
  itemCount: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  cartBumpNonce: 0,
  setItems: (items) => set({ items }),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  bumpCartIcon: () => set((s) => ({ cartBumpNonce: s.cartBumpNonce + 1 })),
  itemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),
  subtotal: () =>
    get().items.reduce((sum, i) => {
      const price = i.variant?.price ?? i.product.price;
      return sum + price * i.quantity;
    }, 0),
}));
