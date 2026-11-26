import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, isHttpUrl } from "@/lib/api-helpers";

/** GET /api/magazines — public discovery list with filters.
 *  ?scope=mine (publisher's own, any status) | ?scope=public (default, APPROVED only)
 *  ?q= search, ?categoryId=, ?featured=1 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") || "public";
  const q = sp.get("q")?.trim() || "";
  const categoryId = sp.get("categoryId") || "";
  const featured = sp.get("featured") === "1";

  const where: Record<string, unknown> = {};
  if (scope === "mine") {
    const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
    if (res) return res;
    const pub = await db.publisher.findUnique({ where: { userId: user!.id } });
    if (!pub) return ok([]);
    where.publisherId = pub.id;
  } else {
    where.status = "APPROVED";
    if (featured) where.featured = true;
  }
  if (q) where.title = { contains: q };
  if (categoryId) where.categoryId = categoryId;

  const list = await db.magazine.findMany({
    where,
    include: {
      category: true,
      publisher: { select: { companyName: true, logoImageId: true } },
      editions: where.status === "APPROVED" || scope !== "mine"
        ? { where: { status: "APPROVED" }, orderBy: { publishedAt: "desc" }, take: 1 }
        : { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { editions: true, favourites: true } },
    },
    orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  // hide owner-only details for non-owners
  let favourites: Set<string> | null = null;
  if (scope === "public") {
    const session = await auth();
    if (!session.res && session.user) {
      const favs = await db.favourite.findMany({ where: { userId: session.user.id } });
      favourites = new Set(favs.map((f) => f.magazineId));
    }
  }

  return ok(
    list.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      status: m.status,
      featured: m.featured,
      rejectionReason: scope === "mine" ? m.rejectionReason : undefined,
      coverImageId: m.coverImageId,
      flipbookUrl: m.flipbookUrl,
      language: m.language,
      frequency: m.frequency,
      website: m.website,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      category: m.category ? { id: m.category.id, name: m.category.name, slug: m.category.slug } : null,
      publisher: m.publisher,
      latestEdition: m.editions[0]
        ? { id: m.editions[0].id, title: m.editions[0].title, issueNumber: m.editions[0].issueNumber, publishedAt: m.editions[0].publishedAt }
        : null,
      editionsCount: m._count.editions,
      readers: m._count.favourites,
      favourited: favourites ? favourites.has(m.id) : undefined,
    }))
  );
}

/** POST /api/magazines — create a draft magazine (approved publishers only). */
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
  const title = String(body.title || "").trim();
  const coverImageId = String(body.coverImageId || "");
  const flipbookUrl = String(body.flipbookUrl || "").trim();
  if (title.length < 2) return bad("Please enter the magazine title.");
  if (!coverImageId) return bad("Please upload a cover image.");
  if (!isHttpUrl(flipbookUrl)) return bad("The flipbook URL must be a valid http(s) link.");

  if (body.categoryId) {
    const cat = await db.category.findUnique({ where: { id: String(body.categoryId) } });
    if (!cat) return bad("Unknown category.");
  }

  const mag = await db.magazine.create({
    data: {
      publisherId: pub.id,
      title,
      description: String(body.description || "").trim() || null,
      categoryId: body.categoryId ? String(body.categoryId) : null,
      coverImageId,
      flipbookUrl,
      language: String(body.language || "English"),
      frequency: String(body.frequency || "").trim() || null,
      website: String(body.website || "").trim() || null,
      status: "DRAFT",
    },
  });
  return ok({ id: mag.id }, 201);
}
