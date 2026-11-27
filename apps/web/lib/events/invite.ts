import { randomBytes } from "node:crypto";

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/l/I

/** Random, URL-safe invite code (AGENTS.md rule 6). 12 chars ≈ 70 bits. */
export function newInviteCode(length = 12): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    const b = bytes[i];
    // Rejection sampling keeps the distribution uniform.
    if (b < 256 - (256 % ALPHABET.length)) out += ALPHABET[b % ALPHABET.length];
  }
  return out.length === length ? out : newInviteCode(length);
}

export function isInviteCodeShape(code: string): boolean {
  return /^[A-Za-z0-9]{10,32}$/.test(code);
}
