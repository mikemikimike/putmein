"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, X, Sparkles } from "lucide-react";

interface InlineWaitlistProps {
  product: "ozias" | "cohen";
  buttonText?: string;
  placeholder?: string;
  className?: string;
}

export default function InlineWaitlist({
  product,
  buttonText,
  placeholder = "Enter your work email...",
  className = "",
}: InlineWaitlistProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultButtonLabel =
    product === "ozias" ? "Join Ozias Waitlist" : "Join Cohen Waitlist";
  const displayButtonText = buttonText || defaultButtonLabel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint =
        product === "ozias" ? "/api/waitlist/ozias" : "/api/waitlist/cohen";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join waitlist. Please try again.");
      }

      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-zinc-950/90 border border-green-500/30 text-white shadow-[0_0_30px_rgba(34,197,94,0.15)]"
          >
            <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium text-zinc-200">
              You&apos;re on the list! We&apos;ll be in touch soon.
            </span>
          </motion.div>
        ) : !isOpen ? (
          <motion.button
            key="button"
            type="button"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-black font-semibold rounded-xl text-sm transition-all hover:bg-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-black group-hover:rotate-12 transition-transform" />
            <span>{displayButtonText}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md flex flex-col items-center gap-2"
          >
            <div className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/90 border border-white/20 shadow-2xl backdrop-blur-xl">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={placeholder}
                className="flex-1 min-w-0 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-black font-semibold rounded-xl text-xs sm:text-sm hover:bg-zinc-200 transition-all flex-shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <span>Join</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-red-400 font-mono text-center mt-1"
              >
                {error}
              </motion.p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
