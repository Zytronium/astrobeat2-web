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
        <form onSubmit={handleSubmit}>
            <label style={{ display: "block", color: "#999", fontSize: "0.8rem", marginBottom: 6 }}>
                Password
            </label>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
                style={{
                    width: "100%",
                    padding: "0.65rem 0.75rem",
                    background: "#0a0a0f",
                    border: "1px solid #2a2a3a",
                    borderRadius: 8,
                    color: "#fff",
                    fontSize: "1rem",
                    boxSizing: "border-box",
                    outline: "none",
                }}
            />

            {error && (
                <p style={{ color: "#f87171", fontSize: "0.8rem", margin: "0.5rem 0 0" }}>{error}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                style={{
                    marginTop: "1.25rem",
                    width: "100%",
                    padding: "0.7rem",
                    background: loading ? "#2a2a3a" : "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "1rem",
                    cursor: loading ? "default" : "pointer",
                    transition: "background 0.15s",
                }}
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>
        </form>
    );
}

// -------- page (wraps form in Suspense) --------
export default function LoginPage() {
    return (
        <main style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0f",
            fontFamily: "system-ui, sans-serif",
        }}>
            <div style={{
                background: "#13131a",
                border: "1px solid #2a2a3a",
                borderRadius: 12,
                padding: "2.5rem",
                width: "100%",
                maxWidth: 380,
            }}>
                <h1 style={{ color: "#fff", margin: "0 0 0.25rem", fontSize: "1.4rem" }}>Astrobeat 2</h1>
                <p style={{ color: "#666", margin: "0 0 2rem", fontSize: "0.875rem" }}>Upload access only</p>

                <Suspense fallback={<p style={{ color: "#555", fontSize: "0.875rem" }}>Loading...</p>}>
                    <LoginForm />
                </Suspense>
            </div>
        </main>
    );
}
