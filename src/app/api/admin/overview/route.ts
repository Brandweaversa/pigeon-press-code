import { db } from "@/lib/db";
import { auth, ok } from "@/lib/api-helpers";

/** GET /api/admin/overview — everything on the platform in one call, for the
 *  admin console's in-depth tabs: all publishers, all magazines, all editions,
 *  all registered readers and every account (with per-item actions in the UI). */
export async function GET() {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;

  const [publishers, magazines, editions, readers, accounts] = await Promise.all([
    db.publisher.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { magazines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.magazine.findMany({
      include: {
        publisher: { select: { companyName: true, status: true } },
        _count: { select: { editions: true, favourites: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.edition.findMany({
      include: {
        magazine: {
          select: { id: true, name: true, publisher: { select: { companyName: true, status: true } } },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 500,
    }),
    db.user.findMany({
      where: { role: "READER" },
      select: { id: true, name: true, email: true, createdAt: true, _count: { select: { favourites: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        publisher: { select: { companyName: true, status: true } },
        _count: { select: { favourites: true, notifications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return ok({
    publishers: publishers.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      contactEmail: p.contactEmail,
      about: p.about,
      logoImageId: p.logoImageId,
      status: p.status,
      rejectionReason: p.rejectionReason,
      email: p.user.email,
      magazines: p._count.magazines,
      createdAt: p.createdAt,
    })),
    magazines: magazines.map((m) => ({
      id: m.id,
      name: m.name,
      logoImageId: m.logoImageId,
      featured: m.featured,
      frequency: m.frequency,
      publisher: m.publisher,
      editionsCount: m._count.editions,
      readers: m._count.favourites,
      createdAt: m.createdAt,
    })),
    editions: editions.map((e) => ({
      id: e.id,
      title: e.title,
      issueNumber: e.issueNumber,
      thumbnailImageId: e.thumbnailImageId,
      flipbookUrl: e.flipbookUrl,
      publishedAt: e.publishedAt,
      magazine: { id: e.magazine.id, name: e.magazine.name },
      publisher: e.magazine.publisher,
    })),
    readers: readers.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      favourites: r._count.favourites,
      createdAt: r.createdAt,
    })),
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      companyName: a.publisher?.companyName ?? null,
      favourites: a._count.favourites,
      notifications: a._count.notifications,
      createdAt: a.createdAt,
    })),
  });
}
