import type { Metadata } from "next";

export const siteUrl = "https://goodtimescoverband.nl";
export const socialImage = "/og.png";

type SeoEntry = {
  title: string;
  description: string;
  path: string;
};

export const pageSeo = {
  home: {
    title: "GoodTimes | Live jaren 80 coverband boeken",
    description: "GoodTimes is een energieke live coverband met de grootste disco-, funk- en partyhits uit de jaren 80. Boek GoodTimes voor festivals, bedrijfsfeesten en evenementen.",
    path: "/",
  },
  "over-de-band": {
    title: "Over GoodTimes | Premium live jaren 80 coverband",
    description: "Maak kennis met de zes muzikanten van GoodTimes: een professionele liveband vol energie, kwaliteit en herkenbare jaren 80-hits.",
    path: "/over-de-band/",
  },
  repertoire: {
    title: "Repertoire | Jaren 80 hits van GoodTimes",
    description: "Bekijk het actuele repertoire van GoodTimes met herkenbare disco-, funk-, pop- en partyklassiekers uit de jaren 80.",
    path: "/repertoire/",
  },
  media: {
    title: "Media | Bekijk en beluister GoodTimes live",
    description: "Bekijk foto’s en beluister repetitieopnames van GoodTimes en proef de energie van onze live jaren 80-show.",
    path: "/media/",
  },
  agenda: {
    title: "Agenda | GoodTimes live",
    description: "Bekijk waar en wanneer GoodTimes optreedt. Beleef live de grootste disco-, funk- en partyhits uit de jaren 80.",
    path: "/agenda/",
  },
  "techniek-productie": {
    title: "Techniek & Productie | GoodTimes",
    description: "Boek GoodTimes met professionele techniek, licht en geluid van onze vaste ervaren geluidstechnicus.",
    path: "/techniek-productie/",
  },
  contact: {
    title: "GoodTimes boeken | Contact",
    description: "GoodTimes boeken voor een festival, bedrijfsfeest, dorpsfeest of evenement? Neem rechtstreeks contact op via info@goodtimescoverband.nl.",
    path: "/contact/",
  },
} satisfies Record<string, SeoEntry>;

export function createMetadata(entry: SeoEntry): Metadata {
  const canonical = `${siteUrl}${entry.path}`;
  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical },
    openGraph: {
      title: entry.title,
      description: entry.description,
      url: canonical,
      siteName: "GoodTimes",
      locale: "nl_NL",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "GoodTimes, live jaren 80-coverband" }],
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
  "@type": "MusicGroup",
  name: "GoodTimes",
  url: siteUrl,
  email: "info@goodtimescoverband.nl",
  genre: ["80's", "disco", "funk", "pop", "dance"],
  description: "Professionele live jaren 80-coverband.",
  image: `${siteUrl}/goodtimes-group-hero.jpeg`,
};

