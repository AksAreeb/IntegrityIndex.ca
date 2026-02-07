/**
 * Slug generation for Members (SEO-friendly URLs).
 * Used by Prisma middleware and sync/seed.
 */
export function slugFromName(name: string): string {
  return (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}
