"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function InstallGuide() {
  const [isIphone, setIsIphone] = useState(false);

  useEffect(() => {
    const appleMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    queueMicrotask(() => setIsIphone(appleMobile));
  }, []);

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
        <p className="portal-lead">
          {isIphone
            ? "Volg deze vijf korte stappen op je iPhone."
            : "Open deze pagina op je iPhone in Safari en volg daarna de stappen hieronder."}
        </p>

        <ol className="portal-install-steps">
          <li><strong>Open in Safari</strong><span>Gebruik Safari op je iPhone.</span></li>
          <li><strong>Tik op Delen</strong><span>Het vierkant met de pijl omhoog.</span></li>
          <li><strong>Kies “Zet op beginscherm”</strong><span>Scrol eventueel iets omlaag.</span></li>
          <li><strong>Laat “Open als webapp” aan</strong><span>Zo opent GoodTimes als app.</span></li>
          <li><strong>Tik op “Voeg toe”</strong><span>Open daarna het GT-icoon.</span></li>
        </ol>

        <Link className="portal-primary" href="/bandinlog/">Open GoodTimes Band-app</Link>
        <p className="portal-security-note">Persoonlijke bandinlog · beveiligd met Supabase</p>
      </section>
    </main>
  );
}
