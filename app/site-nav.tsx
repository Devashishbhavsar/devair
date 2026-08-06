"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Header navigation with active-route indication (Design-System, "Active nav"
 * rule). Client component so the current route can be highlighted without
 * re-fetching the server header on navigation.
 */
export function SiteNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  const links = [
    { href: "/search", label: "Search flights" },
    { href: "/om", label: "Manage booking" },
  ];

  function navClass(href: string, active: boolean): string {
    return active
      ? "rounded-md bg-brand-soft px-3 py-1.5 font-medium text-brand transition-colors"
      : "rounded-md px-3 py-1.5 font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground";
  }

  const accountActive = pathname === "/account";

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Main">
      {links.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={navClass(link.href, active)}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href={email ? "/account" : "/"}
        className={`ml-1 rounded-md border px-3 py-1.5 font-medium transition-colors ${
          accountActive
            ? "border-brand/40 bg-brand-soft text-brand"
            : "border-border text-foreground hover:bg-surface-muted"
        }`}
        aria-current={accountActive ? "page" : undefined}
      >
        {email ? "Account" : "Sign in"}
      </Link>
    </nav>
  );
}
