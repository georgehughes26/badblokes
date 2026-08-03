"use client";

import { useState, type FormEvent } from "react";

export function SlipForm({ token, initialUrl }: { token: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [submitted, setSubmitted] = useState(Boolean(initialUrl));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/slips/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalUrl: url }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong — try again");
      return;
    }
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {submitted && <p className="pill-green w-fit">Slip submitted</p>}
      <div>
        <label className="label" htmlFor="externalUrl">
          Link to your bet slip
        </label>
        <input
          id="externalUrl"
          type="url"
          className="input"
          placeholder="https://…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setSubmitted(false);
          }}
          required
        />
        <p className="mt-1.5 text-xs text-muted">
          A bookmaker share-slip link, or a link to a screenshot you&apos;ve uploaded somewhere (e.g. a photo host).
        </p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "Saving…" : submitted ? "Update slip" : "Submit slip"}
      </button>
    </form>
  );
}
