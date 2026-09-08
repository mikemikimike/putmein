"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2.5 mb-7">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 20px rgba(255,255,255,0.06)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="font-jersey text-white text-3xl tracking-wide">ray</span>
        </div>
        <h1 className="font-jersey text-4xl text-white mb-2 tracking-wide">Welcome back</h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          Sign in to your PutmeIn ray dashboard
        </p>
      </div>

      {/* Card */}
      <div
        className="p-7"
        style={{
          background: "#070707",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 0 40px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div
              className="animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#fca5a5",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="ray-eyebrow">Email</label>
            <input className="ray-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" autoFocus />
          </div>

          <div className="flex flex-col gap-2">
            <label className="ray-eyebrow">Password</label>
            <input className="ray-input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} className="ray-btn-primary w-full py-3 mt-1">
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Signing in…
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.15)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        </div>

        <div className="text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
          No account?{" "}
          <Link href="/register" className="font-medium text-white transition-opacity hover:opacity-70">
            Create one free
          </Link>
        </div>
      </div>

      <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.1)", fontFamily: "var(--font-mono)" }}>
        PutmeIn ray · Server monitoring & deployment
      </p>
    </div>
  );
}
