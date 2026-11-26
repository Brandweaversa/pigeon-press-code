import { db } from "@/lib/db";

export {
  SETTING_KEYS,
  DEFAULT_SETTINGS,
  type SettingsKey,
} from "@/lib/settingsClient";

import { DEFAULT_SETTINGS, SETTING_KEYS, type SettingsKey } from "@/lib/settingsClient";

export async function getSettings(): Promise<Record<SettingsKey, string>> {
  const rows = await db.setting.findMany();
  const merged = { ...DEFAULT_SETTINGS } as Record<string, string>;
  for (const r of rows) {
    if (SETTING_KEYS.includes(r.key as SettingsKey)) merged[r.key] = r.value;
  }
  return merged as Record<SettingsKey, string>;
}
