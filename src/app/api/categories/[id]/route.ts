import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** PATCH /api/categories/:id — rename (admin). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;
  const { id } = await params;
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (name.length < 2) return bad("Please enter a category name.");
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const clash = await db.category.findFirst({ where: { OR: [{ name }, { slug }], NOT: { id } } });
  if (clash) return bad("That category already exists.", 409);
  await db.category.update({ where: { id }, data: { name, slug } });
  return ok({ id, name });
}

/** DELETE /api/categories/:id — admin. Magazines keep existing (category set to null). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;
  const { id } = await params;
  try {
    await db.category.delete({ where: { id } });
  } catch {
    return bad("Could not delete that category.", 400);
  }
  return ok({ deleted: true });
}
