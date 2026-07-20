import { NextRequest } from "next/server";
import { POST as stripeWebhookPost } from "../../stripe/webhook/route";

export const dynamic = "force-dynamic";

/** Alias path for Stripe webhooks — same mock handler as `/api/stripe/webhook`. */
export async function POST(request: NextRequest) {
  return stripeWebhookPost(request);
}
