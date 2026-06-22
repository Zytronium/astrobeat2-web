"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// -------- inner component (uses useSearchParams) --------
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const next = searchParams.get("next") ?? "/upload";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push(next);
            } else {
                setError("Incorrect password.");
            }
        } catch {
            setError("Something went wrong. Try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="mb-2 block text-xs uppercase tracking-widest text-cyan-300/70">
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    required
                    className="w-full rounded-lg border border-cyan-500/20 bg-blue-950/60 px-3 py-2.5 text-sm text-blue-50 placeholder-blue-400/40 transition focus:border-cyan-400/60 focus:bg-blue-950/80 focus:outline-none"
                />
            </div>

            {error && (
                <p className="text-xs text-red-400">{error}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className={[
                    "rounded-lg px-4 py-2.5 font-medium transition",
                    loading
                        ? "bg-cyan-500/20 text-cyan-300/50 border border-cyan-400/20 cursor-not-allowed"
                        : "border border-cyan-400/40 bg-linear-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/40 hover:brightness-110",
                ].join(" ")}
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>
    );
}

// -------- page (wraps form in Suspense) --------
export default function LoginPage() {
    return (
        <main className="min-h-screen bg-linear-to-br from-blue-950 via-blue-950 to-purple-950 flex items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-2xl border border-cyan-400/30 bg-blue-950/40 shadow-lg shadow-cyan-500/20 p-8 backdrop-blur">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight bg-linear-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                        Astrobeat
                    </h1>
                    <p className="mt-1 text-sm text-blue-200/70">Upload access only</p>
                </div>

                <Suspense fallback={<p className="text-xs text-blue-300/60">Loading...</p>}>
                    <LoginForm />
                </Suspense>
            </div>
        </main>
    );
}
