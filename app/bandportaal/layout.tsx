import type { Metadata } from "next";
import "./portal.css";
import { PwaRegistration } from "./PwaRegistration";

export const metadata: Metadata = {
  title: "Bandportaal | GoodTimes",
  robots: { index: false, follow: false },
  manifest: "/band-app.webmanifest",
  appleWebApp: { capable: true, title: "GoodTimes Band", statusBarStyle: "black-translucent" },
};

export default function BandPortalLayout({ children }: { children: React.ReactNode }) {
  return <><PwaRegistration />{children}</>;
}
