export function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

export function optional(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value.length ? value : null;
}

export function flag(form: FormData, key: string): boolean {
  const value = form.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function rupeesField(form: FormData, key: string): number {
  const n = Number(text(form, key));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Invalid amount for ${key}`);
  return Math.round(n * 100);
}
