import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Blog | Integrity Index",
  description:
    "Technical and civic articles on parliamentary transparency, financial disclosures, and conflict-of-interest auditing.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogFeedPage() {
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="font-serif text-3xl font-bold text-[#0F172A] mb-2">
          Blog
        </h1>
        <p className="text-[#64748B] font-sans mb-12">
          Technical and civic insights on parliamentary transparency and financial disclosure.
        </p>

        {/* Featured Post */}
        {featured && (
          <article className="mb-12">
            <Link
              href={`/blog/${featured.slug}`}
              className="block border border-[#E2E8F0] rounded-xl p-6 hover:border-[#0F172A]/30 hover:shadow-md transition-all"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#0F172A] bg-[#F1F5F9] px-2 py-0.5 rounded">
                Featured
              </span>
              <h2 className="font-serif text-xl font-bold text-[#0F172A] mt-3 mb-2 hover:underline">
                {featured.title}
              </h2>
              <p className="text-[#64748B] font-sans text-sm mb-3 line-clamp-2">
                {featured.excerpt}
              </p>
              <time
                dateTime={featured.datePublished}
                className="text-xs text-[#94A3B8] font-sans"
              >
                {formatDate(featured.datePublished)}
              </time>
            </Link>
          </article>
        )}

        {/* Rest of Feed */}
        <div className="space-y-6">
          {rest.map((post) => (
            <article key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block border-b border-[#E2E8F0] pb-6 hover:border-[#0F172A]/20 transition-colors"
              >
                <h2 className="font-serif text-lg font-semibold text-[#0F172A] hover:underline">
                  {post.title}
                </h2>
                <p className="text-[#64748B] font-sans text-sm mt-1 mb-2 line-clamp-2">
                  {post.excerpt}
                </p>
                <time
                  dateTime={post.datePublished}
                  className="text-xs text-[#94A3B8] font-sans"
                >
                  {formatDate(post.datePublished)}
                </time>
              </Link>
            </article>
          ))}
        </div>

        <Link
          href="/"
          className="inline-block mt-12 text-sm font-medium text-[#0F172A] hover:underline"
        >
          ← Back to Home
        </Link>
      </div>
    </AppShell>
  );
}
