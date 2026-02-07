import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SyncButton } from "@/components/SyncButton";
import { MembersDataTable } from "./MembersDataTable";
import { prisma } from "@/lib/db";

export const revalidate = 300;

const FEDERAL_EXPORT_URL = "https://www.ourcommons.ca/en/members/export/json";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function MpsIndexPage({ searchParams }: PageProps) {
  const { q: queryParam } = await searchParams;
  const members = await prisma.member.findMany({
    orderBy: [{ jurisdiction: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      riding: true,
      party: true,
      jurisdiction: true,
      chamber: true,
      photoUrl: true,
    },
  });

  if (members.length === 0) {
    return (
      <AppShell>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
            Representatives Directory
          </h1>
          <p className="text-sm text-[#64748B] font-sans mb-6">
            No representatives in the database yet. Run a sync to populate the roster from the official House of Commons and Ontario Legislative Assembly feeds.
          </p>
          <p className="font-sans text-sm text-[#0F172A] mb-4">
            <SyncButton /> (fetches from {FEDERAL_EXPORT_URL} and Ontario MPP export). Then refresh this page.
          </p>
          <Link href="/" className="font-sans text-sm font-medium text-[#0F172A] hover:underline">← Back to home</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Representatives Directory
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Complete directory of Members of Parliament and Provincial Representatives. Sort and filter below.
        </p>
        <MembersDataTable initialMembers={members} initialFilter={queryParam ?? ""} />
      </div>
    </AppShell>
  );
}
