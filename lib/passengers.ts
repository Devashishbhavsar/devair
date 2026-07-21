import { randomBytes } from "crypto";

/**
 * Saved passengers, keyed by account email. Same in-memory global-store
 * pattern as lib/reservations.ts (no database in this build).
 */

export type SavedPassenger = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  createdAt: string;
};

export type PassengerValidationError = {
  field?: "firstName" | "lastName" | "email" | "nationality" | "dateOfBirth";
  message: string;
};

type PassengerStore = {
  byAccount: Map<string, SavedPassenger[]>;
};

const PASSENGER_STORE_KEY = Symbol.for("devair.passengerStore");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PASSENGERS_PER_ACCOUNT = 20;

type GlobalPassengerStore = typeof globalThis & {
  [PASSENGER_STORE_KEY]?: PassengerStore;
};

function passengerStore(): PassengerStore {
  const globalStore = globalThis as GlobalPassengerStore;
  globalStore[PASSENGER_STORE_KEY] ??= { byAccount: new Map() };
  return globalStore[PASSENGER_STORE_KEY];
}

function normalizeAccount(email: string): string {
  return email.trim().toLowerCase();
}

function validateName(raw: unknown, field: "firstName" | "lastName"): string | PassengerValidationError {
  if (typeof raw !== "string" || !raw.trim()) {
    return { field, message: `${field === "firstName" ? "First" : "Last"} name is required.` };
  }
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 1 || value.length > 60) {
    return { field, message: "Name must be 1-60 characters." };
  }
  return value;
}

export async function listPassengers(accountEmail: string): Promise<SavedPassenger[]> {
  return [...(passengerStore().byAccount.get(normalizeAccount(accountEmail)) ?? [])];
}

export async function addPassenger(
  accountEmail: string,
  raw: { firstName?: unknown; lastName?: unknown; email?: unknown; nationality?: unknown; dateOfBirth?: unknown },
): Promise<
  | { ok: true; passenger: SavedPassenger }
  | { ok: false; errors: PassengerValidationError[]; status?: number }
> {
  const errors: PassengerValidationError[] = [];

  const firstName = validateName(raw.firstName, "firstName");
  if (typeof firstName !== "string") errors.push(firstName);
  const lastName = validateName(raw.lastName, "lastName");
  if (typeof lastName !== "string") errors.push(lastName);

  let email: string | null = null;
  if (raw.email !== undefined && raw.email !== null && raw.email !== "") {
    if (typeof raw.email !== "string" || !EMAIL_REGEX.test(raw.email.trim())) {
      errors.push({ field: "email", message: "Enter a valid email address." });
    } else {
      email = raw.email.trim().toLowerCase();
    }
  }

  let nationality: string | null = null;
  if (raw.nationality !== undefined && raw.nationality !== null && raw.nationality !== "") {
    if (typeof raw.nationality !== "string" || raw.nationality.trim().length > 60) {
      errors.push({ field: "nationality", message: "Nationality must be at most 60 characters." });
    } else {
      nationality = raw.nationality.trim();
    }
  }

  let dateOfBirth: string | null = null;
  if (raw.dateOfBirth !== undefined && raw.dateOfBirth !== null && raw.dateOfBirth !== "") {
    const value = typeof raw.dateOfBirth === "string" ? raw.dateOfBirth.trim() : "";
    const parsed = DATE_REGEX.test(value) ? new Date(`${value}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed > new Date()) {
      errors.push({ field: "dateOfBirth", message: "Date of birth must be a past date (YYYY-MM-DD)." });
    } else {
      dateOfBirth = value;
    }
  }

  if (errors.length > 0 || typeof firstName !== "string" || typeof lastName !== "string") {
    return { ok: false, errors };
  }

  const account = normalizeAccount(accountEmail);
  const store = passengerStore();
  const existing = store.byAccount.get(account) ?? [];
  if (existing.length >= MAX_PASSENGERS_PER_ACCOUNT) {
    return {
      ok: false,
      status: 409,
      errors: [{ message: `At most ${MAX_PASSENGERS_PER_ACCOUNT} saved passengers per account.` }],
    };
  }

  const passenger: SavedPassenger = {
    id: `pax_${randomBytes(6).toString("hex")}`,
    firstName,
    lastName,
    email,
    nationality,
    dateOfBirth,
    createdAt: new Date().toISOString(),
  };
  store.byAccount.set(account, [...existing, passenger]);
  return { ok: true, passenger };
}

export async function removePassenger(
  accountEmail: string,
  passengerId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const account = normalizeAccount(accountEmail);
  const store = passengerStore();
  const existing = store.byAccount.get(account) ?? [];
  const next = existing.filter((passenger) => passenger.id !== passengerId);
  if (next.length === existing.length) {
    return { ok: false, error: "Saved passenger not found.", status: 404 };
  }
  store.byAccount.set(account, next);
  return { ok: true };
}
