import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, sniffImage } from "@/lib/api-helpers";

const MAX = 2 * 1024 * 1024; // 2 MB
const KINDS = ["cover", "edition", "logo", "background", "icon"];
const A4 = 210 / 297; // 0.7071

export async function POST(req: NextRequest) {
  const { res } = await auth(); // any signed-in user can upload for their own use
  if (res) return res;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "");
    if (!(file instanceof File)) return bad("No file received.");
    if (!KINDS.includes(kind)) return bad("Unknown image kind.");

    const mimeOk = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (!mimeOk) return bad("Only PNG, JPG or WebP images are allowed.");
    if (kind === "logo" && file.type !== "image/png")
      return bad("Logos must be transparent PNG files.");
    if (file.size > MAX) return bad("Image is larger than 2 MB.");

    const buf = new Uint8Array(await file.arrayBuffer());
    const info = sniffImage(buf);
    if (info.mime === "application/octet-stream") return bad("That file is not a valid image.");

    // magazine covers should be close to A4 ratio (210:297)
    let ratioWarning = false;
    if ((kind === "cover" || kind === "edition") && info.width && info.height) {
      const r = info.width / info.height;
      if (Math.abs(r - A4) > 0.09) ratioWarning = true;
    }

    const img = await db.image.create({
      data: {
        kind,
        mime: info.mime,
        size: buf.byteLength,
        width: info.width,
        height: info.height,
        data: buf,
      },
    });
    return ok({ id: img.id, url: `/api/images/${img.id}`, width: info.width, height: info.height, ratioWarning }, 201);
  } catch {
    return bad("Upload failed. Please try again.", 500);
  }
}
