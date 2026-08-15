import type { Metadata } from "next";
import { germanLocalizedPages, LocalizedPage, localizedPageMetadata } from "../../localized-route";
export function generateStaticParams() { return germanLocalizedPages.map((slug) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { return localizedPageMetadata("de", (await params).slug); }
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <LocalizedPage locale="de" slug={(await params).slug} />; }
