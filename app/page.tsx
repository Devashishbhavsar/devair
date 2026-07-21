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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const googleEnabled = isGoogleOAuthConfigured();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
      <div className="flex flex-1 flex-col gap-4">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">
          Visa-ready flight holds
        </p>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Reserve a real flight itinerary — without buying the ticket.
        </h1>
        <p className="max-w-lg text-lg text-muted">
          DevAir creates verifiable airline holds for visa applications. Search
          one-way offers, hold a fare for 48 hours or 14 days, and download an
          embassy-ready PDF.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link href="/search" className="btn-primary">
            Search flights
          </Link>
          <Link href="/om" className="btn-secondary">
            Manage a booking
          </Link>
        </div>
      </div>

      <div className="card flex w-full max-w-md flex-col gap-5 self-center px-6 py-8 lg:self-auto">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted">
            Manage your reservations and saved passengers.
          </p>
        </div>

        {error && ERROR_MESSAGES[error] && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {ERROR_MESSAGES[error]}
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
    </main>
  );
}
