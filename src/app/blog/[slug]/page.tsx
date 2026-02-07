import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { getPostBySlug, getAllSlugs, BLOG_AUTHOR, BLOG_PUBLISHER } from "@/lib/blog-posts";
import { SITE_URL } from "@/lib/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | Integrity Index`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.datePublished,
      authors: [post.author],
      url: canonical,
    },
  };
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: BLOG_PUBLISHER,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
  };

  return (
    <AppShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <article className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/blog"
          className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] mb-6 inline-block"
        >
          ← Back to Blog
        </Link>

        <header className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#64748B] font-sans">
            <time dateTime={post.datePublished}>
              {formatDate(post.datePublished)}
            </time>
            <span aria-hidden>·</span>
            <span>{post.author}</span>
          </div>
        </header>

        <div
          className="blog-content font-sans text-[#334155] leading-relaxed space-y-4 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0F172A] [&_h2]:mt-8 [&_h2]:mb-2 [&_p]:mb-3 [&_a]:text-[#0F172A] [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-[#1E293B]"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <footer className="mt-12 pt-8 border-t border-[#E2E8F0]">
          <Link
            href="/blog"
            className="text-sm font-medium text-[#0F172A] hover:underline"
          >
            ← Back to Blog
          </Link>
        </footer>
      </article>
    </AppShell>
  );
}
