import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad, isHttpUrl } from "@/lib/api-helpers";

/** GET editions of a magazine (owner sees all, public sees approved). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  const { user } = await auth();
  const isOwner = !!user && (user.role === "ADMIN" || user.id === mag.publisher.userId);
  const editions = await db.edition.findMany({
    where: { magazineId: id, ...(isOwner ? {} : { status: "APPROVED" }) },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return ok(
    editions.map((e) => ({
      id: e.id, title: e.title, issueNumber: e.issueNumber, description: e.description,
      flipbookUrl: e.flipbookUrl, status: e.status, publishedAt: e.publishedAt,
      rejectionReason: isOwner ? e.rejectionReason : undefined,
    }))
  );
}

/** POST /api/magazines/:id/editions — publisher adds a new edition (goes to review). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["PUBLISHER", "ADMIN"]);
  if (res) return res;

  const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
  if (!mag) return bad("Magazine not found.", 404);
  if (user!.role !== "ADMIN" && mag.publisher.userId !== user!.id)
    return bad("That magazine belongs to another publisher.", 403);
  if (mag.status !== "APPROVED")
    return bad("The magazine itself must be approved before adding editions.", 400);

  const body = await req.json();
  const title = String(body.title || "").trim();
  const flipbookUrl = String(body.flipbookUrl || "").trim();
  if (title.length < 2) return bad("Please enter the edition title.");
  if (!isHttpUrl(flipbookUrl)) return bad("The flipbook URL must be a valid http(s) link.");

  const ed = await db.edition.create({
    data: {
      magazineId: id,
      title,
      issueNumber: String(body.issueNumber || "").trim() || null,
      description: String(body.description || "").trim() || null,
      flipbookUrl,
      coverImageId: body.coverImageId ? String(body.coverImageId) : null,
      status: "PENDING",
    },
  });
  return ok({ id: ed.id }, 201);
}
