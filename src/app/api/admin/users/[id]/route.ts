import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth, ok, bad } from "@/lib/api-helpers";

const ROLES = ["READER", "PUBLISHER", "ADMIN"];

/** PATCH /api/admin/users/:id — change an account's role. Body: { role } */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["ADMIN"]);
  if (res) return res;

  if (id === user!.id) return bad("You cannot change your own role.");

  const body = await req.json();
  const role = String(body.role || "");
  if (!ROLES.includes(role)) return bad("Unknown role.");
  if (role === "ADMIN") {
    // Guard against accidentally promoting many accounts to full platform control.
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins >= 10) return bad("There are already 10 admins — demote one before promoting another.");
  }

  const target = await db.user.findUnique({ where: { id }, include: { publisher: true } });
  if (!target) return bad("Account not found.", 404);

  await db.user.update({ where: { id }, data: { role } });

  // Becoming a publisher takes more than a role flip: every publisher list in
  // the admin console comes from the Publisher profile row, so create a
  // pending profile when the promoted account doesn't have one yet.
  if (role === "PUBLISHER" && !target.publisher) {
    await db.publisher.create({
      data: {
        userId: id,
        companyName: target.name,
        contactEmail: target.email,
        status: "PENDING",
      },
    });
  }

  await db.notification.create({
    data: {
      userId: id,
      title: "Your account role changed",
      body:
        role === "PUBLISHER"
          ? "An administrator made your account a publisher. Sign out and sign back in to see the Publish tab, then check your company profile."
          : `An administrator set your account role to ${role}. Sign out and sign back in for it to take effect.`,
    },
  });
  return ok({ updated: true });
}

/** DELETE /api/admin/users/:id — remove an account entirely.
 *  Cascades: publisher profile, magazines, editions, favourites, notifications. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, res } = await auth(["ADMIN"]);
  if (res) return res;

  if (id === user!.id) return bad("You cannot delete your own account.");

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return bad("Account not found.", 404);

  const admins = await db.user.count({ where: { role: "ADMIN" } });
  if (target.role === "ADMIN" && admins <= 1) return bad("You cannot delete the only admin account.");

  await db.user.delete({ where: { id } });
  return ok({ deleted: true });
}
