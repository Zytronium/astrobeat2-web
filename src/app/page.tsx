import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { tracks } from "@/db/schema";
import TrackPlayer from "@/components/track-player";

export const dynamic = "force-dynamic";

type TrackRow = Awaited<ReturnType<typeof getTracks>>[number];

async function getTracks() {
    return db.select().from(tracks).orderBy(desc(tracks.uploadedAt));
}

export default async function HomePage() {
    const rows = await getTracks();

    const serializableTracks = rows.map((track) => ({
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
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
            <header className="flex flex-col gap-4 rounded-2xl border border-cyan-400/30 bg-blue-950/40 shadow-lg shadow-cyan-500/20 p-5 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight bg-linear-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                            Astrobeat
                        </h1>
                        <p className="text-sm text-blue-200/70">
                            Your personal music library.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/playlists"
                            className="inline-flex items-center justify-center rounded-xl border border-cyan-400/30 bg-blue-950/40 px-5 py-2.5 text-sm font-semibold text-cyan-100 shadow-lg transition hover:bg-cyan-500/20"
                        >
                            Playlists
                        </Link>
                        <Link
                            href="/upload"
                            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:scale-105 hover:brightness-110"
                        >
                            Upload
                        </Link>
                    </div>
                </div>
            </header>

            <TrackPlayer tracks={serializableTracks} />

        </main>
    );
}
