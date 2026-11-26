import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok } from "@/lib/api-helpers";

/** GET /api/notifications — the user's notifications + unread count. */
export async function GET() {
  const { user, res } = await auth();
  if (res) return res;
  const list = await db.notification.findMany({
    where: { userId: user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await db.notification.count({ where: { userId: user!.id, read: false } });
  return ok({
    unread,
    items: list.map((n) => ({ id: n.id, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt })),
  });
}

/** POST /api/notifications — mark read. Body: { ids?: string[], all?: boolean } */
export async function POST(req: NextRequest) {
  const { user, res } = await auth();
  if (res) return res;
  const body = await req.json();
  if (body.all) {
    await db.notification.updateMany({ where: { userId: user!.id, read: false }, data: { read: true } });
  } else if (Array.isArray(body.ids) && body.ids.length) {
    await db.notification.updateMany({
      where: { userId: user!.id, id: { in: body.ids.map(String) } },
      data: { read: true },
    });
  }
  const unread = await db.notification.count({ where: { userId: user!.id, read: false } });
  return ok({ unread });
}
