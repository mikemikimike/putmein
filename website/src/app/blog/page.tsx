import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';
import type { Metadata } from 'next';
import { Blog, WithContext } from 'schema-dts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog — Insights on DevOps, SRE & Infrastructure | Putme.in',
  description:
    'Deep dives into DevOps automation, SRE best practices, infrastructure scaling, and the future of engineering operations. Written by the PutMe.in team.',
  keywords: 'DevOps, SRE, infrastructure automation, platform engineering, Kubernetes, CI/CD, monitoring, incident response, PutMe.in blog',
  openGraph: {
    title: 'Blog — Insights on DevOps, SRE & Infrastructure | Putme.in',
    description:
      'Deep dives into DevOps automation, SRE best practices, infrastructure scaling, and the future of engineering operations.',
    type: 'website',
    url: 'https://putme.in/blog',
    siteName: 'Putme.in',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Insights on DevOps, SRE & Infrastructure | Putme.in',
    description:
      'Deep dives into DevOps automation, SRE best practices, and the future of engineering operations.',
  },
  alternates: {
    canonical: 'https://putme.in/blog',
  },
};

export default async function BlogPage() {
  let posts: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    coverImage: string | null;
    metaKeywords: string | null;
    createdAt: Date;
  }[] = [];

  try {
    posts = await prisma.post.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        metaKeywords: true,
        createdAt: true,
      },
    });
  } catch {
    // DB might not be available during build
  }

  // Blog structured data for SEO/AEO/GEO
  const jsonLd: WithContext<Blog> = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Putme.in Blog',
    description:
      'Insights on DevOps, SRE, infrastructure automation, and platform engineering.',
    url: 'https://putme.in/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Putme.in',
      url: 'https://putme.in',
    },
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting' as const,
      headline: post.title,
      description: post.excerpt || undefined,
      url: `https://putme.in/blog/${post.slug}`,
      datePublished: post.createdAt.toISOString(),
      image: post.coverImage || undefined,
    })),
  };

  // Extract all unique tags from posts
  const allTags = Array.from(
    new Set(
      posts
        .flatMap((p) => (p.metaKeywords ? p.metaKeywords.split(',').map((t) => t.trim()) : []))
        .filter(Boolean)
    )
  ).slice(0, 12);

  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      <Navbar />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-16 px-6 md:px-16 max-w-7xl mx-auto text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-transparent pointer-events-none" />
        <span className="text-sm font-semibold text-pink-400 uppercase tracking-widest mb-4 block relative z-10">
          The Lab
        </span>
        <h1 className="pixel-font text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10">
          Engineering{' '}
          <span className="bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            Insights
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 font-light">
          Deep dives into the future of infrastructure, SRE automation, and DevOps best practices from the PutMe.in team.
        </p>
      </section>

      {/* Tags / Categories */}
      {allTags.length > 0 && (
        <section className="px-6 md:px-16 max-w-7xl mx-auto pb-8">
          <div className="flex flex-wrap justify-center gap-3">
            {allTags.map((tag) => (
              <span
                key={tag}
                className="px-4 py-1.5 text-xs font-medium rounded-full border border-white/10 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-white/20 transition-all cursor-default"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {posts.length === 0 ? (
        /* Empty State */
        <section className="py-32 px-6 md:px-16 max-w-7xl mx-auto text-center">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-16 backdrop-blur-sm max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Coming Soon</h2>
            <p className="text-zinc-500 text-lg">
              We&apos;re crafting insightful articles on DevOps, SRE, and infrastructure. Check back soon!
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Featured Post */}
          {featuredPost && (
            <section className="px-6 md:px-16 max-w-7xl mx-auto pb-12">
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="group block rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-white/20 hover:bg-zinc-800/30 hover:shadow-2xl hover:shadow-pink-500/5"
              >
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Image */}
                  {featuredPost.coverImage ? (
                    <div className="aspect-video md:aspect-auto md:min-h-[360px] overflow-hidden relative">
                      <img
                        src={featuredPost.coverImage}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/50 md:block hidden" />
                    </div>
                  ) : (
                    <div className="aspect-video md:aspect-auto md:min-h-[360px] bg-gradient-to-br from-pink-500/10 via-zinc-900 to-purple-500/10 flex items-center justify-center">
                      <svg className="w-20 h-20 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                        Featured
                      </span>
                      <time
                        dateTime={featuredPost.createdAt.toISOString()}
                        className="text-xs font-mono text-zinc-500"
                      >
                        {new Date(featuredPost.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight group-hover:text-pink-400 transition-colors duration-300">
                      {featuredPost.title}
                    </h2>

                    {featuredPost.excerpt && (
                      <p className="text-zinc-400 text-lg leading-relaxed mb-6 line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                    )}

                    <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-white group-hover:gap-4 transition-all">
                      Read Article{' '}
                      <span className="text-pink-500 transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Post Grid */}
          {remainingPosts.length > 0 && (
            <section className="px-6 md:px-16 max-w-7xl mx-auto py-12 border-t border-white/10">
              <h2 className="text-2xl font-bold text-white mb-10">All Articles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {remainingPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-white/20 hover:bg-zinc-800/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-500/5 flex flex-col"
                  >
                    {/* Card Image */}
                    {post.coverImage ? (
                      <div className="aspect-video overflow-hidden relative">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-pink-500/5 via-zinc-900 to-purple-500/5 flex items-center justify-center">
                        <svg className="w-12 h-12 text-zinc-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                      </div>
                    )}

                    {/* Card Body */}
                    <div className="p-6 flex flex-col flex-1">
                      <time
                        dateTime={post.createdAt.toISOString()}
                        className="text-xs font-mono text-zinc-600 mb-3"
                      >
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>

                      <h3 className="text-xl font-semibold text-white mb-3 leading-snug group-hover:text-pink-400 transition-colors line-clamp-2">
                        {post.title}
                      </h3>

                      {post.excerpt && (
                        <p className="text-zinc-500 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                          {post.excerpt}
                        </p>
                      )}

                      <span className="inline-flex items-center gap-2 text-sm font-bold tracking-widest uppercase text-zinc-400 group-hover:text-white group-hover:gap-3 transition-all mt-auto pt-4 border-t border-white/5">
                        Read More{' '}
                        <span className="text-pink-500 transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Newsletter CTA */}
      <section className="py-20 px-6 md:px-16 max-w-7xl mx-auto border-t border-white/10 text-center">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm p-12 md:p-16 max-w-3xl mx-auto relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-60 h-60 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <h2 className="pixel-font text-3xl md:text-4xl font-bold text-white mb-4">
              Stay in the Loop
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
              Get the latest insights on DevOps, SRE, and infrastructure automation delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full sm:flex-1 px-5 py-3.5 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 outline-none focus:border-pink-400/50 focus:ring-1 focus:ring-pink-400/20 transition-all"
              />
              <button className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
