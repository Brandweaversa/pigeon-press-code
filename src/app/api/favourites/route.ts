import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** GET /api/favourites — the reader's saved magazines. */
export async function GET() {
  const { user, res } = await auth();
  if (res) return res;
  const favs = await db.favourite.findMany({
    where: { userId: user!.id },
    include: {
      magazine: {
        include: {
          category: true,
          publisher: { select: { companyName: true } },
          editions: { orderBy: { publishedAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return ok(
    favs.map((f) => ({
        id: f.id,
        notify: f.notify,
        createdAt: f.createdAt,
        magazine: {
          id: f.magazine.id,
          name: f.magazine.name,
          description: f.magazine.description,
          logoImageId: f.magazine.logoImageId,
          category: f.magazine.category ? { id: f.magazine.category.id, name: f.magazine.category.name } : null,
          publisher: f.magazine.publisher,
          latestEdition: f.magazine.editions[0]
            ? {
                id: f.magazine.editions[0].id,
                title: f.magazine.editions[0].title,
                publishedAt: f.magazine.editions[0].publishedAt,
              }
            : null,
        },
      }))
  );
}

/** POST /api/favourites — toggle a favourite. Body: { magazineId, notify? } */
export async function POST(req: NextRequest) {
  const { user, res } = await auth();
  if (res) return res;
  const body = await req.json();
  const magazineId = String(body.magazineId || "");
  const mag = await db.magazine.findUnique({
    where: { id: magazineId },
    include: { publisher: { select: { status: true } } },
  });
  if (!mag || mag.publisher.status !== "APPROVED") return bad("Magazine not found.", 404);

  const existing = await db.favourite.findUnique({
    where: { userId_magazineId: { userId: user!.id, magazineId } },
  });
  if (existing) {
    await db.favourite.delete({ where: { id: existing.id } });
    return ok({ favourited: false });
  }
  await db.favourite.create({
    data: { userId: user!.id, magazineId, notify: body.notify !== false },
  });
  return ok({ favourited: true });
}

/** PATCH /api/favourites — toggle notifications for one favourite. Body: { magazineId, notify } */
export async function PATCH(req: NextRequest) {
  const { user, res } = await auth();
  if (res) return res;
  const body = await req.json();
  const magazineId = String(body.magazineId || "");
  const existing = await db.favourite.findUnique({
    where: { userId_magazineId: { userId: user!.id, magazineId } },
  });
  if (!existing) return bad("You have not saved that magazine.", 404);
  await db.favourite.update({ where: { id: existing.id }, data: { notify: !!body.notify } });
  return ok({ notify: !!body.notify });
}
