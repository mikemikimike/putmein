"use client";

import React from "react";
import BlogForm from "@/components/admin/BlogForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewBlogPost() {
  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </Link>

        <header className="mb-12">
          <h1 className="pixel-font text-4xl font-bold mb-2">Create New Post</h1>
          <p className="text-zinc-400">Fill in the details below to publish a new blog post.</p>
        </header>

        <BlogForm />
      </div>
    </div>
  );
}
