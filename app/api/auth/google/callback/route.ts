import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForEmail,
  isGoogleOAuthConfigured,
  OAUTH_STATE_COOKIE_NAME,
  verifyOAuthState,
} from "@/lib/auth/google";
import {
  createSessionCookieValue,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

function failureRedirect(request: NextRequest, error: string): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set("error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return failureRedirect(request, "google_oauth_not_configured");
  }

  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;
  if (!verifyOAuthState(state) || state !== cookieState) {
    return failureRedirect(request, "google_oauth_state_mismatch");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return failureRedirect(request, "google_oauth_denied");
  }

  const email = await exchangeCodeForEmail(code, request.nextUrl.origin);
  if (!email) {
    return failureRedirect(request, "google_oauth_failed");
  }

  const response = NextResponse.redirect(new URL("/account", request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return response;
}
