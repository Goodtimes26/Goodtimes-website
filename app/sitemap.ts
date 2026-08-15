import type { MetadataRoute } from "next";
import { pageSeo, siteUrl } from "./seo";
import { languageAlternates, localizedPath, locales } from "./i18n";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = [
    pageSeo.home,
    pageSeo["over-de-band"],
    pageSeo.repertoire,
    pageSeo.media,
    pageSeo.agenda,
    pageSeo["techniek-productie"],
    pageSeo.contact,
    pageSeo["80s-coverband-boeken"],
    pageSeo["coverband-brabant"],
    pageSeo["coverband-bedrijfsfeest"],
  ];
  return locales.flatMap((locale) => publicPages.map((page) => ({
      url: `${siteUrl}${localizedPath(locale, page.path)}`,
      lastModified: new Date("2026-08-15"),
      changeFrequency: ["/", "/agenda/", "/repertoire/"].includes(page.path) ? "weekly" as const : "monthly" as const,
      priority: page.path === "/" ? 1 : page.path === "/contact/" ? 0.9 : 0.8,
      alternates: { languages: languageAlternates(page.path) },
    })));
}

