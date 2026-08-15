import type { Metadata } from "next";
import { languageAlternates, localizedPath, translate, type Locale } from "./i18n";

export const siteUrl = "https://goodtimescoverband.nl";
export const socialImage = "/og.png";
export const facebookUrl = "https://www.facebook.com/share/14sZgHUpgHK/?mibextid=wwXIfr";

export type SeoEntry = {
  title: string;
  description: string;
  path: string;
};

const localizedSeo: Record<"de" | "en", Partial<Record<keyof typeof pageSeo, Pick<SeoEntry, "title" | "description">>>> = {
  de: {
    home: { title: "80er Jahre Coverband buchen | GoodTimes Liveband", description: "GoodTimes ist die niederländische 80er-Jahre-Coverband für Firmenfeiern, Festivals, Stadtfeste und Veranstaltungen in NRW – mit sechs Musikern, zwei Sängerinnen und 100 % Livemusik." },
    "over-de-band": { title: "Über GoodTimes | Niederländische 80er Jahre Liveband", description: "Sechs Musiker, zwei Sängerinnen und keine Backingtracks: Lerne GoodTimes kennen, die professionelle niederländische 80er-Jahre-Liveband für Veranstaltungen." },
    repertoire: { title: "80er Jahre Coverband Repertoire | GoodTimes live", description: "Entdecke das GoodTimes-Repertoire aus Disco, Funk, Dance, Pop und Nederpop – von sechs Musikern und zwei Sängerinnen vollständig live gespielt." },
    media: { title: "80er Jahre Liveband anhören | GoodTimes Media", description: "Höre echte Probenaufnahmen von GoodTimes und erlebe den Sound einer professionellen 80er-Jahre-Coverband – vollständig live und ohne Backingtracks." },
    agenda: { title: "GoodTimes live | Termine der 80er Jahre Coverband", description: "Sieh, wann und wo GoodTimes live spielt, und erlebe eine niederländische 80er-Jahre-Liveband mit Disco, Funk, Dance und Partyhits." },
    "techniek-productie": { title: "Licht und Ton für eine Liveband | GoodTimes Technik", description: "Buche GoodTimes inklusive professioneller Technik, Licht und Ton für Partys, Festivals und Events." },
    contact: { title: "80er Jahre Band buchen | Kontakt GoodTimes", description: "GoodTimes für Firmenfeier, Stadtfest, Festival oder Veranstaltung in Deutschland buchen? Frage die niederländische 80er-Jahre-Liveband direkt an." },
    "80s-coverband-boeken": { title: "80er Jahre Band buchen | GoodTimes 100 % live", description: "GoodTimes als 80er-Jahre-Coverband buchen: sechs Musiker, zwei Sängerinnen, Disco, Funk und Dance – vollständig live und ohne Backingtracks." },
    "coverband-brabant": { title: "Niederländische 80er Coverband | GoodTimes live", description: "GoodTimes ist eine professionelle niederländische 80er-Jahre-Coverband. Sechs Musiker spielen Disco, Funk, Dance und Nederpop vollständig live." },
    "coverband-bedrijfsfeest": { title: "Coverband für Firmenfeier | GoodTimes 80er Liveband", description: "GoodTimes bringt bekannte 80er-Hits vollständig live auf Firmenfeiern, Mitarbeiterfeste und Business-Events – mit sechs Musikern und zwei Sängerinnen." },
    "80er-jahre-coverband-nrw": { title: "80er Jahre Coverband NRW buchen | GoodTimes Liveband", description: "GoodTimes ist die niederländische 80er-Jahre-Coverband für Firmenfeiern, Stadtfeste, Festivals und Veranstaltungen in NRW – 100 % live, ohne Backingtracks." },
  },
  en: {
    home: { title: "Dutch 80s cover band | GoodTimes live band", description: "Book GoodTimes, a professional Dutch 80s cover band and party band for corporate events, weddings, festivals and celebrations in the Netherlands." },
    "over-de-band": { title: "About GoodTimes | Professional Dutch 80s band", description: "Meet the six experienced musicians of GoodTimes, a professional Dutch live band for parties, festivals and events." },
    repertoire: { title: "80s cover band repertoire | GoodTimes live band", description: "Explore the GoodTimes repertoire of danceable disco, funk, pop and party classics from the 80s, always performed 100% live." },
    media: { title: "Listen to GoodTimes live | 80s cover band", description: "Hear GoodTimes rehearsal recordings and experience the energy, harmonies and live sound of this professional Dutch 80s cover band." },
    agenda: { title: "GoodTimes shows | 80s cover band live", description: "See where and when GoodTimes performs live and experience the greatest disco, funk and party hits of the 80s." },
    "techniek-productie": { title: "Live band sound and lighting | GoodTimes production", description: "Book GoodTimes with professional sound, lighting and technical production for parties, festivals and events." },
    contact: { title: "Book a Dutch 80s cover band | Contact GoodTimes", description: "Book GoodTimes for a corporate party, wedding, festival or event in the Netherlands. Contact our professional 80s live band directly." },
    "80s-coverband-boeken": { title: "Book an 80s cover band | GoodTimes 100% live", description: "Book GoodTimes as an 80s cover band: disco, funk and pop with six musicians, live vocals and a completely live performance." },
    "coverband-brabant": { title: "80s cover band from Brabant | GoodTimes live", description: "GoodTimes is a professional 80s cover band from Brabant. Six musicians perform disco, funk and pop completely live." },
    "coverband-bedrijfsfeest": { title: "80s live band for corporate events | GoodTimes", description: "GoodTimes performs familiar 80s hits completely live at corporate parties, staff celebrations and business events." },
  },
};

