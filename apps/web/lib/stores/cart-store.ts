import { create } from 'zustand';

interface CartItem {
  seriesId: string;
  seriesName: string;
  quantity: number;
  pricePerBox: number;
  coverImage: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (seriesId: string) => void;
  updateQuantity: (seriesId: string, quantity: number) => void;
  clear: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find((i) => i.seriesId === item.seriesId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.seriesId === item.seriesId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, item] };
    });
  },

  removeItem: (seriesId) => {
    set((state) => ({
      items: state.items.filter((i) => i.seriesId !== seriesId),
    }));
  },

  updateQuantity: (seriesId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.seriesId === seriesId ? { ...i, quantity } : i,
      ),
    }));
  },

  clear: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.pricePerBox * item.quantity, 0);
  },
}));
