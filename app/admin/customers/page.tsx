import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentAdminEmail } from "@/lib/admin";
import {
  listCustomers,
  listRefundRequests,
  type CustomerSummary,
  type RefundRequest,
} from "@/lib/customers";
import type { Reservation } from "@/lib/reservations";
import { RefundActions } from "./refund-actions";

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

const REFUND_STYLES: Record<NonNullable<Reservation["refundStatus"]>, string> = {
  none: "",
  requested: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  denied: "bg-danger-soft text-danger",
};

const REFUND_LABELS: Record<NonNullable<Reservation["refundStatus"]>, string> = {
  none: "",
  requested: "Refund requested",
  approved: "Refunded",
  denied: "Refund denied",
};

const REQUEST_STYLES: Record<RefundRequest["status"], string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  denied: "bg-danger-soft text-danger",
};

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function summaryChip(label: string, value: string | number, accent = false): ReactNode {
  return (
    <div
      className={`card flex flex-col gap-0.5 px-4 py-3 ${accent ? "ring-1 ring-brand/40" : ""}`}
    >
      <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
    </div>
  );
}

export default async function AdminCustomersPage() {
  const admin = await currentAdminEmail();
  if (!admin) {
    redirect("/");
  }

  const [customers, refunds] = await Promise.all([listCustomers(), listRefundRequests()]);

  const reservationsByPnr = new Map<string, Reservation>();
  for (const customer of customers) {
    for (const reservation of customer.reservations) {
      reservationsByPnr.set(reservation.pnr, reservation);
    }
  }

  const pendingRefundCount = refunds.filter((refund) => refund.status === "pending").length;
  const paidReservationCount = customers.reduce((sum, customer) => sum + customer.paidCount, 0);
  const totalPaidCents = customers.reduce((sum, customer) => sum + customer.totalPaidCents, 0);
  const refundedCents = refunds
    .filter((refund) => refund.status === "approved")
    .reduce((sum, refund) => sum + refund.amountCents, 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted">
          Customers aggregated by traveler email, with reservation history and refund requests.
        </p>
      </div>

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summaryChip("Customers", customers.length)}
        {summaryChip("Paid reservations", paidReservationCount)}
        {summaryChip("Collected", formatMoney(totalPaidCents))}
        {summaryChip(
          "Pending refunds",
          pendingRefundCount,
          pendingRefundCount > 0,
        )}
      </section>

      <section aria-labelledby="refunds-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="refunds-heading" className="text-xl font-semibold tracking-tight">
            Refund requests
          </h2>
          {refundedCents > 0 && (
            <span className="text-sm text-muted">Refunded: {formatMoney(refundedCents)}</span>
          )}
        </div>

        {refunds.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="font-medium">No refund requests yet</p>
            <p className="max-w-sm text-sm text-muted">
              When a customer requests a refund on a paid reservation, it will appear
              here for approval or denial.
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Requested</th>
                  <th className="px-4 py-2.5 font-semibold">Customer</th>
                  <th className="px-4 py-2.5 font-semibold">PNR / Route</th>
                  <th className="px-4 py-2.5 font-semibold">Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Reason</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold">Resolution</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => {
                  const reservation = reservationsByPnr.get(refund.reservationPnr);
                  return (
                    <tr
                      key={refund.id}
                      className="border-b border-border last:border-b-0 align-top"
                    >
                      <td className="px-4 py-3 text-muted">{formatDate(refund.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{refund.travelerEmail}</p>
                        {refund.travelerName && (
                          <p className="text-xs text-muted">{refund.travelerName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold tracking-wider text-foreground">
                          {refund.reservationPnr}
                        </p>
                        {reservation && (
                          <p className="text-xs text-muted">
                            {reservation.offer.airline} {reservation.offer.flightNumber} ·{" "}
                            {reservation.offer.from} → {reservation.offer.to}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {formatMoney(refund.amountCents)}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-muted">{refund.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`status-chip ${REQUEST_STYLES[refund.status]}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RefundActions
                          requestId={refund.id}
                          status={refund.status}
                          resolutionNote={refund.resolutionNote}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="customers-heading" className="flex flex-col gap-3">
        <h2 id="customers-heading" className="text-xl font-semibold tracking-tight">
          Customer list
        </h2>

        {customers.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="font-medium">No customers yet</p>
            <p className="max-w-sm text-sm text-muted">
              Reservations created with a traveler email will appear here, grouped by customer.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {customers.map((customer) => (
              <CustomerCard key={customer.email} customer={customer} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CustomerCard({ customer }: { customer: CustomerSummary }) {
  return (
    <li className="card flex flex-col gap-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{customer.email}</p>
          <p className="text-sm text-muted">
            {customer.travelerName ?? "No traveler name on file"} · Last activity{" "}
            {formatDate(customer.lastActivityAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full border border-border px-2.5 py-0.5">
            {customer.reservationCount} reservation{customer.reservationCount === 1 ? "" : "s"}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5">
            {customer.paidCount} paid
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5">
            {formatMoney(customer.totalPaidCents)} collected
          </span>
          {customer.pendingRefundCount > 0 && (
            <span className="rounded-full border border-warning/50 bg-warning-soft px-2.5 py-0.5 text-warning">
              {customer.pendingRefundCount} refund pending
            </span>
          )}
          {customer.refundedCount > 0 && (
            <span className="rounded-full border border-success/50 bg-success-soft px-2.5 py-0.5 text-success">
              {customer.refundedCount} refunded
            </span>
          )}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {customer.reservations.map((reservation) => (
          <li
            key={reservation.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-muted/50 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold tracking-wider text-foreground">
                {reservation.pnr}
              </span>
              <span className="text-muted">
                {reservation.offer.airline} {reservation.offer.flightNumber} ·{" "}
                {reservation.offer.from} → {reservation.offer.to} · {reservation.offer.date}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {reservation.status === "paid" && (
                <span className="text-xs font-medium text-muted">
                  {formatMoney(
                    reservation.paidAmountCents && reservation.paidAmountCents > 0
                      ? reservation.paidAmountCents
                      : Math.round(reservation.offer.totalPrice * 100),
                  )}
                </span>
              )}
              <span className={`status-chip ${STATUS_STYLES[reservation.status]}`}>
                {STATUS_LABELS[reservation.status]}
              </span>
              {reservation.refundStatus !== "none" && (
                <span className={`status-chip ${REFUND_STYLES[reservation.refundStatus ?? "none"]}`}>
                  {REFUND_LABELS[reservation.refundStatus ?? "none"]}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </li>
  );
}
