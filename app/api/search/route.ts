import { NextRequest, NextResponse } from "next/server";
import { searchFlightOffers, validateSearchInput } from "@/lib/search";

type SearchRequestShape = {
  from?: unknown;
  to?: unknown;
  date?: unknown;
  passengers?: unknown;
  airline?: unknown;
  tripType?: unknown;
};

function buildSearchResponse(raw: SearchRequestShape) {
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
  const airlines = Array.from(new Set(offers.map((offer) => offer.airline)));

  return NextResponse.json({
    ok: true,
    query: validated.value,
    airlines,
    offers,
    empty: offers.length === 0,
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return buildSearchResponse({
    from: params.get("from") ?? "",
    to: params.get("to") ?? "",
    date: params.get("date") ?? "",
    passengers: params.get("passengers") ?? "",
    airline: params.get("airline") ?? "",
    tripType: params.get("tripType") ?? "one-way",
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  return buildSearchResponse((body ?? {}) as SearchRequestShape);
}
