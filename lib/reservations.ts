import { randomBytes } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { airportLabel, searchFlightOffers, validateSearchInput, type FlightOffer } from "./search";

export const HOLD_VALIDITY_OPTIONS = ["48h", "14d"] as const;

export type HoldValidity = (typeof HOLD_VALIDITY_OPTIONS)[number];
export type ReservationStatus = "hold" | "paid" | "expired";

export type Reservation = {
  id: string;
  pnr: string;
  airlineRef: string;
  status: ReservationStatus;
  statusReason: string;
  validity: HoldValidity;
  validityLabel: string;
  holdCreatedAt: string;
  holdExpiresAt: string;
  issuedAt: string;
  travelerName: string | null;
  travelerEmail: string | null;
  verificationUrl: string | null;
  pdfUrl: string;
  offer: FlightOffer;
};

export type ReservationValidationError = {
  field?:
    | "from"
    | "to"
    | "date"
    | "passengers"
    | "airline"
    | "tripType"
    | "offerId"
    | "validity"
    | "travelerName"
    | "travelerEmail";
  message: string;
};

type CreateReservationInput = {
  from?: unknown;
  to?: unknown;
  date?: unknown;
  passengers?: unknown;
  airline?: unknown;
  tripType?: unknown;
  offerId?: unknown;
  selectedOfferId?: unknown;
  validity?: unknown;
  travelerName?: unknown;
  travelerEmail?: unknown;
  origin?: string | null;
};

type ReservationStore = {
  reservations: Reservation[];
};

const STORE_DIR = process.env.DEVAIR_RESERVATION_STORE_DIR ?? path.join(tmpdir(), "devair");
const STORE_FILE = path.join(STORE_DIR, "reservations.json");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PNR_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

function validityLabel(validity: HoldValidity): string {
  return validity === "48h" ? "48 hours" : "14 days";
}

function addValidity(createdAt: Date, validity: HoldValidity): Date {
  const expiresAt = new Date(createdAt);
  if (validity === "48h") {
    expiresAt.setHours(expiresAt.getHours() + 48);
  } else {
    expiresAt.setDate(expiresAt.getDate() + 14);
  }
  return expiresAt;
}

function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let code = "";
  for (const byte of bytes) {
    code += PNR_ALPHABET[byte % PNR_ALPHABET.length];
  }
  return code;
}

function currentStatus(reservation: Reservation, at = new Date()): ReservationStatus {
  if (reservation.status === "paid") return "paid";
  return new Date(reservation.holdExpiresAt) <= at ? "expired" : "hold";
}

function statusReason(status: ReservationStatus): string {
  if (status === "paid") return "Payment received; reservation is confirmed.";
  if (status === "expired") return "Hold validity elapsed before payment.";
  return "Temporary hold is active until payment or expiry.";
}

function withCurrentStatus(reservation: Reservation): Reservation {
  const status = currentStatus(reservation);
  const validity = validateHoldValidity(reservation.validity) ?? "48h";
  return {
    ...reservation,
    status,
    statusReason: statusReason(status),
    validityLabel: reservation.validityLabel ?? validityLabel(validity),
    issuedAt: reservation.issuedAt ?? reservation.holdCreatedAt,
  };
}

function normalizeOrigin(origin: string | null | undefined): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return null;
  }
}

function buildPublicUrls(pnr: string, origin: string | null): Pick<Reservation, "pdfUrl" | "verificationUrl"> {
  const pdfPath = `/api/reservations/${pnr}/pdf`;
  const verifyPath = `/api/reservations/${pnr}`;
  return {
    pdfUrl: origin ? `${origin}${pdfPath}` : pdfPath,
    verificationUrl: origin ? `${origin}${verifyPath}` : verifyPath,
  };
}

async function readStore(): Promise<ReservationStore> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<ReservationStore>;
    return {
      reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [],
    };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : null;
    if (code === "ENOENT") return { reservations: [] };
    throw error;
  }
}

