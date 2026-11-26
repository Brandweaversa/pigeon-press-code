import { NextRequest } from "next/server";
import { hashSync } from "bcryptjs";
import { db } from "@/lib/db";
import { ok, bad } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (name.length < 2) return bad("Please enter your name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Please enter a valid email address.");
    if (password.length < 6) return bad("Password must be at least 6 characters.");

    if (body.role === "PUBLISHER") {
      const companyName = String(body.companyName || "").trim();
      if (companyName.length < 2) return bad("Please enter your company or publication name.");
    }

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return bad("An account with that email already exists.", 409);

    // Bootstrap: the very first account on a fresh platform becomes ADMIN.
    // Serializable isolation prevents two simultaneous first registrations
    // from both seeing "zero admins" and both claiming the role.
    const user = await db.$transaction(
      async (tx) => {
        const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
        const role = adminCount === 0 ? "ADMIN" : body.role === "PUBLISHER" ? "PUBLISHER" : "READER";
        const created = await tx.user.create({
          data: { name, email, role, passwordHash: hashSync(password, 10) },
        });
        if (role === "PUBLISHER") {
          await tx.publisher.create({
            data: {
              userId: created.id,
              companyName: String(body.companyName).trim(),
              contactEmail: String(body.contactEmail || email).toLowerCase().trim(),
              about: String(body.about || "").trim() || null,
              logoImageId: body.logoImageId ? String(body.logoImageId) : null,
              status: "PENDING",
            },
          });
        }
        return created;
      },
      { isolationLevel: "Serializable" }
    );

    return ok({ id: user.id, email: user.email, role: user.role }, 201);
  } catch {
    return bad("Could not create the account. Please try again.", 500);
  }
}
