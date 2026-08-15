import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoodTimesSite, type PageKey } from "./site";
import { createBreadcrumbJsonLd, createMetadata, createWebPageJsonLd, getSeoEntry, pageSeo, siteUrl } from "./seo";
import type { Locale } from "./i18n";

export const localizedPages: PageKey[] = ["over-de-band", "repertoire", "agenda", "media", "techniek-productie", "contact", "80s-coverband-boeken", "coverband-brabant", "coverband-bedrijfsfeest"];

export function localizedHomeMetadata(locale: Locale): Metadata {
  return createMetadata(getSeoEntry("home", locale), locale, "/");
}

export function LocalizedHome({ locale }: { locale: Locale }) {
  const entry = getSeoEntry("home", locale);
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(createWebPageJsonLd(entry, locale)) }} /><GoodTimesSite page="home" locale={locale} /></>;
}

export function localizedPageMetadata(locale: Locale, slug: string): Metadata {
  if (!localizedPages.includes(slug as PageKey)) return {};
  const key = slug as keyof typeof pageSeo;
  return createMetadata(getSeoEntry(key, locale), locale, pageSeo[key].path);
}

export function LocalizedPage({ locale, slug }: { locale: Locale; slug: string }) {
  if (!localizedPages.includes(slug as PageKey)) notFound();
  const key = slug as keyof typeof pageSeo;
  const entry = getSeoEntry(key, locale);
  const breadcrumb = createBreadcrumbJsonLd(slug, locale);
  const webPage = createWebPageJsonLd(entry, locale);
  const event = slug === "agenda" ? {
    "@context": "https://schema.org", "@type": "Event", name: "GoodTimes live in Café-Zaal De Gouwe Leeuw",
    startDate: "2026-10-10T20:30:00+02:00", endDate: "2026-10-11T00:00:00+02:00",
    eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${siteUrl}${entry.path}`, image: `${siteUrl}/goodtimes-group-hero.jpeg`,
    description: locale === "de" ? "Ein Abend voller bekannter Hits aus den 80ern." : locale === "en" ? "A night packed with familiar hits from the 80s." : "Een avond vol herkenbare hits uit de jaren 80.",
    location: { "@type": "Place", name: "Café-Zaal De Gouwe Leeuw", address: { "@type": "PostalAddress", addressLocality: "Venray", addressCountry: "NL" } },
    performer: { "@type": "MusicGroup", "@id": `${siteUrl}/#goodtimes`, name: "GoodTimes", url: siteUrl },
    offers: { "@type": "Offer", price: 0, priceCurrency: "EUR", availability: "https://schema.org/InStock" }, organizer: { "@id": `${siteUrl}/#goodtimes` },
  } : null;
  return <>{breadcrumb && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />{event && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(event) }} />}<GoodTimesSite page={slug as PageKey} locale={locale} /></>;
}
