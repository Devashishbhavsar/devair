import { NextRequest, NextResponse } from "next/server";
import { createCoupon, listCoupons } from "@/lib/coupons";
import { currentAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Unauthorized — admin sign-in required." },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET() {
  const admin = await currentAdminEmail();
  if (!admin) return unauthorized();
  return NextResponse.json(
    { coupons: listCoupons() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const admin = await currentAdminEmail();
  if (!admin) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Coupon request body must be a JSON object." },
      { status: 400 },
    );
  }

  const result = createCoupon({
    code: (body as { code?: unknown }).code,
    percentOff: (body as { percentOff?: unknown }).percentOff,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ coupon: result.value }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
