"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { lineKey, type CartIssue, type CartLine } from "./types";

/**
 * Storage that degrades instead of throwing. Safari private mode, and the
 * in-app browsers inside Facebook and Instagram — which is how a lot of people
 * will reach a food page — either block localStorage or throw on write. Without
 * this fallback the cart would be permanently stuck un-hydrated and every tap
 * on "Add" would look like it did nothing.
 */
const memoryStore = new Map<string, string>();

const resilientStorage = createJSONStorage(() => {
  const available = (() => {
    try {
      const probe = "__gks_probe__";
      window.localStorage.setItem(probe, probe);
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  })();

  if (available) return window.localStorage;

  return {
    getItem: (name: string) => memoryStore.get(name) ?? null,
    setItem: (name: string, value: string) => void memoryStore.set(name, value),
    removeItem: (name: string) => void memoryStore.delete(name),
  };
});

type CartState = {
  lines: CartLine[];
  issues: CartIssue[];
  /**
   * False until localStorage has been read back. Rendering a cart count before
   * that point would mismatch the server HTML and flash an empty badge.
   */
  hydrated: boolean;
  setHydrated: () => void;
  add: (line: Omit<CartLine, "key" | "qty">, qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  remove: (key: string) => void;
  clear: () => void;
  dismissIssues: () => void;
  reconcile: (live: LiveItem[]) => void;
};

export type LiveItem = {
  id: string;
  basePrice: number;
  isSoldOut: boolean;
  variants: { id: string; priceDelta: number }[];
  modifiers: Record<string, number>;
};

/**
 * The cart is entirely local. Adding an item performs no network request at
 * all, which is what makes the interaction feel instant on a slow connection —
 * and what keeps the site usable when the connection drops entirely.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      issues: [],
      hydrated: false,

      setHydrated: () => set({ hydrated: true }),

      add: (line, qty = 1) => {
        const key = lineKey(
          line.itemId,
          line.variantId,
          line.modifiers.map((m) => m.id),
        );
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.key === key ? { ...l, qty: l.qty + qty } : l,
            ),
          });
          return;
        }
        set({ lines: [...get().lines, { ...line, key, qty }] });
      },

      setQty: (key, qty) => {
        if (qty <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({
          lines: get().lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        });
      },

      increment: (key) => {
        const line = get().lines.find((l) => l.key === key);
        if (line) get().setQty(key, line.qty + 1);
      },

      decrement: (key) => {
        const line = get().lines.find((l) => l.key === key);
        if (line) get().setQty(key, line.qty - 1);
      },

      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),

      clear: () => set({ lines: [], issues: [] }),

      dismissIssues: () => set({ issues: [] }),

      /**
       * A cart can sit in localStorage overnight. On load we compare it against
       * the live menu and surface what changed instead of silently adjusting
       * the total or deleting lines — the customer decides what to do.
       */
      reconcile: (live) => {
        const byId = new Map(live.map((i) => [i.id, i]));
        const issues: CartIssue[] = [];
        const lines: CartLine[] = [];

        for (const line of get().lines) {
          const item = byId.get(line.itemId);
          if (!item) {
            issues.push({
              type: "removed",
              key: line.key,
              nameEn: line.nameEn,
              nameNe: line.nameNe,
            });
            continue;
          }

          if (item.isSoldOut) {
            issues.push({
              type: "sold_out",
              key: line.key,
              nameEn: line.nameEn,
              nameNe: line.nameNe,
            });
          }

          const variantDelta = line.variantId
            ? (item.variants.find((v) => v.id === line.variantId)?.priceDelta ??
              0)
            : 0;
          const modifierDelta = line.modifiers.reduce(
            (sum, m) => sum + (item.modifiers[m.id] ?? m.priceDelta),
            0,
          );
          const livePrice = item.basePrice + variantDelta + modifierDelta;

          if (livePrice !== line.unitPrice) {
            issues.push({
              type: "price_changed",
              key: line.key,
              nameEn: line.nameEn,
              nameNe: line.nameNe,
              oldPrice: line.unitPrice,
              newPrice: livePrice,
            });
          }

          lines.push({ ...line, unitPrice: livePrice });
        }

        set({ lines, issues });
      },
    }),
    {
      name: "gks-cart-v1",
      storage: resilientStorage,
      partialize: (state) => ({ lines: state.lines }),
      // Called with the rehydrated state, including on failure — so the UI
      // unblocks either way rather than waiting forever on storage.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export const useCartCount = () =>
  useCartStore((s) => s.lines.reduce((n, l) => n + l.qty, 0));

export const useCartSubtotal = () =>
  useCartStore((s) => s.lines.reduce((n, l) => n + l.qty * l.unitPrice, 0));

export const useCartLine = (key: string) =>
  useCartStore(useShallow((s) => s.lines.find((l) => l.key === key)));
