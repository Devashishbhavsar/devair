import Link from "next/link";
import { CheckoutForm } from "./checkout-form";
import { getReservationByPnr } from "@/lib/reservations";

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
          Enter passenger details, review tax, and pay in Stripe test mode.
        </p>
      </div>

      {pnr && !reservation && (
        <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="font-medium">Hold {pnr.toUpperCase()} not found</p>
          <p className="max-w-sm text-sm text-muted">
            The booking reference is invalid or the hold no longer exists. Search
            again to create a new hold.
          </p>
          <Link href="/search" className="btn-primary">
            Back to search
          </Link>
        </div>
      )}

      {!pnr && (
        <div className="card flex flex-col gap-2 px-5 py-4 text-sm">
          <p className="font-medium">No hold selected</p>
          <p className="text-muted">
            You can pay without a linked hold, or{" "}
            <Link href="/search" className="font-medium text-brand underline underline-offset-4">
              search flights
            </Link>{" "}
            and create a hold first so payment confirms that reservation.
          </p>
        </div>
      )}

      {reservation && (
        <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-mono text-sm font-semibold tracking-wider">
              {reservation.pnr}
            </p>
            <p className="text-sm text-muted">
              {reservation.offer.airline} {reservation.offer.flightNumber} ·{" "}
              {reservation.offer.from} → {reservation.offer.to} · {reservation.offer.date}
            </p>
          </div>
          <span className="text-sm font-medium text-muted">
            Status: {reservation.status}
          </span>
        </div>
      )}

      {(!pnr || reservation) && <CheckoutForm />}
    </main>
  );
}
