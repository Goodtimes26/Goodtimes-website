import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GoodTimesSite, type PageKey } from "../site";
import { createMetadata, pageSeo, siteUrl } from "../seo";

const pages: PageKey[] = ["over-de-band", "repertoire", "agenda", "media", "fotos-videos", "techniek-productie", "contact"];

export function generateStaticParams() {
  return pages.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const seoKey = slug === "fotos-videos" ? "media" : slug;
  const entry = pageSeo[seoKey as keyof typeof pageSeo];
  return entry ? createMetadata(entry) : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pages.includes(slug as PageKey)) notFound();
  const eventJsonLd = slug === "agenda" ? {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "GoodTimes live in Café-Zaal De Gouwe Leeuw",
    startDate: "2026-10-10T20:30:00+02:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${siteUrl}/agenda/`,
    image: `${siteUrl}/goodtimes-group-hero.jpeg`,
    description: "Een avond vol herkenbare hits uit de jaren 80.",
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
      name: "GoodTimes",
      url: siteUrl,
    },
  } : null;
  return <>
    {eventJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }} />}
    <GoodTimesSite page={slug as PageKey} />
  </>;
}

