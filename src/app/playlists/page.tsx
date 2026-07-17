import Link from "next/link";
import { db } from "@/db";
import { playlists } from "@/db/schema";
import { desc } from "drizzle-orm";
import { MdLibraryMusic, MdArrowBack } from "react-icons/md";
import CreatePlaylistDialog from "@/components/create-playlist-dialog";

export const dynamic = "force-dynamic";

async function getPlaylists() {
    return db.select().from(playlists).orderBy(desc(playlists.createdAt));
}

export default async function PlaylistsPage() {
    const allPlaylists = await getPlaylists();

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 overflow-x-hidden">
            <header className="flex flex-col gap-4 rounded-2xl border border-cyan-400/30 bg-blue-950/40 shadow-lg shadow-cyan-500/20 p-5 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/5 text-cyan-100 transition hover:bg-white/10"
                    >
                        <MdArrowBack size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight bg-linear-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                            Playlists
                        </h1>
                        <p className="text-sm text-blue-200/70">
                            Organize your favorite music.
                        </p>
                    </div>
                </div>
            </header>

            <section className="grid gap-4 sm:grid-cols-2">
                <CreatePlaylistDialog />

                {allPlaylists.map((playlist) => (
                    <Link
                        key={playlist.id}
                        href={`/playlists/${playlist.id}`}
                        className="group flex items-center gap-4 rounded-3xl border border-cyan-500/30 bg-blue-950/40 p-5 backdrop-blur-xl shadow-lg transition hover:scale-[1.02] hover:bg-blue-950/60 overflow-hidden"
                    >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 group-hover:from-cyan-500/30 group-hover:to-blue-500/30">
                            <MdLibraryMusic size={32} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white group-hover:text-cyan-300">
                                {playlist.name}
                            </h3>
                            {playlist.description && (
                                <p className="truncate text-sm text-blue-200/60">
                                    {playlist.description}
                                </p>
                            )}
                            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-cyan-400/40">
                                Created {new Date(playlist.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </Link>
                ))}

                {allPlaylists.length === 0 && (
                    <div className="col-span-full py-12 text-center text-blue-200/40">
                        No playlists yet.
                    </div>
                )}
            </section>
        </main>
    );
}
