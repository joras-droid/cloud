"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import {
  QR_METHODS,
  QR_METHOD_LABELS,
  isQrMethod,
  type QrMethodName,
} from "@/lib/payment-methods";

type MethodDraft = {
  key: string;
  method: QrMethodName;
  accountName: string;
  note: string;
  image: string;
};

function blank(method: QrMethodName, key: string): MethodDraft {
  return { key, method, accountName: "", note: "", image: "" };
}

export function PrepayEditor({
  enabled: initialEnabled,
  methods: initialMethods,
}: {
  enabled: boolean;
  methods: {
    method: string;
    accountName: string;
    image: string;
    note?: string;
  }[];
}) {
  const reactId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const keySeq = useRef(0);
  const nextKey = () => {
    keySeq.current += 1;
    return `${reactId}-${keySeq.current}`;
  };

  const [enabled, setEnabled] = useState(initialEnabled);
  const [methods, setMethods] = useState<MethodDraft[]>(() =>
    initialMethods.flatMap((qr) => {
      if (!isQrMethod(qr.method)) return [];
      return [
        {
          key: nextKey(),
          method: qr.method,
          accountName: qr.accountName,
          note: qr.note ?? "",
          image: qr.image,
        },
      ];
    }),
  );
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewsRef = useRef(previews);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(previewsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onSubmit = (event: Event) => {
      if (!enabled) return;
      const message = validate(rootRef.current, methods);
      if (!message) return;
      event.preventDefault();
      setError(message);
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [enabled, methods]);

  function update(key: string, patch: Partial<MethodDraft>) {
    setError(undefined);
    setMethods((rows) =>
      rows.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function addMethod() {
    const used = new Set(methods.map((row) => row.method));
    const method = QR_METHODS.find((name) => !used.has(name));
    if (!method) return;
    setError(undefined);
    setMethods((rows) => [...rows, blank(method, nextKey())]);
  }

  function removeMethod(key: string) {
    setError(undefined);
    setPreviews((current) => {
      const url = current[key];
      if (url) URL.revokeObjectURL(url);
      const next = { ...current };
      delete next[key];
      return next;
    });
    setMethods((rows) => rows.filter((row) => row.key !== key));
  }

  function onFile(key: string, file: File | undefined) {
    setError(undefined);
    setPreviews((current) => {
      const previous = current[key];
      if (previous) URL.revokeObjectURL(previous);
      if (!file) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: URL.createObjectURL(file) };
    });
  }

  return (
    <section
      ref={rootRef}
      className="grid gap-3 rounded-card border border-line bg-paper p-5"
    >
      <h2 className="font-display text-lg font-bold">Prepayment</h2>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="prepayEnabled"
          checked={enabled}
          onChange={(event) => {
            const on = event.target.checked;
            setEnabled(on);
            setError(undefined);
            if (on && methods.length === 0) {
              setMethods([blank("fonepay", nextKey())]);
            }
          }}
          className="size-4 accent-brand-600"
        />
        Accept prepayment
      </label>
      <p className="text-sm text-ink-soft">
        When this is on, customers can pay by QR before the kitchen starts the
        order. Turn it off to take cash on delivery only. Cash on delivery has
        its own switch below.
      </p>

      {enabled ? (
        <div className="grid gap-4">
          <input type="hidden" name="qrCount" value={methods.length} />
          {methods.map((row, index) => {
            const used = new Set(
              methods.filter((other) => other.key !== row.key).map((other) => other.method),
            );
            const preview = previews[row.key] || row.image;
            return (
              <fieldset
                key={row.key}
                className="grid gap-3 rounded-xl border border-line bg-cream/40 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{QR_METHOD_LABELS[row.method]}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMethod(row.key)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`${row.key}-method`}>Payment app</Label>
                    <Select
                      id={`${row.key}-method`}
                      name={`qr.${index}.method`}
                      value={row.method}
                      onChange={(event) => {
                        if (!isQrMethod(event.target.value)) return;
                        update(row.key, { method: event.target.value });
                      }}
                      className="mt-1.5"
                    >
                      {QR_METHODS.filter(
                        (name) => name === row.method || !used.has(name),
                      ).map((name) => (
                        <option key={name} value={name}>
                          {QR_METHOD_LABELS[name]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`${row.key}-account`}>Account name</Label>
                    <Input
                      id={`${row.key}-account`}
                      name={`qr.${index}.accountName`}
                      value={row.accountName}
                      onChange={(event) =>
                        update(row.key, { accountName: event.target.value })
                      }
                      maxLength={80}
                      required
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor={`${row.key}-note`} hint="optional">
                    Note
                  </Label>
                  <Input
                    id={`${row.key}-note`}
                    name={`qr.${index}.note`}
                    value={row.note}
                    onChange={(event) => update(row.key, { note: event.target.value })}
                    maxLength={160}
                    placeholder="Account number, branch, or who the transfer is to"
                    className="mt-1.5"
                  />
                </div>

                <input type="hidden" name={`qr.${index}.image`} value={row.image} />

                {preview ? (
                  <div className="relative aspect-square w-full max-w-48 overflow-hidden rounded-xl bg-paper">
                    <Image
                      src={preview}
                      alt={`${QR_METHOD_LABELS[row.method]} QR`}
                      fill
                      unoptimized
                      className="object-contain"
                      sizes="192px"
                    />
                  </div>
                ) : (
                  <div className="grid aspect-square w-full max-w-48 place-items-center rounded-xl border border-dashed border-line text-sm text-ink-faint">
                    No QR yet
                  </div>
                )}

                <div>
                  <Label htmlFor={`${row.key}-file`}>
                    {row.image || previews[row.key] ? "Replace QR" : "Upload QR"}
                  </Label>
                  <input
                    id={`${row.key}-file`}
                    name={`qr.${index}.file`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={(event) => onFile(row.key, event.target.files?.[0])}
                    className="mt-1.5 block w-full text-sm text-ink-soft file:mr-3 file:rounded-pill file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                  />
                </div>
              </fieldset>
            );
          })}

          {methods.length < QR_METHODS.length ? (
            <Button type="button" variant="outline" onClick={addMethod}>
              Add payment method
            </Button>
          ) : null}
          <FieldError>{error}</FieldError>
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Turn this on to choose payment apps and upload or replace their QR
          codes.
        </p>
      )}
    </section>
  );
}

function validate(root: HTMLElement | null, methods: MethodDraft[]): string | null {
  if (methods.length === 0) {
    return "Add a payment method and upload its QR before turning prepayment on.";
  }
  for (const row of methods) {
    if (!row.accountName.trim()) {
      return "Each payment method needs an account name.";
    }
    const input = root?.querySelector<HTMLInputElement>(
      `input[type="file"][id="${CSS.escape(row.key)}-file"]`,
    );
    const hasFile = Boolean(input?.files && input.files.length > 0);
    if (!row.image && !hasFile) return "Each payment method needs a QR image.";
  }
  return null;
}
