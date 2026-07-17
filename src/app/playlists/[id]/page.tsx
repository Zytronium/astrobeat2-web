import Link from "next/link";
import { db } from "@/db";
import { playlists, playlistTracks, tracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MdArrowBack, MdLibraryMusic, MdPlayArrow } from "react-icons/md";
import TrackPlayer from "@/components/track-player";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getPlaylist(id: string) {
    const [playlist] = await db.select().from(playlists).where(eq(playlists.id, id));
    return playlist;
}

async function getPlaylistTracks(playlistId: string) {
    const rows = await db
        .select({
            track: tracks,
        })
        .from(playlistTracks)
        .innerJoin(tracks, eq(playlistTracks.trackId, tracks.id))
        .where(eq(playlistTracks.playlistId, playlistId))
        .orderBy(playlistTracks.addedAt);
    
    return rows.map(r => r.track);
}

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const playlist = await getPlaylist(id);

    if (!playlist) {
        notFound();
    }

    const playlistTracksData = await getPlaylistTracks(id);

    const serializableTracks = playlistTracksData.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        durationSecs: track.durationSecs,
        fileName: track.fileName,
        uploadedAt:
            track.uploadedAt instanceof Date
                ? track.uploadedAt.toISOString()
                : String(track.uploadedAt),
    }));

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 overflow-x-hidden">
            <header className="flex flex-col gap-4 rounded-2xl border border-cyan-400/30 bg-blue-950/40 shadow-lg shadow-cyan-500/20 p-5 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Link
                        href="/playlists"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-cyan-100 transition hover:bg-white/10"
                    >
                        <MdArrowBack size={24} />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <MdLibraryMusic className="text-cyan-400" size={20} />
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-white">
                                {playlist.name}
                            </h1>
                        </div>
                        {playlist.description && (
                            <p className="truncate text-sm text-blue-200/70">
                                {playlist.description}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            {serializableTracks.length > 0 ? (
                <TrackPlayer tracks={serializableTracks} playlistId={id} />
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-cyan-500/30 bg-blue-950/20 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-900/30 text-blue-200/30">
                        <MdPlayArrow size={40} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">No tracks yet</h3>
                        <p className="text-sm text-blue-200/50">Add some tracks from the library to get started</p>
                    </div>
                    <Link
                        href="/"
                        className="mt-2 rounded-xl bg-cyan-500 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-400 active:scale-95"
                    >
                        Go to Library
                    </Link>
                </div>
            )}
        </main>
    );
}
