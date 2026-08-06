import Link from "next/link";
import { SignInForm } from "./sign-in-form";
import { isGoogleOAuthConfigured } from "@/lib/auth/google";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_or_expired_link:
    "That sign-in link is invalid or has expired. Request a new one below.",
  google_oauth_not_configured:
    "Google sign-in is not enabled on this server.",
  google_oauth_state_mismatch:
    "Google sign-in could not be verified. Please try again.",
  google_oauth_denied: "Google sign-in was cancelled.",
  google_oauth_failed: "Google sign-in failed. Please try again.",
};

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Search one-way offers",
    body: "Find real availability by airport, date, and passenger count.",
  },
  {
    step: "2",
    title: "Hold a fare",
    body: "Reserve a verifiable itinerary for 48 hours or 14 days — no ticket purchase.",
  },
  {
    step: "3",
    title: "Download your PDF",
    body: "Get an embassy-ready itinerary with your PNR for the visa interview.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleEnabled = isGoogleOAuthConfigured();
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="flex flex-1 flex-col">
      {/* First viewport — Design-System: brand (header) + one headline +
          one supporting sentence + one CTA group + one dominant visual. */}
      <section className="relative overflow-hidden bg-[#0b1220]">
        <div
          role="img"
          aria-label="Aircraft wing over a sea of clouds at dusk"
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero-aircraft.svg)" }}
        />
        {/* Legibility scrims over the hero image */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgb(11 18 32 / 0.92) 0%, rgb(11 18 32 / 0.55) 45%, rgb(11 18 32 / 0.08) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              "linear-gradient(to top, #0b1220 0%, rgb(11 18 32 / 0) 100%)",
          }}
        />

        <div className="relative mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl flex-col justify-center px-6 py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#93c5fd]">
            Visa-ready flight holds
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
            Reserve a real flight itinerary — without buying the ticket.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            DevAir creates verifiable airline holds for visa applications.
            Search one-way offers, hold a fare for 48 hours or 14 days, and
            download an embassy-ready PDF.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/search" className="btn-primary">
              Search flights
            </Link>
            <Link href="/om" className="btn-secondary">
              Manage a booking
            </Link>
          </div>
        </div>
      </section>

      {/* Below the fold: purposeful second section + sign-in card (secondary). */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <p className="mt-1 text-muted">
              From search to an embassy-ready itinerary in three steps.
            </p>
            <ol className="mt-8 flex flex-col gap-6">
              {HOW_IT_WORKS.map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand"
                  >
                    {item.step}
                  </span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            id="sign-in"
            className="card flex w-full flex-col gap-5 self-start px-6 py-8"
          >
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
              <p className="mt-1 text-sm text-muted">
                Manage your reservations and saved passengers.
              </p>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
              >
                {errorMessage}
              </p>
            )}

            <SignInForm />

            {googleEnabled && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <a href="/api/auth/google" className="btn-secondary">
                  Continue with Google
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
