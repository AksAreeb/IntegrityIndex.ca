import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { BLOG_POSTS } from "@/lib/blog-posts";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/members`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/my-riding`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/bills`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/legislation`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/explore`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.dateModified ?? post.datePublished),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const members = await prisma.member.findMany({
    select: { id: true, slug: true },
  });

  const memberRoutes: MetadataRoute.Sitemap = members.map((m) => ({
    url: `${base}/member/${m.slug ?? m.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const ridings = await prisma.riding.findMany({
    select: { slug: true },
  });

  const ridingRoutes: MetadataRoute.Sitemap = ridings.map((r) => ({
    url: `${base}/riding/${encodeURIComponent(r.slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  return [...staticRoutes, ...blogRoutes, ...memberRoutes, ...ridingRoutes];
}
