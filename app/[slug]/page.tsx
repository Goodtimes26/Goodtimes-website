import { notFound } from "next/navigation";
import { GoodTimesSite, type PageKey } from "../site";

const pages: PageKey[] = ["over-de-band", "repertoire", "agenda", "fotos-videos", "contact"];

export function generateStaticParams() {
  return pages.map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!pages.includes(slug as PageKey)) notFound();
  return <GoodTimesSite page={slug as PageKey} />;
}
