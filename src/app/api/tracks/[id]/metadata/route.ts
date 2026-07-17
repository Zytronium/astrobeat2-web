import { NextRequest } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tracks } from "@/db/schema";
import { isAuthorized } from "@/lib/api-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { durationSecs?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { durationSecs } = body;

  if (typeof durationSecs !== "number") {
    return Response.json({ error: "durationSecs is required and must be a number" }, { status: 400 });
  }

  try {
    // Only update if it's currently null to avoid unnecessary writes or accidental overwrites
    await db
      .update(tracks)
      .set({ durationSecs: Math.floor(durationSecs) })
      .where(and(eq(tracks.id, id), isNull(tracks.durationSecs)));

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/tracks/[id]/metadata error:", err);
    return Response.json({ error: "Failed to update metadata" }, { status: 500 });
  }
}
