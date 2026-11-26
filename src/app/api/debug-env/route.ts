import { NextResponse } from "next/server";

// TEMPORARY DEBUG ROUTE — delete after diagnosing!
export const dynamic = "force-dynamic";

export async function GET() {
  const db = process.env.PIGEON_DATABASE_URL ?? "";
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  const site = process.env.NEXTAUTH_URL ?? "";

  return NextResponse.json({
    PIGEON_DATABASE_URL: {
      present: db.length > 0,
      length: db.length,
      startsWithMysql: db.startsWith("mysql://"),
      hasQuotes: db.includes('"'),
      hasKeyEqualsPrefix: db.includes("PIGEON_DATABASE_URL="),
      hasLeadingOrTrailingSpace: db !== db.trim(),
    },
    NEXTAUTH_SECRET: { present: secret.length > 0, length: secret.length },
    NEXTAUTH_URL: { present: site.length > 0, value: site || null },
  });
}