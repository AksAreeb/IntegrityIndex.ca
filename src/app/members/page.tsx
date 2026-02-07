import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { MembersClient } from "./MembersClient";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: `${SITE_URL}/members` },
  description:
    "View the official Integrity Ranks for Canadian MPs and MPPs, calculated based on financial disclosure speed and conflict-of-interest audits.",
};

export default async function MembersPage() {
  return (
    <AppShell>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Members
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Search by name or riding. Use the Federal / Provincial toggle above to filter. Typo-tolerant search powered by PostgreSQL trigrams.
        </p>
        <MembersClient initialMembers={[]} />
      </div>
    </AppShell>
  );
}
