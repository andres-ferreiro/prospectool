import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lead Finder",
    short_name: "Lead Finder",
    description: "Encuentra clientes potenciales cerca de ti",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a84ff",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
