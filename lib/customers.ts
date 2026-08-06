// Customer + refund request repository.
// Same in-process globalThis store pattern as lib/reservations.ts and
// lib/coupons.ts (P3: no JSON DB, no filesystem writes, no live providers).
// Customers are aggregated from reservations by traveler email; refund
// requests are first-class records whose resolution also updates the
// reservation's additive refund state (lib/reservations.ts).

import { randomBytes } from "crypto";
import {
  applyReservationRefundState,
  getReservationByPnr,
  listAllReservations,
  type Reservation,
} from "./reservations";

export type RefundStatus = "pending" | "approved" | "denied";

export type RefundRequest = {
  id: string;
  reservationPnr: string;
  travelerEmail: string;
  travelerName: string | null;
  amountCents: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
};

export type CustomerSummary = {
  email: string;
  travelerName: string | null;
  reservationCount: number;
  heldCount: number;
  paidCount: number;
  expiredCount: number;
  pendingRefundCount: number;
  refundedCount: number;
  totalPaidCents: number;
  lastActivityAt: string;
  reservations: Reservation[];
};

type RefundStore = {
  refunds: RefundRequest[];
};

const REFUND_STORE_KEY = Symbol.for("devair.refundStore");
const REASON_MAX_LENGTH = 500;
const NOTE_MAX_LENGTH = 300;

type GlobalRefundStore = typeof globalThis & {
  [REFUND_STORE_KEY]?: RefundStore;
};

function refundStore(): RefundStore {
  const globalStore = globalThis as GlobalRefundStore;
  globalStore[REFUND_STORE_KEY] ??= { refunds: [] };
  return globalStore[REFUND_STORE_KEY];
}

export type RefundResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

function refundId(): string {
  return `ref_${randomBytes(12).toString("hex")}`;
}

/** Amount paid for a reservation: captured intent amount, else fare fallback. */
function paidAmountCentsOf(reservation: Reservation): number {
  if (
    reservation.paidAmountCents !== null &&
    reservation.paidAmountCents !== undefined &&
    reservation.paidAmountCents > 0
  ) {
    return reservation.paidAmountCents;
  }
  return Math.max(0, Math.round(reservation.offer.totalPrice * 100));
}

function normalizeReason(raw: unknown): string {
  if (typeof raw !== "string") return "Not provided";
  const reason = raw.trim().replace(/\s+/g, " ");
  return reason.length > 0 ? reason.slice(0, REASON_MAX_LENGTH) : "Not provided";
}

function normalizeNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const note = raw.trim().replace(/\s+/g, " ");
  return note.length > 0 ? note.slice(0, NOTE_MAX_LENGTH) : null;
}

