import { OmConsole } from "./om-console";

export default function OmPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Manage booking</h1>
        <p className="mt-1 text-muted">
          Look up your reservation status, resend the confirmation email,
          download your invoice, request a cancellation, or extend hold validity.
        </p>
      </div>

      <OmConsole />
    </main>
  );
}
