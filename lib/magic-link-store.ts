import { randomBytes } from "crypto";

interface MagicLinkEntry {
  email: string;
  expiresAt: number;
}

const TOKEN_TTL_MS = 15 * 60 * 1000;

interface GlobalWithMagicLinkStore {
  __devairMagicLinkStore__?: Map<string, MagicLinkEntry>;
}
const globalForStore = globalThis as GlobalWithMagicLinkStore;

const store: Map<string, MagicLinkEntry> = globalForStore.__devairMagicLinkStore__ ??
  new Map<string, MagicLinkEntry>();
globalForStore.__devairMagicLinkStore__ = store;

export function createMagicLinkToken(email: string): string {
  const token = randomBytes(24).toString("base64url");
  store.set(token, { email, expiresAt: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function consumeMagicLinkToken(token: string): string | null {
  const entry = store.get(token);
  if (!entry) return null;
  store.delete(token);
  if (entry.expiresAt < Date.now()) return null;
  return entry.email;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
