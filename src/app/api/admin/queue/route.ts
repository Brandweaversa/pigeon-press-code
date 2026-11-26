import { db } from "@/lib/db";
import { auth, ok } from "@/lib/api-helpers";

/** GET /api/admin/queue — publishers awaiting approval + platform counts.
 *  Magazines and editions publish instantly for approved publishers, so there is
 *  no per-item content queue. */
export async function GET() {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;

  const [pendingPublishers, counts] = await Promise.all([
    db.publisher.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { email: true, createdAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
    Promise.all([
      db.publisher.count(),
      db.magazine.count(),
      db.edition.count(),
      db.user.count({ where: { role: "READER" } }),
      db.user.count(),
    ]),
  ]);

  return ok({
    publishers: pendingPublishers.map((p) => ({
      id: p.id,
      companyName: p.companyName,
      contactEmail: p.contactEmail,
      about: p.about,
      logoImageId: p.logoImageId,
      email: p.user.email,
      createdAt: p.createdAt,
    })),
    stats: {
      publishers: counts[0],
      magazines: counts[1],
      editions: counts[2],
      readers: counts[3],
      users: counts[4],
    },
  });
}
