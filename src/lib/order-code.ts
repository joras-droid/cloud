const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Short code read aloud on the phone: GKS-4F7Q. No O/0 or I/1. */
export function makeOrderCode(): string {
  let body = "";
  for (let i = 0; i < 4; i += 1) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `GKS-${body}`;
}
