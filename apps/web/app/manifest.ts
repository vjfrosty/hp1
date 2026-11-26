import type { MetadataRoute } from "next";

// Moved unchanged from the Vite PWA config (apps/legacy-vite/vite.config.ts).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "АЙДЕ ПО ЕДНА! — Мъжки сбирки и компания",
    short_name: "Айде по една",
    description:
      "Социална платформа за организиране на мъжки сбирки, мезе и приятелска компания в България.",
    theme_color: "#1C4532",
    background_color: "#F7F3EC",
    display: "standalone",
    start_url: "/",
    scope: "/",
    lang: "bg",
    icons: [
      { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
