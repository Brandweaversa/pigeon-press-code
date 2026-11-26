import { db } from "@/lib/db";

export const SETTING_KEYS = [
  "app_name",
  "primary_color",
  "font_family",
  "splash_bg_color",
  "splash_logo_id",
  "splash_logo_size",
  "splash_logo_position",
  "header_logo_id",
  "header_logo_size",
  "header_logo_position",
  "background_image_id",
  "background_position",
  "background_size",
  "background_parallax",
  "background_opacity",
  "app_icon_id",
] as const;

export type SettingsKey = (typeof SETTING_KEYS)[number];

export const DEFAULT_SETTINGS: Record<SettingsKey, string> = {
  app_name: "Pigeon Press",
  primary_color: "#274540",
  font_family: "inter",
  splash_bg_color: "#274540",
  splash_logo_id: "",
  splash_logo_size: "medium",
  splash_logo_position: "center",
  header_logo_id: "",
  header_logo_size: "medium",
  header_logo_position: "left",
  background_image_id: "",
  background_position: "center",
  background_size: "cover",
  background_parallax: "off",
  background_opacity: "0.10",
  app_icon_id: "",
};

export async function getSettings(): Promise<Record<SettingsKey, string>> {
  const rows = await db.setting.findMany();
  const merged = { ...DEFAULT_SETTINGS } as Record<string, string>;
  for (const r of rows) {
    if (r.key in merged && SETTING_KEYS.includes(r.key as SettingsKey)) merged[r.key] = r.value;
  }
  return merged as Record<SettingsKey, string>;
}
