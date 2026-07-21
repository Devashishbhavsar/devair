import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";
import { addPassenger, listPassengers, removePassenger } from "@/lib/passengers";

async function sessionEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function GET() {
  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in to manage saved passengers." }, { status: 401 });
  }
  return NextResponse.json({ passengers: await listPassengers(email) });
}

export async function POST(request: NextRequest) {
  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in to manage saved passengers." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const result = await addPassenger(email, body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status ?? 422 });
  }
  return NextResponse.json({ passenger: result.passenger }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Sign in to manage saved passengers." }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing ?id=<passenger id>." }, { status: 400 });
  }
  const result = await removePassenger(email, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
