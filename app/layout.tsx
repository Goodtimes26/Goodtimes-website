import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { musicGroupJsonLd, pageSeo, siteUrl, websiteJsonLd } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "GoodTimes",
  title: pageSeo.home.title,
  description: pageSeo.home.description,
  formatDetection: { email: false, address: false, telephone: false },
  referrer: "strict-origin-when-cross-origin",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-48x48.png", type: "image/png", sizes: "48x48" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "GoodTimes Band", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#040610",
  colorScheme: "dark",
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

  return <html lang="nl">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Oxanium:wght@500;600;700;800&display=swap" rel="stylesheet" />
      <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=location.pathname.startsWith('/de/')||location.pathname==='/de'?'de':location.pathname.startsWith('/en/')||location.pathname==='/en'?'en':'nl';` }} />
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-Y9T36EJ1Z6" />
      <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;if(!/^\\/(bandinlog|bandportaal)(\\/|$)/.test(window.location.pathname)){gtag('js',new Date());gtag('config','G-Y9T36EJ1Z6');}` }} />
    </head>
    <body style={assetVariables}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(musicGroupJsonLd) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
    {children}
  </body></html>;
}

