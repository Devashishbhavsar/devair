"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  pnr: string;
};

type Message = { kind: "ok" | "error"; text: string } | null;

/** Request a refund on a paid reservation (visible on the account page). */
export function RequestRefund({ pnr }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr, reason: reason.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not request a refund.");
      }
      setOpen(false);
      setReason("");
      setMessage({
        kind: "ok",
        text: "Refund requested. Our team will review it shortly.",
      });
      router.refresh();
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not request a refund.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {message && (
        <p
          role="status"
          className={
            message.kind === "error"
              ? "text-sm text-danger"
              : "text-sm text-success"
          }
        >
          {message.text}
        </p>
      )}
      {!open ? (
        <button
          type="button"
          className="btn-secondary !h-9 text-sm"
          onClick={() => setOpen(true)}
        >
          Request refund
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2">
          <label htmlFor={`refund-reason-${pnr}`} className="field-label">
            Reason (optional)
          </label>
          <textarea
            id={`refund-reason-${pnr}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Why are you requesting a refund?"
            className="field-input !h-auto resize-y py-2"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary !h-9 text-sm" disabled={busy}>
              {busy ? "Submitting…" : "Submit request"}
            </button>
            <button
              type="button"
              className="btn-secondary !h-9 text-sm"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setReason("");
                setMessage(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
