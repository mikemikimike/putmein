"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function WaitlistAdmin() {
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const res = await fetch("/api/waitlist");
      const data = await res.json();
      setWaitlist(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Are you sure you want to delete this waitlist entry?")) return;

    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWaitlist(waitlist.filter((entry) => entry.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/admin" className="p-2 hover:bg-zinc-900 rounded-lg transition-colors text-zinc-400 hover:text-white">
                <ArrowLeft size={24} />
              </Link>
              <h1 className="pixel-font text-4xl md:text-5xl font-bold">Waitlist</h1>
            </div>
            <p className="text-zinc-400">Manage early access waitlist entries.</p>
          </div>
          
          <div className="bg-zinc-900 px-6 py-3 rounded-xl border border-white/10">
            <span className="text-2xl font-bold text-green-400">{waitlist.length}</span>
            <span className="text-zinc-500 ml-2">Total Signups</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : waitlist.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
            <p className="text-zinc-500 text-lg">No waitlist entries yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {waitlist.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col p-6 bg-zinc-900/50 border border-white/10 rounded-2xl relative group"
              >
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-zinc-800 rounded-lg"
                  title="Delete Entry"
                >
                  <Trash2 size={16} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-1 pr-10">{entry.name}</h3>
                <div className="text-sm text-zinc-400 mb-4 space-y-1">
                  <p className="flex items-center gap-2">
                    <span className="text-zinc-500 w-12">Email:</span> 
                    <a href={`mailto:${entry.email}`} className="hover:text-white transition-colors">{entry.email}</a>
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-zinc-500 w-12">Phone:</span> 
                    {entry.phone}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-zinc-500 w-12">Date:</span> 
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="mt-auto bg-black/40 p-4 rounded-xl border border-white/5">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-2 block focus:outline-none">Why they want this product:</span>
                  <p className="text-sm text-zinc-300 italic">"{entry.reason}"</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