async function writeStore(store: ReservationStore): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true });
  const tmpFile = `${STORE_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmpFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(tmpFile, STORE_FILE);
}

function validateHoldValidity(raw: unknown): HoldValidity | null {
  return HOLD_VALIDITY_OPTIONS.includes(raw as HoldValidity) ? (raw as HoldValidity) : null;
}

function validateTravelerName(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 80) return undefined;
  return value;
}

function validateTravelerEmail(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string") return undefined;
  const value = raw.trim().toLowerCase();
  if (value.length > 120 || !EMAIL_REGEX.test(value)) return undefined;
  return value;
}

async function uniquePnr(existing: Reservation[]): Promise<string> {
  const used = new Set(existing.map((reservation) => reservation.pnr));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const pnr = randomCode(6);
    if (!used.has(pnr)) return pnr;
  }
  throw new Error("Could not allocate a unique PNR.");
}

async function uniqueAirlineRef(existing: Reservation[], airlineCode: string): Promise<string> {
  const used = new Set(existing.map((reservation) => reservation.airlineRef));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ref = `${airlineCode}-${randomCode(8)}`;
    if (!used.has(ref)) return ref;
  }
  throw new Error("Could not allocate a unique airline reference.");
}

export async function createHoldReservation(raw: CreateReservationInput): Promise<
  | { ok: true; reservation: Reservation }
  | { ok: false; errors: ReservationValidationError[] }
> {
  const validatedSearch = validateSearchInput({
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

  const errors: ReservationValidationError[] = [];
  if (!validatedSearch.ok) {
    errors.push(...validatedSearch.errors);
  }

  const offerId =
    typeof raw.offerId === "string"
      ? raw.offerId.trim()
      : typeof raw.selectedOfferId === "string"
        ? raw.selectedOfferId.trim()
        : "";
  if (!offerId) {
    errors.push({ field: "offerId", message: "Select a flight offer to hold." });
  }

  const validity = validateHoldValidity(raw.validity);
  if (!validity) {
    errors.push({ field: "validity", message: "Choose a hold validity of 48h or 14d." });
  }

  const travelerName = validateTravelerName(raw.travelerName);
  if (travelerName === undefined) {
    errors.push({ field: "travelerName", message: "Traveler name must be 2-80 characters." });
  }

  const travelerEmail = validateTravelerEmail(raw.travelerEmail);
  if (travelerEmail === undefined) {
    errors.push({ field: "travelerEmail", message: "Enter a valid traveler email address." });
  }

  if (errors.length > 0 || !validatedSearch.ok || !validity) {
    return { ok: false, errors };
  }

  const offers = searchFlightOffers(validatedSearch.value);
  const offer = offers.find((candidate) => candidate.id === offerId);
  if (!offer) {
    return {
      ok: false,
      errors: [{ field: "offerId", message: "Selected offer is no longer available for this search." }],
    };
  }

  const store = await readStore();
  const pnr = await uniquePnr(store.reservations);
  const airlineRef = await uniqueAirlineRef(store.reservations, offer.airlineCode);
  const createdAt = new Date();
  const origin = normalizeOrigin(raw.origin);
  const publicUrls = buildPublicUrls(pnr, origin);
  const reservation: Reservation = {
    id: `res_${pnr.toLowerCase()}`,
    pnr,
    airlineRef,
    status: "hold",
    statusReason: statusReason("hold"),
    validity,
    validityLabel: validityLabel(validity),
    holdCreatedAt: createdAt.toISOString(),
    holdExpiresAt: addValidity(createdAt, validity).toISOString(),
    issuedAt: createdAt.toISOString(),
    travelerName: travelerName ?? null,
    travelerEmail: travelerEmail ?? null,
    verificationUrl: publicUrls.verificationUrl,
    pdfUrl: publicUrls.pdfUrl,
    offer,
  };

  store.reservations.unshift(reservation);
  await writeStore(store);
  return { ok: true, reservation };
}

export async function getReservationByPnr(pnr: string): Promise<Reservation | null> {
  const normalized = pnr.trim().toUpperCase();
  if (!PNR_REGEX.test(normalized)) return null;
  const store = await readStore();
  const reservation = store.reservations.find((candidate) => candidate.pnr === normalized);
  return reservation ? withCurrentStatus(reservation) : null;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLine(y: number, value: string, size = 11): string {
  return `BT /F1 ${size} Tf 54 ${y} Td (${escapePdfText(value)}) Tj ET`;
}

export function buildReservationPdf(reservation: Reservation): Uint8Array {
  const offer = reservation.offer;
  const issuedAt = new Date(reservation.issuedAt).toUTCString();
  const expiresAt = new Date(reservation.holdExpiresAt).toUTCString();
  const lines = [
    pdfLine(760, "DevAir Reservation Hold Confirmation", 18),
    pdfLine(732, `Document ID: ${reservation.id}`),
    pdfLine(714, `Issued at: ${issuedAt}`),
    pdfLine(690, `PNR: ${reservation.pnr}`, 14),
    pdfLine(672, `Airline reference: ${reservation.airlineRef}`),
    pdfLine(654, `Status: ${reservation.status.toUpperCase()} - ${reservation.statusReason}`),
    pdfLine(636, `Hold validity: ${reservation.validityLabel} (${reservation.validity})`),
    pdfLine(618, `Valid until: ${expiresAt}`),
    pdfLine(588, `Traveler: ${reservation.travelerName ?? "Name not provided"}`),
    pdfLine(570, `Traveler email: ${reservation.travelerEmail ?? "Email not provided"}`),
    pdfLine(540, `Airline: ${offer.airline}`),
    pdfLine(522, `Flight: ${offer.flightNumber}`),
    pdfLine(504, `Route: ${airportLabel(offer.from)} to ${airportLabel(offer.to)}`),
    pdfLine(486, `Travel date: ${offer.date}`),
    pdfLine(468, `Departure: ${offer.departTime}    Arrival: ${offer.arriveTime}`),
    pdfLine(450, `Passengers: ${offer.passengers}`),
    pdfLine(432, `Fare held: ${offer.currency} ${offer.totalPrice}`),
    pdfLine(396, "Verification"),
    pdfLine(378, `Verify online: ${reservation.verificationUrl ?? "Use DevAir reservation lookup."}`),
    pdfLine(348, "This visa-ready document confirms a temporary flight reservation hold."),
    pdfLine(330, "It is not a paid ticket and remains valid only until payment or expiry."),
  ];
  const content = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
