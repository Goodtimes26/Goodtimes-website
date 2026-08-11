"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallGuide() {
  const [platform, setPlatform] = useState<"ios" | "android" | "other" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const detectedPlatform = /iPhone|iPad|iPod/i.test(userAgent)
      ? "ios"
      : /Android/i.test(userAgent)
        ? "android"
        : "other";

    queueMicrotask(() => setPlatform(detectedPlatform));

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <main className="portal-shell portal-login-shell">
      <header className="portal-public-header">
        <Link className="portal-brand" href="/">
          GOOD<span>TIMES</span><small>BANDPORTAAL</small>
        </Link>
        <Link className="portal-back-link" href="/bandinlog/">Naar bandinlog</Link>
      </header>

      <section className="portal-login-card portal-install-card" aria-labelledby="install-title">
        <p className="portal-eyebrow">GoodTimes Band-app</p>
        <h1 id="install-title">Installeer de app</h1>
        {platform === null && <p className="portal-lead">Je toestel wordt gecontroleerd...</p>}

        {platform === "ios" && (
          <>
            <p className="portal-lead">Volg deze vijf korte stappen op je iPhone.</p>
            <ol className="portal-install-steps">
              <li><strong>Open in Safari</strong><span>Gebruik Safari op je iPhone.</span></li>
              <li><strong>Tik op Delen</strong><span>Het vierkant met de pijl omhoog.</span></li>
              <li><strong>Kies &quot;Zet op beginscherm&quot;</strong><span>Scrol eventueel iets omlaag.</span></li>
              <li><strong>Laat &quot;Open als webapp&quot; aan</strong><span>Zo opent GoodTimes als app.</span></li>
              <li><strong>Tik op &quot;Voeg toe&quot;</strong><span>Open daarna het GT-icoon.</span></li>
            </ol>
          </>
        )}

        {platform === "android" && (
          <>
            <p className="portal-lead">Installeer de GoodTimes Band-app op je Android-telefoon.</p>
            {installPrompt ? (
              <button className="portal-primary" type="button" onClick={installApp}>
                Installeer GoodTimes Band-app
              </button>
            ) : (
              <ol className="portal-install-steps">
                <li><strong>Open in Chrome</strong><span>Gebruik Chrome op je Android-telefoon.</span></li>
                <li><strong>Tik op ⋮</strong><span>Open het menu rechtsboven.</span></li>
                <li><strong>Kies &quot;App installeren&quot;</strong><span>Soms heet dit &quot;Toevoegen aan startscherm&quot;.</span></li>
                <li><strong>Bevestig</strong><span>Volg de korte melding van Chrome.</span></li>
                <li><strong>Open het GoodTimes-icoon</strong><span>Je komt automatisch bij de bandinlog.</span></li>
              </ol>
            )}
          </>
        )}

        {platform === "other" && (
          <p className="portal-lead">
            Open deze pagina op je iPhone of Android-telefoon om de juiste installatie-uitleg te zien.
          </p>
        )}

        {(platform !== "android" || !installPrompt) && (
          <Link className="portal-primary" href="/bandinlog/">Open GoodTimes Band-app</Link>
        )}
        <p className="portal-security-note">Persoonlijke bandinlog · beveiligd met Supabase</p>
      </section>
    </main>
  );
}
