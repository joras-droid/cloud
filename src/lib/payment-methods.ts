export const QR_METHODS = ["fonepay", "esewa", "khalti", "bank"] as const;

export type QrMethodName = (typeof QR_METHODS)[number];

export const QR_METHOD_LABELS: Record<QrMethodName, string> = {
  fonepay: "Fonepay",
  esewa: "eSewa",
  khalti: "Khalti",
  bank: "Bank",
};

export function isQrMethod(value: string): value is QrMethodName {
  return (QR_METHODS as readonly string[]).includes(value);
}

export function qrMethodLabel(value: string): string {
  return isQrMethod(value) ? QR_METHOD_LABELS[value] : value;
}
