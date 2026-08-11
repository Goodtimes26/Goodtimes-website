import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GoodTimes Band",
    short_name: "GT Band",
    description: "De beveiligde werkomgeving voor de muzikanten van GoodTimes.",
    id: "/bandinlog/",
    start_url: "/bandinlog/",
    scope: "/",
    display: "standalone",
    background_color: "#040610",
    theme_color: "#040610",
    lang: "nl",
    categories: ["music", "productivity"],
    icons: [
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
