"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

export type PageKey = "home" | "over-de-band" | "repertoire" | "agenda" | "media" | "fotos-videos" | "contact";

const nav = [
  ["home", "/", "Home"],
  ["over-de-band", "/over-de-band", "Over de band"],
  ["repertoire", "/repertoire", "Repertoire"],
  ["agenda", "/agenda", "Agenda"],
  ["media", "/media", "Media"],
  ["contact", "/contact", "Contact"],
] as const;

const shows = [
  { day: "12", month: "SEP", place: "Breda", venue: "Mezz — Back to the 80’s", note: "Zaal open 20:00" },
  { day: "04", month: "OKT", place: "Utrecht", venue: "TivoliVredenburg — Clubnacht", note: "Aanvang 21:00" },
  { day: "22", month: "NOV", place: "Eindhoven", venue: "Effenaar — 80’s Forever", note: "Aanvang 20:30" },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function Header({ page }: { page: PageKey }) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [page]);
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="GoodTimes home">
        GOOD<span>TIMES</span><small>THE 80’S LIVE</small>
      </Link>
      <button className="menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu openen">
        <i /><i />
      </button>
      <nav className={open ? "nav open" : "nav"} aria-label="Hoofdnavigatie">
        {nav.map(([key, href, label]) => <Link className={page === key ? "active" : ""} href={href} key={key}>{label}</Link>)}
        <Link className="nav-cta" href="/contact">Boek de band <Arrow /></Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer>
      <div className="brand footer-brand">GOOD<span>TIMES</span><small>THE 80’S LIVE</small></div>
      <p>De soundtrack van jouw beste avond.</p>
      <div className="socials">
        <a href="#" aria-label="Facebook">f</a><a href="#" aria-label="Instagram">◎</a><a href="#" aria-label="YouTube">▶</a>
      </div>
      <div className="footer-bottom"><span>© 2026 GoodTimes. Alle rechten voorbehouden.</span><span>Privacy · Cookies</span></div>
    </footer>
  );
}

function Hero() {
  return (
    <section className="hero">
      {/* Vervang de hero-foto via --hero-image in globals.css; de layout hoeft dan niet te wijzigen. */}
      <div className="hero-image" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">De grootste hits uit de jaren 80. Live, energiek, onvergetelijk.</p>
        <h1>GOODTIMES<br /><em>dé 80’s Coverband</em></h1>
        <div className="hero-intro">
          <p>GoodTimes brengt de grootste klassiekers uit de jaren tachtig tot leven.</p>
          <p>Met jarenlange podiumervaring, aanstekelijke energie en een volledig dansbaar repertoire maken we van ieder optreden een feest.</p>
        </div>
        <div className="actions"><Link className="primary hero-button" href="/contact">Boek GoodTimes <Arrow /></Link><Link className="secondary hero-button" href="/media#audio">Luister naar GoodTimes <span>▶</span></Link></div>
      </div>
      <div className="scroll">SCROLL TO THE 80’S <span>↓</span></div>
    </section>
  );
}

function ShowList() {
  return <div className="show-list">{shows.map((show) => (
    <article className="show-row" key={show.day + show.place}>
      <div className="date"><b>{show.day}</b><span>{show.month}</span></div>
      <div><span className="city">{show.place}</span><h3>{show.venue}</h3><p>{show.note}</p></div>
      <Link href="/contact" aria-label={`Tickets voor ${show.place}`}>Tickets <Arrow /></Link>
    </article>
  ))}</div>;
}

