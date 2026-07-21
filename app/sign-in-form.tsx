"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "sent" | "error";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setStatus("sent");
      setMessage("Check the server console for your magic link (no real email is sent in this build).");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field-input"
          />
        </div>
        <button type="submit" disabled={status === "submitting"} className="btn-primary">
          {status === "submitting" ? "Sending…" : "Sign in with magic link"}
        </button>
      </form>

      {message && (
        <p
          role="status"
          className={
            status === "error" ? "text-sm text-danger" : "text-sm text-muted"
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
