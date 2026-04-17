// REQUIRED DEPS (must be in package.json):
//   "zustand": "^5.0.0"
//   "nanoid": "^5.0.0"
// If the infra agent did not add them, please add to dependencies.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

export type CartUnit = "lb" | "each";

export interface CartLine {
  id: string;
  menu_item_id: string;
  menu_item_slug: string;
  variant_id?: string;
  variant_slug?: string;
  name_en: string;
  name_es: string;
  variant_name_en?: string;
  variant_name_es?: string;
  quantity: number;
  unit: CartUnit;
  unit_price: number;
  line_total: number;
  notes?: string;
}

export interface CartStore {
  lines: CartLine[];
  pickup_date_id: string | null;
  add: (line: Omit<CartLine, "id" | "line_total">) => void;
  remove: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  setPickupDate: (id: string | null) => void;
  clear: () => void;
  subtotal: () => number;
  totalLbs: () => number;
  itemCount: () => number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      pickup_date_id: null,

      add: (partial) => {
        const quantity = partial.quantity;
        const line_total = round(quantity * partial.unit_price);

        // Merge with an existing line that matches item+variant+notes.
        const existing = get().lines.find(
          (l) =>
            l.menu_item_id === partial.menu_item_id &&
            l.variant_id === partial.variant_id &&
            (l.notes ?? "") === (partial.notes ?? "")
        );

        if (existing) {
          const newQty = round(existing.quantity + quantity);
          set({
            lines: get().lines.map((l) =>
              l.id === existing.id
                ? {
                    ...l,
                    quantity: newQty,
                    line_total: round(newQty * l.unit_price),
                  }
                : l
            ),
          });
          return;
        }

        const newLine: CartLine = {
          ...partial,
          id: nanoid(),
          line_total,
        };
        set({ lines: [...get().lines, newLine] });
      },

      remove: (id) => set({ lines: get().lines.filter((l) => l.id !== id) }),

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => l.id !== id) });
          return;
        }
        set({
          lines: get().lines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  quantity,
                  line_total: round(quantity * l.unit_price),
                }
              : l
          ),
        });
      },

      setPickupDate: (id) => set({ pickup_date_id: id }),
      clear: () => set({ lines: [], pickup_date_id: null }),

      subtotal: () =>
        round(get().lines.reduce((sum, l) => sum + l.line_total, 0)),
      totalLbs: () =>
        round(
          get()
            .lines.filter((l) => l.unit === "lb")
            .reduce((sum, l) => sum + l.quantity, 0)
        ),
      itemCount: () =>
        get().lines.reduce((sum, l) => sum + (l.unit === "each" ? l.quantity : 1), 0),
    }),
    {
      name: "cdn-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, pickup_date_id: s.pickup_date_id }),
    }
  )
);
