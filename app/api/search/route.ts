import { NextRequest, NextResponse } from "next/server";
import { searchFlightOffers, validateSearchInput } from "@/lib/search";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body ?? {}) as {
    from?: unknown;
    to?: unknown;
    date?: unknown;
    passengers?: unknown;
    airline?: unknown;
    tripType?: unknown;
  };

  const validated = validateSearchInput({
    from: typeof raw.from === "string" ? raw.from : "",
    to: typeof raw.to === "string" ? raw.to : "",
    date: typeof raw.date === "string" ? raw.date : "",
    passengers:
      typeof raw.passengers === "number" || typeof raw.passengers === "string"
        ? (raw.passengers as number | string)
        : NaN,
    airline: typeof raw.airline === "string" ? raw.airline : "",
    tripType: typeof raw.tripType === "string" ? raw.tripType : "one-way",
  });

  if (!validated.ok) {
    return NextResponse.json(
      {
        error: validated.errors[0]?.message ?? "Invalid search.",
        errors: validated.errors,
      },
      { status: 400 },
    );
  }

  const offers = searchFlightOffers(validated.value);

  return NextResponse.json({
    ok: true,
    query: validated.value,
    offers,
    empty: offers.length === 0,
  });
}
