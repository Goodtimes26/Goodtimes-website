import type { Metadata } from "next";
import "../bandportaal/portal.css";

export const metadata: Metadata = {
  title: "Bandinlog | GoodTimes",
  robots: { index: false, follow: false },
};

export default function BandLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
