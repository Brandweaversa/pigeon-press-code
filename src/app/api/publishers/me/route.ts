import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** GET /api/publishers/me — the signed-in publisher's company + magazines. */
export async function GET() {
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;
  const pub = await db.publisher.findUnique({
    where: { userId: user!.id },
    include: {
      magazines: {
        include: { category: true, _count: { select: { editions: true, favourites: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  return ok(
    pub
      ? {
          id: pub.id,
          companyName: pub.companyName,
          contactEmail: pub.contactEmail,
          about: pub.about,
          logoImageId: pub.logoImageId,
          status: pub.status,
          rejectionReason: pub.rejectionReason,
          createdAt: pub.createdAt,
          magazines: pub.magazines.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            status: m.status,
            featured: m.featured,
            rejectionReason: m.rejectionReason,
            coverImageId: m.coverImageId,
            flipbookUrl: m.flipbookUrl,
            frequency: m.frequency,
            category: m.category ? { id: m.category.id, name: m.category.name } : null,
            editionsCount: m._count.editions,
            readers: m._count.favourites,
          })),
        }
      : null
  );
}

/** PATCH /api/publishers/me — update company profile (only while pending, or info edits). */
export async function PATCH(req: NextRequest) {
  const { user, res } = await auth(["PUBLISHER"]);
  if (res) return res;
  const pub = await db.publisher.findUnique({ where: { userId: user!.id } });
  if (!pub) return bad("No publisher profile found.", 404);

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.companyName !== undefined) {
    const c = String(body.companyName).trim();
    if (c.length < 2) return bad("Please enter the company or publication name.");
    data.companyName = c;
  }
  if (body.contactEmail !== undefined) data.contactEmail = String(body.contactEmail).toLowerCase().trim();
  if (body.about !== undefined) data.about = String(body.about).trim() || null;
  if (body.logoImageId !== undefined) data.logoImageId = body.logoImageId ? String(body.logoImageId) : null;

  const updated = await db.publisher.update({ where: { id: pub.id }, data });
  return ok({ id: updated.id, status: updated.status });
}
