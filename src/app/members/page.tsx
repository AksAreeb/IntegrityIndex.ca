import { AppShell } from "@/components/AppShell";
import { MembersClient } from "./MembersClient";

export const revalidate = 300;

export default async function MembersPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
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
