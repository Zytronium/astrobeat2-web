"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// -------- types --------
interface UploadMeta {
    title: string;
    artist: string;
    album: string;
    genre: string;
    tagInput: string;
    tags: string[];
}

type UploadStatus = "idle" | "uploading" | "saving" | "done" | "error";

const EMPTY_META: UploadMeta = {
    title: "",
    artist: "",
    album: "",
    genre: "",
    tagInput: "",
    tags: [],
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

        // Revoke old blob URL before creating a new one
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(f));

        // Pre-fill title from filename if blank
        if (!meta.title) {
            const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
            setMeta((m) => ({ ...m, title: m.title || name }));
        }
    }

    function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (f) applyFile(f);
        e.target.value = ""; // reset so the same file can be re-selected
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
            // 1. Get presigned URL
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

            // 2. Upload to R2 with XHR so we get progress events
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

            // 3. Save metadata to Neon via your existing POST /api/tracks
            const saveRes = await fetch("/api/tracks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: meta.title || file.name,
                    artist: meta.artist || null,
                    album: meta.album || null,
                    genre: meta.genre || null,
                    tags: meta.tags.length ? meta.tags : null,
                    r2Key,
                    fileName: file.name,
                    fileSizeBytes: file.size,
                    mimeType: file.type,
                }),
            });

            if (!saveRes.ok) throw new Error("Failed to save track metadata");

            setStatus("done");

            // Reset after a moment
            setTimeout(() => {
                setFile(null);
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setMeta(EMPTY_META);
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

    // -------- render helpers --------
    const busy = status === "uploading" || status === "saving";

    return (
        <main style={{
            minHeight: "100vh",
            background: "#0a0a0f",
            color: "#e2e2e8",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem 1rem",
        }}>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#fff" }}>Astrobeat 2</h1>
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "#555" }}>Upload a track</p>
                    </div>
                    <button onClick={handleLogout} style={ghostBtn}>Sign out</button>
                </div>

                {/* Drop zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !file && fileInputRef.current?.click()}
                    style={{
                        border: `2px dashed ${dragging ? "#6366f1" : file ? "#3a3a5a" : "#2a2a3a"}`,
                        borderRadius: 12,
                        padding: "2rem",
                        textAlign: "center",
                        cursor: file ? "default" : "pointer",
                        background: dragging ? "#13132a" : "#0f0f18",
                        transition: "all 0.15s",
                        marginBottom: "1.5rem",
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileInput}
                        style={{ display: "none" }}
                    />

                    {file ? (
                        <div>
                            <p style={{ margin: "0 0 0.25rem", color: "#a5b4fc", fontWeight: 500 }}>{file.name}</p>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#555" }}>
                                {(file.size / 1024 / 1024).toFixed(1)} MB - {file.type}
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                style={{ ...ghostBtn, marginTop: "0.75rem", fontSize: "0.8rem" }}
                            >
                                Replace file
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ margin: "0 0 0.25rem", color: "#666", fontSize: "0.95rem" }}>
                                Drop an audio file here
                            </p>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "#444" }}>
                                or click to browse
                            </p>
                        </div>
                    )}
                </div>

                {/* Preview player */}
                {previewUrl && (
                    <div style={{
                        background: "#13131a",
                        border: "1px solid #2a2a3a",
                        borderRadius: 10,
                        padding: "1rem",
                        marginBottom: "1.5rem",
                    }}>
                        <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Preview
                        </p>
                        <audio
                            ref={audioRef}
                            src={previewUrl}
                            controls
                            style={{ width: "100%", accentColor: "#6366f1" }}
                        />
                    </div>
                )}

                {/* Metadata fields */}
                {file && (
                    <div style={{
                        background: "#13131a",
                        border: "1px solid #2a2a3a",
                        borderRadius: 10,
                        padding: "1.25rem",
                        marginBottom: "1.5rem",
                        display: "grid",
                        gap: "1rem",
                    }}>
                        <Field label="Title *" value={meta.title} onChange={(v) => setMeta((m) => ({ ...m, title: v }))} placeholder="Track title" />
                        <Field label="Artist" value={meta.artist} onChange={(v) => setMeta((m) => ({ ...m, artist: v }))} placeholder="Artist name" />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <Field label="Album" value={meta.album} onChange={(v) => setMeta((m) => ({ ...m, album: v }))} placeholder="Album name" />
                            <Field label="Genre" value={meta.genre} onChange={(v) => setMeta((m) => ({ ...m, genre: v }))} placeholder="e.g. Electronic" />
                        </div>

                        {/* Tags */}
                        <div>
                            <label style={labelStyle}>Tags</label>
                            <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.4rem",
                                padding: "0.5rem",
                                background: "#0a0a0f",
                                border: "1px solid #2a2a3a",
                                borderRadius: 8,
                                minHeight: 42,
                            }}>
                                {meta.tags.map((tag) => (
                                    <span key={tag} style={{
                                        background: "#1e1e3a",
                                        color: "#a5b4fc",
                                        border: "1px solid #3a3a6a",
                                        borderRadius: 20,
                                        padding: "0.2rem 0.6rem",
                                        fontSize: "0.78rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                    }}>
                    {tag}
                                        <button
                                            onClick={() => removeTag(tag)}
                                            style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1 }}
                                        >
                      x
                    </button>
                  </span>
                                ))}
                                <input
                                    value={meta.tagInput}
                                    onChange={(e) => setMeta((m) => ({ ...m, tagInput: e.target.value }))}
                                    onKeyDown={handleTagKeyDown}
                                    onBlur={addTag}
                                    placeholder={meta.tags.length === 0 ? "Add tags (Enter or comma to add)" : ""}
                                    style={{
                                        flex: 1,
                                        minWidth: 120,
                                        background: "none",
                                        border: "none",
                                        outline: "none",
                                        color: "#e2e2e8",
                                        fontSize: "0.875rem",
                                        padding: "0.1rem 0.25rem",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {(status === "uploading" || status === "saving") && (
                    <div style={{ marginBottom: "1rem" }}>
                        <div style={{
                            background: "#1a1a2a",
                            borderRadius: 999,
                            height: 6,
                            overflow: "hidden",
                        }}>
                            <div style={{
                                height: "100%",
                                width: `${status === "saving" ? 100 : progress}%`,
                                background: "#6366f1",
                                borderRadius: 999,
                                transition: "width 0.2s",
                            }} />
                        </div>
                        <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#555" }}>
                            {status === "saving" ? "Saving metadata..." : `Uploading... ${progress}%`}
                        </p>
                    </div>
                )}

                {/* Status messages */}
                {status === "done" && (
                    <p style={{ color: "#4ade80", fontSize: "0.9rem", marginBottom: "1rem" }}>
                        Track uploaded successfully!
                    </p>
                )}
                {status === "error" && errorMsg && (
                    <p style={{ color: "#f87171", fontSize: "0.9rem", marginBottom: "1rem" }}>{errorMsg}</p>
                )}
                {status === "idle" && errorMsg && (
                    <p style={{ color: "#f87171", fontSize: "0.9rem", marginBottom: "1rem" }}>{errorMsg}</p>
                )}

                {/* Upload button */}
                {file && (
                    <button
                        onClick={handleUpload}
                        disabled={busy || !meta.title}
                        style={{
                            width: "100%",
                            padding: "0.85rem",
                            background: busy ? "#2a2a3a" : status === "done" ? "#166534" : "#6366f1",
                            color: busy ? "#555" : "#fff",
                            border: "none",
                            borderRadius: 10,
                            fontSize: "1rem",
                            fontWeight: 500,
                            cursor: busy || !meta.title ? "default" : "pointer",
                            transition: "background 0.15s",
                        }}
                    >
                        {status === "uploading" ? `Uploading... ${progress}%` :
                            status === "saving" ? "Saving..." :
                                status === "done" ? "Done!" :
                                    !meta.title ? "Add a title to upload" :
                                        "Upload track"}
                    </button>
                )}
            </div>
        </main>
    );
}

// -------- shared styles --------
const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.75rem",
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 6,
};

const ghostBtn: React.CSSProperties = {
    background: "none",
    border: "1px solid #2a2a3a",
    color: "#666",
    borderRadius: 8,
    padding: "0.4rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.875rem",
};

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
            <label style={labelStyle}>{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: "100%",
                    padding: "0.6rem 0.75rem",
                    background: "#0a0a0f",
                    border: "1px solid #2a2a3a",
                    borderRadius: 8,
                    color: "#e2e2e8",
                    fontSize: "0.9rem",
                    boxSizing: "border-box",
                    outline: "none",
                }}
            />
        </div>
    );
}
