import Link from "next/link";
import { SearchForm } from "./search-form";

const SEARCH_STRIP = [
  {
    title: "Verifiable holds",
    body: "Every hold comes with a PNR, airline reference, and verification code.",
  },
  {
    title: "48h or 14 days",
    body: "Pick how long the itinerary stays reserved before you decide to pay.",
  },
  {
    title: "Embassy-ready PDF",
    body: "Download a clean itinerary document for your visa interview.",
  },
];

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Search flights</h1>
        <p className="mt-1 text-muted">
          One-way availability by airport, date, and passengers.
        </p>
      </div>

      <SearchForm />

      <section className="card flex flex-col gap-4 px-5 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Searching is just the start
          </h2>
          <p className="mt-1 text-sm text-muted">
            Holds are verifiable, embassy-ready itineraries — not airline
            tickets.
          </p>
        </div>
        <ul className="grid gap-4 text-sm sm:grid-cols-3">
          {SEARCH_STRIP.map((item) => (
            <li key={item.title} className="flex flex-col gap-1">
              <span className="font-medium">{item.title}</span>
              <span className="text-muted">{item.body}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Already holding a booking?{" "}
          <Link
            href="/om"
            className="font-medium text-brand underline underline-offset-4"
          >
            Manage it by PNR
          </Link>{" "}
          — no account needed.
        </p>
      </section>
    </main>
  );
}
