import { NextRequest, NextResponse } from "next/server";
import { createMockPaymentIntent, isStripeMockEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

type PaymentBody = {
  amountCents?: unknown;
  amount?: unknown;
  currency?: unknown;
  reservationPnr?: unknown;
  pnr?: unknown;
  passengerEmail?: unknown;
  email?: unknown;
  passengerName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asAmountCents(body: PaymentBody): number | null {
  if (typeof body.amountCents === "number" && Number.isFinite(body.amountCents)) {
    return Math.round(body.amountCents);
  }
  if (typeof body.amountCents === "string" && body.amountCents.trim()) {
    const n = Number(body.amountCents);
    return Number.isFinite(n) ? Math.round(n) : null;
  }
  // Dollars → cents (checkout UI uses dollars)
  if (typeof body.amount === "number" && Number.isFinite(body.amount)) {
    return Math.round(body.amount * 100);
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isStripeMockEnabled()) {
    return NextResponse.json(
      { error: "Only gated Stripe mock/test mode is enabled (P3)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Payment body must be a JSON object." }, { status: 400 });
  }

  const payload = body as PaymentBody;
  const amountCents = asAmountCents(payload);
  if (amountCents === null || amountCents < 1) {
    return NextResponse.json(
      { error: "amountCents (positive integer) or amount (dollars) is required." },
      { status: 400 },
    );
  }

  const first = asString(payload.firstName);
  const last = asString(payload.lastName);
  const passengerName =
    asString(payload.passengerName) ||
    (first || last ? [first, last].filter(Boolean).join(" ") : undefined);

  try {
    const intent = createMockPaymentIntent({
      amountCents,
      currency: asString(payload.currency) || "usd",
      reservationPnr: asString(payload.reservationPnr) || asString(payload.pnr),
      passengerEmail: asString(payload.passengerEmail) || asString(payload.email),
      passengerName,
    });

    return NextResponse.json(
      {
        ok: true,
        mock: true,
        livemode: false,
        paymentIntent: {
          id: intent.id,
          clientSecret: intent.client_secret,
          amount: intent.amount,
          currency: intent.currency,
          status: intent.status,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create payment.";
    const status = message.includes("stripe_live_mode") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
