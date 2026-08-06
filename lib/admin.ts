import { cookies } from "next/headers";
import { readSessionEmail, SESSION_COOKIE_NAME } from "./session";

// Admin RBAC (lite MVP per Architecture.md "Admin — RBAC bookings ops").
// Allowlist comes from DEVAIR_ADMIN_EMAILS (comma-separated). When unset the
// demo build falls back to a single documented demo admin so local flows work
// without secret configuration; magic-link auth still gates access (an
// attacker needs the admin's inbox).
const DEFAULT_ADMIN_EMAIL = "admin@devair.test";

export function adminEmails(): string[] {
  const raw = process.env.DEVAIR_ADMIN_EMAILS
    ?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean) ?? [];
  return raw.length > 0 ? raw : [DEFAULT_ADMIN_EMAIL];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return adminEmails().includes(normalized);
}

export async function currentAdminEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  return isAdminEmail(email) ? email : null;
}
