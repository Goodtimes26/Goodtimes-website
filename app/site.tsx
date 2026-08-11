"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../lib/supabase";

export type PageKey = "home" | "over-de-band" | "repertoire" | "agenda" | "media" | "fotos-videos" | "techniek-productie" | "contact" | "bandinlog" | "80s-coverband-boeken" | "coverband-brabant" | "coverband-bedrijfsfeest";

const nav = [
  ["home", "/", "Home"],
  ["over-de-band", "/over-de-band", "Over de band"],
  ["repertoire", "/repertoire", "Repertoire"],
  ["agenda", "/agenda", "Agenda"],
  ["media", "/media", "Media"],
  ["techniek-productie", "/techniek-productie", "Techniek & Productie"],
  ["contact", "/contact", "Contact"],
] as const;

const facebookUrl = "https://www.facebook.com/share/14sZgHUpgHK/?mibextid=wwXIfr";
const whatsappUrl = "https://wa.me/31615066740?text=Hallo%20GoodTimes%21%20Ik%20ben%20benieuwd%20naar%20de%20mogelijkheden%20voor%20een%20optreden.%20Kunnen%20jullie%20contact%20met%20mij%20opnemen%3F";

function FacebookIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M14 8.5V7c0-.8.5-1 1-1h2V2.1L14.1 2C10.6 2 9 4.1 9 6.7v1.8H6V13h3v9h4.5v-9h3l.5-4.5h-3Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a9.7 9.7 0 0 0-8.4 14.6L2.3 22l5.5-1.4A9.8 9.8 0 1 0 12 2Zm0 17.8c-1.4 0-2.8-.4-4-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A7.8 7.8 0 1 1 12 19.8Zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-1.5-.7-2.5-1.4-3.5-3.1-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5l-.7-1.7c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.2-.2-.4-.3Z" /></svg>;
}

