"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart/store";

/** Cart is local. Once the order exists on the server, empty it so a refresh
 *  cannot place the same bag twice. */
export function ClearCartOnDone() {
  const clear = useCartStore((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
