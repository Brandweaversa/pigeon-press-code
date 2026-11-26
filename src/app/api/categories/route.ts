import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, slugify } from "@/lib/api-helpers";

/** GET /api/categories — public list with magazine counts. */
export async function GET() {
  const cats = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { magazines: { where: { status: "APPROVED" } } } } },
  });
  return ok(
    cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, sortOrder: c.sortOrder, magazines: c._count.magazines }))
  );
}

/** POST /api/categories — admin creates a category. */
export async function POST(req: NextRequest) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (name.length < 2) return bad("Please enter a category name.");
  const slug = slugify(name);
  const exists = await db.category.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (exists) return bad("That category already exists.", 409);
  const count = await db.category.count();
  const cat = await db.category.create({ data: { name, slug, sortOrder: count } });
  return ok({ id: cat.id, name: cat.name, slug: cat.slug }, 201);
}
