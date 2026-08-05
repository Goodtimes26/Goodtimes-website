"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseClient, hasSupabaseConfig } from "../../lib/supabase";

export function BandLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [inviteMode, setInviteMode] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const configured = hasSupabaseConfig();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const isInvite = window.location.hash.includes("type=invite");
    if (isInvite) queueMicrotask(() => setInviteMode(true));

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !isInvite) router.replace("/bandportaal");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setInviteMode(true);
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("De beveiligde bandomgeving is nog niet geconfigureerd.");
      return;
    }
    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (loginError) {
      setError("E-mailadres of wachtwoord is onjuist.");
      return;
    }
    router.replace("/bandportaal");
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Vul je e-mailadres in.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("De beveiligde bandomgeving is nog niet geconfigureerd.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: "https://goodtimescoverband.nl/bandinlog/nieuw-wachtwoord",
    });
    setLoading(false);
    if (resetError) {
      setError("De herstellink kon niet worden verstuurd. Probeer het later opnieuw.");
      return;
    }
    setMessage("Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met verdere instructies.");
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Gebruik minimaal 12 tekens voor je wachtwoord.");
      return;
    }
    if (password !== passwordConfirmation) {
      setError("De wachtwoorden komen niet overeen.");
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("De beveiligde bandomgeving is nog niet geconfigureerd.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError("De uitnodiging is verlopen of ongeldig. Vraag een nieuwe uitnodiging aan.");
      return;
    }
    router.replace("/bandportaal");
  }

  return (
    <main className="portal-shell portal-login-shell">
      <header className="portal-public-header">
        <Link className="portal-brand" href="/">GOOD<span>TIMES</span><small>BANDPORTAAL</small></Link>
        <Link className="portal-back-link" href="/">Terug naar website</Link>
      </header>
      <section className="portal-login-card" aria-labelledby="login-title">
        <p className="portal-eyebrow">Alleen voor bandleden</p>
        <h1 id="login-title">{resetMode ? "Wachtwoord herstellen" : "Bandinlog"}</h1>
        <p className="portal-lead">
          {resetMode
            ? "Vul het e-mailadres van je persoonlijke GoodTimes-account in."
            : inviteMode
            ? "Kies een persoonlijk wachtwoord om je account te activeren."
            : "Log in met je persoonlijke GoodTimes-account."}
        </p>
        {!configured && (
          <div className="portal-notice portal-notice-warning" role="status">
            Supabase is nog niet gekoppeld. Volg eerst de installatiehandleiding.
          </div>
        )}
        <form onSubmit={resetMode ? handlePasswordReset : inviteMode ? handleSetPassword : handleSubmit} className="portal-form">
          {(!inviteMode || resetMode) && (
            <label>
              E-mailadres
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required={!resetMode}
              />
            </label>
          )}
          {!resetMode && <label>
            {inviteMode ? "Nieuw wachtwoord" : "Wachtwoord"}
            <input
              type="password"
              autoComplete={inviteMode ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>}
          {inviteMode && !resetMode && (
            <label>
              Herhaal wachtwoord
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                required
              />
            </label>
          )}
          {error && <p className="portal-error" role="alert">{error}</p>}
          {message && <p className="portal-notice portal-reset-message" role="status">{message}</p>}
          <button className="portal-primary" type="submit" disabled={loading || !configured}>
            {loading
              ? "Even geduld…"
              : resetMode
                ? "Herstellink versturen"
                : inviteMode
                ? "Account activeren"
                : "Inloggen"}
          </button>
        </form>
        {!inviteMode && !resetMode && <button className="portal-forgot-link" type="button" onClick={() => { setResetMode(true); setError(""); setMessage(""); }}>Wachtwoord vergeten?</button>}
        {resetMode && <button className="portal-forgot-link" type="button" onClick={() => { setResetMode(false); setError(""); setMessage(""); }}>Terug naar bandinlog</button>}
        <p className="portal-security-note">
          Persoonlijke accounts · beveiligde sessie · geen gedeeld wachtwoord
        </p>
      </section>
    </main>
  );
}
