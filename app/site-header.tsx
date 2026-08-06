import Link from "next/link";
import { cookies } from "next/headers";
import { isDemoBannerVisible } from "@/lib/demo-banner";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";
import { SiteNav } from "./site-nav";

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
        <SiteNav email={email} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  const showDemoBanner = isDemoBannerVisible();

  return (
    <footer className="border-t border-border py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted sm:flex-row sm:flex-wrap">
        <p>DevAir — flight reservation holds for visa applications.</p>
        <nav className="flex items-center gap-4" aria-label="Footer">
          <Link href="/search" className="transition-colors hover:text-foreground">
            Search flights
          </Link>
          <Link href="/om" className="transition-colors hover:text-foreground">
            Manage booking
          </Link>
        </nav>
        {showDemoBanner && (
          <p>Demo build · Stripe test mode · no real tickets issued.</p>
        )}
      </div>
    </footer>
  );
}
