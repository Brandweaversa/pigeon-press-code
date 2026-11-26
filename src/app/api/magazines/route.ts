import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** GET /api/magazines — magazine catalogue.
 *  ?scope=mine   → the signed-in publisher's own magazines
 *  ?scope=all    → admin only: every magazine with publisher info
 *  default       → public: magazines from APPROVED publishers, featured first
 *  ?q= search by name, ?categoryId= filter */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") || "public";
  const q = sp.get("q")?.trim() || "";
  const categoryId = sp.get("categoryId") || "";

  const where: Record<string, unknown> = {};
  let viewerId: string | null = null;
  let favourites: Set<string> | null = null;

  if (scope === "mine") {
    const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
    if (res) return res;
    const pub = await db.publisher.findUnique({ where: { userId: user!.id } });
    if (!pub) return ok([]);
    where.publisherId = pub.id;
  } else if (scope === "all") {
    const { res } = await auth(["ADMIN"]);
    if (res) return res;
  } else {
    // public: only content from approved publishers is visible
    where.publisher = { status: "APPROVED" };
    const session = await auth();
    if (!session.res && session.user) {
      viewerId = session.user.id;
      const favs = await db.favourite.findMany({ where: { userId: viewerId } });
      favourites = new Set(favs.map((f) => f.magazineId));
    }
  }
  if (q) where.name = { contains: q };
  if (categoryId) where.categoryId = categoryId;

  const list = await db.magazine.findMany({
    where,
    include: {
      category: true,
      publisher: { select: { id: true, companyName: true, logoImageId: true } },
      editions: { orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }], take: 1 },
      _count: { select: { editions: true, favourites: true } },
    },
    orderBy: scope === "public" ? [{ featured: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
    take: 200,
  });

  return ok(
    list.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      logoImageId: m.logoImageId,
      frequency: m.frequency,
      featured: m.featured,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      category: m.category ? { id: m.category.id, name: m.category.name, slug: m.category.slug } : null,
      publisher: m.publisher,
      latestEdition: m.editions[0]
        ? {
            id: m.editions[0].id,
            title: m.editions[0].title,
            issueNumber: m.editions[0].issueNumber,
            thumbnailImageId: m.editions[0].thumbnailImageId,
            publishedAt: m.editions[0].publishedAt,
          }
        : null,
      editionsCount: m._count.editions,
      readers: m._count.favourites,
      favourited: favourites ? favourites.has(m.id) : undefined,
    }))
  );
}

/** POST /api/magazines — create a magazine (approved publishers only; live immediately). */
export async function POST(req: NextRequest) {
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const pub =
    user!.role === "ADMIN"
      ? await db.publisher.findFirst({ where: { status: "APPROVED" } })
      : await db.publisher.findUnique({ where: { userId: user!.id } });
  if (!pub || pub.status !== "APPROVED")
    return bad("Your publisher account must be approved before creating magazines.", 403);

  const body = await req.json();
  const name = String(body.name || "").trim();
  const logoImageId = String(body.logoImageId || "");
  if (name.length < 2) return bad("Please enter the magazine name.");
  if (!logoImageId) return bad("Please upload the magazine logo.");

  if (body.categoryId) {
    const cat = await db.category.findUnique({ where: { id: String(body.categoryId) } });
    if (!cat) return bad("Unknown category.");
  }

  const mag = await db.magazine.create({
    data: {
      publisherId: pub.id,
      name,
      description: String(body.description || "").trim() || null,
      categoryId: body.categoryId ? String(body.categoryId) : null,
      logoImageId,
      frequency: String(body.frequency || "").trim() || null,
    },
  });
  return ok({ id: mag.id }, 201);
}
