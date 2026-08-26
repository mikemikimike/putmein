import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Article, WithContext } from "schema-dts";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post) return {};

  return {
    title: post.metaTitle || `${post.title} - Putme.in`,
    description: post.metaDescription || post.excerpt,
    keywords: post.metaKeywords,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      images: post.coverImage ? [post.coverImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || undefined,
      images: post.coverImage ? [post.coverImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
  });

  if (!post || !post.isPublished) {
    notFound();
  }

  // Article Schema for AEO/GEO optimization
  const jsonLd: WithContext<Article> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt || undefined,
    image: post.coverImage || undefined,
    datePublished: post.createdAt.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: {
      "@type": "Organization",
      name: "Putme.in",
      url: "https://putme.in",
    },
  };

  return (
    <article className="min-h-screen bg-black text-white py-24 px-6 md:px-16">
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 space-y-6">
          <div className="flex items-center gap-3 text-sm font-mono text-zinc-500 uppercase tracking-widest">
            <time dateTime={post.createdAt.toISOString()}>
                {new Date(post.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </time>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-xl text-zinc-400 font-light leading-relaxed italic">
              {post.excerpt}
            </p>
          )}

          {post.coverImage && (
            <div className="aspect-video w-full overflow-hidden rounded-3xl border border-white/10 mt-12 mb-20">
               <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
        </header>

        <section 
          className="prose prose-invert prose-pink max-w-none text-zinc-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        <footer className="mt-24 pt-12 border-t border-white/10">
           <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <h3 className="text-2xl font-bold mb-2">Ready to scale?</h3>
              <p className="text-zinc-400 mb-6 max-w-md">
                 Stop managing infrastructure and start building the future today.
              </p>
              <Link href="/" className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all">
                 Get Early Access
              </Link>
           </div>
        </footer>
      </div>
    </article>
  );
}
