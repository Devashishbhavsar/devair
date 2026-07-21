import { NextRequest, NextResponse } from "next/server";
import { expirePastDueHolds } from "@/lib/reservations";

export const dynamic = "force-dynamic";

/**
 * Expire job (T-JOBS / AU): cancels past-due holds by marking them expired.
 * Callable by a scheduler (POST) or manually (GET) — idempotent either way.
 */
async function runExpireJob() {
  const result = await expirePastDueHolds();
  return NextResponse.json(
    {
      ok: true,
      job: "expire-holds",
      checked: result.checked,
      expiredCount: result.expired.length,
      expired: result.expired.map((reservation) => ({
        pnr: reservation.pnr,
        airlineRef: reservation.airlineRef,
        holdExpiresAt: reservation.holdExpiresAt,
        status: reservation.status,
      })),
      ranAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(_request: NextRequest) {
  return runExpireJob();
}

export async function GET(_request: NextRequest) {
  return runExpireJob();
}
