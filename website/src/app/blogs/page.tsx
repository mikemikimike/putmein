import Link from "next/link";
import prisma from "@/lib/prisma";
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Blog - Putme.in",
  description: "Insights and updates on serverless infrastructure, engineering efficiency, and scaling.",
};

export default async function BlogListPage() {
  const posts = await prisma.post.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-black text-white py-24 px-6 md:px-16">
      <div className="max-w-5xl mx-auto">
        <header className="mb-20 text-center">
          <h1 className="pixel-font text-5xl md:text-7xl font-bold mb-6">The Lab.</h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Deep dives into the future of infrastructure and SRE automation.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 italic">
            No posts yet. Check back soon.
          </div>
        ) : (
          <div className="grid gap-12">
            {posts.map((post: { id: string; slug: string; title: string; excerpt: string | null; createdAt: Date }) => (
              <article key={post.id} className="group border-b border-white/5 pb-12 last:border-0">
                <Link href={`/blogs/${post.slug}`} className="block space-y-4">
                  <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
                    <time dateTime={post.createdAt.toISOString()}>
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold group-hover:text-pink-500 transition-colors">
                    {post.title}
                  </h2>
                  
                  {post.excerpt && (
                    <p className="text-lg text-zinc-400 leading-relaxed max-w-3xl">
                      {post.excerpt}
                    </p>
                  )}
                  
                  <div className="pt-2">
                    <span className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 group-hover:gap-4 transition-all">
                      Read More <span className="text-pink-500">→</span>
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
