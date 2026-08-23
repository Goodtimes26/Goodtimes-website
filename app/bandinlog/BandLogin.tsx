"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clearStoredSupabaseSession, getSupabaseClient, hasSupabaseConfig } from "../../lib/supabase";
import { AuthRequestTimeoutError, isInvalidCredentials, safeAuthError, withAuthTimeout } from "../../lib/authRequest";
import { validateBandAccount } from "../../lib/bandAccount";

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
  const authRequestInFlight = useRef(false);
  const configured = hasSupabaseConfig();

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const isInvite = window.location.hash.includes("type=invite");
    if (isInvite) queueMicrotask(() => setInviteMode(true));

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setInviteMode(true);
      // Navigeer niet vanuit SIGNED_IN: signInWithPassword wacht zelf op de
      // auth-callbacks. Een routewissel die direct opnieuw Auth aanspreekt kan
      // daardoor vooral in Safari/iOS dezelfde auth-lock vasthouden.
      if (event === "INITIAL_SESSION" && session && !isInvite && !authRequestInFlight.current) {
        window.setTimeout(() => {
          void validateBandAccount(supabase, session.user.id).then((result) => {
            if (result.ok) router.replace("/bandportaal");
            else {
              console.warn("[GoodTimes bandinlog] Opgeslagen sessie is niet meer geldig", { reason: result.reason, error: safeAuthError(result.error) });
              clearStoredSupabaseSession();
            }
          }).catch((sessionError) => {
            console.warn("[GoodTimes bandinlog] Sessiescontrole mislukt", safeAuthError(sessionError));
            clearStoredSupabaseSession();
          });
        }, 0);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestInFlight.current) return;
    setError("");
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("De beveiligde bandomgeving is nog niet geconfigureerd.");
      return;
    }
    authRequestInFlight.current = true;
    setLoading(true);
    try {
      const { data: loginData, error: loginError } = await withAuthTimeout(supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      }));
      if (loginError) {
        console.warn("[GoodTimes bandinlog] Inloggen geweigerd", safeAuthError(loginError));
        setError(isInvalidCredentials(loginError) ? "E-mailadres of wachtwoord is onjuist." : "Inloggen is niet gelukt door een verbindingsprobleem. Probeer het opnieuw.");
        return;
      }
      if (!loginData.user) {
        setError("De inlogserver gaf geen geldig gebruikersaccount terug. Probeer het opnieuw.");
        return;
      }
      const account = await validateBandAccount(supabase, loginData.user.id);
      if (!account.ok) {
        console.error("[GoodTimes bandinlog] Bandaccountcontrole mislukt", { reason: account.reason, error: safeAuthError(account.error) });
        if (account.reason === "profile") setError("Je account is niet gekoppeld aan een bandprofiel. Neem contact op met de beheerder.");
        else if (account.reason === "role") setError("Je account heeft geen geldige bandrol. Neem contact op met de beheerder.");
        else if (account.reason === "session") setError("De nieuwe sessie kon niet worden bevestigd. Probeer opnieuw in te loggen.");
        else setError("Je bandprofiel kon niet worden gecontroleerd door een verbindingsprobleem. Probeer het opnieuw.");
        clearStoredSupabaseSession();
        return;
      }
      console.info("[GoodTimes bandinlog] Authenticatie afgerond; portaal wordt geopend");
      router.replace("/bandportaal");
    } catch (loginError) {
      console.error("[GoodTimes bandinlog] Inlogaanvraag mislukt", safeAuthError(loginError));
      if (loginError instanceof AuthRequestTimeoutError) clearStoredSupabaseSession();
      setError(loginError instanceof AuthRequestTimeoutError ? "Inloggen duurde te lang. Controleer je verbinding en probeer het opnieuw." : "Er kon geen verbinding worden gemaakt. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      authRequestInFlight.current = false;
      setLoading(false);
    }
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestInFlight.current) return;
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
    authRequestInFlight.current = true;
    setLoading(true);
    try {
      const { error: resetError } = await withAuthTimeout(supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: "https://goodtimescoverband.nl/bandinlog/nieuw-wachtwoord",
      }));
      if (resetError) {
        console.warn("[GoodTimes bandinlog] Wachtwoordherstel geweigerd", safeAuthError(resetError));
        setError("De herstellink kon door een verbindingsprobleem niet worden verstuurd. Probeer het opnieuw.");
        return;
      }
      setMessage("Als dit e-mailadres bij ons bekend is, ontvang je een e-mail met verdere instructies.");
    } catch (resetError) {
      console.error("[GoodTimes bandinlog] Wachtwoordherstel mislukt", safeAuthError(resetError));
      setError(resetError instanceof AuthRequestTimeoutError ? "Het versturen duurde te lang. Controleer je verbinding en probeer het opnieuw." : "Er kon geen verbinding worden gemaakt. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      authRequestInFlight.current = false;
      setLoading(false);
    }
  }

  async function handleSetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authRequestInFlight.current) return;
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
    authRequestInFlight.current = true;
    setLoading(true);
    try {
      const { error: updateError } = await withAuthTimeout(supabase.auth.updateUser({ password }));
      if (updateError) {
        console.warn("[GoodTimes bandinlog] Wachtwoord instellen geweigerd", safeAuthError(updateError));
        setError("De uitnodiging is verlopen of ongeldig. Vraag een nieuwe uitnodiging aan.");
        return;
      }
      router.replace("/bandportaal");
    } catch (updateError) {
      console.error("[GoodTimes bandinlog] Wachtwoord instellen mislukt", safeAuthError(updateError));
      setError(updateError instanceof AuthRequestTimeoutError ? "De aanvraag duurde te lang. Controleer je verbinding en probeer het opnieuw." : "Er kon geen verbinding worden gemaakt. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      authRequestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <main className="portal-shell portal-login-shell">
      <header className="portal-public-header">
        <Link className="portal-brand" href="/">GOOD<span>TIMES</span><small>BANDPORTAAL</small></Link>
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
