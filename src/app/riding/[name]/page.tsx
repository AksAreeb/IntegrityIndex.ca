import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/constants";
import { AppShell } from "@/components/AppShell";

interface PageProps {
  params: Promise<{ name: string }>;
}

function formatRidingDisplay(slugOrName: string): string {
  const decoded = decodeURIComponent(slugOrName).trim();
  return decoded
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name).trim();
  if (!decoded) return { title: "Riding Not Found | Integrity Index" };
  const ridingDisplay = formatRidingDisplay(decoded);
  return {
    title: `Financial Audit: Who Represents ${ridingDisplay}? | Integrity Index`,
    description: `Transparency portal for ${ridingDisplay}. View financial disclosures, stock trades, and conflict-of-interest analysis for your representative.`,
    alternates: { canonical: `${SITE_URL}/riding/${encodeURIComponent(decoded)}` },
  };
}

export default async function RidingPage({ params }: PageProps) {
  const { name } = await params;
  const decoded = decodeURIComponent(name).trim();
  if (!decoded) {
    redirect("/explore");
  }

  const slug = decoded.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const riding = await prisma.riding.findFirst({
    where: { slug },
    select: { name: true, jurisdiction: true },
  });

  const ridingName = riding?.name ?? decoded;
  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { riding: { equals: ridingName, mode: "insensitive" } },
        { riding: { equals: decoded, mode: "insensitive" } },
        { id: decoded },
        ...(slug ? [{ slug }] as const : []),
      ],
      jurisdiction: riding?.jurisdiction ?? "FEDERAL",
    },
    select: { id: true, slug: true },
  });

  if (member) {
    redirect(`/member/${member.slug ?? member.id}`);
  }

  const ridingDisplay = formatRidingDisplay(decoded);

  return (
    <AppShell>
      {/* Breadcrumbs: Home > [Province] > [Riding] */}
      <nav
        className="border-b border-[#E2E8F0] bg-[#FAFBFC] py-3"
        aria-label="Breadcrumb"
      >
        <div className="max-w-2xl mx-auto px-6">
          <ol className="flex items-center gap-2 text-sm text-[#64748B] font-sans">
            <li>
              <Link href="/" className="hover:text-[#0F172A] transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/explore" className="hover:text-[#0F172A] transition-colors">
                Canada
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-[#0F172A] font-medium" aria-current="page">
              {ridingDisplay}
            </li>
          </ol>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Riding: {ridingDisplay}
        </h1>
        <p className="text-[#64748B] font-sans">
          No representative found for this riding in our database. Try the{" "}
          <a href="/explore" className="text-[#0F172A] underline">
            map
          </a>{" "}
          or{" "}
          <a href="/mps" className="text-[#0F172A] underline">
            representatives list
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}
