"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  airportLabel,
  SEARCH_AIRLINES,
  type FlightOffer,
  validateSearchInput,
} from "@/lib/search";

type Status = "idle" | "loading" | "results" | "empty" | "error";
type HoldStatus = "idle" | "loading" | "success" | "error";
type FieldName = "from" | "to" | "date" | "passengers" | "airline";
type FieldErrors = Partial<Record<FieldName, string>>;
type HoldValidity = "48h" | "14d";
type ReservationSummary = {
  pnr: string;
  airlineRef: string;
  documentNumber: string;
  verificationCode: string;
  status: "hold" | "paid" | "expired";
  validity: HoldValidity;
  validityLabel: string;
  holdValidityHours: number;
  holdExpiresAt: string;
  documentType: string;
  ticketingStatus: "not_ticketed" | "ticketed";
  verificationUrl: string | null;
  pdfUrl: string;
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SearchForm() {
  const defaultDate = useMemo(() => todayIsoDate(), []);
  const [from, setFrom] = useState("JFK");
  const [to, setTo] = useState("LHR");
  const [date, setDate] = useState(defaultDate);
  const [passengers, setPassengers] = useState(1);
  const [airline, setAirline] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [holdValidity, setHoldValidity] = useState<HoldValidity>("48h");
  const [travelerName, setTravelerName] = useState("");
  const [travelerEmail, setTravelerEmail] = useState("");
  const [holdStatus, setHoldStatus] = useState<HoldStatus>("idle");
  const [holdMessage, setHoldMessage] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationSummary | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setHoldMessage(null);
    setOffers([]);
    setSelectedId(null);
    setReservation(null);
    setHoldStatus("idle");

    const validated = validateSearchInput({
      from,
      to,
      date,
      passengers,
      airline,
      tripType: "one-way",
    });

    if (!validated.ok) {
      const nextFieldErrors: FieldErrors = {};
      for (const error of validated.errors) {
        if (error.field && !nextFieldErrors[error.field as FieldName]) {
          nextFieldErrors[error.field as FieldName] = error.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      setStatus("error");
      setMessage(validated.errors[0]?.message ?? "Check your search details and try again.");
      return;
    }

    setFieldErrors({});
    setStatus("loading");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validated.value,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Search failed. Check your inputs and try again.");
        return;
      }

      const nextOffers = Array.isArray(data.offers) ? (data.offers as FlightOffer[]) : [];
      setOffers(nextOffers);
      if (nextOffers.length === 0) {
        setStatus("empty");
        setMessage(
          validated.value.airline
            ? `No ${validated.value.airline} flights found for that route and date. Try another airline or day.`
            : "No flights found for that route and date. Try different airports or another day.",
        );
        return;
      }

      setStatus("results");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage("Could not reach the search service. Please try again.");
    }
  }

  const selected = offers.find((offer) => offer.id === selectedId) ?? null;
  const activeAirline = airline.trim();

  async function handleCreateHold() {
    if (!selected) {
      setHoldStatus("error");
      setHoldMessage("Select a flight offer before creating a hold.");
      return;
    }

    setHoldStatus("loading");
    setHoldMessage(null);
    setReservation(null);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          date,
          passengers,
          airline,
          tripType: "one-way",
          offerId: selected.id,
          validity: holdValidity,
          travelerName,
          travelerEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setHoldStatus("error");
        setHoldMessage(data.error ?? "Could not create a reservation hold.");
        return;
      }

      setReservation(data.reservation as ReservationSummary);
      setHoldStatus("success");
      setHoldMessage(null);
    } catch {
      setHoldStatus("error");
      setHoldMessage("Could not reach the reservation service. Please try again.");
    }
  }

  function fieldClassName(field: FieldName): string {
    return `field-input ${
      fieldErrors[field]
        ? "!border-danger focus:!border-danger"
        : ""
    }`;
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 px-6 py-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="from" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              From
            </label>
            <input
              id="from"
              name="from"
              type="text"
              maxLength={3}
              required
              autoComplete="off"
              placeholder="JFK"
              value={from}
              onChange={(event) => setFrom(event.target.value.toUpperCase())}
              aria-invalid={fieldErrors.from ? true : undefined}
              aria-describedby={fieldErrors.from ? "from-error" : undefined}
              className={`${fieldClassName("from")} uppercase`}
            />
            {fieldErrors.from && (
              <p id="from-error" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.from}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="to" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              To
            </label>
            <input
              id="to"
              name="to"
              type="text"
              maxLength={3}
              required
              autoComplete="off"
              placeholder="LHR"
              value={to}
              onChange={(event) => setTo(event.target.value.toUpperCase())}
              aria-invalid={fieldErrors.to ? true : undefined}
              aria-describedby={fieldErrors.to ? "to-error" : undefined}
              className={`${fieldClassName("to")} uppercase`}
            />
            {fieldErrors.to && (
              <p id="to-error" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.to}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              min={defaultDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={fieldErrors.date ? true : undefined}
              aria-describedby={fieldErrors.date ? "date-error" : undefined}
              className={fieldClassName("date")}
            />
            {fieldErrors.date && (
              <p id="date-error" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.date}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 text-left">
            <label htmlFor="passengers" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Passengers
            </label>
            <input
              id="passengers"
              name="passengers"
              type="number"
              min={1}
              max={9}
              required
              value={passengers}
              onChange={(event) => setPassengers(Number(event.target.value))}
              aria-invalid={fieldErrors.passengers ? true : undefined}
              aria-describedby={fieldErrors.passengers ? "passengers-error" : undefined}
              className={fieldClassName("passengers")}
            />
            {fieldErrors.passengers && (
              <p id="passengers-error" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.passengers}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 text-left sm:col-span-2">
            <label htmlFor="airline" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Airline
            </label>
            <select
              id="airline"
              name="airline"
              value={airline}
              onChange={(event) => setAirline(event.target.value)}
              aria-invalid={fieldErrors.airline ? true : undefined}
              aria-describedby={fieldErrors.airline ? "airline-error" : undefined}
              className={fieldClassName("airline")}
            >
              <option value="">Any airline</option>
              {SEARCH_AIRLINES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {fieldErrors.airline && (
              <p id="airline-error" className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.airline}
              </p>
            )}
          </div>
        </div>

        <input type="hidden" name="tripType" value="one-way" />
        <p className="text-left text-sm text-zinc-500 dark:text-zinc-400">Trip type: one-way</p>

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary"
        >
          {status === "loading" ? "Searching…" : "Search flights"}
        </button>
      </form>

      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={
            status === "error"
              ? "text-sm text-red-600 dark:text-red-400"
              : "text-sm text-zinc-600 dark:text-zinc-400"
          }
        >
          {message}
        </p>
      )}

      {status === "results" && offers.length > 0 && (
        <section aria-label="Flight results" className="flex flex-col gap-3 text-left">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            {offers.length} offer{offers.length === 1 ? "" : "s"} · {airportLabel(from)} →{" "}
            {airportLabel(to)}
          </h2>
          {activeAirline && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Filtered to {activeAirline}</p>
          )}
          <ul className="flex flex-col gap-3">
            {offers.map((offer) => {
              const isSelected = offer.id === selectedId;
              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(offer.id);
                      setReservation(null);
                      setHoldStatus("idle");
                      setHoldMessage(null);
                    }}
                    aria-pressed={isSelected}
                    className={`card flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "!border-brand ring-2 ring-brand/30"
                        : "hover:!border-brand/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-black dark:text-zinc-50">
                        {offer.airline} · {offer.flightNumber}
                      </span>
                      <span className="font-semibold text-black dark:text-zinc-50">
                        {formatMoney(offer.totalPrice, offer.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {offer.departTime} → {offer.arriveTime} · {formatDuration(offer.durationMinutes)} ·{" "}
                      {offer.passengers} passenger{offer.passengers === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      {formatMoney(offer.pricePerPassenger, offer.currency)} per passenger
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="card flex flex-col gap-4 px-5 py-5">
              <div className="flex flex-col gap-1">
                <p role="status" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Selected {selected.airline} ({selected.flightNumber}) for{" "}
                  {formatMoney(selected.totalPrice, selected.currency)}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Create a verifiable hold with PNR, airline reference, validity, and PDF.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="holdValidity" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Hold validity
                  </label>
                  <select
                    id="holdValidity"
                    value={holdValidity}
                    onChange={(event) => setHoldValidity(event.target.value as HoldValidity)}
                    className="field-input"
                  >
                    <option value="48h">48 hours</option>
                    <option value="14d">14 days</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="travelerName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Traveler name
                  </label>
                  <input
                    id="travelerName"
                    type="text"
                    value={travelerName}
                    onChange={(event) => setTravelerName(event.target.value)}
                    className="field-input"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <label htmlFor="travelerEmail" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Traveler email
                  </label>
                  <input
                    id="travelerEmail"
                    type="email"
                    value={travelerEmail}
                    onChange={(event) => setTravelerEmail(event.target.value)}
                    className="field-input"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateHold}
                disabled={holdStatus === "loading"}
                className="btn-primary"
              >
                {holdStatus === "loading" ? "Creating hold..." : "Create hold"}
              </button>

              {holdMessage && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {holdMessage}
                </p>
              )}

              {reservation && (
                <div className="grid gap-2 rounded-md bg-zinc-100 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>PNR</span>
                    <strong>{reservation.pnr}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Airline reference</span>
                    <strong>{reservation.airlineRef}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Document</span>
                    <strong>{reservation.documentNumber}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Document type</span>
                    <strong>{reservation.documentType}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Verification code</span>
                    <strong>{reservation.verificationCode}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Status</span>
                    <strong>{reservation.status.toUpperCase()}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Hold validity</span>
                    <strong>
                      {reservation.validityLabel} ({reservation.holdValidityHours}h)
                    </strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Ticketing</span>
                    <strong>{reservation.ticketingStatus === "ticketed" ? "Ticketed" : "Not ticketed"}</strong>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>Valid until</span>
                    <strong>{new Date(reservation.holdExpiresAt).toLocaleString()}</strong>
                  </div>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <a className="underline underline-offset-4" href={reservation.pdfUrl} target="_blank">
                      Open PDF
                    </a>
                    {reservation.verificationUrl && (
                      <a className="underline underline-offset-4" href={reservation.verificationUrl} target="_blank">
                        Verify hold
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
