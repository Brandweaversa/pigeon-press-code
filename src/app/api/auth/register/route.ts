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

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) return bad("An account with that email already exists.", 409);

    // Bootstrap: the very first account on a fresh platform becomes ADMIN.
    const adminCount = await db.user.count({ where: { role: "ADMIN" } });
    const role = adminCount === 0 ? "ADMIN" : body.role === "PUBLISHER" ? "PUBLISHER" : "READER";

    const user = await db.user.create({
      data: { name, email, role, passwordHash: hashSync(password, 10) },
    });

    if (role === "PUBLISHER") {
      const companyName = String(body.companyName || "").trim();
      const contactEmail = String(body.contactEmail || email).toLowerCase().trim();
      if (companyName.length < 2) return bad("Please enter your company or publication name.");
      await db.publisher.create({
        data: {
          userId: user.id,
          companyName,
          contactEmail,
          about: String(body.about || "").trim() || null,
          logoImageId: body.logoImageId ? String(body.logoImageId) : null,
          status: "PENDING",
        },
      });
    }

    return ok({ id: user.id, email: user.email, role: user.role }, 201);
  } catch {
    return bad("Could not create the account. Please try again.", 500);
  }
}
