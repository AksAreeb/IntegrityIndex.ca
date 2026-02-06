import { AppShell } from "@/components/AppShell";
import { MembersClient } from "./MembersClient";
import { listMembers } from "@/app/actions/members";

export const revalidate = 300;

export default async function MembersPage() {
  const initialMembers = await listMembers(50);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Members Directory
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Search representatives by name or riding. Typo-tolerant fuzzy search powered by PostgreSQL trigrams.
        </p>
        <MembersClient initialMembers={initialMembers} />
      </div>
    </AppShell>
  );
}
