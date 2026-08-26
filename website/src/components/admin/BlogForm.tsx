"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BlogFormProps {
  initialData?: any;
  isEditing?: boolean;
}

export default function BlogForm({ initialData, isEditing }: BlogFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    coverImage: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    isPublished: false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        slug: initialData.slug || "",
        content: initialData.content || "",
        excerpt: initialData.excerpt || "",
        coverImage: initialData.coverImage || "",
        metaTitle: initialData.metaTitle || "",
        metaDescription: initialData.metaDescription || "",
        metaKeywords: initialData.metaKeywords || "",
        isPublished: initialData.isPublished || false,
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const finalValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    setFormData((prev) => {
      const newData = { ...prev, [name]: finalValue };
      // Auto-generate slug from title if not manually edited or if it's a new post
      if (name === "title" && !isEditing) {
        newData.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/blogs/${initialData.id}` : "/api/blogs";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      router.push("/admin");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-white/10 backdrop-blur-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-400">Title</label>
          <input
            required
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-medium"
            placeholder="Blog Title"
          />
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-zinc-400">Slug (SEO-friendly URL)</label>
          <input
            required
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-mono text-sm"
            placeholder="blog-slug"
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-zinc-400">Content (Markdown or HTML)</label>
        <textarea
          required
          name="content"
          value={formData.content}
          onChange={handleChange}
          rows={12}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-sans text-base resize-none"
          placeholder="Write your blog content here..."
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-zinc-400">Excerpt (Short summary)</label>
        <textarea
          name="excerpt"
          value={formData.excerpt}
          onChange={handleChange}
          rows={3}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all resize-none"
          placeholder="Bried summary of the blog post"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-pink-400/80">Meta Title</label>
          <input
            name="metaTitle"
            value={formData.metaTitle}
            onChange={handleChange}
            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
          />
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium text-pink-400/80">Meta Keywords</label>
          <input
            name="metaKeywords"
            value={formData.metaKeywords}
            onChange={handleChange}
            className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500/50"
          />
        </div>
        <div className="space-y-4 md:col-span-1">
           <label className="flex items-center gap-3 cursor-pointer mt-8">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={handleChange}
                className="w-5 h-5 rounded border-white/10 bg-black/40 text-pink-500 focus:ring-pink-500/50"
              />
              <span className="text-sm font-medium text-zinc-300">Publish immediately</span>
           </label>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-pink-400/80">Meta Description</label>
        <textarea
          name="metaDescription"
          value={formData.metaDescription}
          onChange={handleChange}
          rows={2}
          className="w-full bg-black/20 border border-white/5 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-pink-500/50 resize-none"
        />
      </div>

      <div className="flex gap-4 pt-6">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
        >
          {loading ? "Saving..." : isEditing ? "Update Post" : "Create Post"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="px-8 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-all border border-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
