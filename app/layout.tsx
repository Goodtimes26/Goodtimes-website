import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://goodtimesband.nl"),
  title: { default: "GoodTimes | Dé Nederlandse 80’s Coverband", template: "%s | GoodTimes" },
  description: "GoodTimes brengt de grootste 80’s hits live naar festivals, feesten, bedrijfsevents en poppodia.",
  openGraph: { title: "GoodTimes — The 80’s Live", description: "De soundtrack van jouw beste avond.", images: ["/og.png"], locale: "nl_NL", type: "website" },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="nl"><body>{children}</body></html>;
}
