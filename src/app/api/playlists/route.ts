import { NextResponse } from "next/server";
import { db } from "@/db";
import { playlists, playlistTracks } from "@/db/schema";
import { desc, notInArray, eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const excludeTrackId = searchParams.get("excludeTrackId");

        let query;

        if (excludeTrackId) {
            const playlistsWithTrack = db
                .select({ id: playlistTracks.playlistId })
                .from(playlistTracks)
                .where(eq(playlistTracks.trackId, excludeTrackId));

            query = db.select().from(playlists).where(
                notInArray(
                    playlists.id,
                    sql`(${playlistsWithTrack})`
                )
            );
        } else {
            query = db.select().from(playlists);
        }

        const allPlaylists = await query.orderBy(desc(playlists.createdAt));
        return NextResponse.json(allPlaylists);
    } catch (error) {
        console.error("Failed to fetch playlists:", error);
        return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, description } = await request.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        const [newPlaylist] = await db.insert(playlists).values({
            name,
            description,
        }).returning();

        return NextResponse.json(newPlaylist);
    } catch (error) {
        console.error("Failed to create playlist:", error);
        return NextResponse.json({ error: "Failed to create playlist" }, { status: 500 });
    }
}
