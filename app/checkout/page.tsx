import Link from "next/link";
import { AlertIcon, SearchIcon } from "../icons";
import { CheckoutForm } from "./checkout-form";
import { getReservationByPnr } from "@/lib/reservations";

function formatUtc(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString();
}

function statusChipClass(status: "hold" | "paid" | "expired"): string {
  switch (status) {
    case "paid":
      return "status-chip bg-success-soft text-success";
    case "expired":
      return "status-chip bg-danger-soft text-danger";
    default:
      return "status-chip bg-brand-soft text-brand";
  }
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ pnr?: string }>;
}) {
  const { pnr } = await searchParams;
  const reservation = pnr ? await getReservationByPnr(pnr) : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-muted">
          Review your hold, enter passenger details, apply a coupon, and pay in
          Stripe test mode.
        </p>
      </div>

      {pnr && !reservation && (
        <div
          role="status"
          className="card flex flex-col items-center gap-2 px-6 py-10 text-center"
        >
          <AlertIcon className="h-8 w-8 text-muted" />
          <p className="font-medium">Hold {pnr.toUpperCase()} not found</p>
          <p className="max-w-sm text-sm text-muted">
            The booking reference is invalid or the hold no longer exists.
            Search again to create a new hold.
          </p>
          <Link href="/search" className="btn-primary mt-2">
            Back to search
          </Link>
        </div>
      )}

      {!pnr && (
        <div
          role="status"
          className="card flex flex-col items-center gap-2 px-6 py-10 text-center"
        >
          <SearchIcon className="h-8 w-8 text-muted" />
          <p className="font-medium">No hold selected</p>
          <p className="max-w-md text-sm text-muted">
            You can pay without a linked hold, or{" "}
            <Link
              href="/search"
              className="font-medium text-brand underline underline-offset-4"
            >
              search flights
            </Link>{" "}
            and create a hold first so payment confirms that reservation.
          </p>
        </div>
      )}

      {reservation && (
        <section
          className="flex flex-col gap-3"
          aria-labelledby="hold-summary-heading"
        >
          <h2
            id="hold-summary-heading"
            className="text-lg font-semibold text-foreground"
          >
            Hold summary
          </h2>
          <div className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-sm font-semibold tracking-wider text-foreground">
                  {reservation.pnr}
                </p>
                <p className="text-sm text-muted">
                  {reservation.offer.airline} {reservation.offer.flightNumber} ·{" "}
                  {reservation.offer.from} → {reservation.offer.to} ·{" "}
                  {reservation.offer.date}
                </p>
              </div>
              <span className={statusChipClass(reservation.status)}>
                {reservation.status}
              </span>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted">Hold valid until</dt>
                <dd className="font-medium text-foreground">
                  {formatUtc(reservation.holdExpiresAt)} (
                  {reservation.validityLabel})
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted">Document</dt>
                <dd className="font-medium text-foreground">
                  {reservation.documentNumber} · {reservation.documentType}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted">Traveler</dt>
                <dd className="font-medium text-foreground">
                  {reservation.travelerName ?? "Not provided"}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="text-muted">Ticketing</dt>
                <dd className="font-medium text-foreground">
                  {reservation.ticketingStatus === "ticketed"
                    ? "Ticketed"
                    : "Not ticketed"}
                </dd>
              </div>
            </dl>
            <a
              href={reservation.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-brand underline underline-offset-4"
            >
              Download itinerary PDF
            </a>
          </div>
        </section>
      )}

      {(!pnr || reservation) && <CheckoutForm reservation={reservation} />}
    </main>
  );
}
