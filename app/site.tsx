"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type PageKey = "home" | "over-de-band" | "repertoire" | "agenda" | "media" | "fotos-videos" | "contact";

const nav = [
  ["home", "/", "Home"],
  ["over-de-band", "/over-de-band", "Over de band"],
  ["repertoire", "/repertoire", "Repertoire"],
  ["agenda", "/agenda", "Agenda"],
  ["media", "/media", "Media"],
  ["contact", "/contact", "Contact"],
] as const;

const facebookUrl = "https://www.facebook.com/share/14sZgHUpgHK/?mibextid=wwXIfr";

function FacebookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M14 8.5V7c0-.8.5-1 1-1h2V2.1L14.1 2C10.6 2 9 4.1 9 6.7v1.8H6V13h3v9h4.5v-9h3l.5-4.5h-3Z" /></svg>;
}

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
        <a className="facebook-follow" href={facebookUrl} target="_blank" rel="noopener noreferrer"><FacebookIcon /><span>Volg GoodTimes op Facebook</span></a>
        <a href="#" aria-label="Instagram">◎</a><a href="#" aria-label="YouTube">▶</a>
      </div>
      <div className="footer-bottom"><span>© 2026 GoodTimes. Alle rechten voorbehouden.</span><span>Privacy · Cookies</span></div>
    </footer>
  );
}

function Hero() {
  return (
    <section className="hero home-hero">
      {/* Vervang dit bestand om de hero-foto later te wijzigen; behoud de afmetingen voor een stabiele layout. */}
      <img className="hero-image" src="/goodtimes-group-hero.jpeg" width="1536" height="1024" alt="De zes muzikanten van GoodTimes voor een kleurrijke jaren 80-achtergrond" fetchPriority="high" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">De grootste hits uit de jaren 80. Live, energiek, onvergetelijk.</p>
        <h1>GOODTIMES<br /><em>de 80’s Coverband</em></h1>
        <div className="hero-intro">
          <p>GoodTimes brengt de grootste klassiekers uit de jaren tachtig tot leven.</p>
          <p>Met jarenlange podiumervaring, aanstekelijke energie en een volledig dansbaar repertoire maken we van ieder optreden een feest.</p>
        </div>
        <div className="actions home-hero-actions">
          <Link className="primary hero-button" href="/contact">Boek GoodTimes <Arrow /></Link>
        </div>
      </div>
      <div className="scroll">SCROLL TO THE 80’S <span>↓</span></div>
    </section>
  );
}

function HomePage() {
  return <><Hero />
    <section className="home-usp-strip" aria-label="Waarom GoodTimes">
      <ul>
        <li>100% Live</li>
        <li>6 ervaren muzikanten</li>
        <li>De grootste 80’s hits</li>
        <li>Professionele sound &amp; uitstraling</li>
      </ul>
    </section>
    <section className="home-intro">
      <div className="home-intro-copy">
        <h2>Beleef de jaren 80. Live.</h2>
        <p>GoodTimes is een live jaren 80-coverband van zes muzikanten. Van De Dolly Dots tot Donna Summer en van Toto tot De Dijk: met live zang, strakke meerstemmigheid en 100% live gespeelde muziek brengen we een avond vol herkenning, energie en dansbare klassiekers.</p>
      </div>
      <ul className="home-highlights" aria-label="Kenmerken van GoodTimes">
        <li>100% live</li>
        <li>De grootste 80’s hits</li>
        <li>Voor festivals, bedrijfsfeesten, evenementen, tentfeesten en dorpsfeesten</li>
      </ul>
      <nav className="home-links" aria-label="Ontdek GoodTimes">
        <Link className="text-link" href="/repertoire">Bekijk het jaren 80-repertoire <Arrow /></Link>
        <Link className="text-link" href="/media">Beluister GoodTimes live <Arrow /></Link>
      </nav>
    </section>
    <section className="booking-band"><p className="eyebrow">Klaar voor een tijdreis?</p><h2>MAAK VAN JOUW EVENT<br /><span>EEN GOOD TIME.</span></h2><Link className="primary" href="/contact">Check beschikbaarheid <Arrow /></Link></section>
  </>;
}

function PageIntro({ kicker, title, accent, text, className = "" }: { kicker: string; title: string; accent: string; text: string; className?: string }) {
  return <section className={`page-intro ${className}`.trim()}><p className="eyebrow">{kicker}</p><h1>{title}<br /><em>{accent}</em></h1>{text && <p>{text}</p>}</section>;
}

