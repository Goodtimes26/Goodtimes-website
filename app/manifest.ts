import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoodTimes – Dé 80's Coverband",
    short_name: "GoodTimes",
    description: "Professionele live jaren 80-coverband en feestband voor Brabant en heel Nederland.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#040610",
    theme_color: "#040610",
    lang: "nl",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
