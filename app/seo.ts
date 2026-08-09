import type { Metadata } from "next";

export const siteUrl = "https://goodtimescoverband.nl";
export const socialImage = "/og.png";
export const facebookUrl = "https://www.facebook.com/share/14sZgHUpgHK/?mibextid=wwXIfr";

type SeoEntry = {
  title: string;
  description: string;
  path: string;
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
} satisfies Record<string, SeoEntry>;

export function createMetadata(entry: SeoEntry): Metadata {
  const canonical = `${siteUrl}${entry.path}`;
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical },
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
      locale: "nl_NL",
      type: "website",
      images: [{ url: socialImage, width: 1672, height: 941, alt: "GoodTimes, professionele live jaren 80-coverband" }],
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
    availableLanguage: ["nl"],
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
  inLanguage: "nl-NL",
  publisher: { "@id": `${siteUrl}/#goodtimes` },
};

export function createWebPageJsonLd(entry: SeoEntry) {
  const url = `${siteUrl}${entry.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: entry.title,
    description: entry.description,
    inLanguage: "nl-NL",
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
};

export function createBreadcrumbJsonLd(slug: string) {
  const canonicalSlug = slug === "fotos-videos" ? "media" : slug;
  const entry = pageSeo[canonicalSlug as keyof typeof pageSeo];
  if (!entry) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: breadcrumbLabels[canonicalSlug], item: `${siteUrl}${entry.path}` },
    ],
  };
}
