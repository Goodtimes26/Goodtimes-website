import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL("https://goodtimesband.nl"),
  title: { default: "GoodTimes | Dé Nederlandse 80’s Coverband", template: "%s | GoodTimes" },
  description: "GoodTimes brengt de grootste 80’s hits live naar festivals, feesten, bedrijfsevents en poppodia.",
  openGraph: { title: "GoodTimes — The 80’s Live", description: "De soundtrack van jouw beste avond.", images: ["/og.png"], locale: "nl_NL", type: "website" },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const assetVariables = {
    "--hero-image": `url('${basePath}/goodtimes-group-hero-final.png')`,
    "--supporting-image": `url('${basePath}/goodtimes-hero.png')`,
    "--member-1": `url('${basePath}/members/esther-zang.png')`,
    "--member-2": `url('${basePath}/members/cindy-zang.png')`,
    "--member-3": `url('${basePath}/members/luuk-toetsen.jpg')`,
    "--member-4": `url('${basePath}/members/joost-gitaar.jpg')`,
    "--member-5": `url('${basePath}/members/eddie-basgitaar.png')`,
    "--member-6": `url('${basePath}/members/eric-drums.jpg')`,
  } as CSSProperties;

  return <html lang="nl"><body style={assetVariables}>{children}</body></html>;
}
