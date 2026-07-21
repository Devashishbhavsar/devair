import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  googleAuthorizeUrl,
  isGoogleOAuthConfigured,
  OAUTH_STATE_COOKIE_MAX_AGE,
  OAUTH_STATE_COOKIE_NAME,
} from "@/lib/auth/google";

export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "google_oauth_not_configured");
    return NextResponse.redirect(url);
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(
    googleAuthorizeUrl(request.nextUrl.origin, state),
  );
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_STATE_COOKIE_MAX_AGE,
  });
  return response;
}
