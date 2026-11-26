import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

/** POST /api/admin/review — approve / reject / feature / unfeature. */
export async function POST(req: NextRequest) {
  const { res } = await auth(["ADMIN"]);
  if (res) return res;

  const body = await req.json();
  const type = String(body.type || "");
  const id = String(body.id || "");
  const action = String(body.action || "");
  const reason = String(body.reason || "").trim();

  if (!["publisher", "magazine", "edition"].includes(type)) return bad("Unknown review type.");
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
            ? `${pub.companyName} is approved. You can now create magazines and submit editions.`
            : `${pub.companyName} was not approved. Reason: ${reason}`,
      },
    });
    return ok({ done: true });
  }

  if (type === "magazine") {
    const mag = await db.magazine.findUnique({ where: { id }, include: { publisher: true } });
    if (!mag) return bad("Magazine not found.", 404);
    if (action === "approve") {
      await db.magazine.update({ where: { id }, data: { status: "APPROVED", rejectionReason: null } });
    } else if (action === "reject") {
      await db.magazine.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
    } else if (action === "feature" || action === "unfeature") {
      if (mag.status !== "APPROVED") return bad("Only approved magazines can be featured.", 400);
      await db.magazine.update({ where: { id }, data: { featured: action === "feature" } });
    }
    if (action === "approve" || action === "reject") {
      await db.notification.create({
        data: {
          userId: mag.publisher.userId,
          title: action === "approve" ? `Magazine approved: ${mag.title}` : `Magazine not approved: ${mag.title}`,
          body:
            action === "approve"
              ? `${mag.title} is now live on the platform.`
              : `${mag.title} was not approved. Reason: ${reason}`,
        },
      });
    }
    return ok({ done: true });
  }

  // edition
  const ed = await db.edition.findUnique({ where: { id }, include: { magazine: { include: { publisher: true } } } });
  if (!ed) return bad("Edition not found.", 404);
  if (action === "approve") {
    await db.edition.update({ where: { id }, data: { status: "APPROVED", publishedAt: new Date(), rejectionReason: null } });
    // notify readers who favourite-followed this magazine
    const favs = await db.favourite.findMany({ where: { magazineId: ed.magazineId, notify: true } });
    if (favs.length) {
      await db.notification.createMany({
        data: favs.map((f) => ({
          userId: f.userId,
          title: `New edition: ${ed.magazine.title}`,
          body: `${ed.title}${ed.issueNumber ? ` (${ed.issueNumber})` : ""} is ready to read.`,
        })),
      });
    }
  } else if (action === "reject") {
    await db.edition.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason } });
  } else return bad("Editions cannot be featured.");
  if (action === "approve" || action === "reject") {
    await db.notification.create({
      data: {
        userId: ed.magazine.publisher.userId,
        title: action === "approve" ? `Edition approved: ${ed.title}` : `Edition not approved: ${ed.title}`,
        body:
          action === "approve"
            ? `${ed.title} for ${ed.magazine.title} is now live and readers were notified.`
            : `${ed.title} for ${ed.magazine.title} was not approved. Reason: ${reason}`,
      },
    });
  }
  return ok({ done: true });
}
