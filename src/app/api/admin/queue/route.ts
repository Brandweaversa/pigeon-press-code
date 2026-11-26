import { db } from "@/lib/db";
import { auth, ok } from "@/lib/api-helpers";

/** GET /api/admin/queue — everything awaiting review + platform counts. */
export async function GET() {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;

  const [pendingPublishers, pendingMagazines, pendingEditions, counts] = await Promise.all([
    db.publisher.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.magazine.findMany({
      where: { status: "PENDING" },
      include: {
        publisher: { select: { companyName: true } },
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: "asc" },
    }),
    db.edition.findMany({
      where: { status: "PENDING" },
      include: { magazine: { select: { title: true, publisher: { select: { companyName: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    Promise.all([
      db.publisher.count(),
      db.magazine.count(),
      db.edition.count({ where: { status: "APPROVED" } }),
      db.user.count({ where: { role: "READER" } }),
      db.user.count(),
    ]),
  ]);

  return ok({
    publishers: pendingPublishers.map((p) => ({
      id: p.id, companyName: p.companyName, contactEmail: p.contactEmail,
      about: p.about, logoImageId: p.logoImageId, email: p.user.email, createdAt: p.createdAt,
    })),
    magazines: pendingMagazines.map((m) => ({
      id: m.id, title: m.title, description: m.description, coverImageId: m.coverImageId,
      flipbookUrl: m.flipbookUrl, frequency: m.frequency,
      publisher: m.publisher.companyName, category: m.category?.name || null, updatedAt: m.updatedAt,
    })),
    editions: pendingEditions.map((e) => ({
      id: e.id, title: e.title, issueNumber: e.issueNumber, flipbookUrl: e.flipbookUrl,
      magazineTitle: e.magazine.title, publisher: e.magazine.publisher.companyName, createdAt: e.createdAt,
    })),
    stats: {
      publishers: counts[0],
      magazines: counts[1],
      approvedEditions: counts[2],
      readers: counts[3],
      users: counts[4],
    },
  });
}
