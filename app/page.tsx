import type { Metadata } from "next";
import { GoodTimesSite } from "./site";
import { createMetadata, pageSeo } from "./seo";

export const metadata: Metadata = createMetadata(pageSeo.home);

export default function Home() {
  return <GoodTimesSite page="home" />;
}