export const pageSeo = {
  home: {
    title: "Coverband Brabant boeken | GoodTimes 80's liveband",
    description: "Boek GoodTimes, een professionele 80's coverband en feestband voor bedrijfsfeesten, bruiloften, festivals en evenementen in Brabant en heel Nederland.",
    path: "/",
  },
  "over-de-band": {
    title: "Over GoodTimes | Professionele 80's coverband Brabant",
    description: "Maak kennis met de zes ervaren muzikanten van GoodTimes: een professionele liveband voor feesten, festivals en evenementen in Brabant en heel Nederland.",
    path: "/over-de-band/",
  },
  repertoire: {
    title: "80's coverband repertoire | GoodTimes liveband",
    description: "Bekijk het actuele repertoire van GoodTimes met dansbare disco-, funk-, pop- en partyklassiekers uit de jaren 80, altijd 100% live gespeeld.",
    path: "/repertoire/",
  },
  media: {
    title: "GoodTimes live beluisteren | 80's coverband",
    description: "Beluister repetitieopnames van GoodTimes en ervaar de energie, samenzang en live sound van deze professionele jaren 80-coverband en feestband.",
    path: "/media/",
  },
  agenda: {
    title: "Agenda GoodTimes | 80's coverband live",
    description: "Bekijk waar en wanneer GoodTimes live optreedt en beleef een avond met de grootste disco-, funk- en partyhits uit de jaren 80.",
    path: "/agenda/",
  },
  "techniek-productie": {
    title: "Licht en geluid voor liveband | GoodTimes techniek",
    description: "Boek GoodTimes inclusief professionele techniek, licht en geluid van onze vaste geluidstechnicus voor feesten, festivals en evenementen.",
    path: "/techniek-productie/",
  },
  contact: {
    title: "Coverband boeken in Brabant | Contact GoodTimes",
    description: "GoodTimes boeken voor een bedrijfsfeest, bruiloft, festival of evenement in Brabant of elders in Nederland? Neem rechtstreeks contact met ons op.",
    path: "/contact/",
  },
  "80s-coverband-boeken": {
    title: "Jaren 80 coverband boeken | GoodTimes 100% live",
    description: "Een jaren 80 coverband boeken? GoodTimes brengt disco, funk, pop en Nederpop met zes muzikanten, live zang en een volledig live gespeelde show.",
    path: "/80s-coverband-boeken/",
  },
  "coverband-brabant": {
    title: "Jaren 80 coverband Brabant | GoodTimes 100% live",
    description: "Boek GoodTimes als jaren 80 coverband in Brabant. Zes muzikanten spelen disco, funk, pop en Nederpop volledig live op feesten en evenementen.",
    path: "/coverband-brabant/",
  },
  "coverband-bedrijfsfeest": {
    title: "Jaren 80 band voor bedrijfsfeest | GoodTimes live",
    description: "Zoek je een live band voor een bedrijfsfeest? GoodTimes speelt herkenbare jaren 80-hits volledig live op personeelsfeesten en zakelijke evenementen.",
    path: "/coverband-bedrijfsfeest/",
  },
  "80er-jahre-coverband-nrw": {
    title: "80er Jahre Coverband NRW buchen | GoodTimes Liveband",
    description: "GoodTimes ist die niederländische 80er-Jahre-Coverband für Firmenfeiern, Stadtfeste, Festivals und Veranstaltungen in NRW – 100 % live, ohne Backingtracks.",
    path: "/80er-jahre-coverband-nrw/",
  },
} satisfies Record<string, SeoEntry>;

