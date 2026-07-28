import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-card">
        <p className="eyebrow">404 — Verkeerde afslag</p>
        <h1>Deze pagina bestaat niet</h1>
        <p>De muziek speelt door, maar deze pagina konden we niet vinden.</p>
        <Link className="primary" href="/">Terug naar de homepage <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}

