"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginForm({ nextPath }: { nextPath: string }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const result = await response.json() as { error?: string };
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Access was not granted.");
    window.location.assign(nextPath);
  }

  return <form className="login-card" onSubmit={submit}>
    <Link className="oss-brand" href="/"><span>TL</span><strong>Tarelog</strong></Link>
    <p className="login-kicker">PRIVATE JOURNAL</p>
    <h1>Open your food record.</h1>
    <p>Enter the access token configured by this deployment. A one-way-derived value is stored only in an HTTP-only session cookie.</p>
    <label><span>Access token</span><input type="password" autoComplete="current-password" minLength={24} value={token} onChange={(event) => setToken(event.target.value)} required autoFocus /></label>
    {message && <p className="login-error" role="alert">{message}</p>}
    <button className="oss-button solid" disabled={busy} aria-busy={busy}>{busy ? "Checking…" : "Open journal"}</button>
    <Link className="login-back" href="/">← Back to the open-source project</Link>
  </form>;
}
