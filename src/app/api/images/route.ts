import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, sniffImage, canUploadKind } from "@/lib/api-helpers";

const MAX = 2 * 1024 * 1024; // 2 MB

/** Kinds that must be transparent PNG logos. */
const LOGO_KINDS = ["magazine-logo", "company-logo", "brand-logo", "icon"];

export async function POST(req: NextRequest) {
  const { user, res } = await auth();
  if (res) return res;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") || "");
    if (!(file instanceof File)) return bad("No file received.");
    if (!["magazine-logo", "edition", "company-logo", "brand-logo", "background", "icon"].includes(kind))
      return bad("Unknown image kind.");
    if (!user || !canUploadKind(user.role, kind))
      return bad("You do not have permission to upload that kind of image.", 403);

    const mimeOk = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
    if (!mimeOk) return bad("Only PNG, JPG or WebP images are allowed.");
    if (LOGO_KINDS.includes(kind) && file.type !== "image/png")
      return bad("Logos and icons must be PNG files.");
    if (file.size > MAX) return bad("Image is larger than 2 MB.");

    const buf = new Uint8Array(await file.arrayBuffer());
    const info = sniffImage(buf);
    if (info.mime === "application/octet-stream") return bad("That file is not a valid image.");

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
    return ok({ id: img.id, url: `/api/images/${img.id}`, width: info.width, height: info.height }, 201);
  } catch {
    return bad("Upload failed. Please try again.", 500);
  }
}
