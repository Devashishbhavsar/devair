"use client";

import { FormEvent, useMemo, useState } from "react";
import { airportLabel, type FlightOffer } from "@/lib/search";

type Status = "idle" | "loading" | "results" | "empty" | "error";

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
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    setOffers([]);
    setSelectedId(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to,
          date,
          passengers,
          tripType: "one-way",
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
        setMessage("No flights found for that route and date. Try different airports or another day.");
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

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
              className="h-11 rounded-md border border-zinc-300 px-3 text-base uppercase outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-50"
            />
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
              className="h-11 rounded-md border border-zinc-300 px-3 text-base uppercase outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-50"
            />
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
              className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-50"
            />
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
              className="h-11 rounded-md border border-zinc-300 px-3 text-base outline-none focus:border-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-50"
            />
          </div>
        </div>

        <input type="hidden" name="tripType" value="one-way" />
        <p className="text-left text-sm text-zinc-500 dark:text-zinc-400">Trip type: one-way</p>

        <button
          type="submit"
          disabled={status === "loading"}
          className="h-11 rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
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
          <ul className="flex flex-col gap-3">
            {offers.map((offer) => {
              const isSelected = offer.id === selectedId;
              return (
                <li key={offer.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(offer.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full flex-col gap-2 rounded-md border px-4 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-zinc-950 bg-zinc-100 dark:border-zinc-50 dark:bg-zinc-900"
                        : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-500"
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
            <p role="status" className="text-sm text-zinc-700 dark:text-zinc-300">
              Selected {selected.airline} ({selected.flightNumber}) for{" "}
              {formatMoney(selected.totalPrice, selected.currency)}. Hold/checkout comes in a later
              story.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
