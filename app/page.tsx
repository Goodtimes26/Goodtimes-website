import type { Metadata } from "next";
import { GoodTimesSite } from "./site";
import { createMetadata, createWebPageJsonLd, pageSeo } from "./seo";

export const metadata: Metadata = createMetadata(pageSeo.home);

export default function Home() {
  const webPageJsonLd = createWebPageJsonLd(pageSeo.home);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
    <GoodTimesSite page="home" />
  </>;
}

