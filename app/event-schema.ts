import type { Locale } from "./i18n";
import { localizedPath } from "./i18n";
import { siteUrl } from "./seo";

const descriptions: Record<Locale, string> = {
  nl: "Een avond vol herkenbare hits uit de jaren 80.",
  de: "Ein Abend voller bekannter Hits aus den 80ern.",
  en: "A night packed with familiar hits from the 80s.",
};

export function createPublicEventJsonLd(locale: Locale = "nl") {
  const localizedAgendaPath = localizedPath(locale, "/agenda/");
  const eventUrl = `${siteUrl}${localizedAgendaPath.endsWith("/") ? localizedAgendaPath : `${localizedAgendaPath}/`}`;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${eventUrl}#goodtimes-2026-10-10`,
    name: "GoodTimes live in Café-Zaal De Gouwe Leeuw",
    startDate: "2026-10-10T20:30:00+02:00",
    endDate: "2026-10-11T00:00:00+02:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: eventUrl,
    image: `${siteUrl}/goodtimes-group-hero.jpeg`,
    description: descriptions[locale],
    location: {
      "@type": "Place",
      name: "Café-Zaal De Gouwe Leeuw",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Venray",
        addressCountry: "NL",
      },
    },
    performer: {
      "@type": "MusicGroup",
      "@id": `${siteUrl}/#goodtimes`,
      name: "GoodTimes",
      url: siteUrl,
    },
    offers: {
      "@type": "Offer",
      url: eventUrl,
      validFrom: "2026-07-28T14:12:19+02:00",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    organizer: { "@id": `${siteUrl}/#goodtimes` },
  };
}
