"use client";

import { useState } from "react";
import { Check, Copy, Phone } from "lucide-react";
import { telHref } from "@/lib/phone";
import { cn } from "@/lib/utils";

async function writeClipboard(value: string) {
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

const iconBtn =
  "focus-ring inline-grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98]";

export function CallIconButton({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <a
      href={telHref(phone)}
      className={cn(iconBtn, className)}
      aria-label={`Call ${phone}`}
    >
      <Phone className="size-4" aria-hidden />
    </a>
  );
}

export function CopyIconButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await writeClipboard(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(iconBtn, copied && "text-herb hover:text-herb", className)}
      aria-label={label}
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </button>
  );
}

export function PhoneWithActions({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
        className,
      )}
    >
      <span className="min-w-0 break-all tabular-nums text-ink-soft">{phone}</span>
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <CallIconButton phone={phone} />
        <CopyIconButton value={phone} label="Copy phone number" />
      </span>
    </div>
  );
}

export function AddressWithActions({
  addressLine,
  zone,
  copyValue: copyValueProp,
  className,
}: {
  addressLine: string;
  zone?: string;
  copyValue?: string;
  className?: string;
}) {
  const copyValue =
    copyValueProp ?? [addressLine, zone].filter(Boolean).join(", ");

  return (
    <p
      className={cn(
        "inline-flex max-w-full flex-wrap items-start gap-x-1 gap-y-1 text-sm leading-relaxed",
        className,
      )}
    >
      <span className="min-w-0 break-words text-ink">{addressLine}</span>
      <CopyIconButton value={copyValue} label="Copy address" className="mt-px shrink-0" />
    </p>
  );
}