/** All refund requests, newest first. */
export function listRefundRequests(): RefundRequest[] {
  return refundStore()
    .refunds.slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/**
 * Customer list aggregated by traveler email (AC AD-10 / AD-20).
 * Every reservation with a traveler email groups under one customer; the
 * summary rolls up status counts, paid volume and refund activity.
 */
export async function listCustomers(): Promise<CustomerSummary[]> {
  const reservations = await listAllReservations();
  const byEmail = new Map<string, Reservation[]>();

  for (const reservation of reservations) {
    const email = reservation.travelerEmail?.trim().toLowerCase();
    if (!email) continue;
    const group = byEmail.get(email) ?? [];
    group.push(reservation);
    byEmail.set(email, group);
  }

  const customers: CustomerSummary[] = [];
  for (const [email, group] of byEmail) {
    const heldCount = group.filter((reservation) => reservation.status === "hold").length;
    const paidCount = group.filter((reservation) => reservation.status === "paid").length;
    const expiredCount = group.filter((reservation) => reservation.status === "expired").length;
    const pendingRefundCount = group.filter(
      (reservation) => reservation.refundStatus === "requested",
    ).length;
    const refundedCount = group.filter(
      (reservation) => reservation.refundStatus === "approved",
    ).length;
    const totalPaidCents = group
      .filter((reservation) => reservation.status === "paid")
      .reduce((sum, reservation) => sum + paidAmountCentsOf(reservation), 0);
    const lastActivityAt = group.reduce(
      (latest, reservation) =>
        reservation.holdCreatedAt > latest ? reservation.holdCreatedAt : latest,
      group[0]?.holdCreatedAt ?? "",
    );
    const travelerName =
      group.map((reservation) => reservation.travelerName).find((name) => name !== null) ?? null;

    customers.push({
      email,
      travelerName,
      reservationCount: group.length,
      heldCount,
      paidCount,
      expiredCount,
      pendingRefundCount,
      refundedCount,
      totalPaidCents,
      lastActivityAt,
      reservations: group,
    });
  }

  return customers.sort((a, b) => (a.lastActivityAt < b.lastActivityAt ? 1 : -1));
}

/**
 * Customer-facing refund request (AC CP-01). Ownership is enforced by the
 * caller-supplied session email: only the traveler who booked the paid
 * reservation can request a refund for it.
 */
export async function createRefundRequest(input: {
  pnr?: unknown;
  reason?: unknown;
  email: string;
}): Promise<RefundResult<RefundRequest>> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Sign-in is required to request a refund.", status: 401 };
  }
  if (typeof input.pnr !== "string") {
    return { ok: false, error: "PNR is required.", status: 400 };
  }

  const reservation = await getReservationByPnr(input.pnr);
  if (!reservation) {
    return { ok: false, error: "Reservation not found.", status: 404 };
  }
  if ((reservation.travelerEmail ?? "").toLowerCase() !== email) {
    return {
      ok: false,
      error: "Refunds can only be requested for reservations booked with your email.",
      status: 403,
    };
  }
  if (reservation.status !== "paid") {
    return {
      ok: false,
      error: "Only paid reservations can be refunded.",
      status: 409,
    };
  }
  if (reservation.refundStatus === "approved") {
    return {
      ok: false,
      error: "This reservation has already been refunded.",
      status: 409,
    };
  }

  const store = refundStore();
  const alreadyPending = store.refunds.some(
    (refund) => refund.reservationPnr === reservation.pnr && refund.status === "pending",
  );
  if (alreadyPending) {
    return {
      ok: false,
      error: "A refund request is already pending for this reservation.",
      status: 409,
    };
  }

  const now = new Date().toISOString();
  const refund: RefundRequest = {
    id: refundId(),
    reservationPnr: reservation.pnr,
    travelerEmail: email,
    travelerName: reservation.travelerName,
    amountCents: paidAmountCentsOf(reservation),
    currency: reservation.offer.currency || "USD",
    reason: normalizeReason(input.reason),
    status: "pending",
    createdAt: now,
    resolvedAt: null,
    resolutionNote: null,
  };

  const state = await applyReservationRefundState(reservation.pnr, {
    refundStatus: "requested",
    refundRequestedAt: now,
  });
  if (!state.ok) {
    return { ok: false, error: state.error, status: state.status };
  }

  store.refunds.unshift(refund);
  return { ok: true, value: refund };
}

/** Admin resolution of a pending refund request (AC CP-01). */
export async function resolveRefundRequest(
  id: string,
  action: "approve" | "deny",
  note?: unknown,
): Promise<RefundResult<{ refund: RefundRequest; reservation: Reservation }>> {
  if (action !== "approve" && action !== "deny") {
    return { ok: false, error: "Action must be approve or deny.", status: 400 };
  }

  const store = refundStore();
  const index = store.refunds.findIndex((refund) => refund.id === id);
  if (index < 0) {
    return { ok: false, error: "Refund request not found.", status: 404 };
  }
  const existing = store.refunds[index];
  if (existing.status !== "pending") {
    return {
      ok: false,
      error: `Refund request is already ${existing.status}.`,
      status: 409,
    };
  }

  const now = new Date().toISOString();
  const refund: RefundRequest = {
    ...existing,
    status: action === "approve" ? "approved" : "denied",
    resolvedAt: now,
    resolutionNote: normalizeNote(note),
  };
  store.refunds[index] = refund;

  const state = await applyReservationRefundState(refund.reservationPnr, {
    refundStatus: action === "approve" ? "approved" : "denied",
    refundResolvedAt: now,
  });
  if (!state.ok) {
    return { ok: false, error: state.error, status: state.status };
  }

  return { ok: true, value: { refund, reservation: state.reservation } };
}
