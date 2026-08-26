"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Clock, Trash2 } from "lucide-react";

export default function ContactsAdminPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetch(`/api/contact/${id}`, { method: "DELETE" });
      if (res.ok) {
        setContacts(contacts.filter((c) => c.id !== id));
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
            <h1 className="pixel-font text-4xl md:text-5xl font-bold mb-2 flex items-center gap-3">
              <Mail className="text-amber-400" size={40} />
              Contact Messages
            </h1>
            <p className="text-zinc-400">View and manage messages from the contact form.</p>
          </div>
          
          <div className="flex gap-4">
             <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
            <p className="text-zinc-500 text-lg">No messages found.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="group flex flex-col p-6 bg-zinc-900/50 border border-white/10 rounded-2xl hover:bg-zinc-900/80 transition-all backdrop-blur-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      {contact.subject}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="font-medium text-amber-400/90">{contact.name}</span>
                      <span>•</span>
                      <a href={`mailto:${contact.email}`} className="hover:text-amber-400 transition-colors">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 whitespace-nowrap">
                      <Clock size={12} />
                      {new Date(contact.createdAt).toLocaleDateString()} {new Date(contact.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete message"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                  <p className="text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {contact.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
