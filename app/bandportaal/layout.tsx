import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: "Bandportaal | GoodTimes",
  robots: { index: false, follow: false },
};

export default function BandPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
