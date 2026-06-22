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
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
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

            <div className="flex flex-col gap-3">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-white/50">
                        Now playing
                    </div>
                    <div className="truncate text-lg font-medium text-white">
                        {currentTrack ? currentTrack.title : "Nothing selected"}
                    </div>
                    <div className="truncate text-sm text-white/60">
                        {currentTrack?.artist || "Choose a track to start"}
                    </div>
                </div>

            </div>

            {error ? (
                <p className="mt-3 text-sm text-red-300">{error}</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-5">

                <div className="flex items-center gap-3 text-sm text-white/60">
    <span className="w-10 text-right">
      {formatTime(currentTime)}
    </span>

                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        value={currentTime}
                        onChange={(e) => seek(Number(e.target.value))}
                        className="flex-1 accent-white"
                    />

                    <span className="w-10">
      {formatTime(duration)}
    </span>
                </div>


                <div className="flex items-center justify-between">

                    <div className="w-20" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShuffle(!shuffle)}
                            className={`rounded-full border px-4 py-3 transition ${
                                shuffle
                                    ? "border-white bg-white text-black"
                                    : "border-white/10 bg-black/30 text-white hover:bg-white/10"
                            }`}
                        >
                            <MdShuffle size={20} />
                        </button>

                        <button
                            onClick={() => void step(-1)}
                            disabled={busy || tracks.length === 0}
                            className="rounded-full border border-white/10 bg-black/30 px-4 py-3 text-white hover:bg-white/10 disabled:opacity-40"
                        >
                            <MdSkipPrevious size={22} />
                        </button>

                        <button
                            onClick={() => void togglePlay()}
                            disabled={busy || tracks.length === 0}
                            className="rounded-full bg-white px-6 py-3 font-medium text-black hover:bg-white/90 disabled:opacity-40"
                        >
                            {isPlaying ? (
                                <MdPause size={24} />
                            ) : (
                                <MdPlayArrow size={24} />
                            )}
                        </button>

                        <button
                            onClick={() => void step(1)}
                            disabled={busy || tracks.length === 0}
                            className="rounded-full border border-white/10 bg-black/30 px-4 py-3 text-white hover:bg-white/10 disabled:opacity-40"
                        >
                            <MdSkipNext size={22} />
                        </button>

                        <button
                            onClick={() => setLoop(!loop)}
                            className={`rounded-full border px-4 py-3 transition ${
                                loop
                                    ? "border-white bg-white text-black"
                                    : "border-white/10 bg-black/30 text-white hover:bg-white/10"
                            }`}
                        >
                            <MdRepeat size={20} />
                        </button>
                    </div>


                    <select
                        value={speed}
                        onChange={(e) => changeSpeed(Number(e.target.value))}
                        className="w-20 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-white"
                    >
                        <option value={0.5}>0.5×</option>
                        <option value={0.75}>0.75×</option>
                        <option value={1}>1×</option>
                        <option value={1.25}>1.25×</option>
                        <option value={1.5}>1.5×</option>
                        <option value={2}>2×</option>
                    </select>

                </div>

            </div>

            {tracks.length > 0 ? (
                <div className="mt-5 grid gap-2">
                    {tracks.map((track, index) => {
                        const active = index === currentIndex;
                        return (
                            <button
                                key={track.id}
                                onClick={() => void playTrack(index)}
                                className={[
                                    "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                                    active
                                        ? "border-white/20 bg-white/10"
                                        : "border-white/10 bg-black/20 hover:bg-black/30",
                                ].join(" ")}
                            >
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-white">
                                        {track.title}
                                    </div>
                                    <div className="truncate text-xs text-white/55">
                                        {track.artist || "Unknown artist"}
                                        {track.album ? ` • ${track.album}` : ""}
                                    </div>
                                </div>
                                <div className="ml-4 shrink-0 text-xs text-white/40">
                                    {track.durationSecs ? `${Math.round(track.durationSecs)}s` : "—"}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </section>
    );
}
