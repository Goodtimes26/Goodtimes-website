"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient, hasSupabaseConfig } from "../../../lib/supabase";

type ResetStatus = "checking" | "valid" | "invalid" | "success";

export function ResetPassword() {
  const [status, setStatus] = useState<ResetStatus>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const configured = hasSupabaseConfig();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }

    const hash = window.location.hash;
    const query = new URLSearchParams(window.location.search);
    const hasRecoveryLink = hash.includes("type=recovery") || query.has("code");
    const linkContainsError = hash.includes("error=") || query.has("error");
    if (!hasRecoveryLink || linkContainsError) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }

    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) setStatus("valid");
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setStatus(!sessionError && data.session ? "valid" : "invalid");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleUpdatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Gebruik minimaal 8 tekens voor je nieuwe wachtwoord.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("De beveiligde bandomgeving is niet beschikbaar. Probeer het later opnieuw.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("Je wachtwoord kon niet worden gewijzigd. De herstellink is mogelijk verlopen. Vraag een nieuwe link aan.");
      return;
    }
    await supabase.auth.signOut();
    window.history.replaceState({}, "", "/bandinlog/nieuw-wachtwoord");
    setStatus("success");
  }

  return <main className="portal-shell portal-login-shell">
    <header className="portal-public-header">
      <Link className="portal-brand" href="/">GOOD<span>TIMES</span><small>BANDPORTAAL</small></Link>
      <Link className="portal-back-link" href="/">Terug naar website</Link>
    </header>
    <section className="portal-login-card" aria-labelledby="reset-title">
      <p className="portal-eyebrow">Beveiligd wachtwoordherstel</p>
      <h1 id="reset-title">Nieuw wachtwoord</h1>

      {status === "checking" && <p className="portal-lead" role="status">De herstellink wordt gecontroleerd…</p>}

      {status === "invalid" && <>
        <p className="portal-notice portal-notice-error" role="alert">Deze herstellink is ongeldig of verlopen. Vraag via de bandinlog een nieuwe link aan.</p>
        <Link className="portal-primary" href="/bandinlog">Naar bandinlog</Link>
      </>}

      {status === "valid" && <>
        <p className="portal-lead">Kies een nieuw wachtwoord van minimaal 8 tekens.</p>
        <form className="portal-form" onSubmit={handleUpdatePassword}>
          <label>Nieuw wachtwoord
            <input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>Herhaal nieuw wachtwoord
            <input type="password" autoComplete="new-password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
          </label>
          {error && <p className="portal-error" role="alert">{error}</p>}
          <button className="portal-primary" type="submit" disabled={loading}>{loading ? "Even geduld…" : "Wachtwoord wijzigen"}</button>
        </form>
      </>}

      {status === "success" && <>
        <p className="portal-notice portal-reset-message" role="status">Je wachtwoord is gewijzigd. Je kunt nu opnieuw inloggen.</p>
        <Link className="portal-primary" href="/bandinlog">Naar bandinlog</Link>
      </>}
    </section>
  </main>;
}
