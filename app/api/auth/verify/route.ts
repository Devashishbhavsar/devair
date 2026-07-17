import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLinkToken } from "@/lib/magic-link-store";
import { createSessionCookieValue, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const email = token ? consumeMagicLinkToken(token) : null;

  if (!email) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "invalid_or_expired_link");
    return NextResponse.redirect(url);
  }

  const response = NextResponse.redirect(new URL("/account", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return response;
}
