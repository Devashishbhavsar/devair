"use client";

import { FormEvent, useState } from "react";

type Reservation = {
  pnr: string;
  airlineRef: string;
  status: "hold" | "paid" | "expired";
  statusReason: string;
  validity: string;
  validityLabel: string;
  holdExpiresAt: string;
  travelerName: string | null;
  travelerEmail: string | null;
  pdfUrl: string;
  cancelRequestedAt?: string | null;
  offer: {
    airline: string;
    flightNumber: string;
    from: string;
    to: string;
    date: string;
  };
};

type ActionStatus = { kind: "idle" | "loading" | "ok" | "error"; message?: string };

const PNR_PATTERN = /^[A-Z2-9]{6}$/i;

function formatUtc(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString();
}

export function OmConsole() {
  const [pnrInput, setPnrInput] = useState("");
  const [lookupStatus, setLookupStatus] = useState<ActionStatus>({ kind: "idle" });
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus>({ kind: "idle" });
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function refresh(pnr: string): Promise<Reservation | null> {
    const res = await fetch(`/api/om/${encodeURIComponent(pnr)}`, { cache: "no-store" });
    const json = (await res.json().catch(() => ({}))) as {
      reservation?: Reservation;
      error?: string;
    };
    if (!res.ok || !json.reservation) {
      throw new Error(json.error || "Reservation not found.");
    }
    return json.reservation;
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const pnr = pnrInput.trim().toUpperCase();
    setActionStatus({ kind: "idle" });
    if (!PNR_PATTERN.test(pnr)) {
      setLookupStatus({ kind: "error", message: "Enter a 6-character PNR (letters/digits)." });
      setReservation(null);
      return;
    }
    setLookupStatus({ kind: "loading" });
    try {
      const found = await refresh(pnr);
      setReservation(found);
      setLookupStatus({ kind: "ok" });
    } catch (error) {
      setReservation(null);
      setLookupStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Lookup failed.",
      });
    }
  }

  async function runAction(
    action: "resend_email" | "request_cancel" | "extend_validity",
    label: string,
  ) {
    if (!reservation) return;
    setBusyAction(action);
    setActionStatus({ kind: "loading" });
    try {
      const res = await fetch(`/api/om/${encodeURIComponent(reservation.pnr)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        sentTo?: string;
        reservation?: Reservation;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `${label} failed.`);
      }
      if (json.reservation) {
        setReservation(json.reservation);
      } else {
        const updated = await refresh(reservation.pnr).catch(() => null);
        if (updated) setReservation(updated);
      }
      setActionStatus({
        kind: "ok",
        message:
          action === "resend_email"
            ? `Confirmation email re-sent to ${json.sentTo} (stub provider — no live email).`
            : `${label} done.`,
      });
    } catch (error) {
      setActionStatus({
        kind: "error",
        message: error instanceof Error ? error.message : `${label} failed.`,
      });
    } finally {
      setBusyAction(null);
    }
  }

  const inputClass =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm uppercase text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
  const actionClass =
    "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900";

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <form onSubmit={handleLookup} className="flex flex-col gap-2" noValidate>
        <label
          htmlFor="pnr"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Booking reference (PNR)
        </label>
        <div className="flex gap-2">
          <input
            id="pnr"
            name="pnr"
            className={inputClass}
            value={pnrInput}
            onChange={(e) => setPnrInput(e.target.value)}
            placeholder="e.g. AB3CD9"
            maxLength={6}
            aria-invalid={lookupStatus.kind === "error"}
          />
          <button
            type="submit"
            disabled={lookupStatus.kind === "loading"}
            className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {lookupStatus.kind === "loading" ? "Looking up…" : "Look up"}
          </button>
        </div>
        {lookupStatus.kind === "error" && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {lookupStatus.message}
          </p>
        )}
      </form>

      {!reservation && lookupStatus.kind !== "error" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enter the PNR from your hold confirmation to manage the booking.
        </p>
      )}

      {reservation && (
        <section
          aria-labelledby="booking-status-heading"
          className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              id="booking-status-heading"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {reservation.pnr} · {reservation.offer.airline} {reservation.offer.flightNumber}
            </h2>
            <span className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              {reservation.status}
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Route</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {reservation.offer.from} → {reservation.offer.to} · {reservation.offer.date}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Hold valid until</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {formatUtc(reservation.holdExpiresAt)} ({reservation.validityLabel})
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Traveler</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {reservation.travelerName ?? "Not provided"} ·{" "}
                {reservation.travelerEmail ?? "no email"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">Status detail</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">{reservation.statusReason}</dd>
            </div>
          </dl>
          {reservation.cancelRequestedAt && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Cancellation requested at {formatUtc(reservation.cancelRequestedAt)} — our team
              will process it.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={actionClass}
              disabled={busyAction !== null || !reservation.travelerEmail}
              onClick={() => runAction("resend_email", "Resend email")}
            >
              {busyAction === "resend_email" ? "Sending…" : "Resend email"}
            </button>
            <a
              href={`/api/reservations/${reservation.pnr}/pdf`}
              className={actionClass}
              target="_blank"
              rel="noreferrer"
            >
              Download invoice (PDF)
            </a>
            <button
              type="button"
              className={actionClass}
              disabled={busyAction !== null || Boolean(reservation.cancelRequestedAt)}
              onClick={() => runAction("request_cancel", "Request cancel")}
            >
              {busyAction === "request_cancel" ? "Requesting…" : "Request cancel"}
            </button>
            <button
              type="button"
              className={actionClass}
              disabled={busyAction !== null || reservation.status === "paid"}
              onClick={() => runAction("extend_validity", "Extend validity")}
            >
              {busyAction === "extend_validity" ? "Extending…" : "Extend validity"}
            </button>
          </div>
          {!reservation.travelerEmail && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No traveler email on file — resend is disabled.
            </p>
          )}
          {actionStatus.kind !== "idle" && actionStatus.message && (
            <p
              role="status"
              className={
                actionStatus.kind === "error"
                  ? "text-sm text-red-600 dark:text-red-400"
                  : "text-sm text-emerald-700 dark:text-emerald-400"
              }
            >
              {actionStatus.message}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
