import { createHash, randomBytes } from "crypto";
import { airportLabel, searchFlightOffers, validateSearchInput, type FlightOffer } from "./search";

export const HOLD_VALIDITY_OPTIONS = ["48h", "14d"] as const;
const HOLD_VALIDITY_CONFIG = {
  "48h": { label: "48 hours", durationHours: 48 },
  "14d": { label: "14 days", durationHours: 14 * 24 },
} as const satisfies Record<string, { label: string; durationHours: number }>;

export type HoldValidity = (typeof HOLD_VALIDITY_OPTIONS)[number];
export type ReservationStatus = "hold" | "paid" | "expired";

export type Reservation = {
  id: string;
  pnr: string;
  airlineRef: string;
  documentNumber: string;
  verificationCode: string;
  status: ReservationStatus;
  statusReason: string;
  validity: HoldValidity;
  validityLabel: string;
  holdValidityHours: number;
  holdCreatedAt: string;
  holdExpiresAt: string;
  issuedAt: string;
  documentType: string;
  ticketingStatus: "not_ticketed" | "ticketed";
  travelerName: string | null;
  travelerEmail: string | null;
  verificationUrl: string | null;
  pdfUrl: string;
  offer: FlightOffer;
  cancelRequestedAt?: string | null;
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

const RESERVATION_STORE_KEY = Symbol.for("devair.reservationStore");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PNR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PNR_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

type GlobalReservationStore = typeof globalThis & {
  [RESERVATION_STORE_KEY]?: ReservationStore;
};

function reservationStore(): ReservationStore {
  const globalStore = globalThis as GlobalReservationStore;
  globalStore[RESERVATION_STORE_KEY] ??= { reservations: [] };
  return globalStore[RESERVATION_STORE_KEY];
}

function validityLabel(validity: HoldValidity): string {
  return HOLD_VALIDITY_CONFIG[validity].label;
}

function validityDurationHours(validity: HoldValidity): number {
  return HOLD_VALIDITY_CONFIG[validity].durationHours;
}

function addValidity(createdAt: Date, validity: HoldValidity): Date {
  const expiresAt = new Date(createdAt);
  expiresAt.setHours(expiresAt.getHours() + validityDurationHours(validity));
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

function documentNumber(pnr: string): string {
  return `DA-HOLD-${pnr}`;
}

function verificationPayload(reservation: Pick<
  Reservation,
  "pnr" | "airlineRef" | "holdCreatedAt" | "holdExpiresAt" | "offer"
>): string {
  return [
    reservation.pnr,
    reservation.airlineRef,
    reservation.holdCreatedAt,
    reservation.holdExpiresAt,
    reservation.offer.flightNumber,
    reservation.offer.from,
    reservation.offer.to,
    reservation.offer.date,
  ].join("|");
}

function verificationCode(reservation: Pick<
  Reservation,
  "pnr" | "airlineRef" | "holdCreatedAt" | "holdExpiresAt" | "offer"
>): string {
  return createHash("sha256").update(verificationPayload(reservation)).digest("hex").slice(0, 16).toUpperCase();
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
  const normalized = {
    ...reservation,
    documentNumber: reservation.documentNumber ?? documentNumber(reservation.pnr),
    verificationCode: reservation.verificationCode ?? verificationCode(reservation),
  };
  return {
    ...normalized,
    status,
    statusReason: statusReason(status),
    validityLabel: reservation.validityLabel ?? validityLabel(validity),
    holdValidityHours: reservation.holdValidityHours ?? validityDurationHours(validity),
    issuedAt: reservation.issuedAt ?? reservation.holdCreatedAt,
    documentType: reservation.documentType ?? "Visa-ready reservation hold",
    ticketingStatus: reservation.ticketingStatus ?? "not_ticketed",
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
  return reservationStore();
}

async function writeStore(store: ReservationStore): Promise<void> {
  reservationStore().reservations = store.reservations;
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
    documentNumber: documentNumber(pnr),
    verificationCode: "",
    status: "hold",
    statusReason: statusReason("hold"),
    validity,
    validityLabel: validityLabel(validity),
    holdValidityHours: validityDurationHours(validity),
    holdCreatedAt: createdAt.toISOString(),
    holdExpiresAt: addValidity(createdAt, validity).toISOString(),
    issuedAt: createdAt.toISOString(),
    documentType: "Visa-ready reservation hold",
    ticketingStatus: "not_ticketed",
    travelerName: travelerName ?? null,
    travelerEmail: travelerEmail ?? null,
    verificationUrl: publicUrls.verificationUrl,
    pdfUrl: publicUrls.pdfUrl,
    offer,
  };
  reservation.verificationCode = verificationCode(reservation);

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

export async function markReservationPaid(pnr: string): Promise<
  | { ok: true; reservation: Reservation }
  | { ok: false; error: string; status?: number }
> {
  const normalized = pnr.trim().toUpperCase();
  if (!PNR_REGEX.test(normalized)) {
    return { ok: false, error: "Invalid PNR.", status: 400 };
  }

  const store = await readStore();
  const index = store.reservations.findIndex((candidate) => candidate.pnr === normalized);
  if (index < 0) {
    return { ok: false, error: "Reservation not found.", status: 404 };
  }

  const existing = withCurrentStatus(store.reservations[index]);
  if (existing.status === "expired") {
    return { ok: false, error: "Hold expired before payment.", status: 409 };
  }
  if (existing.status === "paid") {
    return { ok: true, reservation: existing };
  }

  const paid: Reservation = withCurrentStatus({
    ...existing,
    status: "paid",
    statusReason: statusReason("paid"),
    ticketingStatus: "ticketed",
  });
  store.reservations[index] = paid;
  await writeStore(store);
  return { ok: true, reservation: paid };
}

export async function requestReservationCancellation(pnr: string): Promise<
  | { ok: true; reservation: Reservation }
  | { ok: false; error: string; status?: number }
> {
  const normalized = pnr.trim().toUpperCase();
  if (!PNR_REGEX.test(normalized)) {
    return { ok: false, error: "Invalid PNR.", status: 400 };
  }
  const store = await readStore();
  const index = store.reservations.findIndex((candidate) => candidate.pnr === normalized);
  if (index < 0) {
    return { ok: false, error: "Reservation not found.", status: 404 };
  }
  const updated: Reservation = {
    ...store.reservations[index],
    cancelRequestedAt: store.reservations[index].cancelRequestedAt ?? new Date().toISOString(),
  };
  store.reservations[index] = updated;
  await writeStore(store);
  return { ok: true, reservation: withCurrentStatus(updated) };
}

export async function extendReservationValidity(
  pnr: string,
  validity?: unknown,
): Promise<
  | { ok: true; reservation: Reservation }
  | { ok: false; error: string; status?: number }
> {
  const normalized = pnr.trim().toUpperCase();
  if (!PNR_REGEX.test(normalized)) {
    return { ok: false, error: "Invalid PNR.", status: 400 };
  }
  const store = await readStore();
  const index = store.reservations.findIndex((candidate) => candidate.pnr === normalized);
  if (index < 0) {
    return { ok: false, error: "Reservation not found.", status: 404 };
  }
  const existing = withCurrentStatus(store.reservations[index]);
  if (existing.status === "paid") {
    return { ok: false, error: "Paid reservations do not need validity extension.", status: 409 };
  }
  const nextValidity = validity === undefined || validity === null || validity === ""
    ? existing.validity
    : validateHoldValidity(validity);
  if (!nextValidity) {
    return { ok: false, error: "Choose a hold validity of 48h or 14d.", status: 400 };
  }
  const now = new Date();
  const extended: Reservation = withCurrentStatus({
    ...existing,
    status: "hold",
    statusReason: statusReason("hold"),
    validity: nextValidity,
    validityLabel: validityLabel(nextValidity),
    holdValidityHours: validityDurationHours(nextValidity),
    holdExpiresAt: addValidity(now, nextValidity).toISOString(),
  });
  extended.verificationCode = verificationCode(extended);
  store.reservations[index] = extended;
  await writeStore(store);
  return { ok: true, reservation: extended };
}

export async function expirePastDueHolds(at = new Date()): Promise<{
  ok: true;
  expired: Reservation[];
  checked: number;
}> {
  const store = await readStore();
  const expired: Reservation[] = [];
  store.reservations = store.reservations.map((reservation) => {
    if (reservation.status === "paid") return reservation;
    if (reservation.status === "expired") return reservation;
    if (new Date(reservation.holdExpiresAt) > at) return reservation;
    const cancelled: Reservation = {
      ...reservation,
      status: "expired",
      statusReason: statusReason("expired"),
      ticketingStatus: "not_ticketed",
    };
    expired.push(withCurrentStatus(cancelled));
    return cancelled;
  });
  await writeStore(store);
  return { ok: true, expired, checked: store.reservations.length };
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLine(x: number, y: number, value: string, size = 11, font = "F1"): string {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(value)}) Tj ET`;
}

function pdfRule(y: number): string {
  return `54 ${y} m 558 ${y} l S`;
}

function pdfBox(x: number, y: number, width: number, height: number): string {
  return `${x} ${y} ${width} ${height} re S`;
}

function pdfWrappedLines(x: number, y: number, value: string, options?: { size?: number; width?: number }): {
  commands: string[];
  nextY: number;
} {
  const size = options?.size ?? 10;
  const width = options?.width ?? 86;
  const words = value
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .flatMap((word) => {
      if (word.length <= width) return [word];
      const chunks: string[] = [];
      for (let index = 0; index < word.length; index += width) {
        chunks.push(word.slice(index, index + width));
      }
      return chunks;
    });
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  return {
    commands: lines.map((line, index) => pdfLine(x, y - index * (size + 4), line, size)),
    nextY: y - lines.length * (size + 4),
  };
}

export function buildReservationPdf(reservation: Reservation): Uint8Array {
  const offer = reservation.offer;
  const issuedAt = new Date(reservation.issuedAt).toUTCString();
  const createdAt = new Date(reservation.holdCreatedAt).toUTCString();
  const expiresAt = new Date(reservation.holdExpiresAt).toUTCString();
  const content: string[] = [
    "1.2 w",
    pdfBox(42, 42, 528, 708),
    pdfLine(54, 724, "DEVAIR", 12, "F2"),
    pdfLine(54, 700, "Visa Reservation Hold / Embassy Itinerary", 18, "F2"),
    pdfLine(54, 678, "Temporary flight reservation document for visa submission.", 10),
    pdfLine(390, 724, `Document: ${reservation.documentNumber}`, 10, "F2"),
    pdfLine(390, 706, `Issued: ${issuedAt}`, 9),
    pdfRule(664),
    pdfLine(54, 640, "Reservation identifiers", 12, "F2"),
    pdfLine(72, 626, `Document type: ${reservation.documentType}`, 10),
    pdfLine(72, 616, `PNR: ${reservation.pnr}`, 13, "F2"),
    pdfLine(306, 616, `Airline booking reference: ${reservation.airlineRef}`, 11, "F2"),
    pdfLine(72, 596, `Verification code: ${reservation.verificationCode}`, 10),
    pdfLine(306, 596, `Status: ${reservation.status.toUpperCase()}`, 10, "F2"),
    pdfLine(72, 576, `Status detail: ${reservation.statusReason}`, 10),
    pdfLine(306, 576, `Ticketing: ${reservation.ticketingStatus === "ticketed" ? "Ticketed" : "Not paid / not ticketed"}`, 10),
    pdfRule(556),
    pdfLine(54, 532, "Hold validity", 12, "F2"),
    pdfLine(72, 508, `Validity option: ${reservation.validityLabel} (${reservation.validity}, ${reservation.holdValidityHours} hours)`, 10),
    pdfLine(72, 490, `Hold created: ${createdAt}`, 10),
    pdfLine(72, 472, `Hold valid until: ${expiresAt}`, 10, "F2"),
    pdfLine(72, 454, "Status remains HOLD until payment is received or the validity window expires.", 10),
    pdfRule(434),
    pdfLine(54, 410, "Traveler", 12, "F2"),
    pdfLine(72, 386, `Name: ${reservation.travelerName ?? "Name not provided"}`, 10),
    pdfLine(72, 368, `Email: ${reservation.travelerEmail ?? "Email not provided"}`, 10),
    pdfRule(348),
    pdfLine(54, 324, "Flight itinerary", 12, "F2"),
    pdfLine(72, 300, `Airline: ${offer.airline}`, 10),
    pdfLine(306, 300, `Flight: ${offer.flightNumber}`, 10),
    pdfLine(72, 282, `Route: ${airportLabel(offer.from)} to ${airportLabel(offer.to)}`, 10),
    pdfLine(72, 264, `Travel date: ${offer.date}`, 10),
    pdfLine(306, 264, `Passengers: ${offer.passengers}`, 10),
    pdfLine(72, 246, `Departure: ${offer.departTime}`, 10),
    pdfLine(306, 246, `Arrival: ${offer.arriveTime}`, 10),
    pdfLine(72, 228, "Cabin / booking basis: Economy hold", 10),
    pdfLine(306, 228, `Fare held: ${offer.currency} ${offer.totalPrice}`, 10),
    pdfRule(208),
    pdfLine(54, 184, "Verification", 12, "F2"),
  ];
  const verification = pdfWrappedLines(
    72,
    160,
    `Verify this hold online at ${reservation.verificationUrl ?? "the DevAir reservation lookup"} using PNR ${reservation.pnr} and code ${reservation.verificationCode}.`,
    { size: 10, width: 82 },
  );
  const disclaimer = pdfWrappedLines(
    72,
    verification.nextY - 12,
    "Embassy note: this document confirms a temporary flight reservation hold with verifiable identifiers. It is formatted for visa documentation and embassy review, but it is not a paid ticket and does not guarantee carriage until the hold is paid and confirmed by the airline.",
    { size: 9, width: 92 },
  );
  content.push(...verification.commands, ...disclaimer.commands);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content.join("\n"), "utf8")} >>\nstream\n${content.join("\n")}\nendstream`,
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
