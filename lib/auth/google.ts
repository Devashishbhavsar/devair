import { createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Google OAuth, gated by env (AC: routes work when env present; otherwise gated).
 * Required env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 * Optional: GOOGLE_REDIRECT_URI (defaults to <origin>/api/auth/google/callback).
 */

const STATE_COOKIE = "devair_oauth_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;
// Same per-process fallback pattern as lib/session.ts — never a fixed literal.
const STATE_SECRET =
  process.env.SESSION_SECRET || randomBytes(32).toString("hex");

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function sign(value: string): string {
  return createHmac("sha256", STATE_SECRET).update(value).digest("hex");
}

export function createOAuthState(): string {
  const nonce = randomBytes(16).toString("hex");
  return `${nonce}.${sign(nonce)}`;
}

export function verifyOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;
  const [nonce, signature] = state.split(".");
  if (!nonce || !signature) return false;
  const expected = sign(nonce);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function googleRedirectUri(requestOrigin: string): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `${requestOrigin}/api/auth/google/callback`
  );
}

export function googleAuthorizeUrl(requestOrigin: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(requestOrigin),
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForEmail(
  code: string,
  requestOrigin: string,
): Promise<string | null> {
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(requestOrigin),
    }),
  });
  if (!tokenResponse.ok) return null;

  const tokens: { access_token?: string } = await tokenResponse.json();
  if (!tokens.access_token) return null;

  const profileResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );
  if (!profileResponse.ok) return null;

  const profile: { email?: string; email_verified?: boolean } =
    await profileResponse.json();
  if (!profile.email || profile.email_verified === false) return null;
  return profile.email;
}

export const OAUTH_STATE_COOKIE_NAME = STATE_COOKIE;
export const OAUTH_STATE_COOKIE_MAX_AGE = STATE_MAX_AGE_SECONDS;
