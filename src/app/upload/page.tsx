"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// -------- types --------
interface UploadMeta {
    title: string;
    artist: string;
    album: string;
    genre: string;
    tagInput: string;
    tags: string[];
    durationSecs: number | null;
}

type UploadStatus = "idle" | "uploading" | "saving" | "done" | "error";

const EMPTY_META: UploadMeta = {
    title: "",
    artist: "",
    album: "",
    genre: "",
    tagInput: "",
    tags: [],
    durationSecs: null,
};

// -------- component --------
export default function UploadPage() {
    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const [meta, setMeta] = useState<UploadMeta>(EMPTY_META);
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");

    const durationRef = useRef<number | null>(null);
    const metaRef = useRef(meta);
    useEffect(() => {
        metaRef.current = meta;
    }, [meta]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    // -------- file handling --------
    function applyFile(f: File) {
        if (!f.type.startsWith("audio/")) {
            setErrorMsg("Only audio files are supported.");
            return;
        }
        setErrorMsg("");
        setFile(f);
        setStatus("idle");
        setProgress(0);
        durationRef.current = null;
        setMeta(m => ({ ...m, durationSecs: null }));

        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(f));

        if (!meta.title) {
            const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
            setMeta((m) => ({ ...m, title: m.title || name }));
        }
    }

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) applyFile(f);
        e.target.value = "";
    }

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) applyFile(f);
    }, [previewUrl, meta.title]);

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave() {
        setDragging(false);
    }

    // -------- tag handling --------
    function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag();
        }
    }

    function addTag() {
        const tag = meta.tagInput.trim().toLowerCase();
        if (tag && !meta.tags.includes(tag)) {
            setMeta((m) => ({ ...m, tags: [...m.tags, tag], tagInput: "" }));
        } else {
            setMeta((m) => ({ ...m, tagInput: "" }));
        }
    }

    function removeTag(tag: string) {
        setMeta((m) => ({ ...m, tags: m.tags.filter((t) => t !== tag) }));
    }

    // -------- upload --------
    async function handleUpload() {
        if (!file) return;
        setStatus("uploading");
        setProgress(0);
        setErrorMsg("");

        try {
            const presignRes = await fetch("/api/upload/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileName: file.name,
                    mimeType: file.type,
                    fileSizeBytes: file.size,
                }),
            });

            if (!presignRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl, r2Key } = await presignRes.json();

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", uploadUrl);
                xhr.setRequestHeader("Content-Type", file.type);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
                };

                xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 upload failed: ${xhr.status}`)));
                xhr.onerror = () => reject(new Error("Network error during upload"));
                xhr.send(file);
            });

            setProgress(100);
            setStatus("saving");

            const saveRes = await fetch("/api/tracks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: metaRef.current.title || file.name,
                    artist: metaRef.current.artist || null,
                    album: metaRef.current.album || null,
                    genre: metaRef.current.genre || null,
                    tags: metaRef.current.tags.length ? metaRef.current.tags : null,
                    durationSecs: durationRef.current,
                    r2Key,
                    fileName: file.name,
                    fileSizeBytes: file.size,
                    mimeType: file.type,
                }),
            });

            if (!saveRes.ok) throw new Error("Failed to save track metadata");

            setStatus("done");

            setTimeout(() => {
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setMeta(EMPTY_META);
                durationRef.current = null;
                setStatus("idle");
                setProgress(0);
            }, 2500);
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : "Upload failed");
            setStatus("error");
        }
    }

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    const busy = status === "uploading" || status === "saving";

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-950 to-purple-950 px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-2xl">

                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-400/30 bg-blue-950/40 shadow-lg shadow-cyan-500/20 p-5 backdrop-blur sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight bg-linear-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                            Upload track
                        </h1>
                        <p className="text-sm text-blue-200/70">Add audio to your library</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="rounded-xl border border-cyan-400/30 bg-blue-950/60 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 hover:text-white"
                    >
                        Sign out
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={[
                        "mb-6 flex flex-col items-center justify-center rounded-2xl border-2 p-8 text-center transition",
                        dragging
                            ? "border-cyan-400 bg-cyan-500/10 backdrop-blur"
                            : file
                                ? "border-cyan-400/30 bg-blue-950/40 backdrop-blur"
                                : "border-dashed border-cyan-400/30 bg-blue-950/20 hover:border-cyan-400/60",
                    ].join(" ")}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileInput}
                        className="hidden"
                    />

                    {file ? (
                        <div>
                            <p className="mb-2 text-sm font-medium text-cyan-300">{file.name}</p>
                            <p className="text-xs text-blue-300/60">
                                {(file.size / 1024 / 1024).toFixed(1)} MB - {file.type}
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}
                                className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/20 hover:text-cyan-100"
                            >
                                Replace file
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p className="mb-1 text-blue-200">Drop audio file here</p>
                            <p className="text-xs text-blue-300/60">or click to browse</p>
                        </div>
                    )}
                </div>

                {/* Preview player */}
                {previewUrl && (
                    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-cyan-500/30 bg-blue-950/40 p-4 backdrop-blur">
                        <div className="text-xs uppercase tracking-widest text-cyan-300/70">Preview</div>
                        <audio
                            ref={audioRef}
                            src={previewUrl}
                            onLoadedMetadata={(e) => {
                                const d = e.currentTarget.duration;
                                if (isFinite(d)) {
                                    const secs = Math.floor(d);
                                    durationRef.current = secs;
                                    setMeta(m => ({ ...m, durationSecs: secs }));
                                }
                            }}
                            controls
                            className="w-full accent-cyan-400"
                        />
                    </div>
                )}

                {/* Metadata fields */}
                {file && (
                    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-cyan-500/30 bg-blue-950/40 p-5 backdrop-blur">
                        <Field
                            label="Title *"
                            value={meta.title}
                            onChange={(v) => setMeta((m) => ({ ...m, title: v }))}
                            placeholder="Track title"
                        />
                        <Field
                            label="Artist"
                            value={meta.artist}
                            onChange={(v) => setMeta((m) => ({ ...m, artist: v }))}
                            placeholder="Artist name"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Album"
                                value={meta.album}
                                onChange={(v) => setMeta((m) => ({ ...m, album: v }))}
                                placeholder="Album"
                            />
                            <Field
                                label="Genre"
                                value={meta.genre}
                                onChange={(v) => setMeta((m) => ({ ...m, genre: v }))}
                                placeholder="Genre"
                            />
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-300/70">
                                Tags
                            </label>
                            <div className="flex flex-wrap gap-2 rounded-xl border border-cyan-500/20 bg-blue-950/60 p-3">
                                {meta.tags.map((tag) => (
                                    <div
                                        key={tag}
                                        className="flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            className="ml-1 font-bold text-cyan-300 hover:text-cyan-100"
                                        >
                                            x
                                        </button>
                                    </div>
                                ))}
                                <input
                                    value={meta.tagInput}
                                    onChange={(e) => setMeta((m) => ({ ...m, tagInput: e.target.value }))}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={addTag}
                                    placeholder={meta.tags.length === 0 ? "Add tags..." : ""}
                                    className="flex-1 min-w-[120px] bg-transparent text-sm text-blue-100 placeholder-blue-400/40 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {(status === "uploading" || status === "saving") && (
                    <div className="mb-4">
                        <div className="h-1.5 overflow-hidden rounded-full bg-blue-950/60">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full transition-all duration-200"
                                style={{
                                    width: `${status === "saving" ? 100 : progress}%`,
                                }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-blue-300/60">
                            {status === "saving"
                                ? "Saving metadata..."
                                : `Uploading... ${progress}%`}
                        </p>
                    </div>
                )}

                {/* Status messages */}
                {status === "done" && (
                    <p className="mb-4 text-sm font-medium text-emerald-400">
                        Track uploaded successfully!
                    </p>
                )}
                {(status === "error" || (status === "idle" && errorMsg)) && (
                    <p className="mb-4 text-sm text-red-400">{errorMsg}</p>
                )}

                {/* Upload button */}
                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={busy || !meta.title}
                        className={[
                            "w-full rounded-xl px-6 py-3 font-medium transition",
                            status === "done"
                                ? "bg-emerald-500/40 text-emerald-200 border border-emerald-400/50"
                                : busy
                                    ? "bg-blue-950/60 text-blue-400/50 border border-blue-800/40 cursor-not-allowed"
                                    : !meta.title
                                        ? "bg-cyan-500/20 text-cyan-300/50 border border-cyan-400/20 cursor-not-allowed"
                                        : "border border-cyan-400/40 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/40 hover:brightness-110",
                        ].join(" ")}
                    >
                        {status === "uploading"
                            ? `Uploading... ${progress}%`
                            : status === "saving"
                                ? "Saving..."
                                : status === "done"
                                    ? "Done!"
                                    : !meta.title
                                        ? "Add a title to upload"
                                        : "Upload track"}
                    </button>
                )}
            </div>
        </main>
    );
}

// -------- Field subcomponent --------
function Field({
                   label,
                   value,
                   onChange,
                   placeholder,
               }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-300/70">
                {label}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-cyan-500/20 bg-blue-950/60 px-3 py-2.5 text-sm text-blue-50 placeholder-blue-400/40 transition focus:border-cyan-400/60 focus:bg-blue-950/80 focus:outline-none"
            />
        </div>
    );
}
