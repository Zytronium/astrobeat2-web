"use client";

import { useState } from "react";
import { MdAdd, MdClose } from "react-icons/md";
import { useRouter } from "next/navigation";

export default function CreatePlaylistDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/playlists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });

            if (res.ok) {
                setIsOpen(false);
                setName("");
                setDescription("");
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to create playlist:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-cyan-500/30 bg-blue-950/20 p-8 transition hover:bg-blue-950/40"
            >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                    <MdAdd size={32} />
                </div>
                <div className="text-center">
                    <h3 className="font-semibold text-white">Create New Playlist</h3>
                    <p className="text-xs text-blue-200/50">Start organizing your music</p>
                </div>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-cyan-500/30 bg-blue-950/90 p-6 shadow-2xl backdrop-blur-xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">New Playlist</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-blue-200/50 hover:text-white"
                            >
                                <MdClose size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold uppercase tracking-widest text-cyan-400/60">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="My awesome playlist"
                                    required
                                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/20 focus:border-cyan-400/50 focus:outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-bold uppercase tracking-widest text-cyan-400/60">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="What's this playlist about?"
                                    rows={3}
                                    className="resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-blue-200/20 focus:border-cyan-400/50 focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
                                className="mt-2 rounded-xl bg-cyan-500 py-3 font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 active:scale-95 disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : "Create Playlist"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
