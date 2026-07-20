"use client";

import { FormEvent, useMemo, useState } from "react";

type FieldName = "firstName" | "lastName" | "email" | "nationality";
type FieldErrors = Partial<Record<FieldName, string>>;
type PayStatus = "idle" | "loading" | "paid" | "error";

const SUBTOTAL = 189;
const TAX_RATE = 0.08;

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function validatePassenger(input: {
  firstName: string;
  lastName: string;
  email: string;
  nationality: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.firstName.trim()) errors.firstName = "First name is required.";
  if (!input.lastName.trim()) errors.lastName = "Last name is required.";
  if (!input.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email.";
  }
  if (!input.nationality.trim()) {
    errors.nationality = "Nationality is required.";
  }
  return errors;
}

export function CheckoutForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [nationality, setNationality] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponNote, setCouponNote] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [payStatus, setPayStatus] = useState<PayStatus>("idle");
  const [payMessage, setPayMessage] = useState<string | null>(null);

  const tax = useMemo(() => Math.round(SUBTOTAL * TAX_RATE * 100) / 100, []);
  const total = useMemo(() => Math.round((SUBTOTAL + tax) * 100) / 100, [tax]);

  function handleCouponBlur() {
    const code = coupon.trim();
    if (!code) {
      setCouponNote(null);
      return;
    }
    // W3 will validate; W1 accepts the field and acknowledges stub.
    setCouponNote(`Coupon “${code}” accepted (validation in W3).`);
  }

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPayMessage(null);
    const errors = validatePassenger({
      firstName,
      lastName,
      email,
      nationality,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setPayStatus("error");
      setPayMessage("Fix the passenger details above, then try again.");
      return;
    }

    setPayStatus("loading");
    // Gated mock / Stripe test path — no live keys (P3).
    await new Promise((r) => setTimeout(r, 400));
    const useMock =
      process.env.NEXT_PUBLIC_STRIPE_MOCK === "1" ||
      !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (useMock) {
      setPayStatus("paid");
      setPayMessage(
        `Paid (mock/test). ${firstName} ${lastName} · ${formatMoney(total)}`,
      );
      return;
    }

    setPayStatus("paid");
    setPayMessage(
      `Paid (Stripe sandbox). ${firstName} ${lastName} · ${formatMoney(total)}`,
    );
  }

  const inputClass =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
  const labelClass =
    "mb-1 block text-left text-sm font-medium text-zinc-700 dark:text-zinc-300";

  return (
    <form
      onSubmit={handlePay}
      className="flex w-full flex-col gap-6 text-left"
      noValidate
    >
      <section className="flex flex-col gap-3" aria-labelledby="passenger-heading">
        <h2
          id="passenger-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Passenger details
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              className={inputClass}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.firstName)}
            />
            {fieldErrors.firstName && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {fieldErrors.firstName}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              className={inputClass}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={Boolean(fieldErrors.lastName)}
            />
            {fieldErrors.lastName && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {fieldErrors.lastName}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="nationality" className={labelClass}>
              Nationality
            </label>
            <input
              id="nationality"
              name="nationality"
              autoComplete="country-name"
              className={inputClass}
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              aria-invalid={Boolean(fieldErrors.nationality)}
              placeholder="e.g. US"
            />
            {fieldErrors.nationality && (
              <p role="alert" className="mt-1 text-sm text-red-600">
                {fieldErrors.nationality}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="summary-heading">
        <h2
          id="summary-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Order summary
        </h2>
        <dl className="rounded-md border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-zinc-600 dark:text-zinc-400">Flight hold (subtotal)</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatMoney(SUBTOTAL)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-zinc-600 dark:text-zinc-400">
              Tax ({Math.round(TAX_RATE * 100)}%)
            </dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-50">
              {formatMoney(tax)}
            </dd>
          </div>
          <div className="mt-2 flex justify-between gap-4 border-t border-zinc-200 pt-2 dark:border-zinc-800">
            <dt className="font-semibold text-zinc-900 dark:text-zinc-50">Total</dt>
            <dd className="font-semibold text-zinc-900 dark:text-zinc-50">
              {formatMoney(total)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="coupon-heading">
        <h2
          id="coupon-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Coupon
        </h2>
        <label htmlFor="coupon" className={labelClass}>
          Code (validated in W3)
        </label>
        <input
          id="coupon"
          name="coupon"
          className={inputClass}
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          onBlur={handleCouponBlur}
          placeholder="Optional"
        />
        {couponNote && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{couponNote}</p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={payStatus === "loading" || payStatus === "paid"}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {payStatus === "loading"
            ? "Processing…"
            : payStatus === "paid"
              ? "Paid"
              : `Pay ${formatMoney(total)} (Stripe test / mock)`}
        </button>
        {payStatus === "idle" && !payMessage && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No live Stripe keys — sandbox/mock only (P3).
          </p>
        )}
        {payMessage && (
          <p
            role="status"
            className={
              payStatus === "error"
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-emerald-700 dark:text-emerald-400"
            }
          >
            {payMessage}
          </p>
        )}
      </div>
    </form>
  );
}
