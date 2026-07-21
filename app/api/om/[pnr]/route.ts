import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import {
  extendReservationValidity,
  getReservationByPnr,
  requestReservationCancellation,
} from "@/lib/reservations";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Booking status lookup (OM view). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  const reservation = await getReservationByPnr(pnr);
  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, reservation }, { headers: NO_STORE });
}

type OmActionBody = {
  action?: unknown;
  email?: unknown;
  validity?: unknown;
};

/** OM actions: resend_email | request_cancel | extend_validity. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  let body: OmActionBody;
  try {
    body = (await request.json()) as OmActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const action = typeof body.action === "string" ? body.action : "";

  if (action === "resend_email") {
    const reservation = await getReservationByPnr(pnr);
    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }
    const to =
      (typeof body.email === "string" && body.email.trim()) ||
      reservation.travelerEmail ||
      "";
    if (!to) {
      return NextResponse.json(
        { error: "No traveler email on file — provide one to resend." },
        { status: 400 },
      );
    }
    // Stub email provider only (P3 — real_email_provider prohibited).
    await sendEmail(
      to,
      `DevAir reservation ${reservation.pnr} (${reservation.status})`,
      `Your reservation ${reservation.pnr} is ${reservation.status}. ` +
        `Hold valid until ${reservation.holdExpiresAt}. PDF: ${reservation.pdfUrl}`,
    );
    return NextResponse.json(
      { ok: true, action, sentTo: to, mock: true },
      { headers: NO_STORE },
    );
  }

  if (action === "request_cancel") {
    const result = await requestReservationCancellation(pnr);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(
      { ok: true, action, reservation: result.reservation },
      { headers: NO_STORE },
    );
  }

  if (action === "extend_validity") {
    const result = await extendReservationValidity(pnr, body.validity);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json(
      { ok: true, action, reservation: result.reservation },
      { headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { error: "Unknown action. Use resend_email, request_cancel, or extend_validity." },
    { status: 400 },
  );
}
