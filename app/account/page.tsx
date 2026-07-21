import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";
import { listReservationsByEmail, type Reservation } from "@/lib/reservations";
import { LogoutButton } from "./logout-button";
import { SavedPassengers } from "./saved-passengers";

const STATUS_STYLES: Record<Reservation["status"], string> = {
  hold: "bg-warning-soft text-warning",
  paid: "bg-success-soft text-success",
  expired: "bg-danger-soft text-danger",
};

const STATUS_LABELS: Record<Reservation["status"], string> = {
  hold: "Held",
  paid: "Paid",
  expired: "Expired",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!email) {
    redirect("/");
  }

  const reservations = await listReservationsByEmail(email);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
          <p className="mt-1 text-muted">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/search" className="btn-primary">
            Search flights
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section aria-labelledby="history-heading" className="flex flex-col gap-3">
        <h2 id="history-heading" className="text-xl font-semibold tracking-tight">
          Booking history
        </h2>
        {reservations.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="font-medium">No bookings yet</p>
            <p className="max-w-sm text-sm text-muted">
              Holds you create with this email address ({email}) as the traveler
              email will show up here.
            </p>
            <Link href="/search" className="btn-secondary">
              Find a flight
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="card px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold tracking-wider">
                        {reservation.pnr}
                      </span>
                      <span className={`status-chip ${STATUS_STYLES[reservation.status]}`}>
                        {STATUS_LABELS[reservation.status]}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {reservation.offer.airline} {reservation.offer.flightNumber} ·{" "}
                      {reservation.offer.from} → {reservation.offer.to} ·{" "}
                      {reservation.offer.date}
                    </p>
                    <p className="text-xs text-muted">
                      {reservation.status === "hold"
                        ? `Hold valid until ${formatDate(reservation.holdExpiresAt)}`
                        : reservation.statusReason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/om?pnr=${reservation.pnr}`}
                      className="btn-secondary !h-9 text-sm"
                    >
                      Manage
                    </Link>
                    {reservation.status === "hold" && (
                      <Link
                        href={`/checkout?pnr=${reservation.pnr}`}
                        className="btn-primary !h-9 text-sm"
                      >
                        Pay now
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SavedPassengers />
    </main>
  );
}
