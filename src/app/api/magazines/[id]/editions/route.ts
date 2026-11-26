import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** GET /api/magazines/:id/editions — editions in the publisher-defined display order. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  const { user } = await auth();
  const isOwner = !!user && (user.role === "ADMIN" || user.id === mag.publisher.userId);
  if (mag.publisher.status !== "APPROVED" && !isOwner) return bad("Magazine not found.", 404);

  const editions = await db.edition.findMany({
    where: { magazineId: id },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
  });
  return ok(
    editions.map((e) => ({
      id: e.id,
      title: e.title,
      issueNumber: e.issueNumber,
      thumbnailImageId: e.thumbnailImageId,
      flipbookUrl: e.flipbookUrl,
      sortOrder: e.sortOrder,
      publishedAt: e.publishedAt,
    }))
  );
}

/** POST /api/magazines/:id/editions — publish a new edition (approved publishers only).
 *  The edition goes live immediately and favouriting readers are notified. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  const isOwner = user!.role === "ADMIN" || mag.publisher.userId === user!.id;
  if (!isOwner) return bad("That magazine belongs to another publisher.", 403);
  if (mag.publisher.status !== "APPROVED")
    return bad("Your publisher account must be approved before publishing editions.", 403);

  const body = await req.json();
  const title = String(body.title || "").trim();
  const flipbookUrl = String(body.flipbookUrl || "").trim();
  const thumbnailImageId = String(body.thumbnailImageId || "");
  if (title.length < 2) return bad("Please enter the edition title.");
  if (!flipbookUrl) return bad("Please enter the flipbook URL.");
  if (!/^https?:\/\/.+/i.test(flipbookUrl)) return bad("The flipbook URL must be a valid http(s) link.");
  if (!thumbnailImageId) return bad("Please upload an edition thumbnail.");

  const last = await db.edition.findFirst({
    where: { magazineId: id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const ed = await db.edition.create({
    data: {
      magazineId: id,
      title,
      issueNumber: String(body.issueNumber || "").trim() || null,
      flipbookUrl,
      thumbnailImageId,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  // notify readers who favourite-followed this magazine
  const favs = await db.favourite.findMany({ where: { magazineId: id, notify: true }, select: { userId: true } });
  if (favs.length) {
    await db.notification.createMany({
      data: favs.map((f) => ({
        userId: f.userId,
        title: `New edition: ${mag.name}`,
        body: `${ed.title}${ed.issueNumber ? ` (${ed.issueNumber})` : ""} is ready to read.`,
      })),
    });
  }

  // Notify every admin so the platform side can follow what goes live. The
  // edition is already created, so a notification failure must not fail it.
  try {
    const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
    if (admins.length) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: `Edition live: ${mag.name}`,
          body: `${ed.title}${ed.issueNumber ? ` (${ed.issueNumber})` : ""} was published by ${mag.publisher.companyName} and is now visible to readers.`,
        })),
      });
    }
  } catch {
    // non-critical
  }

  return ok({ id: ed.id }, 201);
}

/** PATCH /api/magazines/:id/editions — reorder editions. Body: { order: [editionId, ...] } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  if (user!.role !== "ADMIN" && mag.publisher.userId !== user!.id)
    return bad("That magazine belongs to another publisher.", 403);

  const body = await req.json();
  const order: unknown = body.order;
  if (!Array.isArray(order) || order.some((x) => typeof x !== "string"))
    return bad("Please provide the edition order as a list of ids.");

  const owned = await db.edition.findMany({
    where: { magazineId: id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((e) => e.id));
  if (order.length !== owned.length || (order as string[]).some((x) => !ownedIds.has(x)))
    return bad("The order must contain every edition of this magazine exactly once.");

  await db.$transaction(
    (order as string[]).map((editionId, i) =>
      db.edition.update({ where: { id: editionId }, data: { sortOrder: i + 1 } })
    )
  );
  return ok({ reordered: true });
}
