import type { Metadata } from "next";
import { InstallGuide } from "./InstallGuide";

export const metadata: Metadata = {
  title: "GoodTimes Band-app installeren",
  description: "Installeer de beveiligde GoodTimes Band-app op je iPhone of Android-telefoon.",
  robots: { index: false, follow: false },
};

export default function InstallPage() {
  return <InstallGuide />;
}
