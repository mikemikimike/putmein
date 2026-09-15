"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check on mount whether setup is actually required
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/setup-status");
        if (res.ok) {
          const data = await res.json();
          if (!data.setupRequired) {
            // Setup already finished — bounce to login
            router.replace("/login");
            return;
          }
        }
      } catch {
        // Continue to show setup page if network is ok
      } finally {
        if (isMounted) setCheckingSetup(false);
      }
    }
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name or username.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Setup failed. Please check server logs.");
        return;
      }

      // Successful setup — redirect into dashboard
      window.location.href = "/chat";
    } catch {
      setError("Network connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    form.password &&
    form.confirmPassword &&
    form.password === form.confirmPassword;
  const passwordsMismatch =
    form.password &&
    form.confirmPassword &&
    form.password !== form.confirmPassword;

  if (checkingSetup) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg
          className="animate-spin text-white/50"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center flex-shrink-0">
            <Image
              src="/logo.svg"
              alt="Ray"
              width={36}
              height={36}
              className="w-9 h-9 object-contain drop-shadow-[0_0_16px_rgba(255,255,255,0.15)]"
              priority
            />
          </div>
          <span className="font-jersey text-white text-3xl tracking-wide">ray</span>
        </div>
        <h1 className="font-jersey text-4xl text-white mb-2 tracking-wide">
          Initial Setup
        </h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Create your administrator account to secure your platform
        </p>
      </div>

      {/* Card */}
      <div
        className="p-7"
        style={{
          background: "#070707",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.03), 0 0 40px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              className="animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#fca5a5",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="ray-eyebrow">Name / Username</label>
            <input
              className="ray-input"
              type="text"
              placeholder="e.g. admin or your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="ray-eyebrow">Email Address</label>
            <input
              className="ray-input"
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="ray-eyebrow">New Password</label>
              {form.password && (
                <span
                  className={`text-[10px] font-mono ${
                    form.password.length >= 8
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                >
                  {form.password.length >= 8
                    ? "✓ 8+ chars"
                    : `${form.password.length}/8 chars`}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                className="ray-input pr-14"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/40 hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="ray-eyebrow">Confirm Password</label>
              {form.confirmPassword && (
                <span
                  className={`text-[10px] font-mono ${
                    passwordsMatch ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {passwordsMatch ? "✓ Passwords match" : "Mismatch"}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                className="ray-input pr-14"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm({ ...form, confirmPassword: e.target.value })
                }
                required
                autoComplete="new-password"
                style={
                  passwordsMismatch
                    ? { borderColor: "rgba(239,68,68,0.35)" }
                    : {}
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white/40 hover:text-white px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ray-btn-primary w-full py-3 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Configuring platform…
              </span>
            ) : (
              "Complete Setup & Launch"
            )}
          </button>
        </form>
      </div>

      <p
        className="text-center text-xs mt-6"
        style={{
          color: "rgba(255,255,255,0.15)",
          fontFamily: "var(--font-mono)",
        }}
      >
        PutmeIn ray · First-time administrator configuration
      </p>
    </div>
  );
}