function HomePage() {
  return <><Hero />
    {/* De voordelen zijn losse lijstitems, zodat nieuwe punten eenvoudig toegevoegd kunnen worden. */}
    <section className="split">
      <div className="feature-photo"><span>100% LIVE</span></div>
      <div className="feature-copy"><p className="eyebrow">Waarom GoodTimes?</p><h2>De jaren 80.<br />Live op het podium.</h2>
        <ul><li><b>01</b><span><strong>100% live gespeeld</strong>Geen tapes of trucs: een complete liveshow met echte instrumenten.</span></li><li><b>02</b><span><strong>Professionele muzikanten</strong>Ervaren performers met overtuiging, plezier en podiumenergie.</span></li><li><b>03</b><span><strong>De grootste 80’s hits</strong>Herkenbare klassiekers uit het beste muzikale decennium.</span></li><li><b>04</b><span><strong>Dansbaar repertoire</strong>Een energieke set die het publiek vanaf de eerste noot meekrijgt.</span></li><li><b>05</b><span><strong>Voor ieder evenement</strong>Festivals, bedrijfsfeesten, tentfeesten en evenementen.</span></li></ul>
        <Link className="text-link" href="/over-de-band">Ontmoet de band <Arrow /></Link>
      </div>
    </section>
    <section className="booking-band"><p className="eyebrow">Klaar voor een tijdreis?</p><h2>MAAK VAN JOUW EVENT<br /><span>EEN GOOD TIME.</span></h2><Link className="primary" href="/contact">Check beschikbaarheid <Arrow /></Link></section>
  </>;
}

function PageIntro({ kicker, title, accent, text, className = "" }: { kicker: string; title: string; accent: string; text: string; className?: string }) {
  return <section className={`page-intro ${className}`.trim()}><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{accent}</em></h1><p>{text}</p></section>;
}

function About() {
  const members = [["ESTHER","Zang"],["CINDY","Zang"],["LUUK","Toetsen"],["JOOST","Gitaar"],["EDDIE","Basgitaar"],["ERIC","Drums"]];
  return <><PageIntro kicker="Vijf muzikanten. Eén tijdmachine." title="DIT IS" accent="GOODTIMES." text="Een energieke Nederlandse liveband met een zwak voor grote refreinen, analoge synths en volle dansvloeren." />
    <section className="about-grid"><div className="about-image" /><div><p className="eyebrow">Ons verhaal</p><h2>Geboren uit liefde voor een gouden decennium.</h2><p>GoodTimes ontstond uit een gedeelde liefde voor de muziek die de jaren tachtig kleur gaf. Geen verkleedpartij, maar een eigentijdse liveshow die de songs respecteert en hun energie opnieuw laat knallen.</p><p>Van intieme club tot groot festival: we maken contact, bouwen spanning op en laten pas los als iedereen meezingt.</p></div></section>
    <section className="members"><p className="eyebrow">The band</p><h2>De mensen achter de sound</h2><div className="member-grid">{members.map(([name, role],i)=><article key={name}><div className={`portrait p${i+1}`}><span>0{i+1}</span></div><h3>{name}</h3><p>{role}</p></article>)}</div></section>
  </>;
}

type RepertoireSong = { id: string; title: string; artist: string; category: string };

function Repertoire() {
  const [songs, setSongs] = useState<RepertoireSong[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site/api/repertoire", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Repertoire kon niet worden geladen");
        return response.json() as Promise<{ songs?: RepertoireSong[] }>;
      })
      .then((data) => {
        setSongs(Array.isArray(data.songs) ? data.songs : []);
        setStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => {
    const grouped = new Map<string, RepertoireSong[]>();
    songs.forEach((song) => {
      const category = song.category?.trim() || "Repertoire";
      grouped.set(category, [...(grouped.get(category) ?? []), song]);
    });
    return [...grouped.entries()].map(([name, categorySongs]) => ({
      name,
      songs: categorySongs,
    }));
  }, [songs]);

  return <><PageIntro kicker="All killer. No filler." title="ONS" accent="REPERTOIRE." text="Het actuele repertoire van GoodTimes, rechtstreeks uit de Setlist Maker." />
    <section className="repertoire-grid">
      {status === "loading" && <article><span>LIVE</span><h2>Repertoire laden…</h2></article>}
      {status === "error" && <article><span>LET OP</span><h2>Repertoire tijdelijk niet beschikbaar</h2></article>}
      {status === "ready" && categories.length === 0 && <article><span>LIVE</span><h2>Nog geen nummers beschikbaar</h2></article>}
      {categories.map((category, i)=><article key={category.name}><span>{String(i+1).padStart(2, "0")}</span><h2>{category.name}</h2><ol>{category.songs.map((song)=><li key={song.id || `${song.title}-${song.artist}`}><strong>{song.title}</strong></li>)}</ol></article>)}
    </section>
    <section className="note"><p>Ons repertoire groeit voortdurend. Voor een bruiloft of bedrijfsevent denken we graag mee over de perfecte set.</p><Link className="primary" href="/contact">Bespreek jouw event <Arrow /></Link></section>
  </>;
}

