import type { Metadata } from "next";
import { LocalizedPage, localizedPageMetadata, localizedPages } from "../../localized-route";
export function generateStaticParams() { return localizedPages.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { return localizedPageMetadata("en", (await params).slug); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <LocalizedPage locale="en" slug={(await params).slug} />; }
