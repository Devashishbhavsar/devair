import Link from "next/link";
import { cookies } from "next/headers";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";

export async function SiteHeader() {
  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-white dark:text-[#0b1220]">
            D
          </span>
          DevAir
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/search" className="rounded-md px-3 py-1.5 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground">
            Search flights
          </Link>
          <Link href="/om" className="rounded-md px-3 py-1.5 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground">
            Manage booking
          </Link>
          <Link
            href={email ? "/account" : "/"}
            className="ml-1 rounded-md border border-border px-3 py-1.5 font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            {email ? "Account" : "Sign in"}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 text-sm text-muted sm:flex-row">
        <p>DevAir — flight reservation holds for visa applications.</p>
        <p>Demo build · Stripe test mode · no real tickets issued.</p>
      </div>
    </footer>
  );
}