function Agenda() {
  return <><PageIntro kicker="We’ll see you there" title="LIVE." accent="HARD. SAMEN." text="Bekijk waar GoodTimes binnenkort de eighties laat herleven. Voor besloten events kun je direct contact opnemen." />
    <section className="agenda-page"><ShowList /><div className="empty-show"><span>DEC — 2026</span><h2>Jouw event hier?</h2><p>Informeer vrijblijvend naar onze beschikbaarheid.</p><Link className="text-link" href="/contact">Boek GoodTimes <Arrow /></Link></div></section>
  </>;
}

function Media() {
  const [audioTracks, setAudioTracks] = useState<{ title: string; src: string }[]>([]);
  useEffect(() => {
    fetch("/audio/tracks.json")
      .then((response) => response.json())
      .then((tracks) => setAudioTracks(Array.isArray(tracks) ? tracks : []))
      .catch(() => setAudioTracks([]));
  }, []);
  return <><PageIntro className="media-intro" kicker="Turn it up" title="ZIEN. HOREN." accent="MEEMAKEN." text="De opnames zijn gemaakt tijdens onze repetities. Ongeslepen, puur en ruw. Precies zoals GoodTimes live klinkt. Een eerlijk voorproefje van de energie en sfeer die je tijdens een optreden kunt verwachten." />
    <div id="audio" className="audio-anchor" aria-hidden="true" />
    <section className="audio-list" aria-label="Audio van GoodTimes">
      {audioTracks.map((track)=><article className="audio-track" key={track.src}><h2>{track.title}</h2><audio controls preload="metadata" src={track.src}>Je browser ondersteunt deze audioplayer niet.</audio></article>)}
    </section>
  </>;
}

function Contact() {
  const [sent, setSent] = useState(false);
  function submit(e: FormEvent) { e.preventDefault(); setSent(true); }
  return <><PageIntro kicker="Let’s make it happen" title="BOEK DE BAND." accent="START HET FEEST." text="Vertel ons kort wat je organiseert. We reageren meestal binnen één werkdag met beschikbaarheid en een voorstel op maat." />
    <section className="contact-grid"><div><h2>Direct contact</h2><a href="mailto:boekingen@goodtimesband.nl">boekingen@goodtimesband.nl</a><a href="tel:+31612345678">+31 (0)6 12 34 56 78</a><p>GoodTimes is beschikbaar in heel Nederland en daarbuiten.</p><div className="socials"><a href="#">f</a><a href="#">◎</a><a href="#">▶</a></div></div>
      <form onSubmit={submit}>{sent ? <div className="thanks"><span>✓</span><h2>Bedankt!</h2><p>Je aanvraag is ontvangen. We nemen snel contact op.</p></div> : <>
        <div className="field-row"><label>Naam<input required name="name" placeholder="Jouw naam" /></label><label>E-mail<input required type="email" name="email" placeholder="naam@email.nl" /></label></div>
        <div className="field-row"><label>Type event<select name="type"><option>Bedrijfsfeest</option><option>Festival / podium</option><option>Bruiloft</option><option>Anders</option></select></label><label>Datum<input type="date" name="date" /></label></div>
        <label>Vertel ons meer<textarea required name="message" placeholder="Locatie, aantal gasten en wat je voor ogen hebt..." /></label>
        <button className="primary" type="submit">Verstuur aanvraag <Arrow /></button><small>Door te versturen ga je akkoord met onze privacyvoorwaarden.</small>
      </>}</form>
    </section>
  </>;
}

export function GoodTimesSite({ page }: { page: PageKey }) {
  const content = page === "home" ? <HomePage /> : page === "over-de-band" ? <About /> : page === "repertoire" ? <Repertoire /> : page === "agenda" ? <Agenda /> : page === "media" || page === "fotos-videos" ? <Media /> : <Contact />;
  return <><Header page={page === "fotos-videos" ? "media" : page} /><main>{content}</main><Footer /></>;
}
