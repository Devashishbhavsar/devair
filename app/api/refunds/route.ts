import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";
import { createRefundRequest } from "@/lib/customers";

export const dynamic = "force-dynamic";

/** Customer-facing refund request: the signed-in traveler owns the reservation. */
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!email) {
    return NextResponse.json(
      { error: "Sign-in is required to request a refund." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Refund request body must be a JSON object." },
      { status: 400 },
    );
  }

  const result = await createRefundRequest({
    pnr: (body as { pnr?: unknown }).pnr,
    reason: (body as { reason?: unknown }).reason,
    email,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ok: true, refund: result.value },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
