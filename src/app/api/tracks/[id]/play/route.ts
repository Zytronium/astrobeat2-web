import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tracks, playEvents } from "@/db/schema";
import { isAuthorized } from "@/lib/api-auth";

// -------- POST /api/tracks/[id]/play --------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify track exists
  try {
    const rows = await db
      .select({ id: tracks.id })
      .from(tracks)
      .where(eq(tracks.id, id))
      .limit(1);

    if (!rows[0]) {
      return Response.json({ error: "Track not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("POST /api/tracks/[id]/play DB lookup error:", err);
    return Response.json({ error: "Failed to verify track" }, { status: 500 });
  }

  // Parse optional source from body
  let source: string | null = null;
  try {
    const body = await req.json() as Record<string, unknown>;
    if (typeof body.source === "string") {
      source = body.source;
    }
  } catch {
    // Body is optional - fall through with null source
  }

  try {
    await db.insert(playEvents).values({
      trackId: id,
      source,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("POST /api/tracks/[id]/play insert error:", err);
    return Response.json({ error: "Failed to log play event" }, { status: 500 });
  }
}
