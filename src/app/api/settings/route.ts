import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";
import { SETTING_KEYS, getSettings, type SettingsKey } from "@/lib/settings";

/** GET /api/settings — public design settings (merged with defaults). */
export async function GET() {
  return ok(await getSettings());
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const SIZES = ["small", "medium", "large"];
const POSITIONS = ["top", "center", "bottom", "left", "right"];
const BGSIZE = ["cover", "contain", "auto"];

/** PUT /api/settings — admin updates design settings. Body: partial settings map. */
export async function PUT(req: NextRequest) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;
  const body = (await req.json()) as Record<string, unknown>;

  const updates: [SettingsKey, string][] = [];
  for (const [k, v] of Object.entries(body)) {
    if (!SETTING_KEYS.includes(k as SettingsKey)) continue;
    const key = k as SettingsKey;
    const val = String(v ?? "");
    if (["primary_color", "splash_bg_color"].includes(key) && val && !HEX.test(val))
      return bad("Colors must be hex values like #274540.");
    if (val && (key.endsWith("_size") || key === "background_size") && key !== "background_image_id" && !BGSIZE.includes(val) && !SIZES.includes(val))
      return bad(`Invalid value for ${key}.`);
    if (val && (key === "background_position" || key.endsWith("_position")) && !POSITIONS.includes(val))
      return bad(`Invalid value for ${key}.`);
    if (key === "background_parallax" && val && !["on", "off"].includes(val)) return bad("Parallax must be on or off.");
    if (key === "font_family" && val && !["inter", "poppins", "merriweather", "system"].includes(val))
      return bad("Unknown font.");
    if (key === "background_opacity" && val && (isNaN(Number(val)) || Number(val) < 0 || Number(val) > 1))
      return bad("Opacity must be a number between 0 and 1.");
    updates.push([key, val]);
  }
  if (!updates.length) return bad("No valid settings provided.");

  for (const [key, value] of updates) {
    await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  return ok(await getSettings());
}
