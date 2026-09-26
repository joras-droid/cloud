"use client";

import { useState } from "react";
import { AddButton } from "@/components/cart/add-button";
import { OptionSheet } from "./option-sheet";
import type { MenuItem } from "@/server/queries/menu";

/** Thin client boundary so the card itself can stay a Server Component. */
export function ItemActions({
  item,
  className,
}: {
  item: MenuItem;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddButton
        item={item}
        className={className}
        onNeedsOptions={() => setOpen(true)}
      />
      {open ? (
        <OptionSheet item={item} open={open} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
