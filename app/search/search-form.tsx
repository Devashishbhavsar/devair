"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  airportLabel,
  SEARCH_AIRLINES,
  type FlightOffer,
  validateSearchInput,
} from "@/lib/search";
import {
  AlertIcon,
  CalendarIcon,
  CheckIcon,
  FilterIcon,
  PlaneArriveIcon,
  PlaneDepartIcon,
  SearchIcon,
  UsersIcon,
} from "../icons";

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

function statusChipClass(status: ReservationSummary["status"]): string {
  switch (status) {
    case "paid":
      return "status-chip bg-success-soft text-success";
    case "expired":
      return "status-chip bg-danger-soft text-danger";
    default:
      return "status-chip bg-brand-soft text-brand";
  }
}

function FieldIcon({ kind }: { kind: FieldName }) {
  const className = "pointer-events-none absolute inset-y-0 left-3 h-4 w-4 self-center text-muted";
  switch (kind) {
    case "from":
      return <PlaneDepartIcon className={className} />;
    case "to":
      return <PlaneArriveIcon className={className} />;
    case "date":
      return <CalendarIcon className={className} />;
    case "passengers":
      return <UsersIcon className={className} />;
    case "airline":
      return <FilterIcon className={className} />;
  }
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
          <div className="flex flex-col text-left">
            <label htmlFor="from" className="field-label">
              From
            </label>
            <div className="relative">
              <FieldIcon kind="from" />
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
                className={`${fieldClassName("from")} pl-9 uppercase`}
              />
            </div>
            {fieldErrors.from && (
              <p id="from-error" className="mt-1 text-sm text-danger">
                {fieldErrors.from}
              </p>
            )}
          </div>
          <div className="flex flex-col text-left">
            <label htmlFor="to" className="field-label">
              To
            </label>
            <div className="relative">
              <FieldIcon kind="to" />
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
                className={`${fieldClassName("to")} pl-9 uppercase`}
              />
            </div>
            {fieldErrors.to && (
              <p id="to-error" className="mt-1 text-sm text-danger">
                {fieldErrors.to}
              </p>
            )}
          </div>
          <div className="flex flex-col text-left">
            <label htmlFor="date" className="field-label">
              Date
            </label>
            <div className="relative">
              <FieldIcon kind="date" />
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
                className={`${fieldClassName("date")} pl-9`}
              />
            </div>
            {fieldErrors.date && (
              <p id="date-error" className="mt-1 text-sm text-danger">
                {fieldErrors.date}
              </p>
            )}
          </div>
          <div className="flex flex-col text-left">
            <label htmlFor="passengers" className="field-label">
              Passengers
            </label>
            <div className="relative">
              <FieldIcon kind="passengers" />
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
                className={`${fieldClassName("passengers")} pl-9`}
              />
            </div>
            {fieldErrors.passengers && (
              <p id="passengers-error" className="mt-1 text-sm text-danger">
                {fieldErrors.passengers}
              </p>
            )}
          </div>
          <div className="flex flex-col text-left sm:col-span-2">
            <label htmlFor="airline" className="field-label">
              Airline
            </label>
            <div className="relative">
              <FieldIcon kind="airline" />
              <select
                id="airline"
                name="airline"
                value={airline}
                onChange={(event) => setAirline(event.target.value)}
                aria-invalid={fieldErrors.airline ? true : undefined}
                aria-describedby={fieldErrors.airline ? "airline-error" : undefined}
                className={`${fieldClassName("airline")} pl-9`}
              >
                <option value="">Any airline</option>
                {SEARCH_AIRLINES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            {fieldErrors.airline && (
              <p id="airline-error" className="mt-1 text-sm text-danger">
                {fieldErrors.airline}
              </p>
            )}
          </div>
        </div>

        <input type="hidden" name="tripType" value="one-way" />
        <p className="text-left text-sm text-muted">Trip type: one-way</p>

        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary"
        >
          {status === "loading" ? "Searching…" : "Search flights"}
        </button>
      </form>

      {status === "error" && message && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      {status === "empty" && message && (
        <div
          role="status"
          className="card flex flex-col items-center gap-2 px-6 py-10 text-center"
        >
          <SearchIcon className="h-8 w-8 text-muted" />
          <p className="font-medium">No flights found</p>
          <p className="max-w-md text-sm text-muted">{message}</p>
          <p className="text-sm text-muted">
            Tip: try a nearby airport, a different date, or remove the airline
            filter.
          </p>
        </div>
      )}

      {status === "results" && offers.length > 0 && (
        <section aria-label="Flight results" className="flex flex-col gap-3 text-left">
          <h2 className="text-lg font-semibold text-foreground">
            {offers.length} offer{offers.length === 1 ? "" : "s"} · {airportLabel(from)} →{" "}
            {airportLabel(to)}
          </h2>
          {activeAirline && (
            <p className="text-sm text-muted">Filtered to {activeAirline}</p>
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
                      <span className="font-medium text-foreground">
                        {offer.airline} · {offer.flightNumber}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(offer.totalPrice, offer.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-muted">
                      {offer.departTime} → {offer.arriveTime} · {formatDuration(offer.durationMinutes)} ·{" "}
                      {offer.passengers} passenger{offer.passengers === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-muted">
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
                <p role="status" className="text-sm font-medium text-foreground">
                  Selected {selected.airline} ({selected.flightNumber}) for{" "}
                  {formatMoney(selected.totalPrice, selected.currency)}
                </p>
                <p className="text-sm text-muted">
                  Create a verifiable hold with PNR, airline reference, validity, and PDF.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col text-left">
                  <label htmlFor="holdValidity" className="field-label">
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
                <div className="flex flex-col text-left">
                  <label htmlFor="travelerName" className="field-label">
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
                <div className="flex flex-col text-left sm:col-span-2">
                  <label htmlFor="travelerEmail" className="field-label">
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
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
                >
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{holdMessage}</p>
                </div>
              )}

              {holdStatus === "success" && reservation && (
                <div className="flex items-start gap-2 rounded-md bg-success-soft px-3 py-2 text-sm text-success">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Hold created — save your PNR below and download the PDF for
                    your visa interview.
                  </p>
                </div>
              )}

              {reservation && (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-muted p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">
                      Reservation {reservation.pnr}
                    </p>
                    <span className={statusChipClass(reservation.status)}>
                      {reservation.status}
                    </span>
                  </div>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">PNR</dt>
                      <dd className="font-medium text-foreground">{reservation.pnr}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Airline reference</dt>
                      <dd className="font-medium text-foreground">{reservation.airlineRef}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Document</dt>
                      <dd className="font-medium text-foreground">{reservation.documentNumber}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Document type</dt>
                      <dd className="font-medium text-foreground">{reservation.documentType}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Verification code</dt>
                      <dd className="font-medium text-foreground">{reservation.verificationCode}</dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Hold validity</dt>
                      <dd className="font-medium text-foreground">
                        {reservation.validityLabel} ({reservation.holdValidityHours}h)
                      </dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Ticketing</dt>
                      <dd className="font-medium text-foreground">
                        {reservation.ticketingStatus === "ticketed" ? "Ticketed" : "Not ticketed"}
                      </dd>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 sm:flex-col sm:gap-0">
                      <dt className="text-muted">Valid until</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(reservation.holdExpiresAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-4 pt-1">
                    <a
                      className="font-medium text-brand underline underline-offset-4"
                      href={reservation.pdfUrl}
                      target="_blank"
                    >
                      Open PDF
                    </a>
                    {reservation.verificationUrl && (
                      <a
                        className="font-medium text-brand underline underline-offset-4"
                        href={reservation.verificationUrl}
                        target="_blank"
                      >
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
