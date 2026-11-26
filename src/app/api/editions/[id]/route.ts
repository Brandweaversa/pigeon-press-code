import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** Shared loader with visibility check. */
async function loadEdition(id: string) {
  const ed = await db.edition.findUnique({
    where: { id },
    include: {
      magazine: {
        include: {
          category: true,
          publisher: true,
        },
      },
    },
  });
  if (!ed) return { error: bad("Edition not found.", 404) };
  const { user } = await auth();
  const isOwner = !!user && (user.role === "ADMIN" || user.id === ed.magazine.publisher.userId);
  if (ed.magazine.publisher.status !== "APPROVED" && !isOwner) return { error: bad("Edition not found.", 404) };
  return { ed, user, isOwner };
}

/** GET /api/editions/:id — full edition detail + previous editions + publisher info. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadEdition(id);
  if ("error" in r) return r.error;
  const { ed, user, isOwner } = r;

  const siblings = await db.edition.findMany({
    where: { magazineId: ed.magazineId, id: { not: ed.id } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    select: {
      id: true,
      title: true,
      issueNumber: true,
      thumbnailImageId: true,
      sortOrder: true,
      publishedAt: true,
    },
  });

  let favourited = false;
  if (user) {
    const f = await db.favourite.findUnique({
      where: { userId_magazineId: { userId: user.id, magazineId: ed.magazineId } },
    });
    favourited = !!f;
  }

  return ok({
    id: ed.id,
    title: ed.title,
    issueNumber: ed.issueNumber,
    flipbookUrl: ed.flipbookUrl,
    thumbnailImageId: ed.thumbnailImageId,
    sortOrder: ed.sortOrder,
    publishedAt: ed.publishedAt,
    magazine: {
      id: ed.magazine.id,
      name: ed.magazine.name,
      logoImageId: ed.magazine.logoImageId,
      frequency: ed.magazine.frequency,
      category: ed.magazine.category ? { id: ed.magazine.category.id, name: ed.magazine.category.name } : null,
    },
    publisher: {
      id: ed.magazine.publisher.id,
      companyName: ed.magazine.publisher.companyName,
      logoImageId: ed.magazine.publisher.logoImageId,
      contactEmail: ed.magazine.publisher.contactEmail,
      about: ed.magazine.publisher.about,
    },
    previousEditions: siblings,
    favourited,
    isOwner,
  });
}

/** PATCH /api/editions/:id — owner or admin edits the edition. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const ed = await db.edition.findUnique({
    where: { id },
    include: { magazine: { include: { publisher: true } } },
  });
  if (!ed) return bad("Edition not found.", 404);
  if (user!.role !== "ADMIN" && ed.magazine.publisher.userId !== user!.id)
    return bad("That edition belongs to another publisher.", 403);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (t.length < 2) return bad("Please enter the edition title.");
    data.title = t;
  }
  if (body.issueNumber !== undefined) data.issueNumber = String(body.issueNumber).trim() || null;
  if (body.flipbookUrl !== undefined) {
    const u = String(body.flipbookUrl).trim();
    if (!/^https?:\/\/.+/i.test(u)) return bad("The flipbook URL must be a valid http(s) link.");
    data.flipbookUrl = u;
  }
  if (body.thumbnailImageId !== undefined && body.thumbnailImageId)
    data.thumbnailImageId = String(body.thumbnailImageId);

  await db.edition.update({ where: { id }, data });
  return ok({ updated: true });
}

/** DELETE /api/editions/:id — owner or admin. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;
  const ed = await db.edition.findUnique({
    where: { id },
    include: { magazine: { include: { publisher: true } } },
  });
  if (!ed) return bad("Edition not found.", 404);
  if (user!.role !== "ADMIN" && ed.magazine.publisher.userId !== user!.id)
    return bad("That edition belongs to another publisher.", 403);
  await db.edition.delete({ where: { id } });
  return ok({ deleted: true });
}
