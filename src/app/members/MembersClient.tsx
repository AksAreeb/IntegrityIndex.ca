"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/SearchInput";
import { MemberPhoto } from "@/components/MemberPhoto";
import { searchMembers, type MemberSearchResult } from "@/app/actions/members";

function MemberCard({ member }: { member: MemberSearchResult }) {
  return (
    <Link
      href={`/member/${member.id}`}
      className="group flex items-center gap-4 p-4 rounded-[4px] border border-[#E2E8F0] bg-white hover:border-[#0F172A] hover:shadow-sm transition-colors"
    >
      <span className="block w-16 h-16 rounded-full overflow-hidden bg-[#F1F5F9] flex-shrink-0">
        <MemberPhoto member={member} size={64} className="object-cover w-full h-full" alt={member.name} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#0F172A] truncate group-hover:underline">
          {member.name}
        </p>
        <p className="text-sm text-[#64748B] truncate">{member.riding}</p>
        <p className="text-sm text-[#64748B]">
          {member.party} · {member.jurisdiction}
        </p>
      </div>
    </Link>
  );
}

export function MemberGrid({ members }: { members: MemberSearchResult[] }) {
  if (members.length === 0) {
    return (
      <p className="py-12 text-center text-[#64748B] text-sm">
        No members match. Try a different search or run seed to populate.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((m) => (
        <MemberCard key={m.id} member={m} />
      ))}
    </div>
  );
}

interface MembersClientProps {
  initialMembers: MemberSearchResult[];
}

export function MembersClient({ initialMembers }: MembersClientProps) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSearchResult[]>(initialMembers);

  const handleSearch = useCallback(async (q: string) => {
    const results = await searchMembers(q);
    setMembers(results);
  }, []);

  return (
    <div className="space-y-6">
      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        debounceMs={300}
      />
      <MemberGrid members={members} />
    </div>
  );
}
