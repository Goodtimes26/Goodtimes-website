"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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

const songs = {
  "Pop & New Wave": ["Take On Me — a-ha", "Don’t You (Forget About Me) — Simple Minds", "The Reflex — Duran Duran", "Tainted Love — Soft Cell", "Everybody Wants to Rule the World — Tears for Fears"],
  "Rock Anthems": ["Jump — Van Halen", "Livin’ on a Prayer — Bon Jovi", "The Final Countdown — Europe", "Summer of ’69 — Bryan Adams", "You Give Love a Bad Name — Bon Jovi"],
  "Dancefloor": ["You Spin Me Round — Dead or Alive", "I Think We’re Alone Now — Tiffany", "Maniac — Michael Sembello", "Footloose — Kenny Loggins", "Venus — Bananarama"],
};

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
      <div className="hero-image" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">Feel the GoodTimes.</p>
        <h1>GOODTIMES,<br /><em>dé 80’s Coverband</em></h1>
        <p className="lead">Van synthpop tot stadionrock. Eén band, één avond,<br />alle hits die je woord voor woord kent.</p>
        <div className="actions"><Link className="primary hero-button" href="/contact">Boek GoodTimes <Arrow /></Link><Link className="secondary hero-button" href="#luisteren">Luister naar GoodTimes <span>▶</span></Link></div>
      </div>
      <div className="scroll">SCROLL TO THE 80’S <span>↓</span></div>
    </section>
  );
}

const audioTracks = [
  { title: "The 80’s Medley", detail: "Live demo · audiofragment", audioSrc: "" },
  { title: "Everybody Wants to Rule the World", detail: "Live demo · audiofragment", audioSrc: "" },
  { title: "Don’t You (Forget About Me)", detail: "Live demo · audiofragment", audioSrc: "" },
];

function ListenSection() {
  return <section className="listen-section" id="luisteren">
    <div className="listen-intro">
      <p className="eyebrow">Press play</p>
      <h2>Luister naar<br /><span>GoodTimes.</span></h2>
      <p>De sound van de eighties, live en vol energie. Deze audiospelers zijn voorbereid om jullie eigen mp3- of wav-bestanden rechtstreeks te koppelen.</p>
      <Link className="text-link" href="/media">Bekijk alle media <Arrow /></Link>
    </div>
    <div className="track-list">
      {audioTracks.map((track, index) => <article className="track" data-audio-slot={`track-${index + 1}`} key={track.title}>
        <span className="track-number">0{index + 1}</span>
        <button className="track-play" type="button" disabled={!track.audioSrc} aria-label={`Speel ${track.title}`}>
          <span>▶</span>
        </button>
        <div className="track-info"><h3>{track.title}</h3><p>{track.detail}</p></div>
        {track.audioSrc ? <audio controls preload="none" src={track.audioSrc}>Je browser ondersteunt geen audio.</audio> : <span className="audio-ready">Audio klaar om te koppelen</span>}
      </article>)}
    </div>
  </section>;
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
    <section className="statement"><p className="eyebrow">Geen jukebox. Een liveshow.</p><h2>ICONISCHE HITS.<br /><span>ONVERGETELIJKE AVOND.</span></h2><p>GoodTimes brengt de energie, sound en stijl van de jaren tachtig terug naar het podium. Strak gespeeld, vol overtuiging en altijd met het publiek midden in de show.</p></section>
    <section className="split">
      <div className="feature-photo"><span>100% LIVE</span></div>
      <div className="feature-copy"><p className="eyebrow">Waarom GoodTimes</p><h2>Alles klopt.<br />Van de eerste synth<br />tot de laatste toegift.</h2>
        <ul><li><b>01</b><span><strong>Ervaren liveband</strong>Vijf bevlogen muzikanten met één missie: feest.</span></li><li><b>02</b><span><strong>Herkenbaar repertoire</strong>Alleen de grootste 80’s hits, slim opgebouwd.</span></li><li><b>03</b><span><strong>Flexibel & professioneel</strong>Voor festival, feest, bedrijfsevent of poppodium.</span></li></ul>
        <Link className="text-link" href="/over-de-band">Ontmoet de band <Arrow /></Link>
      </div>
    </section>
    <ListenSection />
    <section className="upcoming"><div className="section-head"><div><p className="eyebrow">Live in jouw buurt</p><h2>Binnenkort op het podium</h2></div><Link className="text-link" href="/agenda">Volledige agenda <Arrow /></Link></div><ShowList /></section>
    <section className="booking-band"><p className="eyebrow">Klaar voor een tijdreis?</p><h2>MAAK VAN JOUW EVENT<br /><span>EEN GOOD TIME.</span></h2><Link className="primary" href="/contact">Check beschikbaarheid <Arrow /></Link></section>
  </>;
}

