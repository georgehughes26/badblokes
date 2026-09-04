import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bad Blokes Acca",
    short_name: "Bad Blokes Acca",
    description: "Weekly football picks, points & fines tracker for the lads.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#5b3fe6",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
