"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ShareLink({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
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
        className,
      )}
    >
      <Share2 className="size-4" aria-hidden />
      {copied ? "Copied" : label}
    </button>
  );
}
