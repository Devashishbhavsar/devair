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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-8 px-6 py-24 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            DevAir
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Sign in to manage your flight reservations.
          </p>
        </div>

        {error && ERROR_MESSAGES[error] && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <SignInForm />

        {googleEnabled && (
          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <a
              href="/api/auth/google"
              className="flex h-11 items-center justify-center rounded-full border border-zinc-300 px-5 font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Continue with Google
            </a>
          </div>
        )}

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Looking for flights?{" "}
          <Link href="/search" className="font-medium underline underline-offset-4">
            Search one-way offers
          </Link>
        </p>
      </main>
    </div>
  );
}
