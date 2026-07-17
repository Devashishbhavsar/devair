import Link from "next/link";
import { SearchForm } from "./search-form";

export default function SearchPage() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              DevAir
            </Link>
            <Link
              href="/account"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Account
            </Link>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Search flights
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            One-way availability by airport, date, and passengers.
          </p>
        </div>

        <SearchForm />
      </main>
    </div>
  );
}
