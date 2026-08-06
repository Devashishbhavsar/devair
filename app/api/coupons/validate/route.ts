import { NextRequest, NextResponse } from "next/server";
import { validateCouponCode } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  const subtotal = typeof body === "object" && body !== null ? (body as { subtotal?: unknown }).subtotal : undefined;

  const result = validateCouponCode(typeof code === "string" ? code : "", subtotal);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ...result },
    { headers: { "Cache-Control": "no-store" } },
  );
}
