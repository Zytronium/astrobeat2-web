import { NextResponse } from "next/server";
import { db } from "@/db";
import { playlistTracks, tracks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const items = await db
            .select({
                track: tracks,
            })
            .from(playlistTracks)
            .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
            .where(eq(playlistTracks.playlistId, id))
            .orderBy(playlistTracks.addedAt);

        return NextResponse.json(items.map(i => i.track));
    } catch (error) {
        console.error("Failed to fetch playlist tracks:", error);
        return NextResponse.json({ error: "Failed to fetch tracks" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: playlistId } = await params;
    try {
        const { trackId } = await request.json();

        if (!trackId) {
            return NextResponse.json({ error: "Track ID is required" }, { status: 400 });
        }

        const [newItem] = await db.insert(playlistTracks).values({
            playlistId,
            trackId,
        }).returning();

        return NextResponse.json(newItem);
    } catch (error) {
        console.error("Failed to add track to playlist:", error);
        return NextResponse.json({ error: "Failed to add track" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: playlistId } = await params;
    try {
        const { trackId } = await request.json();

        if (!trackId) {
            return NextResponse.json({ error: "Track ID is required" }, { status: 400 });
        }

        await db.delete(playlistTracks).where(
            and(
                eq(playlistTracks.playlistId, playlistId),
                eq(playlistTracks.trackId, trackId)
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to remove track from playlist:", error);
        return NextResponse.json({ error: "Failed to remove track" }, { status: 500 });
    }
}
