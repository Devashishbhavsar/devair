import { SignInForm } from "./sign-in-form";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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

        {error === "invalid_or_expired_link" && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            That sign-in link is invalid or has expired. Request a new one below.
          </p>
        )}

        <SignInForm />
      </main>
    </div>
  );
}
