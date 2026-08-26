"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, Home, Globe, Users } from "lucide-react";

export default function AdminDashboard() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const res = await fetch("/api/blogs");
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/blogs/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBlogs(blogs.filter((b) => b.id !== id));
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
            <h1 className="pixel-font text-4xl md:text-5xl font-bold mb-2">CMS Dashboard</h1>
            <p className="text-zinc-400">Manage your blog posts and SEO settings.</p>
          </div>
          
          <div className="flex gap-4">
             <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all"
            >
              <Home size={18} />
              View Site
            </Link>
            <Link
              href="/admin/waitlist"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all text-green-400 hover:text-green-300"
            >
              <Users size={18} />
              Waitlist
            </Link>
            <Link
              href="/admin/contacts"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 transition-all text-amber-400 hover:text-amber-300"
            >
              <Globe size={18} /> {/* Using Globe or a similar icon since lucide-react doesn't export Mail by default here, but let's just stick to what was imported or use what's available. We'll add Mail to imports if needed */}
              View Messages
            </Link>
            <Link
              href="/admin/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              <Plus size={20} />
              Create New Post
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
            <p className="text-zinc-500 text-lg mb-6">No blog posts found.</p>
            <Link href="/admin/new" className="text-white font-bold hover:underline">
              Create your first post →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="group flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-zinc-900/50 border border-white/10 rounded-2xl hover:bg-zinc-900/80 transition-all backdrop-blur-sm"
              >
                <div className="flex-1 mb-4 md:mb-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold group-hover:text-pink-400 transition-colors">
                      {blog.title}
                    </h2>
                    {!blog.isPublished && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded border border-white/5">
                        Draft
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                     <span>/{blog.slug}</span>
                     <span>•</span>
                     <span>{new Date(blog.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   <Link
                    href={`/blogs/${blog.slug}`}
                    target="_blank"
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Globe size={20} />
                  </Link>
                  <Link
                    href={`/admin/edit/${blog.id}`}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Edit size={20} />
                  </Link>
                  <button
                    onClick={() => deleteBlog(blog.id)}
                    className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
