"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type SavedPassenger = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
};

type ApiError = { field?: string; message: string };

export function SavedPassengers() {
  const [passengers, setPassengers] = useState<SavedPassenger[] | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [errors, setErrors] = useState<ApiError[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/passengers");
      if (!response.ok) {
        setPassengers([]);
        return;
      }
      const data = (await response.json()) as { passengers?: SavedPassenger[] };
      setPassengers(data.passengers ?? []);
    } catch {
      setPassengers([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/passengers")
      .then((response) => (response.ok ? response.json() : { passengers: [] }))
      .then((data: { passengers?: SavedPassenger[] }) => {
        if (!cancelled) setPassengers(data.passengers ?? []);
      })
      .catch(() => {
        if (!cancelled) setPassengers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setBusy(true);
    try {
      const response = await fetch("/api/passengers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, dateOfBirth, nationality }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        errors?: ApiError[];
        error?: string;
      };
      if (!response.ok) {
        setErrors(data.errors ?? [{ message: data.error ?? "Could not save passenger." }]);
        return;
      }
      setFirstName("");
      setLastName("");
      setDateOfBirth("");
      setNationality("");
      await refresh();
    } catch {
      setErrors([{ message: "Could not reach the server. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/passengers?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="passengers-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="passengers-heading" className="text-xl font-semibold tracking-tight">
          Saved passengers
        </h2>
        <p className="mt-1 text-sm text-muted">
          Reuse traveler details at checkout instead of retyping them.
        </p>
      </div>

      {passengers === null ? (
        <div className="card px-5 py-6 text-sm text-muted">Loading saved passengers…</div>
      ) : passengers.length === 0 ? (
        <div className="card px-5 py-6 text-sm text-muted">
          No saved passengers yet — add one below.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {passengers.map((passenger) => (
            <li
              key={passenger.id}
              className="card flex items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="font-medium">
                  {passenger.firstName} {passenger.lastName}
                </p>
                <p className="text-xs text-muted">
                  {[passenger.dateOfBirth && `Born ${passenger.dateOfBirth}`, passenger.nationality]
                    .filter(Boolean)
                    .join(" · ") || "No extra details"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(passenger.id)}
                disabled={busy}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="card flex flex-col gap-4 px-5 py-5" noValidate>
        <p className="text-sm font-semibold">Add passenger</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="pax-first" className="field-label">
              First name
            </label>
            <input
              id="pax-first"
              className="field-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="pax-last" className="field-label">
              Last name
            </label>
            <input
              id="pax-last"
              className="field-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="pax-dob" className="field-label">
              Date of birth <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="pax-dob"
              type="date"
              className="field-input"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pax-nat" className="field-label">
              Nationality <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="pax-nat"
              className="field-input"
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              placeholder="e.g. US"
            />
          </div>
        </div>
        {errors.length > 0 && (
          <ul role="alert" className="text-sm text-danger">
            {errors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        )}
        <button type="submit" disabled={busy} className="btn-primary self-start">
          {busy ? "Saving…" : "Save passenger"}
        </button>
      </form>
    </section>
  );
}
