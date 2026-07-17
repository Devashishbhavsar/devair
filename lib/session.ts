import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "devair_session";
// No fixed fallback: an ephemeral random secret is generated per-process when
// SESSION_SECRET is unset, so local dev works but no fixed literal ever exists.
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

export function createSessionCookieValue(email: string): string {
  const payload = Buffer.from(email, "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSessionEmail(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expectedSignature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
