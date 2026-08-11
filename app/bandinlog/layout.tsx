import type { Metadata } from "next";
import "../bandportaal/portal.css";
import { PwaRegistration } from "../bandportaal/PwaRegistration";

export const metadata: Metadata = {
  title: "Bandinlog | GoodTimes",
  robots: { index: false, follow: false },
  manifest: "/band-app.webmanifest",
  appleWebApp: { capable: true, title: "GoodTimes Band", statusBarStyle: "black-translucent" },
};

export default function BandLoginLayout({ children }: { children: React.ReactNode }) {
  return <><PwaRegistration />{children}</>;
}
