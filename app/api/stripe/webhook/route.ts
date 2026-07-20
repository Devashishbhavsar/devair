import { NextRequest, NextResponse } from "next/server";
import { markReservationPaid } from "@/lib/reservations";
import {
  buildMockWebhookEvent,
  getMockPaymentIntent,
  markMockPaymentSucceeded,
  verifyMockWebhookSignature,
  type MockPaymentIntent,
} from "@/lib/stripe";

export const dynamic = "force-dynamic";

type WebhookBody = {
  type?: unknown;
  data?: { object?: Partial<MockPaymentIntent> & { metadata?: Record<string, unknown> } };
  paymentIntentId?: unknown;
  reservationPnr?: unknown;
  pnr?: unknown;
};

function pnrFromIntent(intent: MockPaymentIntent | null, body: WebhookBody): string | undefined {
  const fromMeta = intent?.metadata?.reservationPnr;
  if (fromMeta) return fromMeta;
  const fromBodyMeta = body.data?.object?.metadata?.reservationPnr;
  if (typeof fromBodyMeta === "string" && fromBodyMeta.trim()) {
    return fromBodyMeta.trim().toUpperCase();
  }
  if (typeof body.reservationPnr === "string" && body.reservationPnr.trim()) {
    return body.reservationPnr.trim().toUpperCase();
  }
  if (typeof body.pnr === "string" && body.pnr.trim()) {
    return body.pnr.trim().toUpperCase();
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const verified = verifyMockWebhookSignature(
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid webhook body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Webhook body must be a JSON object." }, { status: 400 });
  }

  const payload = body as WebhookBody;
  const paymentIntentId =
    (typeof payload.paymentIntentId === "string" && payload.paymentIntentId) ||
    (typeof payload.data?.object?.id === "string" && payload.data.object.id) ||
    "";

  if (!paymentIntentId) {
    return NextResponse.json(
      { error: "paymentIntentId or data.object.id is required." },
      { status: 400 },
    );
  }

  let intent = getMockPaymentIntent(paymentIntentId);
  if (!intent && payload.data?.object?.id === paymentIntentId) {
    // Allow synthetic webhook payloads in smoke tests without prior create.
    const amount =
      typeof payload.data.object.amount === "number" ? payload.data.object.amount : 0;
    intent = {
      id: paymentIntentId,
      object: "payment_intent",
      amount,
      currency:
        typeof payload.data.object.currency === "string"
          ? payload.data.object.currency
          : "usd",
      status: "requires_payment_method",
      client_secret: `${paymentIntentId}_secret_synthetic`,
      metadata: {
        reservationPnr:
          typeof payload.data.object.metadata?.reservationPnr === "string"
            ? payload.data.object.metadata.reservationPnr
            : undefined,
      },
      livemode: false,
      mock: true,
      createdAt: new Date().toISOString(),
    };
  }

  if (!intent) {
    return NextResponse.json({ error: "Unknown payment intent." }, { status: 404 });
  }

  const eventType =
    typeof payload.type === "string" && payload.type
      ? payload.type
      : "payment_intent.succeeded";

  if (eventType !== "payment_intent.succeeded") {
    return NextResponse.json(
      { ok: true, ignored: true, type: eventType, mock: true },
      { status: 200 },
    );
  }

  const succeeded = markMockPaymentSucceeded(intent.id) ?? {
    ...intent,
    status: "succeeded" as const,
  };
  const event = buildMockWebhookEvent(succeeded, "payment_intent.succeeded");
  const pnr = pnrFromIntent(succeeded, payload);

  let reservationResult: Awaited<ReturnType<typeof markReservationPaid>> | null = null;

  if (pnr) {
    reservationResult = await markReservationPaid(pnr);
    if (!reservationResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          mock: true,
          eventId: event.id,
          paymentIntentId: succeeded.id,
          error: reservationResult.error,
        },
        { status: reservationResult.status ?? 400 },
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      mock: true,
      livemode: false,
      eventId: event.id,
      type: event.type,
      paymentIntentId: succeeded.id,
      paymentStatus: succeeded.status,
      reservationMarkedPaid: Boolean(pnr && reservationResult?.ok),
      reservation: reservationResult?.ok ? reservationResult.reservation : null,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
