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
            name: m.name,
            description: m.description,
            logoImageId: m.logoImageId,
            frequency: m.frequency,
            category: m.category ? { id: m.category.id, name: m.category.name } : null,
            editionsCount: m._count.editions,
            readers: m._count.favourites,
          })),
        }
      : null
  );
}

/** POST /api/publishers/me — create the company profile for an account that
 *  has publisher access (an admin promoted it, or the role was set manually)
 *  but no profile yet. Only allowed once; the profile starts PENDING. */
export async function POST(req: NextRequest) {
  const { user, res } = await auth(["PUBLISHER"]);
  if (res) return res;
  const existing = await db.publisher.findUnique({ where: { userId: user!.id } });
  if (existing) return bad("You already have a publisher profile.");

  const body = await req.json();
  const companyName = String(body.companyName || "").trim();
  if (companyName.length < 2) return bad("Please enter the company or publication name.");

  const created = await db.publisher.create({
    data: {
      userId: user!.id,
      companyName,
      contactEmail: String(body.contactEmail || user!.email || "").toLowerCase().trim(),
      about: body.about ? String(body.about).trim() || null : null,
      logoImageId: body.logoImageId ? String(body.logoImageId) : null,
      status: "PENDING",
    },
  });
  return ok({ id: created.id, status: created.status });
}

/** PATCH /api/publishers/me — update the company profile. */
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
