"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SettingsKey } from "@/lib/settingsClient";
import { useEffect } from "react";

/** Fetch design settings and mirror them onto <html> CSS vars so admin
 *  changes apply instantly without a rebuild. */
export function useLiveSettings() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Record<SettingsKey, string>>("/api/settings"),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const fontVar =
      settings.font_family === "poppins"
        ? "var(--font-poppins)"
        : settings.font_family === "merriweather"
          ? "var(--font-merriweather)"
          : settings.font_family === "system"
            ? "ui-sans-serif, system-ui"
            : "var(--font-inter)";
    const vars: Record<string, string> = {
      "--app-font": fontVar,
      "--primary": settings.primary_color || "#274540",
      "--ring": settings.primary_color || "#274540",
      "--splash-bg": settings.splash_bg_color || "#274540",
      "--bg-image": settings.background_image_id ? `url(/api/images/${settings.background_image_id})` : "none",
      "--bg-size": settings.background_size || "cover",
      "--bg-pos": settings.background_position || "center",
      "--bg-opacity": settings.background_opacity || "0.10",
      "--bg-parallax": settings.background_parallax === "on" ? "fixed" : "scroll",
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  }, [settings]);

  return settings;
}

export type DesignSettings = Partial<Record<SettingsKey, string>> & Record<SettingsKey, string>;
