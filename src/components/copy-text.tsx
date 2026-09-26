"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyText({
  value,
  label,
  copyLabel,
  copiedLabel,
  className,
}: {
  value: string;
  label: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);

    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "focus-ring inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors active:scale-[0.98]",
        copied
          ? "bg-herb-soft text-herb"
          : "text-ink-soft hover:bg-brand-50 hover:text-ink",
        className,
      )}
      aria-label={label}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      {copied ? copiedLabel : copyLabel}
    </button>
  );
}
