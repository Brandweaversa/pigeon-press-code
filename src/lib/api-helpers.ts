import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, type SessionUser } from "@/lib/auth";

export function ok<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data as object, typeof init === "number" ? { status: init } : init);
}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Returns { user } on success or { res } with a 401/403 response. */
export async function auth(roles?: string[]): Promise<{ user: SessionUser | null; res: NextResponse | null }> {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return { user: null, res: bad("Please sign in.", 401) };
  if (roles && !roles.includes(user.role)) return { user: null, res: bad("You do not have permission for that.", 403) };
  return { user, res: null };
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `c-${Date.now()}`;
}

export function isHttpUrl(u: string) {
  return /^https?:\/\/.+\..+/i.test(u);
}

/* ---------------- image uploads ---------------- */

export const UPLOAD_KINDS = ["magazine-logo", "edition", "company-logo", "brand-logo", "background", "icon"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Which roles may upload which kind of image. Design assets are admin-only. */
export function canUploadKind(role: string, kind: string): boolean {
  if (kind === "background" || kind === "icon" || kind === "brand-logo") return role === "ADMIN";
  return role === "PUBLISHER" || role === "ADMIN"; // magazine-logo, edition, company-logo
}

export type ImgInfo = { mime: string; width: number | null; height: number | null };

/** Sniff mime + pixel dimensions from the first bytes of an upload. */
export function sniffImage(buf: Uint8Array): ImgInfo {
  // PNG: IHDR width/height at bytes 16..24
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50) {
    const w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
    const h = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
    return { mime: "image/png", width: w, height: h };
  }
  // JPEG: scan markers for SOF0..SOF3
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = (buf[i + 2] << 8) | buf[i + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        const h = (buf[i + 5] << 8) | buf[i + 6];
        const w = (buf[i + 7] << 8) | buf[i + 8];
        return { mime: "image/jpeg", width: w, height: h };
      }
      i += 2 + len;
    }
    return { mime: "image/jpeg", width: null, height: null };
  }
  // WebP
  if (buf.length > 30 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    // VP8X extended header
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x58) {
      const w = 1 + ((buf[24] | (buf[25] << 8) | (buf[26] << 16)) & 0xffffff);
      const h = 1 + ((buf[27] | (buf[28] << 8) | (buf[29] << 16)) & 0xffffff);
      return { mime: "image/webp", width: w, height: h };
    }
    return { mime: "image/webp", width: null, height: null };
  }
  return { mime: "application/octet-stream", width: null, height: null };
}