function PageIntro({ kicker, title, accent, text }: { kicker: string; title: string; accent: string; text: string }) {
  return <section className="page-intro"><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{accent}</em></h1><p>{text}</p></section>;
}

function About() {
  const members = [["LEX","Zang"],["NINA","Keys & vocals"],["MARC","Gitaar"],["DANIËL","Bas"],["ROBIN","Drums"]];
  return <><PageIntro kicker="Vijf muzikanten. Eén tijdmachine." title="DIT IS" accent="GOODTIMES." text="Een energieke Nederlandse liveband met een zwak voor grote refreinen, analoge synths en volle dansvloeren." />
    <section className="about-grid"><div className="about-image" /><div><p className="eyebrow">Ons verhaal</p><h2>Geboren uit liefde voor een gouden decennium.</h2><p>GoodTimes ontstond uit een gedeelde liefde voor de muziek die de jaren tachtig kleur gaf. Geen verkleedpartij, maar een eigentijdse liveshow die de songs respecteert en hun energie opnieuw laat knallen.</p><p>Van intieme club tot groot festival: we maken contact, bouwen spanning op en laten pas los als iedereen meezingt.</p></div></section>
    <section className="members"><p className="eyebrow">The band</p><h2>De mensen achter de sound</h2><div className="member-grid">{members.map(([name, role],i)=><article key={name}><div className={`portrait p${i+1}`}><span>0{i+1}</span></div><h3>{name}</h3><p>{role}</p></article>)}</div></section>
  </>;
}

function Repertoire() {
  return <><PageIntro kicker="All killer. No filler." title="DE SOUNDTRACK" accent="VAN DE 80’S." text="Een dansbare set vol synthpop, new wave, powerballads en stadionrock. Bekend vanaf de eerste noot." />
    <section className="repertoire-grid">{Object.entries(songs).map(([genre, list], i)=><article key={genre}><span>0{i+1}</span><h2>{genre}</h2><ol>{list.map(song=><li key={song}>{song}</li>)}</ol></article>)}</section>
    <section className="note"><p>Ons repertoire groeit voortdurend. Voor een bruiloft of bedrijfsevent denken we graag mee over de perfecte set.</p><Link className="primary" href="/contact">Bespreek jouw event <Arrow /></Link></section>
  </>;
}

function Agenda() {
  return <><PageIntro kicker="We’ll see you there" title="LIVE." accent="HARD. SAMEN." text="Bekijk waar GoodTimes binnenkort de eighties laat herleven. Voor besloten events kun je direct contact opnemen." />
    <section className="agenda-page"><ShowList /><div className="empty-show"><span>DEC — 2026</span><h2>Jouw event hier?</h2><p>Informeer vrijblijvend naar onze beschikbaarheid.</p><Link className="text-link" href="/contact">Boek GoodTimes <Arrow /></Link></div></section>
  </>;
}

function Media() {
  return <><PageIntro kicker="Turn it up" title="ZIEN. HOREN." accent="MEEMAKEN." text="Een voorproefje van de energie op het podium. Binnenkort voegen we hier jullie eigen foto’s, video’s en audiofragmenten toe." />
    <section className="media-grid"><a className="video-card featured" href="#"><span className="play">▶</span><small>LIVE AT THE 80’S NIGHT</small><h2>Don’t You (Forget About Me)</h2></a>{["Crowd goes wild","Synths & singalongs","Backstage GoodTimes","The final countdown"].map((x,i)=><div className={`media-card m${i+1}`} key={x}><span>0{i+1}</span><h3>{x}</h3></div>)}</section>
    <section className="social-call"><p>Volg de band voor nieuwe livebeelden, aankondigingen en backstage-momenten.</p><div className="socials"><a href="#">f</a><a href="#">◎</a><a href="#">▶</a></div></section>
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
