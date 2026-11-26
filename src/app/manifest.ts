import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // The manifest may be rendered during a build with no database reachable
  // (e.g. Vercel prerender) — fall back to defaults instead of failing.
  let settings: { key: string; value: string }[] = [];
  try {
    settings = await db.setting.findMany();
  } catch {
    settings = [];
  }
  const get = (k: string, d: string) => settings.find((s) => s.key === k)?.value || d;
  const name = get("app_name", "Pigeon Press");
  const icon = get("app_icon_id", "");
  const icons: MetadataRoute.Manifest["icons"] = icon
    ? [
        { src: `/api/images/${icon}`, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: `/api/images/${icon}`, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: `/api/images/${icon}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];
  return {
    name,
    short_name: name,
    description: "Discover, favourite and read magazines from independent publishers.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: get("splash_bg_color", "#274540"),
    theme_color: get("primary_color", "#274540"),
    icons,
  };
}