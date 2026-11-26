import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, bad } from "@/lib/api-helpers";

/** GET /api/pages/:slug — Terms / Privacy content. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!["terms", "privacy"].includes(slug)) return bad("Page not found.", 404);
  const page = await db.page.findUnique({ where: { slug } });
  if (!page) return bad("Page not found.", 404);
  return ok({ slug: page.slug, title: page.title, content: page.content, updatedAt: page.updatedAt });
}