function FloatingWhatsApp() {
  return <a className="whatsapp-fab" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp met GoodTimes over een optreden">
    <WhatsAppIcon />
  </a>;
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function Header({ page }: { page: PageKey }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="GoodTimes home">
        GOOD<span>TIMES</span><small>THE 80’S LIVE</small>
      </Link>
      <button className="menu" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-navigation" aria-label={open ? "Menu sluiten" : "Menu openen"}>
        MENU
      </button>
      <nav id="main-navigation" className={open ? "nav open" : "nav"} aria-label="Hoofdnavigatie">
        {nav.map(([key, href, label]) => <Link className={page === key ? "active" : ""} href={href} key={key} aria-current={page === key ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="nav-cta" href="/contact" onClick={() => setOpen(false)}>Boek de band <Arrow /></Link>
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
      <nav className="footer-booking-links" aria-label="GoodTimes boeken">
        <span>GoodTimes boeken</span>
        <Link href="/80s-coverband-boeken">80’s coverband boeken</Link>
        <Link href="/coverband-brabant">Coverband Brabant</Link>
        <Link href="/coverband-bedrijfsfeest">Coverband bedrijfsfeest</Link>
      </nav>
      <div className="footer-bottom"><span>© 2026 GoodTimes. Alle rechten voorbehouden.</span><span>Privacy · Cookies</span></div>
    </footer>
  );
}

function Hero() {
  return (
    <section className="hero home-hero">
      {/* Vervang dit bestand om de hero-foto later te wijzigen; behoud de afmetingen voor een stabiele layout. */}
      <Image className="hero-image" src="/goodtimes-group-hero.jpeg" width={1536} height={1024} sizes="(max-width: 767px) 100vw, 45vw" alt="De zes muzikanten van GoodTimes, professionele jaren 80-coverband uit Brabant" preload />
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="eyebrow">De grootste hits uit de jaren 80. Live, energiek, onvergetelijk.</p>
        <h1>GOODTIMES<br /><em>de 80’s Coverband</em></h1>
        <div className="hero-intro">
          <p>GoodTimes brengt de grootste klassiekers uit de jaren tachtig tot leven.</p>
          <p>Boek GoodTimes voor feesten, bedrijfsfeesten en evenementen: met jarenlange podiumervaring, aanstekelijke energie en een volledig dansbaar repertoire maken we van ieder optreden een feest.</p>
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
        <p>GoodTimes is een live jaren 80-coverband van zes muzikanten. Van De Dolly Dots tot Donna Summer en van Toto tot De Dijk: met live zang, strakke meerstemmigheid en 100% live gespeelde muziek brengen we een avond vol herkenning, energie en dansbare klassiekers. GoodTimes is te boeken als professionele coverband en feestband in Noord-Brabant en door heel Nederland, van Waalwijk, Den Bosch, Tilburg, Breda en Eindhoven tot Nijmegen.</p>
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
    ["CINDY", "Zang", "/members/cindy-zang.jpeg", "Cindy, zangeres van GoodTimes"],
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
    <section className="members"><p className="eyebrow">The band</p><h2>De muzikanten achter de sound</h2><div className="member-grid">{members.map(([name, role, image, alt],i)=><article key={name}><div className={`portrait p${i+1}`}><Image src={image} alt={alt} width={1200} height={800} sizes="(max-width: 900px) 50vw, 17vw" /><span aria-hidden="true">0{i+1}</span></div><h3>{name}</h3><p>{role}</p></article>)}</div><Link className="text-link about-repertoire-link" href="/repertoire">Bekijk ons jaren 80-repertoire <Arrow /></Link></section>
  </>;
}

type RepertoireSong = { id: string; title: string; artist?: string; category?: string };

function Repertoire() {
  const [songs, setSongs] = useState<RepertoireSong[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const legacyUrl = "https://goodtimes-setlist-maker.e-voorthuijsen571420.chatgpt.site/api/repertoire";
    async function loadRepertoire() {
      const supabase = getSupabaseClient();
      if (supabase) {
        const result = await supabase.from("public_repertoire").select("id,title,category,source_order").order("source_order", { nullsFirst: false });
        if (!result.error && result.data?.length) return { songs: result.data as RepertoireSong[] };
      }
      const response = await fetch(legacyUrl, {
      signal: controller.signal,
      cache: "no-store",
      });
      if (!response.ok) throw new Error("Repertoire kon niet worden geladen");
      return response.json() as Promise<{ songs?: RepertoireSong[] }>;
    }
    loadRepertoire()
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
  const pauseOtherTracks = (currentTrack: HTMLAudioElement) => {
    document.querySelectorAll<HTMLAudioElement>(".audio-track audio").forEach((track) => {
      if (track !== currentTrack) track.pause();
    });
  };
  useEffect(() => {
    fetch("/audio/tracks.json")
      .then((response) => response.json())
      .then((tracks) => setAudioTracks(Array.isArray(tracks) ? tracks : []))
      .catch(() => setAudioTracks([]));
  }, []);
  return <><PageIntro className="media-intro" kicker="Turn it up" title="ZIEN. HOREN." accent="MEEMAKEN." text="De opnames zijn gemaakt tijdens onze repetities. Ongeslepen, puur en ruw. Precies zoals GoodTimes live klinkt. Een eerlijk voorproefje van de energie en sfeer die je tijdens een optreden kunt verwachten." />
    <div id="audio" className="audio-anchor" aria-hidden="true" />
    <section className="audio-list" aria-label="Audio van GoodTimes">
      {audioTracks.map((track)=><article className="audio-track" key={track.src}><h2>{track.title}</h2><audio controls preload="metadata" src={track.src} onPlay={(event) => pauseOtherTracks(event.currentTarget)}>Je browser ondersteunt deze audioplayer niet.</audio></article>)}
    </section>
  </>;
}

function TechniqueProduction() {
  // Voeg later eenvoudig een tweede foto toe aan deze lijst; de galerij past zich automatisch aan.
  const bannerImages = [
    {
      src: "/techniek-productie-banner.jpg",
      alt: "Professionele mengtafel met het verlichte podium van GoodTimes op de achtergrond",
    },
  ];
  const possibilities = [
    "Professionele geluidsversterking",
    "Podium- en sfeerverlichting",
    "Complete bediening van licht en geluid",
    "Technische ondersteuning voor kleine en middelgrote evenementen",
    "Maatwerk afgestemd op locatie, publiek en wensen van de organisatie",
  ];
  const benefits = [
    ["◉", "Vaste ervaren geluidstechnicus"],
    ["⌁", "Professionele licht- en geluidsapparatuur"],
    ["◎", "Perfect afgestemd op GoodTimes"],
    ["↔", "Eén aanspreekpunt voor band én techniek"],
    ["✓", "Betrouwbare opbouw, bediening en ondersteuning"],
  ];

  return <>
    <PageIntro kicker="GoodTimes achter de knoppen" title="TECHNIEK &" accent="PRODUCTIE." text="Professionele techniek, volledig afgestemd op de band en jouw evenement." />
    <section className={`tech-banner-grid ${bannerImages.length > 1 ? "has-multiple" : ""}`} aria-label="GoodTimes techniek en productie">
      {bannerImages.map((image) => <figure className="tech-banner" key={image.src}><Image src={image.src} alt={image.alt} width={1179} height={855} sizes="(max-width: 900px) 100vw, 84vw" /></figure>)}
    </section>
    <section className="tech-intro">
      <p className="eyebrow">Techniek die het optreden versterkt</p>
      <h2>Professionele techniek voor een zorgeloos optreden</h2>
      <div className="tech-copy">
        <p>Een geslaagd optreden draait om meer dan alleen goede muziek. Professioneel licht en helder geluid maken het verschil.</p>
        <p>GoodTimes is te boeken als band, maar desgewenst verzorgen wij ook de complete technische ondersteuning met professioneel licht en geluid.</p>
        <p>Hiervoor werken wij uitsluitend samen met onze vaste, ervaren geluidstechnicus. Hierdoor zijn de band, het geluid en de verlichting perfect op elkaar afgestemd en ben je verzekerd van een professionele uitvoering.</p>
      </div>
    </section>
    <section className="tech-options">
      <div className="tech-section-heading"><p className="eyebrow">Kies wat past</p><h2>Twee mogelijkheden</h2></div>
      <div className="tech-option-grid">
        <article><span>01</span><h3>GoodTimes zonder techniek</h3><p>Ideaal wanneer de locatie beschikt over een eigen licht- en geluidsinstallatie of een eigen geluidstechnicus.</p></article>
        <article><span>02</span><h3>GoodTimes inclusief techniek</h3><ul><li>Complete verzorging van professioneel licht en geluid.</li><li>Professionele bediening door onze vaste geluidstechnicus.</li><li>Eén aanspreekpunt voor band én techniek.</li><li>Een totaaloplossing waarbij alles perfect op elkaar is afgestemd.</li></ul></article>
      </div>
    </section>
    <section className="tech-capabilities">
      <div className="tech-section-heading"><p className="eyebrow">Van podium tot zaal</p><h2>Onze mogelijkheden</h2></div>
      <ul>{possibilities.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></li>)}</ul>
    </section>
    <section className="tech-benefits">
      <div className="tech-section-heading"><p className="eyebrow">Eén sterk team</p><h2>Waarom kiezen voor GoodTimes techniek?</h2></div>
      <div className="tech-benefit-grid">{benefits.map(([icon, label]) => <article key={label}><span aria-hidden="true">{icon}</span><h3>{label}</h3></article>)}</div>
    </section>
    <section className="tech-tail">
      <article className="tech-custom"><p className="eyebrow">Maatwerk</p><h2>Geen evenement en geen locatie is hetzelfde.</h2><p>Daarom bespreken wij vooraf de locatie, het aantal bezoekers en de technische wensen. Alleen geluid, alleen verlichting of een complete technische verzorging behoort tot de mogelijkheden.</p></article>
      <aside className="tech-notice"><p>Wanneer je kiest voor GoodTimes inclusief techniek verzorgen wij de volledige technische ondersteuning altijd met onze eigen vaste geluidstechnicus. Hierdoor kunnen wij de kwaliteit, betrouwbaarheid en uitstraling garanderen waar GoodTimes voor staat.</p></aside>
    </section>
    <section className="tech-cta"><p className="eyebrow">Benieuwd naar de mogelijkheden?</p><h2>Wij denken graag met je mee.</h2><p>Of je nu alleen GoodTimes wilt boeken of kiest voor een compleet verzorgd optreden inclusief professionele techniek, wij denken graag met je mee en adviseren graag over de mogelijkheden.</p><Link className="primary" href="/contact">Informeer naar de mogelijkheden <Arrow /></Link></section>
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
      <a className="primary contact-whatsapp-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp met GoodTimes openen in een nieuw tabblad"><WhatsAppIcon /> WhatsApp met GoodTimes <Arrow /></a>
      <div className="contact-bookings">
        <p className="eyebrow">Boekingen</p>
        <p>GoodTimes is beschikbaar als live band voor bruiloften, bedrijfsfeesten, personeelsfeesten, festivals en evenementen in Brabant en heel Nederland.</p>
      </div>
    </div>
  </section>;
}

type LandingPageContent = {
  kicker: string;
  title: string;
  accent: string;
  introduction: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
  highlights: string[];
  cta: string;
};

const landingPages: Record<"80s-coverband-boeken" | "coverband-brabant" | "coverband-bedrijfsfeest", LandingPageContent> = {
  "80s-coverband-boeken": {
    kicker: "De jaren 80, volledig live",
    title: "80'S COVERBAND",
    accent: "BOEKEN.",
    introduction: "Zoek je een 80's coverband die de energie en herkenning van het muziekdecennium live naar het podium brengt? GoodTimes speelt dansbare jaren 80-muziek met zes ervaren muzikanten en zonder backing tracks.",
    sections: [
      {
        title: "Een live jaren 80-band voor jouw evenement",
        paragraphs: [
          "Van disco en funk tot pop, Nederpop en dance classics: GoodTimes brengt bekende nummers uit de jaren tachtig met live zang, meerstemmigheid en een energieke bandsound.",
          "De band is inzetbaar voor feestavonden, bedrijfsfeesten, festivals en andere evenementen waar herkenning, dansbare muziek en een professionele uitstraling samenkomen.",
        ],
      },
      {
        title: "Herkenbare hits, gespeeld door een echte liveband",
        paragraphs: [
          "Een 80's liveband maakt muziek tastbaar. De interactie tussen muzikanten, publiek en podium zorgt voor een optreden dat iedere avond leeft.",
          "Bekijk het repertoire voor een indruk van de nummers of beluister de repetitieopnames om te horen hoe GoodTimes live klinkt.",
        ],
      },
    ],
    highlights: ["100% live, zonder backing tracks", "Zes ervaren muzikanten", "Voor feesten, festivals en evenementen"],
    cta: "Informeer naar beschikbaarheid",
  },
  "coverband-brabant": {
    kicker: "Live vanuit Noord-Brabant",
    title: "COVERBAND",
    accent: "BRABANT.",
    introduction: "GoodTimes is een professionele 80's coverband uit Brabant. Vanuit de regio is de band goed inzetbaar voor feesten, festivals en evenementen in Noord-Brabant en daarbuiten.",
    sections: [
      {
        title: "Een energieke live band in Brabant",
        paragraphs: [
          "Organiseer je een evenement in Den Bosch, Tilburg, Eindhoven of elders in Noord-Brabant? GoodTimes brengt een herkenbare jaren 80-show met dansbare classics, sterke zang en een volledige livebezetting.",
          "De combinatie van bekende muziek en podiumenergie maakt de band geschikt voor uiteenlopende gelegenheden, van een feestavond tot een festival of bedrijfsevenement.",
        ],
      },
      {
        title: "Ook buiten Brabant te boeken",
        paragraphs: [
          "GoodTimes speelt niet alleen in Brabant. Ook voor optredens elders in Nederland kun je informeren naar de mogelijkheden en beschikbaarheid.",
          "Wie specifiek een jaren 80-band wil boeken, kan het repertoire bekijken en via de live opnames alvast kennismaken met de sound van GoodTimes.",
        ],
      },
    ],
    highlights: ["Coverband uit Brabant", "Volledig live gespeeld", "Professionele sound en uitstraling"],
    cta: "GoodTimes boeken in Brabant",
  },
  "coverband-bedrijfsfeest": {
    kicker: "Herkenning voor het hele bedrijf",
    title: "COVERBAND",
    accent: "BEDRIJFSFEEST.",
    introduction: "Met herkenbare jaren 80-hits en een energieke liveshow brengt GoodTimes collega's samen op de dansvloer. Een professionele coverband voor een bedrijfsfeest, personeelsfeest of zakelijk evenement.",
    sections: [
      {
        title: "Live muziek voor een breed publiek",
        paragraphs: [
          "De muziek uit de jaren tachtig verbindt generaties. Bekende refreinen, dansbare disco, funk en pop zorgen voor herkenning zonder dat het programma eenvormig wordt.",
          "GoodTimes speelt alles volledig live. Daarmee krijgt een personeelsfeest of bedrijfsevenement de energie en spontaniteit van een echte band op het podium.",
        ],
      },
      {
        title: "Passend bij zakelijke evenementen",
        paragraphs: [
          "Van jubileum en relatie-evenement tot bedrijfsfestival: GoodTimes combineert een verzorgde uitstraling met een repertoire dat uitnodigt om mee te zingen en te dansen.",
          "Wil je weten of de band past bij jouw locatie en programma? Neem contact op; we denken graag mee over de mogelijkheden voor het evenement.",
        ],
      },
    ],
    highlights: ["Voor personeelsfeesten en jubilea", "Dansbare jaren 80-hits", "Zes professionele muzikanten"],
    cta: "Vraag beschikbaarheid aan",
  },
};

function SeoLandingPage({ page }: { page: keyof typeof landingPages }) {
  const content = landingPages[page];
  return <>
    <PageIntro kicker={content.kicker} title={content.title} accent={content.accent} text={content.introduction} className="seo-landing-intro" />
    <section className="seo-landing-content">
      <div className="seo-landing-main">
        {content.sections.map((section) => <article key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>)}
      </div>
      <aside className="seo-landing-aside" aria-label="Kenmerken van GoodTimes">
        <p className="eyebrow">GoodTimes live</p>
        <ul>{content.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
        <Link className="primary" href="/contact">{content.cta} <Arrow /></Link>
      </aside>
    </section>
    <section className="seo-landing-discover">
      <p className="eyebrow">Ontdek GoodTimes</p>
      <h2>Bekijk en beluister de band</h2>
      <nav aria-label="Meer over GoodTimes">
        <Link className="text-link" href="/repertoire">Bekijk het repertoire <Arrow /></Link>
        <Link className="text-link" href="/media">Beluister de live opnames <Arrow /></Link>
        {page !== "80s-coverband-boeken" && <Link className="text-link" href="/80s-coverband-boeken">Meer over een 80’s coverband boeken <Arrow /></Link>}
        {page !== "coverband-brabant" && <Link className="text-link" href="/coverband-brabant">GoodTimes als coverband in Brabant <Arrow /></Link>}
        {page !== "coverband-bedrijfsfeest" && <Link className="text-link" href="/coverband-bedrijfsfeest">Liveband voor een bedrijfsfeest <Arrow /></Link>}
      </nav>
    </section>
  </>;
}

export function GoodTimesSite({ page }: { page: PageKey }) {
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase || page === "bandinlog") return;
    const storageKey = "goodtimes_visit_id";
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const createVisitId = () =>
      window.crypto?.randomUUID?.() ??
      "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (character) =>
        (
          Number(character) ^
          (window.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(character) / 4)))
        ).toString(16),
      );

    void (async () => {
      let visitId: string | null = null;
      try {
        visitId = window.sessionStorage.getItem(storageKey);
      } catch {
        // Sommige privacy-instellingen blokkeren sessionStorage; meten blijft dan mogelijk.
      }
      if (!visitId || !uuidPattern.test(visitId)) visitId = createVisitId();

      const recordView = (id: string) =>
        supabase.from("page_views").insert({
          path: window.location.pathname,
          visit_id: id,
        });

      let { error: trackingError } = await recordView(visitId);
      if (trackingError) {
        visitId = createVisitId();
        ({ error: trackingError } = await recordView(visitId));
      }
      if (!trackingError) {
        try {
          window.sessionStorage.setItem(storageKey, visitId);
        } catch {
          // De registratie zelf is gelukt; opslag van de sessiecode is optioneel.
        }
      }
    })();
  }, [page]);

  const content = page === "home" ? <HomePage /> : page === "over-de-band" ? <About /> : page === "repertoire" ? <Repertoire /> : page === "agenda" ? <Agenda /> : page === "media" || page === "fotos-videos" ? <Media /> : page === "techniek-productie" ? <TechniqueProduction /> : page === "contact" ? <Contact /> : page === "bandinlog" ? <Contact /> : <SeoLandingPage page={page} />;
  return <><a className="skip-link" href="#main-content">Ga direct naar de inhoud</a><Header page={page === "fotos-videos" ? "media" : page} /><main id="main-content" tabIndex={-1}>{content}</main><Footer />{page !== "bandinlog" && <FloatingWhatsApp />}</>;
}

