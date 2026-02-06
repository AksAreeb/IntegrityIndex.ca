import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/members`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/bills`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/legislation`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/explore`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];

  const members = await prisma.member.findMany({
    select: { id: true },
  });

  const memberRoutes: MetadataRoute.Sitemap = members.map((m) => ({
    url: `${base}/member/${m.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...memberRoutes];
}
