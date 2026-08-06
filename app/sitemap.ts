import type { MetadataRoute } from "next";
import { pageSeo, siteUrl } from "./seo";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    pageSeo.home,
    pageSeo["over-de-band"],
    pageSeo.repertoire,
    pageSeo.media,
    pageSeo.agenda,
    pageSeo["techniek-productie"],
    pageSeo.contact,
  ].map((page) => ({
    url: `${siteUrl}${page.path}`,
    lastModified: new Date("2026-08-06"),
    changeFrequency: ["/", "/agenda/", "/repertoire/"].includes(page.path) ? "weekly" : "monthly",
    priority: page.path === "/" ? 1 : page.path === "/contact/" ? 0.9 : 0.8,
  }));
}

