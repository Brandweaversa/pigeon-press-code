import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";

/** GET /api/editions — the Discover feed: latest editions across all approved publishers.
 *  ?q= search by edition or magazine name */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";

  const list = await db.edition.findMany({
    where: {
      magazine: { publisher: { status: "APPROVED" } },
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { magazine: { name: { contains: q } } },
              { magazine: { publisher: { companyName: { contains: q } } } },
            ],
          }
        : {}),
    },
    include: {
      magazine: {
        select: {
          id: true,
          name: true,
          logoImageId: true,
          category: { select: { id: true, name: true } },
          publisher: { select: { id: true, companyName: true } },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 60,
  });

  return ok(
    list.map((e) => ({
      id: e.id,
      title: e.title,
      issueNumber: e.issueNumber,
      thumbnailImageId: e.thumbnailImageId,
      publishedAt: e.publishedAt,
      magazine: e.magazine,
    }))
  );
}
