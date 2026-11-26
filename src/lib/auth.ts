import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  // Fail loudly when the secret is missing — never fall back to a hardcoded value.
  secret: process.env.NEXTAUTH_SECRET,
  pages: {},
  providers: [
    Credentials({
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        const match = await compare(password, user.passwordHash);
        if (!match) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id?: string; role?: string; name?: string };
        token.id = u.id || "";
        token.role = u.role || "READER";
        token.name = u.name || token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as SessionUser).id = (token.id as string) || "";
        (session.user as SessionUser).role = (token.role as string) || "READER";
        session.user.name = (token.name as string) || session.user.name;
      }
      return session;
    },
  },
};
