import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { tracks } from "@/db/schema";
import TrackPlayer from "@/components/track-player";

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
            <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-white">
                            Astrobeat
                        </h1>
                        <p className="text-sm text-white/60">
                            Minimal library view with playback.
                        </p>
                    </div>

                    <Link
                        href="/upload"
                        className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                        Upload track
                    </Link>
                </div>
            </header>

            <TrackPlayer tracks={serializableTracks} />

        </main>
    );
}
