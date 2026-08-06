"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  status: "pending" | "approved" | "denied";
  resolutionNote: string | null;
};

export function RefundActions({ requestId, status, resolutionNote }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (status !== "pending") {
    return (
      <span className="text-xs text-muted">
        {resolutionNote ? `Note: ${resolutionNote}` : "Resolved."}
      </span>
    );
  }

  async function resolve(action: "approve" | "deny") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/refunds/${encodeURIComponent(requestId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Could not resolve refund request.");
      }
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve refund request.");
    } finally {
      setBusy(null);
    }
  }

  const buttonClass =
    "rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="flex flex-col items-start gap-1.5">
      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Resolution note (optional)"
        maxLength={300}
        className="w-48 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-brand"
        aria-label="Resolution note"
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          className={`${buttonClass} text-success`}
          disabled={busy !== null}
          onClick={() => resolve("approve")}
        >
          {busy === "approve" ? "Approving…" : "Approve refund"}
        </button>
        <button
          type="button"
          className={`${buttonClass} text-danger`}
          disabled={busy !== null}
          onClick={() => resolve("deny")}
        >
          {busy === "deny" ? "Denying…" : "Deny"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
