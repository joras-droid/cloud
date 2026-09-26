"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import type { AdminMenuRow } from "@/server/queries/admin";
import { setItemAvailability, setItemPrice } from "@/server/actions/menu";
import { formatPaisa, rupeesToPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

export function MenuTable({
  items,
  canEdit,
}: {
  items: AdminMenuRow[];
  canEdit: boolean;
}) {
  const grouped = items.reduce<Record<string, AdminMenuRow[]>>((acc, item) => {
    (acc[item.categoryEn] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, rows]) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
            {category}
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-paper">
            {rows.map((item) => (
              <MenuRow key={item.id} item={item} canEdit={canEdit} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MenuRow({ item, canEdit }: { item: AdminMenuRow; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState(String(item.basePrice / 100));
  const [saved, setSaved] = useState(false);

  const soldOut = item.status === "sold_out";

  function savePrice() {
    const rupees = Number(price);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setPrice(String(item.basePrice / 100));
      return;
    }
    const paisa = rupeesToPaisa(rupees);
    if (paisa === item.basePrice) return;

    startTransition(async () => {
      await setItemPrice(item.id, paisa);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <li className="flex items-center gap-3 p-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-line">
        {item.imageKind === "video" && item.image ? (
          <video
            src={item.image}
            muted
            playsInline
            preload="metadata"
            className={cn("size-full object-cover", soldOut && "opacity-40 grayscale")}
          />
        ) : item.image ? (
          <Image
            src={item.image}
            alt=""
            fill
            sizes="48px"
            className={cn("object-cover", soldOut && "opacity-40 grayscale")}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/menu/${item.id}`}
          className="focus-ring block truncate rounded font-medium text-ink hover:text-brand-700"
        >
          {item.nameEn}
        </Link>
        <p className="truncate text-sm text-ink-faint">
          {item.nameNe ?? (
            // A missing translation is flagged, never a blocker — adding a dish
            // at 8pm must not wait on finding the Nepali word for it.
            <span className="text-gold">Nepali name missing</span>
          )}
        </p>
      </div>

      {canEdit ? (
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-ink-faint">Rs</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={price}
            disabled={pending}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={savePrice}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label={`Price for ${item.nameEn}`}
            className="focus-ring w-20 rounded-lg border border-line px-2 py-1.5 text-right tabular-nums"
          />
          {pending ? (
            <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
          ) : saved ? (
            <Check className="size-4 text-herb" aria-label="Saved" />
          ) : (
            <span className="size-4" />
          )}
        </label>
      ) : (
        <span className="text-sm font-medium tabular-nums">
          {formatPaisa(item.basePrice)}
        </span>
      )}

      <form action={setItemAvailability} className="shrink-0">
        <input type="hidden" name="itemId" value={item.id} />
        {/* The target is fixed in the markup, so a resubmitted or retried
            request always writes the same value. */}
        <input
          type="hidden"
          name="status"
          value={soldOut ? "published" : "sold_out"}
        />
        <AvailabilityButton soldOut={soldOut} />
      </form>
    </li>
  );
}

function AvailabilityButton({ soldOut }: { soldOut: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={soldOut}
      className={cn(
        "focus-ring w-24 rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
        soldOut
          ? "bg-chilli text-white hover:bg-chilli/90"
          : "bg-herb-soft text-herb hover:bg-herb hover:text-white",
      )}
    >
      {pending ? "Saving…" : soldOut ? "Sold out" : "Available"}
    </button>
  );
}
