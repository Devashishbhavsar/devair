import { OmConsole } from "./om-console";

const OM_ACTIONS = [
  "Re-send the confirmation email to the traveler",
  "Download the embassy-ready invoice PDF",
  "Request a cancellation for our team to process",
  "Extend hold validity before it expires",
];

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

      <section className="card flex flex-col gap-3 px-5 py-5">
        <h2 className="text-lg font-semibold tracking-tight">
          What you can do here
        </h2>
        <ul className="grid gap-2 text-sm text-muted sm:grid-cols-2">
          {OM_ACTIONS.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Can&apos;t find your PNR? Check the confirmation email you received
          when the hold was created.
        </p>
      </section>
    </main>
  );
}
