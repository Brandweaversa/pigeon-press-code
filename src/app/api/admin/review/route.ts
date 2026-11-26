import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** POST /api/admin/review — approve / reject publishers, feature / unfeature magazines.
 *  Approved publishers publish magazines and editions instantly — no content review. */
export async function POST(req: NextRequest) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;

  const body = await req.json();
  const type = String(body.type || "");
  const id = String(body.id || "");
  const action = String(body.action || "");
  const reason = String(body.reason || "").trim();

  if (!["publisher", "magazine"].includes(type)) return bad("Unknown review type.");
  if (!["approve", "reject", "feature", "unfeature"].includes(action)) return bad("Unknown action.");
  if (action === "reject" && reason.length < 3) return bad("Please give the publisher a short reason.");

  if (type === "publisher") {
    const pub = await db.publisher.findUnique({ where: { id }, include: { user: true } });
    if (!pub) return bad("Publisher not found.", 404);
    if (action === "approve") {
      await db.publisher.update({ where: { id }, data: { status: "APPROVED", rejectionReason: null } });
    } else if (action === "reject") {
      await db.publisher.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
    } else return bad("Publishers cannot be featured.");
    await db.notification.create({
      data: {
        userId: pub.userId,
        title: action === "approve" ? "Publisher approved" : "Publisher registration reviewed",
        body:
          action === "approve"
            ? `${pub.companyName} is approved. You can now publish magazines and editions — they go live immediately.`
            : `${pub.companyName} was not approved. Reason: ${reason}`,
      },
    });
    return ok({ done: true });
  }

  // magazine — feature / unfeature (pins it to the top of the Magazines catalogue)
  if (action !== "feature" && action !== "unfeature") return bad("Magazines publish instantly — use feature / unfeature.");
  const mag = await db.magazine.findUnique({ where: { id } });
  if (!mag) return bad("Magazine not found.", 404);
  await db.magazine.update({ where: { id }, data: { featured: action === "feature" } });
  return ok({ done: true });
}
