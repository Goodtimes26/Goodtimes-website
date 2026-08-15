import type { Metadata } from "next";
import { LocalizedHome, localizedHomeMetadata } from "../localized-route";
export const metadata: Metadata = localizedHomeMetadata("de");
export default function Page() { return <LocalizedHome locale="de" />; }
