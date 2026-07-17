/** Common IATA codes for W1 search validation (simulated catalog). */
export const AIRPORTS: Record<string, { city: string; name: string }> = {
  JFK: { city: "New York", name: "John F. Kennedy International" },
  LGA: { city: "New York", name: "LaGuardia" },
  EWR: { city: "Newark", name: "Newark Liberty International" },
  LAX: { city: "Los Angeles", name: "Los Angeles International" },
  SFO: { city: "San Francisco", name: "San Francisco International" },
  ORD: { city: "Chicago", name: "O'Hare International" },
  MIA: { city: "Miami", name: "Miami International" },
  ATL: { city: "Atlanta", name: "Hartsfield–Jackson Atlanta International" },
  SEA: { city: "Seattle", name: "Seattle–Tacoma International" },
  BOS: { city: "Boston", name: "Logan International" },
  DFW: { city: "Dallas", name: "Dallas/Fort Worth International" },
  DEN: { city: "Denver", name: "Denver International" },
  LHR: { city: "London", name: "Heathrow" },
  LGW: { city: "London", name: "Gatwick" },
  CDG: { city: "Paris", name: "Charles de Gaulle" },
  FRA: { city: "Frankfurt", name: "Frankfurt Airport" },
  AMS: { city: "Amsterdam", name: "Schiphol" },
  DXB: { city: "Dubai", name: "Dubai International" },
  DOH: { city: "Doha", name: "Hamad International" },
  SIN: { city: "Singapore", name: "Changi" },
  HKG: { city: "Hong Kong", name: "Hong Kong International" },
  NRT: { city: "Tokyo", name: "Narita International" },
  HND: { city: "Tokyo", name: "Haneda" },
  SYD: { city: "Sydney", name: "Kingsford Smith" },
  YYZ: { city: "Toronto", name: "Pearson International" },
  DEL: { city: "Delhi", name: "Indira Gandhi International" },
  BOM: { city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International" },
  BLR: { city: "Bengaluru", name: "Kempegowda International" },
};

export const IATA_REGEX = /^[A-Za-z]{3}$/;

export function normalizeIata(code: string): string {
  return code.trim().toUpperCase();
}

export function isKnownAirport(code: string): boolean {
  return normalizeIata(code) in AIRPORTS;
}

export type AirportCatalogEntry = {
  code: string;
  city: string;
  name: string;
  label: string;
};

export function getAirportCatalog(): AirportCatalogEntry[] {
  return Object.entries(AIRPORTS)
    .map(([code, airport]) => ({
      code,
      city: airport.city,
      name: airport.name,
      label: `${airport.city} (${code}) - ${airport.name}`,
    }))
    .sort((a, b) => a.city.localeCompare(b.city) || a.code.localeCompare(b.code));
}
