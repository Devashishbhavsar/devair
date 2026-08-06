import { NextRequest, NextResponse } from "next/server";
import { setCouponEnabled } from "@/lib/coupons";
import { currentAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const admin = await currentAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized — admin sign-in required." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const enabled = (body as { enabled?: unknown }).enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "Request body must include a boolean enabled field." },
      { status: 400 },
    );
  }

  const { code } = await context.params;
  const result = setCouponEnabled(code, enabled);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ coupon: result.value }, { headers: { "Cache-Control": "no-store" } });
}
