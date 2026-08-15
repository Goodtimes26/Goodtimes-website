import type { Metadata } from "next";
import { LocalizedHome, localizedHomeMetadata } from "../localized-route";
export const metadata: Metadata = localizedHomeMetadata("en");
export default function Page() { return <LocalizedHome locale="en" />; }
