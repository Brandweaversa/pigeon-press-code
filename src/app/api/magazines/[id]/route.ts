import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** GET /api/magazines/:id — brand info + editions + publisher details.
 *  Visible when the publisher is APPROVED; owners and admins always see their own. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mag = await db.magazine.findUnique({
    where: { id },
    include: {
      category: true,
      publisher: true,
    },
  });
  if (!mag) return bad("Magazine not found.", 404);

  const { user } = await auth();
  const isOwner = !!user && (user.role === "ADMIN" || user.id === mag.publisher.userId);
  if (mag.publisher.status !== "APPROVED" && !isOwner) return bad("Magazine not found.", 404);

  const editions = await db.edition.findMany({
    where: { magazineId: id },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });

  let favourited = false;
  if (user) {
    const f = await db.favourite.findUnique({
      where: { userId_magazineId: { userId: user.id, magazineId: id } },
    });
    favourited = !!f;
  }

  return ok({
    id: mag.id,
    name: mag.name,
    description: mag.description,
    logoImageId: mag.logoImageId,
    frequency: mag.frequency,
    featured: mag.featured,
    category: mag.category ? { id: mag.category.id, name: mag.category.name } : null,
    publisher: {
      id: mag.publisher.id,
      companyName: mag.publisher.companyName,
      logoImageId: mag.publisher.logoImageId,
      contactEmail: mag.publisher.contactEmail,
      about: mag.publisher.about,
    },
    editions: editions.map((e) => ({
      id: e.id,
      title: e.title,
      issueNumber: e.issueNumber,
      thumbnailImageId: e.thumbnailImageId,
      flipbookUrl: e.flipbookUrl,
      sortOrder: e.sortOrder,
      publishedAt: e.publishedAt,
    })),
    favourited,
    isOwner,
  });
}

/** PATCH /api/magazines/:id — owner or admin edits brand info. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  if (user!.role !== "ADMIN" && mag.publisher.userId !== user!.id)
    return bad("That magazine belongs to another publisher.", 403);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (n.length < 2) return bad("Please enter the magazine name.");
    data.name = n;
  }
  if (body.description !== undefined) data.description = String(body.description).trim() || null;
  if (body.logoImageId !== undefined && body.logoImageId) data.logoImageId = String(body.logoImageId);
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? String(body.categoryId) : null;
  if (body.frequency !== undefined) data.frequency = String(body.frequency).trim() || null;

  await db.magazine.update({ where: { id }, data });
  return ok({ updated: true });
}

/** DELETE /api/magazines/:id — owner or admin. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;
  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  if (user!.role !== "ADMIN" && mag.publisher.userId !== user!.id)
    return bad("That magazine belongs to another publisher.", 403);
  await db.magazine.delete({ where: { id } });
  return ok({ deleted: true });
}
