import { NextRequest, NextResponse } from "next/server";
import { createHoldReservation } from "@/lib/reservations";

export const dynamic = "force-dynamic";

type ReservationRequestShape = {
  from?: unknown;
  to?: unknown;
  date?: unknown;
  passengers?: unknown;
  airline?: unknown;
  tripType?: unknown;
  offerId?: unknown;
  selectedOfferId?: unknown;
  validity?: unknown;
  travelerName?: unknown;
  travelerEmail?: unknown;
};

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof createHoldReservation>>;
  try {
    result = await createHoldReservation({
      ...((body ?? {}) as ReservationRequestShape),
      origin: request.nextUrl.origin,
    });
  } catch {
    return NextResponse.json({ error: "Could not create reservation hold." }, { status: 500 });
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.errors[0]?.message ?? "Could not create reservation hold.",
        errors: result.errors,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      reservation: result.reservation,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