function About() {
  const members = [
    ["ESTHER", "Zang", "/members/esther-zang.jpeg", "Esther, zangeres van GoodTimes"],
    ["CINDY", "Zang", "/members/cindy-zang.png", "Cindy, zangeres van GoodTimes"],
    ["LUUK", "Toetsen", "/members/luuk-toetsen.jpg", "Luuk achter de toetsen bij GoodTimes"],
    ["JOOST", "Gitaar", "/members/joost-gitaar.jpg", "Joost speelt gitaar bij GoodTimes"],
    ["EDDIE", "Basgitaar", "/members/eddie-basgitaar.png", "Eddie speelt basgitaar bij GoodTimes"],
    ["ERIC", "Drums", "/members/eric-drums.jpg", "Eric achter het drumstel bij GoodTimes"],
  ];
  return <><PageIntro kicker="Zes muzikanten. Eén tijdmachine." title="DIT IS" accent="GOODTIMES." text="Een energieke Nederlandse liveband met een zwak voor grote refreinen, analoge synths en volle dansvloeren." />
    <section className="about-story">
      <div className="about-story-inner">
        <p className="eyebrow">Ons verhaal</p>
        <p>Stap terug in de tijd naar het mooiste muziekdecennium ooit: de jaren 80.</p>
        <p>GoodTimes brengt een energieke live show vol herkenning, dansbare classics en pure nostalgie. Denk aan de grootste hits van onder andere Donna Summer, Dolly Dots, Jocelyn Brown, disco, funk en de beste 80’s party classics – gespeeld met passie, kwaliteit en een flinke dosis podiumenergie.</p>
        <p>Wij kiezen bewust voor een premium en exclusieve aanpak. Dat betekent:</p>
        <ul className="about-list about-promises">
          <li>maximaal een beperkt aantal optredens per jaar</li>
          <li>altijd 100% live muziek</li>
          <li>professionele sound en uitstraling</li>
          <li>een avond vol dans, sfeer en herkenning</li>
        </ul>
        <p>GoodTimes is daarmee de perfecte band voor:</p>
        <ul className="about-list about-events">
          <li>festivals</li>
          <li>bedrijfsfeesten</li>
          <li>exclusieve evenementen</li>
          <li>tentfeesten en dorpsfeesten</li>
        </ul>
        <p>Wil je jouw evenement veranderen in een echte 80’s party waar het publiek nog lang over napraat?</p>
      </div>
    </section>
    <section className="members"><p className="eyebrow">The band</p><h2>De muzikanten achter de sound</h2><div className="member-grid">{members.map(([name, role, image, alt],i)=><article key={name}><div className={`portrait p${i+1}`}><img src={image} alt={alt} width="1200" height="800" loading="lazy" /><span>0{i+1}</span></div><h3>{name}</h3><p>{role}</p></article>)}</div><Link className="text-link about-repertoire-link" href="/repertoire">Bekijk ons jaren 80-repertoire <Arrow /></Link></section>
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

  return <><PageIntro kicker="All killer. No filler." title="ONS" accent="REPERTOIRE." text="" />
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
  return <><PageIntro kicker="GoodTimes live" title="AGENDA." accent="VENRAY." text="Een avond vol herkenbare hits uit de jaren 80." />
    <section className="agenda-page">
      <article className="agenda-event">
        <div className="agenda-event-date">
          <strong>10</strong>
          <span>oktober</span>
          <b>2026</b>
        </div>
        <div className="agenda-event-details">
          <p className="eyebrow">GoodTimes live</p>
          <h2>Café-Zaal De Gouwe Leeuw</h2>
          <p className="agenda-location">Venray</p>
          <p className="agenda-time">Aanvang 20:30 uur</p>
          <p className="agenda-description">Een avond vol herkenbare hits uit de jaren 80.</p>
          <Link className="text-link agenda-contact-link" href="/contact">Vraag naar beschikbaarheid <Arrow /></Link>
        </div>
      </article>
    </section>
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
  return <section className="contact-page">
    <div className="contact-card">
      <p className="eyebrow">GoodTimes direct</p>
      <h1>Neem contact op</h1>
      <p className="contact-intro">Heb je een vraag, wil je GoodTimes boeken of meer informatie over een optreden? Neem gerust contact met ons op. We reageren zo snel mogelijk.</p>
      <div className="contact-email">
        <span aria-hidden="true">📧</span>
        <a href="mailto:info@goodtimescoverband.nl">info@goodtimescoverband.nl</a>
      </div>
      <a className="primary contact-mail-button" href="mailto:info@goodtimescoverband.nl">Stuur een e-mail <Arrow /></a>
      <a className="primary contact-facebook-button" href={facebookUrl} target="_blank" rel="noopener noreferrer"><FacebookIcon /> Bekijk GoodTimes op Facebook <Arrow /></a>
      <div className="contact-bookings">
        <p className="eyebrow">Boekingen</p>
        <p>GoodTimes is beschikbaar voor bruiloften, bedrijfsfeesten, festivals, evenementen…</p>
      </div>
    </div>
  </section>;
}

export function GoodTimesSite({ page }: { page: PageKey }) {
  const content = page === "home" ? <HomePage /> : page === "over-de-band" ? <About /> : page === "repertoire" ? <Repertoire /> : page === "agenda" ? <Agenda /> : page === "media" || page === "fotos-videos" ? <Media /> : <Contact />;
  return <><Header page={page === "fotos-videos" ? "media" : page} /><main>{content}</main><Footer /></>;
}

