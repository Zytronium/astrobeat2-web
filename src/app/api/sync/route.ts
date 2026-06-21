import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tracks, playEvents } from "@/db/schema";
import { isAuthorized } from "@/lib/api-auth";

// -------- GET /api/sync --------
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all tracks
    const allTracks = await db.select().from(tracks).orderBy(tracks.uploadedAt);

    // Fetch last played timestamp per track
    const lastPlayedRows = await db
      .select({
        trackId: playEvents.trackId,
        lastPlayedAt: sql<string>`MAX(${playEvents.playedAt})`.as("last_played_at"),
      })
      .from(playEvents)
      .groupBy(playEvents.trackId);

    // Build a lookup map for quick access
    const lastPlayedMap = new Map<string, string>();
    for (const row of lastPlayedRows) {
      lastPlayedMap.set(row.trackId, row.lastPlayedAt);
    }

    // Merge last played into each track
    const tracksWithPlayData = allTracks.map((track) => ({
      ...track,
      lastPlayedAt: lastPlayedMap.get(track.id) ?? null,
    }));

    // evictBefore = now minus 3 months
    const evictBefore = new Date();
    evictBefore.setMonth(evictBefore.getMonth() - 3);

    return Response.json({
      tracks: tracksWithPlayData,
      evictBefore: evictBefore.toISOString(),
    });
  } catch (err) {
    console.error("GET /api/sync error:", err);
    return Response.json({ error: "Sync failed" }, { status: 500 });
  }
}
