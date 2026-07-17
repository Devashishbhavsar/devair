import { NextRequest, NextResponse } from "next/server";
import { createMagicLinkToken, EMAIL_REGEX } from "@/lib/magic-link-store";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = typeof (body as { email?: unknown })?.email === "string"
    ? (body as { email: string }).email.trim().toLowerCase()
    : "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const token = createMagicLinkToken(email);
  const magicLink = new URL(`/api/auth/verify?token=${token}`, request.url).toString();

  // W0 stub: no real email provider yet — log the magic link instead of sending mail.
  // Never return the link in the API response: it is a bearer credential for the account.
  console.log(`[devair] Magic link for ${email}: ${magicLink}`);

  return NextResponse.json({ ok: true });
}
