import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, isHttpUrl } from "@/lib/api-helpers";

/** GET /api/magazines/:id — detail (public sees APPROVED only, owner sees all). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mag = await db.magazine.findUnique({
    where: { id },
    include: {
      category: true,
      publisher: { include: { user: { select: { email: true } } } },
    },
  });
  if (!mag) return bad("Magazine not found.", 404);

  const { user } = await auth();
  const isOwner = !!user && (user.role === "ADMIN" || user.id === mag.publisher.userId);
  if (mag.status !== "APPROVED" && !isOwner) return bad("Magazine not found.", 404);

  const editions = await db.edition.findMany({
    where: { magazineId: id, ...(isOwner ? {} : { status: "APPROVED" }) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
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
    title: mag.title,
    description: mag.description,
    status: mag.status,
    featured: mag.featured,
    rejectionReason: isOwner ? mag.rejectionReason : undefined,
    coverImageId: mag.coverImageId,
    flipbookUrl: mag.flipbookUrl,
    language: mag.language,
    frequency: mag.frequency,
    website: mag.website,
    category: mag.category ? { id: mag.category.id, name: mag.category.name } : null,
    publisher: { id: mag.publisher.id, companyName: mag.publisher.companyName, logoImageId: mag.publisher.logoImageId },
    editions: editions.map((e) => ({
      id: e.id, title: e.title, issueNumber: e.issueNumber, description: e.description,
      flipbookUrl: e.flipbookUrl, status: e.status, publishedAt: e.publishedAt,
      rejectionReason: isOwner ? e.rejectionReason : undefined,
    })),
    favourited,
    isOwner,
  });
}

/** PATCH /api/magazines/:id — owner edit; action:"submit" sends for approval. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  if (user!.role !== "ADMIN" && mag.publisher.userId !== user!.id)
    return bad("That magazine belongs to another publisher.", 403);

  const body = await req.json();

  if (body.action === "submit") {
    if (mag.status === "APPROVED") return bad("This magazine is already approved.");
    await db.magazine.update({ where: { id }, data: { status: "PENDING", rejectionReason: null } });
    return ok({ status: "PENDING" });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const t = String(body.title).trim();
    if (t.length < 2) return bad("Please enter the magazine title.");
    data.title = t;
  }
  if (body.description !== undefined) data.description = String(body.description).trim() || null;
  if (body.flipbookUrl !== undefined) {
    const u = String(body.flipbookUrl).trim();
    if (!isHttpUrl(u)) return bad("The flipbook URL must be a valid http(s) link.");
    data.flipbookUrl = u;
  }
  if (body.coverImageId !== undefined && body.coverImageId) data.coverImageId = String(body.coverImageId);
  if (body.categoryId !== undefined) data.categoryId = body.categoryId ? String(body.categoryId) : null;
  if (body.language !== undefined) data.language = String(body.language);
  if (body.frequency !== undefined) data.frequency = String(body.frequency).trim() || null;
  if (body.website !== undefined) data.website = String(body.website).trim() || null;

  // any content edit re-enters moderation unless it is still a draft
  const nextStatus = mag.status === "DRAFT" ? "DRAFT" : "PENDING";
  data.status = nextStatus;
  if (nextStatus === "PENDING") data.rejectionReason = null;

  await db.magazine.update({ where: { id }, data });
  return ok({ status: nextStatus });
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
