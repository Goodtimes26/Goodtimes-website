import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { musicGroupJsonLd, pageSeo, siteUrl } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageSeo.home.title,
  description: pageSeo.home.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assetVariables = {
    "--supporting-image": "url('/goodtimes-hero.png')",
    "--member-1": "url('/members/esther-zang.jpeg')",
    "--member-2": "url('/members/cindy-zang.jpeg')",
    "--member-3": "url('/members/luuk-toetsen.jpg')",
    "--member-4": "url('/members/joost-gitaar.jpg')",
    "--member-5": "url('/members/eddie-basgitaar.png')",
    "--member-6": "url('/members/eric-drums.jpg')",
  } as CSSProperties;

  return <html lang="nl"><body style={assetVariables}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(musicGroupJsonLd) }} />
    {children}
  </body></html>;
}

