import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionEmail, SESSION_COOKIE_NAME } from "@/lib/session";
import { LogoutButton } from "./logout-button";

export default async function AccountPage() {
  const cookieStore = await cookies();
  const email = readSessionEmail(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!email) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-md flex-col items-center gap-6 px-6 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Your account
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Signed in as <span className="font-medium text-black dark:text-zinc-50">{email}</span>
        </p>
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Search flights
        </Link>
        <LogoutButton />
      </main>
    </div>
  );
}
