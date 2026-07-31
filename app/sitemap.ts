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
    changeFrequency: page.path === "/" ? "monthly" : "weekly",
    priority: page.path === "/" ? 1 : 0.8,
  }));
}

