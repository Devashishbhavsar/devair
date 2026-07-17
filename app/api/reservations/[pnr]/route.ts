import { NextResponse } from "next/server";
import { getReservationByPnr } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  let reservation: Awaited<ReturnType<typeof getReservationByPnr>>;
  try {
    reservation = await getReservationByPnr(pnr);
  } catch {
    return NextResponse.json({ error: "Could not load reservation." }, { status: 500 });
  }

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      reservation,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
