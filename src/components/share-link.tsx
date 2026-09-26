"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareLink({
  url,
  label,
  className,
  iconOnly,
}: {
  url: string;
  label: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url });
      } catch {
        // The customer dismissed the share sheet.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "active:scale-[0.98]",
        iconOnly && "inline-grid size-8 shrink-0 place-items-center p-0",
        className,
      )}
      aria-label={label}
    >
      <Share2 className="size-4 shrink-0" aria-hidden />
      {iconOnly ? (
        <span className="sr-only">{copied ? "Copied" : label}</span>
      ) : (
        (copied ? "Copied" : label)
      )}
    </button>
  );
}
