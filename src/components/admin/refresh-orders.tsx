"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 15_000;

/** Pull new orders onto the board while the kitchen is watching. */
export function RefreshOrders() {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [router]);

  return null;
}
