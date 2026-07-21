import { SearchForm } from "./search-form";

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
    </main>
  );
}
