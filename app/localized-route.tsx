import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoodTimesSite, type PageKey } from "./site";
import { createBreadcrumbJsonLd, createMetadata, createWebPageJsonLd, getSeoEntry, pageSeo, siteUrl } from "./seo";
import type { Locale } from "./i18n";
import { createPublicEventJsonLd } from "./event-schema";

export const localizedPages: PageKey[] = ["over-de-band", "repertoire", "agenda", "media", "techniek-productie", "contact", "80s-coverband-boeken", "coverband-brabant", "coverband-bedrijfsfeest"];
export const germanLocalizedPages: PageKey[] = [...localizedPages, "80er-jahre-coverband-nrw"];

function pagesFor(locale: Locale) {
  return locale === "de" ? germanLocalizedPages : localizedPages;
}

export function localizedHomeMetadata(locale: Locale): Metadata {
  return createMetadata(getSeoEntry("home", locale), locale, "/");
}

export function LocalizedHome({ locale }: { locale: Locale }) {
  const entry = getSeoEntry("home", locale);
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(createWebPageJsonLd(entry, locale)) }} /><GoodTimesSite page="home" locale={locale} /></>;
}

export function localizedPageMetadata(locale: Locale, slug: string): Metadata {
  if (!pagesFor(locale).includes(slug as PageKey)) return {};
  const key = slug as keyof typeof pageSeo;
  const metadata = createMetadata(getSeoEntry(key, locale), locale, pageSeo[key].path);
  if (locale !== "de" || slug !== "80er-jahre-coverband-nrw") return metadata;
  return {
    ...metadata,
    alternates: {
      canonical: `${siteUrl}/de/80er-jahre-coverband-nrw/`,
      languages: {
        nl: `${siteUrl}/80s-coverband-boeken/`,
        de: `${siteUrl}/de/80er-jahre-coverband-nrw/`,
        en: `${siteUrl}/en/80s-coverband-boeken/`,
        "x-default": `${siteUrl}/80s-coverband-boeken/`,
      },
    },
  };
}

export function LocalizedPage({ locale, slug }: { locale: Locale; slug: string }) {
  if (!pagesFor(locale).includes(slug as PageKey)) notFound();
  const key = slug as keyof typeof pageSeo;
  const entry = getSeoEntry(key, locale);
  const breadcrumb = createBreadcrumbJsonLd(slug, locale);
  const webPage = createWebPageJsonLd(entry, locale);
  const event = slug === "agenda" ? createPublicEventJsonLd(locale) : null;
  const service = slug === "80er-jahre-coverband-nrw" ? {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${siteUrl}/de/80er-jahre-coverband-nrw/#service`,
    name: "GoodTimes – niederländische 80er-Jahre-Coverband für Live-Events in NRW",
    serviceType: "Live-Auftritt einer 80er-Jahre-Coverband",
    provider: { "@id": `${siteUrl}/#goodtimes` },
    url: `${siteUrl}/de/80er-jahre-coverband-nrw/`,
    areaServed: [
      { "@type": "AdministrativeArea", name: "Nordrhein-Westfalen" },
      { "@type": "AdministrativeArea", name: "Niederrhein" },
      ...["Kleve", "Krefeld", "Mönchengladbach", "Düsseldorf", "Duisburg"].map((name) => ({ "@type": "City", name })),
    ],
  } : null;
  return <>{breadcrumb && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />{event && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(event) }} />}{service && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />}<GoodTimesSite page={slug as PageKey} locale={locale} /></>;
}
