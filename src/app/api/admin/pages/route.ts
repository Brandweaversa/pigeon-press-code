import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

const SLUGS = ["terms", "privacy"];

/** PUT /api/admin/pages — edit Terms & Conditions / Privacy Policy. */
export async function PUT(req: NextRequest) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;
  const body = await req.json();
  const slug = String(body.slug || "");
  if (!SLUGS.includes(slug)) return bad("Unknown page.");
  const title = String(body.title || "").trim();
  const content = String(body.content || "");
  if (title.length < 3) return bad("Please enter the page title.");
  if (content.trim().length < 20) return bad("The page content is too short.");
  await db.page.upsert({
    where: { slug },
    update: { title, content },
    create: { slug, title, content },
  });
  return ok({ slug, updatedAt: new Date() });
}
