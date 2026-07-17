"use client";

import { useMemo, useRef, useState } from "react";
import {
    MdPlayArrow,
    MdPause,
    MdSkipNext,
    MdSkipPrevious,
    MdShuffle,
    MdRepeat,
} from "react-icons/md";

type Track = {
    id: string;
    title: string;
    artist: string | null;
    album: string | null;
    durationSecs: number | null;
    fileName: string;
    uploadedAt: string;
};

export default function TrackPlayer({ tracks }: { tracks: Track[] }) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [shuffle, setShuffle] = useState(false);
    const [loop, setLoop] = useState(false);

    const currentTrack = useMemo(
        () => (currentIndex === null ? null : tracks[currentIndex] ?? null),
        [currentIndex, tracks]
    );

    const logPlay = async (trackId: string) => {
        try {
            await fetch(`/api/tracks/${trackId}/play`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ source: "root" }),
            });
        } catch {
            // ignore logging failures
        }
    };

    const playTrack = async (index: number) => {
        const track = tracks[index];
        const audio = audioRef.current;
        if (!audio || !track) return;

        setBusy(true);
        setError(null);
        setCurrentIndex(index);

        try {
            const response = await fetch(`/api/tracks/${track.id}/stream`);

            if (!response.ok) {
                throw new Error("Failed to get stream URL");
            }

            const { url } = await response.json();

            audio.src = url;
            audio.load();
            await audio.play();
            setIsPlaying(true);
            void logPlay(track.id);
        } catch {
            setIsPlaying(false);
            setError("Playback failed.");
        } finally {
            setBusy(false);
        }
    };

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (currentIndex === null) {
            if (tracks.length > 0) await playTrack(0);
            return;
        }

        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
            return;
        }

        try {
            setBusy(true);
            await audio.play();
            setIsPlaying(true);
            const track = tracks[currentIndex];
            if (track) void logPlay(track.id);
        } catch {
            setError("Playback failed.");
        } finally {
            setBusy(false);
        }
    };

    const step = async (direction: 1 | -1) => {
        if (tracks.length === 0) return;
        let next: number;

        if (shuffle && tracks.length > 1) {
            do {
                next = Math.floor(Math.random() * tracks.length);
            } while (next === currentIndex);
        } else {
            next =
                currentIndex === null
                    ? 0
                    : (currentIndex + direction + tracks.length) % tracks.length;
        }

        await playTrack(next);
    };

    const seek = (value: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = value;
        setCurrentTime(value);
    };

    const changeSpeed = (value: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.playbackRate = value;
        setSpeed(value);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <section className="rounded-3xl border border-cyan-500/30 bg-blue-950/40 backdrop-blur-xl shadow-xl shadow-purple-500/20 p-5">
            <audio
                ref={audioRef}
                preload="metadata"
                onLoadedMetadata={() => {
                    if (audioRef.current) {
                        setDuration(audioRef.current.duration);
                    }
                }}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setCurrentTime(audioRef.current.currentTime);
                    }
                }}
                onEnded={() => {
                    if (loop && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        void audioRef.current.play();
                        return;
                    }

                    setIsPlaying(false);
                    void step(1);
                }}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
            />

            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/60">
                        Now playing
                    </div>
                    <div className="truncate text-xl font-bold text-white drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
                        {currentTrack ? currentTrack.title : "Ready to play"}
                    </div>
                    <div className="truncate text-sm text-blue-200/60">
                        {currentTrack?.artist || "Select a track to start listening"}
                    </div>
                </div>
            </div>

            {error ? (
                <p className="mt-3 text-sm text-red-300">{error}</p>
            ) : null}

            <div className="mt-4 flex flex-col gap-6">

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-medium tabular-nums text-blue-200/50">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-blue-900/50 accent-cyan-400 transition-all hover:accent-cyan-300"
                    />
                </div>

                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    {/* Secondary Controls */}
                    <div className="flex items-center justify-center gap-4 sm:justify-start">
                        <button
                            onClick={() => setShuffle(!shuffle)}
                            title="Shuffle"
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                                shuffle
                                    ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                                    : "text-blue-200/50 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <MdShuffle size={20} />
                        </button>
                        <button
                            onClick={() => setLoop(!loop)}
                            title="Repeat"
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                                loop
                                    ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,255,255,0.3)]"
                                    : "text-blue-200/50 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                            <MdRepeat size={20} />
                        </button>
                        <select
                            value={speed}
                            onChange={(e) => changeSpeed(Number(e.target.value))}
                            className="rounded-lg bg-blue-900/30 px-2 py-1 text-xs font-medium text-cyan-200/80 outline-none hover:bg-blue-900/50"
                        >
                            <option value={0.5}>0.5x</option>
                            <option value={0.75}>0.75x</option>
                            <option value={1}>1x</option>
                            <option value={1.25}>1.25x</option>
                            <option value={1.5}>1.5x</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x</option>
                        </select>
                    </div>

                    {/* Main Playback Controls */}
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => void step(-1)}
                            disabled={busy || tracks.length === 0}
                            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-30"
                        >
                            <MdSkipPrevious size={32} />
                        </button>

                        <button
                            onClick={() => void togglePlay()}
                            disabled={busy || tracks.length === 0}
                            className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 text-white shadow-[0_0_20px_rgba(0,255,255,0.4)] transition hover:scale-105 hover:bg-cyan-400 active:scale-95 disabled:opacity-50"
                        >
                            {isPlaying ? (
                                <MdPause size={36} />
                            ) : (
                                <MdPlayArrow size={36} className="ml-1" />
                            )}
                        </button>

                        <button
                            onClick={() => void step(1)}
                            disabled={busy || tracks.length === 0}
                            className="flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-white/10 disabled:opacity-30"
                        >
                            <MdSkipNext size={32} />
                        </button>
                    </div>

                    {/* Spacer for desktop layout balance */}
                    <div className="hidden w-40 sm:block" />
                </div>
            </div>

            {tracks.length > 0 ? (
                <div className="mt-8 flex flex-col gap-2">
                    <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400/60">
                        Library ({tracks.length})
                    </div>
                    {tracks.map((track, index) => {
                        const active = index === currentIndex;
                        return (
                            <button
                                key={track.id}
                                onClick={() => void playTrack(index)}
                                className={[
                                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.98]",
                                    active
                                        ? "border-cyan-400/60 bg-cyan-500/10 shadow-sm"
                                        : "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10",
                                ].join(" ")}
                            >
                                <div className="min-w-0">
                                    <div className={["truncate text-sm font-medium transition-colors", active ? "text-cyan-300" : "text-white"].join(" ")}>
                                        {track.title}
                                    </div>
                                    <div className="truncate text-xs text-blue-200/50">
                                        {track.artist || "Unknown Artist"}
                                    </div>
                                </div>
                                <div className="ml-4 shrink-0 font-mono text-[10px] text-blue-200/40">
                                    {track.durationSecs ? formatTime(track.durationSecs) : "--:--"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}
