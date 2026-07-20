/**
 * Gated Stripe sandbox / mock helpers (P3).
 * No `stripe` npm package and no live secret keys — mock-only payment intents.
 */
import { createHash, randomBytes } from "crypto";

export type MockPaymentStatus = "requires_payment_method" | "succeeded" | "canceled";

export type MockPaymentIntent = {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  status: MockPaymentStatus;
  client_secret: string;
  metadata: {
    reservationPnr?: string;
    passengerEmail?: string;
    passengerName?: string;
  };
  livemode: false;
  mock: true;
  createdAt: string;
};

type PaymentStore = {
  intents: Record<string, MockPaymentIntent>;
};

const PAYMENT_STORE_KEY = Symbol.for("devair.stripeMockStore");

type GlobalPaymentStore = typeof globalThis & {
  [PAYMENT_STORE_KEY]?: PaymentStore;
};

function paymentStore(): PaymentStore {
  const globalStore = globalThis as GlobalPaymentStore;
  if (!globalStore[PAYMENT_STORE_KEY]) {
    globalStore[PAYMENT_STORE_KEY] = { intents: {} };
  }
  return globalStore[PAYMENT_STORE_KEY];
}

function assertNotLiveSecret(secret: string | undefined): void {
  if (secret && secret.startsWith("sk_live")) {
    throw new Error("stripe_live_mode is prohibited (P3). Use mock or test keys only.");
  }
}

/** True when we must stay on the gated mock path (default). */
export function isStripeMockEnabled(): boolean {
  assertNotLiveSecret(process.env.STRIPE_SECRET_KEY);
  if (process.env.STRIPE_MOCK === "0" && process.env.STRIPE_SECRET_KEY?.startsWith("sk_test")) {
    // Real test-mode SDK path is not wired; still mock (no stripe package).
    return true;
  }
  return true;
}

export type CreatePaymentInput = {
  amountCents: number;
  currency?: string;
  reservationPnr?: string;
  passengerEmail?: string;
  passengerName?: string;
};

export function createMockPaymentIntent(input: CreatePaymentInput): MockPaymentIntent {
  assertNotLiveSecret(process.env.STRIPE_SECRET_KEY);

  const amount = Math.round(Number(input.amountCents));
  if (!Number.isFinite(amount) || amount < 1) {
    throw new Error("amountCents must be a positive integer (cents).");
  }

  const currency = (input.currency || "usd").trim().toLowerCase() || "usd";
  const id = `pi_mock_${randomBytes(12).toString("hex")}`;
  const secretTail = createHash("sha256").update(id).digest("hex").slice(0, 24);
  const intent: MockPaymentIntent = {
    id,
    object: "payment_intent",
    amount,
    currency,
    status: "requires_payment_method",
    client_secret: `${id}_secret_${secretTail}`,
    metadata: {
      reservationPnr: input.reservationPnr?.trim().toUpperCase() || undefined,
      passengerEmail: input.passengerEmail?.trim() || undefined,
      passengerName: input.passengerName?.trim() || undefined,
    },
    livemode: false,
    mock: true,
    createdAt: new Date().toISOString(),
  };

  paymentStore().intents[id] = intent;
  return intent;
}

export function getMockPaymentIntent(id: string): MockPaymentIntent | null {
  return paymentStore().intents[id] ?? null;
}

export function markMockPaymentSucceeded(id: string): MockPaymentIntent | null {
  const intent = paymentStore().intents[id];
  if (!intent) return null;
  intent.status = "succeeded";
  paymentStore().intents[id] = intent;
  return intent;
}

export type MockWebhookEvent = {
  id: string;
  object: "event";
  type: "payment_intent.succeeded" | "payment_intent.payment_failed";
  livemode: false;
  mock: true;
  data: { object: MockPaymentIntent };
};

export function buildMockWebhookEvent(
  intent: MockPaymentIntent,
  type: MockWebhookEvent["type"] = "payment_intent.succeeded",
): MockWebhookEvent {
  return {
    id: `evt_mock_${randomBytes(10).toString("hex")}`,
    object: "event",
    type,
    livemode: false,
    mock: true,
    data: { object: intent },
  };
}

/** Soft verify mock webhook signatures (accept mock or absent; reject live). */
export function verifyMockWebhookSignature(
  signatureHeader: string | null,
  webhookSecret: string | undefined,
): { ok: true } | { ok: false; error: string } {
  assertNotLiveSecret(webhookSecret);
  if (webhookSecret?.startsWith("whsec_live")) {
    return { ok: false, error: "Live webhook secrets are prohibited (P3)." };
  }
  if (!signatureHeader) {
    // Mock path: unsigned events allowed when STRIPE_WEBHOOK_SECRET unset or mock.
    if (!webhookSecret || webhookSecret.startsWith("whsec_mock") || webhookSecret === "mock") {
      return { ok: true };
    }
    return { ok: false, error: "Missing Stripe-Signature header." };
  }
  if (signatureHeader.startsWith("mock=") || signatureHeader.includes("t=mock")) {
    return { ok: true };
  }
  // Accept any non-live signature in sandbox/mock mode.
  return { ok: true };
}
