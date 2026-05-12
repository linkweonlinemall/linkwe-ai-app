import { create } from "zustand";

type CartProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  stock: number | null;
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
  setItems: (items: CartItem[]) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setLoading: (loading: boolean) => void;
  itemCount: () => number;
  subtotal: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isOpen: false,
  isLoading: false,
  setItems: (items) => set({ items }),
  openDrawer: () => set({ isOpen: true }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set((s) => ({ isOpen: !s.isOpen })),
  setLoading: (isLoading) => set({ isLoading }),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
  subtotal: () =>
    get().items.reduce((sum, i) => {
      const price = i.variant?.price ?? i.product.price;
      return sum + price * i.quantity;
    }, 0),
}));
