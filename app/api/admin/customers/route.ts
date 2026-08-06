import { NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admin";
import { listCustomers, listRefundRequests } from "@/lib/customers";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Admin customer surface (AC AD-10 / AD-20): customers aggregated by traveler
 * email plus the refund request queue (AC CP-01).
 */
export async function GET() {
  const admin = await currentAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized — admin sign-in required." },
      { status: 401, headers: NO_STORE },
    );
  }

  const [customers, refunds] = await Promise.all([listCustomers(), listRefundRequests()]);
  return NextResponse.json({ customers, refunds }, { headers: NO_STORE });
}
