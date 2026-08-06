import { NextRequest, NextResponse } from "next/server";
import { currentAdminEmail } from "@/lib/admin";
import { resolveRefundRequest } from "@/lib/customers";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type ResolveBody = {
  action?: unknown;
  note?: unknown;
};

/** Admin resolution of a pending refund request: approve or deny. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdminEmail();
  if (!admin) {
    return NextResponse.json(
      { error: "Unauthorized — admin sign-in required." },
      { status: 401, headers: NO_STORE },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Resolution body must be a JSON object." },
      { status: 400 },
    );
  }

  const { action } = body as ResolveBody;
  if (action !== "approve" && action !== "deny") {
    return NextResponse.json(
      { error: "Action must be approve or deny." },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const result = await resolveRefundRequest(id, action, (body as ResolveBody).note);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    { ok: true, refund: result.value.refund, reservation: result.value.reservation },
    { headers: NO_STORE },
  );
}
