import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const img = await db.image.findUnique({ where: { id } });
  if (!img) return NextResponse.json({ error: "Image not found." }, { status: 404 });
  const body = new Uint8Array(img.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