export function getSeoEntry(key: keyof typeof pageSeo, locale: Locale = "nl"): SeoEntry {
  const base = pageSeo[key];
  return locale === "nl" ? base : { ...base, ...(localizedSeo[locale][key] ?? {}), path: localizedPath(locale, base.path) };
}

export function createMetadata(entry: SeoEntry, locale: Locale = "nl", basePath?: string): Metadata {
  const canonical = `${siteUrl}${entry.path}`;
  const alternatePath = basePath ?? (entry.path.replace(/^\/(de|en)(?=\/|$)/, "") || "/");
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical, languages: languageAlternates(alternatePath) },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url: canonical,
      siteName: "GoodTimes",
      locale: locale === "de" ? "de_DE" : locale === "en" ? "en_GB" : "nl_NL",
      type: "website",
      images: [{ url: socialImage, width: 1672, height: 941, alt: locale === "de" ? "GoodTimes, professionelle 80er-Live-Coverband" : locale === "en" ? "GoodTimes, professional live 80s cover band" : "GoodTimes, professionele live jaren 80-coverband" }],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: entry.description,
      images: [socialImage],
    },
  };
}

export const musicGroupJsonLd = {
  "@context": "https://schema.org",
  "@type": ["MusicGroup", "Organization"],
  "@id": `${siteUrl}/#goodtimes`,
  name: "GoodTimes",
  alternateName: "GoodTimes 80's Coverband",
  url: siteUrl,
  logo: `${siteUrl}/favicon-512x512.png`,
  email: "info@goodtimescoverband.nl",
  telephone: "+31615066740",
  genre: ["80's", "disco", "funk", "pop", "dance classics", "Nederpop"],
  description: "Professionele live jaren 80-coverband en feestband voor bedrijfsfeesten, bruiloften, festivals en evenementen in Brabant en heel Nederland.",
  image: `${siteUrl}/goodtimes-group-hero.jpeg`,
  sameAs: [facebookUrl],
  areaServed: [
    { "@type": "AdministrativeArea", name: "Noord-Brabant" },
    ...["Waalwijk", "Den Bosch", "Tilburg", "Breda", "Eindhoven", "Nijmegen"].map((name) => ({ "@type": "City", name })),
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "boekingen",
    email: "info@goodtimescoverband.nl",
    telephone: "+31615066740",
    availableLanguage: ["nl", "de", "en"],
    areaServed: "NL",
  },
  member: [
    ["Esther", "zang"],
    ["Cindy", "zang"],
    ["Luuk", "toetsen"],
    ["Joost", "gitaar"],
    ["Eddie", "basgitaar"],
    ["Eric", "drums"],
  ].map(([name, role]) => ({ "@type": "Person", name, roleName: role })),
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: "GoodTimes",
  alternateName: "GoodTimes 80's Coverband",
  description: pageSeo.home.description,
  inLanguage: ["nl-NL", "de-DE", "en-GB"],
  publisher: { "@id": `${siteUrl}/#goodtimes` },
};

export function createWebPageJsonLd(entry: SeoEntry, locale: Locale = "nl") {
  const url = `${siteUrl}${entry.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: entry.title,
    description: entry.description,
    inLanguage: locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "nl-NL",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#goodtimes` },
  };
}

const breadcrumbLabels: Record<string, string> = {
  "over-de-band": "Over de band",
  repertoire: "Repertoire",
  agenda: "Agenda",
  media: "Media",
  "techniek-productie": "Techniek & Productie",
  contact: "Contact",
  "80s-coverband-boeken": "80's coverband boeken",
  "coverband-brabant": "Coverband Brabant",
  "coverband-bedrijfsfeest": "Coverband bedrijfsfeest",
  "80er-jahre-coverband-nrw": "80er-Jahre-Coverband NRW",
};

export function createBreadcrumbJsonLd(slug: string, locale: Locale = "nl") {
  const canonicalSlug = slug === "fotos-videos" ? "media" : slug;
  const key = canonicalSlug as keyof typeof pageSeo;
  const entry = getSeoEntry(key, locale);
  if (!entry) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}${localizedPath(locale, "/")}` },
      { "@type": "ListItem", position: 2, name: translate(locale, breadcrumbLabels[canonicalSlug]), item: `${siteUrl}${entry.path}` },
    ],
  };
}
