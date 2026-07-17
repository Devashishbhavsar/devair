import { AIRPORTS, IATA_REGEX, isKnownAirport, normalizeIata } from "./airports";

export type SearchInput = {
  from: string;
  to: string;
  date: string;
  passengers: number | string;
  tripType?: string;
};

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  from: string;
  to: string;
  date: string;
  departTime: string;
  arriveTime: string;
  durationMinutes: number;
  passengers: number;
  currency: string;
  pricePerPassenger: number;
  totalPrice: number;
};

export type SearchValidationError = {
  field?: "from" | "to" | "date" | "passengers" | "tripType";
  message: string;
};

const AIRLINES = [
  { code: "DA", name: "DevAir Airways" },
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "BA", name: "British Airways" },
  { code: "EK", name: "Emirates" },
  { code: "QR", name: "Qatar Airways" },
] as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseLocalDate(isoDate: string): Date | null {
  if (!DATE_REGEX.test(isoDate)) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function validateSearchInput(raw: Partial<SearchInput>): {
  ok: true;
  value: {
    from: string;
    to: string;
    date: string;
    passengers: number;
    tripType: "one-way";
  };
} | {
  ok: false;
  errors: SearchValidationError[];
} {
  const errors: SearchValidationError[] = [];
  const from = typeof raw.from === "string" ? normalizeIata(raw.from) : "";
  const to = typeof raw.to === "string" ? normalizeIata(raw.to) : "";
  const date = typeof raw.date === "string" ? raw.date.trim() : "";
  const passengersRaw = raw.passengers;
  const passengers =
    typeof passengersRaw === "number"
      ? passengersRaw
      : typeof passengersRaw === "string"
        ? Number(passengersRaw)
        : NaN;
  const tripType =
    typeof raw.tripType === "string" && raw.tripType.trim()
      ? raw.tripType.trim().toLowerCase()
      : "one-way";

  if (!from || !IATA_REGEX.test(from)) {
    errors.push({ field: "from", message: "Enter a valid 3-letter departure airport code." });
  } else if (!isKnownAirport(from)) {
    errors.push({ field: "from", message: `Unknown departure airport "${from}".` });
  }

  if (!to || !IATA_REGEX.test(to)) {
    errors.push({ field: "to", message: "Enter a valid 3-letter destination airport code." });
  } else if (!isKnownAirport(to)) {
    errors.push({ field: "to", message: `Unknown destination airport "${to}".` });
  } else if (from && to && from === to) {
    errors.push({ field: "to", message: "Destination must differ from departure." });
  }

  const parsedDate = parseLocalDate(date);
  if (!parsedDate) {
    errors.push({ field: "date", message: "Enter a valid travel date (YYYY-MM-DD)." });
  } else if (parsedDate < startOfToday()) {
    errors.push({ field: "date", message: "Travel date cannot be in the past." });
  }

  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 9) {
    errors.push({ field: "passengers", message: "Passengers must be a whole number from 1 to 9." });
  }

  if (tripType !== "one-way") {
    errors.push({ field: "tripType", message: "Only one-way search is supported in this release." });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      from,
      to,
      date,
      passengers,
      tripType: "one-way",
    },
  };
}

export function searchFlightOffers(input: {
  from: string;
  to: string;
  date: string;
  passengers: number;
}): FlightOffer[] {
  const seed = hashSeed(`${input.from}-${input.to}-${input.date}-${input.passengers}`);
  // Deterministic empty result for a known edge-case route (error/empty AC).
  if (input.from === "SYD" && input.to === "YYZ") {
    return [];
  }

  const count = 3 + (seed % 3);
  const offers: FlightOffer[] = [];

  for (let i = 0; i < count; i += 1) {
    const airline = AIRLINES[(seed + i * 3) % AIRLINES.length];
    const departHour = 6 + ((seed + i * 5) % 14);
    const durationMinutes = 90 + ((seed + i * 17) % 540);
    const arriveTotal = departHour * 60 + 15 + (i % 4) * 10 + durationMinutes;
    const arriveHour = Math.floor(arriveTotal / 60) % 24;
    const arriveMinute = arriveTotal % 60;
    const pricePerPassenger = 120 + ((seed + i * 41) % 680);
    const flightNum = 100 + ((seed + i * 13) % 800);

    offers.push({
      id: `${airline.code}${flightNum}-${input.from}${input.to}-${input.date}-${i}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: `${airline.code}${flightNum}`,
      from: input.from,
      to: input.to,
      date: input.date,
      departTime: `${String(departHour).padStart(2, "0")}:${String(15 + (i % 4) * 10).padStart(2, "0")}`,
      arriveTime: `${String(arriveHour).padStart(2, "0")}:${String(arriveMinute).padStart(2, "0")}`,
      durationMinutes,
      passengers: input.passengers,
      currency: "USD",
      pricePerPassenger,
      totalPrice: pricePerPassenger * input.passengers,
    });
  }

  return offers.sort((a, b) => a.totalPrice - b.totalPrice);
}

export function airportLabel(code: string): string {
  const info = AIRPORTS[normalizeIata(code)];
  if (!info) return code;
  return `${info.city} (${normalizeIata(code)})`;
}
