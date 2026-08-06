"use client";

import { FormEvent, useState } from "react";
import { AlertIcon, SearchIcon } from "../icons";

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

function statusChipClass(status: Reservation["status"]): string {
  switch (status) {
    case "paid":
      return "status-chip bg-success-soft text-success";
    case "expired":
      return "status-chip bg-danger-soft text-danger";
    default:
      return "status-chip bg-brand-soft text-brand";
  }
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

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <form onSubmit={handleLookup} className="flex flex-col gap-2" noValidate>
        <label htmlFor="pnr" className="field-label">
          Booking reference (PNR)
        </label>
        <div className="flex gap-2">
          <input
            id="pnr"
            name="pnr"
            className="field-input font-mono uppercase tracking-wider"
            value={pnrInput}
            onChange={(e) => setPnrInput(e.target.value)}
            placeholder="e.g. AB3CD9"
            maxLength={6}
            aria-invalid={lookupStatus.kind === "error"}
          />
          <button
            type="submit"
            disabled={lookupStatus.kind === "loading"}
            className="btn-primary shrink-0"
          >
            {lookupStatus.kind === "loading" ? "Looking up…" : "Look up"}
          </button>
        </div>
      </form>

      {lookupStatus.kind === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{lookupStatus.message}</p>
        </div>
      )}

      {!reservation && lookupStatus.kind !== "error" && (
        <div
          role="status"
          className="card flex flex-col items-center gap-2 px-6 py-10 text-center"
        >
          <SearchIcon className="h-8 w-8 text-muted" />
          <p className="font-medium">Find your booking</p>
          <p className="max-w-md text-sm text-muted">
            Enter the 6-character PNR from your hold confirmation to check
            status, resend the email, download your invoice, or manage the hold.
          </p>
        </div>
      )}

      {reservation && (
        <section
          aria-labelledby="booking-status-heading"
          className="card flex flex-col gap-4 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="booking-status-heading"
              className="text-lg font-semibold text-foreground"
            >
              {reservation.pnr} · {reservation.offer.airline}{" "}
              {reservation.offer.flightNumber}
            </h2>
            <span className={statusChipClass(reservation.status)}>
              {reservation.status}
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Route</dt>
              <dd className="font-medium text-foreground">
                {reservation.offer.from} → {reservation.offer.to} · {reservation.offer.date}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Hold valid until</dt>
              <dd className="font-medium text-foreground">
                {formatUtc(reservation.holdExpiresAt)} ({reservation.validityLabel})
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Traveler</dt>
              <dd className="font-medium text-foreground">
                {reservation.travelerName ?? "Not provided"} ·{" "}
                {reservation.travelerEmail ?? "no email"}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-muted">Status detail</dt>
              <dd className="font-medium text-foreground">{reservation.statusReason}</dd>
            </div>
          </dl>
          {reservation.cancelRequestedAt && (
            <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Cancellation requested at {formatUtc(reservation.cancelRequestedAt)} — our team
                will process it.
              </span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyAction !== null || !reservation.travelerEmail}
              onClick={() => runAction("resend_email", "Resend email")}
            >
              {busyAction === "resend_email" ? "Sending…" : "Resend email"}
            </button>
            <a
              href={`/api/reservations/${reservation.pnr}/pdf`}
              className="btn-secondary"
              target="_blank"
              rel="noreferrer"
            >
              Download invoice (PDF)
            </a>
            <button
              type="button"
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyAction !== null || Boolean(reservation.cancelRequestedAt)}
              onClick={() => runAction("request_cancel", "Request cancel")}
            >
              {busyAction === "request_cancel" ? "Requesting…" : "Request cancel"}
            </button>
            <button
              type="button"
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyAction !== null || reservation.status === "paid"}
              onClick={() => runAction("extend_validity", "Extend validity")}
            >
              {busyAction === "extend_validity" ? "Extending…" : "Extend validity"}
            </button>
          </div>
          {!reservation.travelerEmail && (
            <p className="text-sm text-muted">
              No traveler email on file — resend is disabled.
            </p>
          )}
          {actionStatus.kind !== "idle" && actionStatus.message && (
            <p
              role="status"
              className={
                actionStatus.kind === "error"
                  ? "flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
                  : "flex items-start gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success"
              }
            >
              {actionStatus.kind === "error" ? (
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              )}
              <span>{actionStatus.message}</span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
