"use client";

import { useState, useCallback, useEffect, useDeferredValue, useMemo } from "react";
import Link from "next/link";
import { SearchInput } from "@/components/SearchInput";
import { MemberPhoto } from "@/components/MemberPhoto";
import { useJurisdiction } from "@/contexts/JurisdictionContext";
import type { MemberSearchResult } from "@/app/actions/members";

function MemberCard({
  member,
  jurisdictionParam,
}: {
  member: MemberSearchResult;
  jurisdictionParam: string;
}) {
  return (
    <Link
      href={`/member/${member.id}?jurisdiction=${encodeURIComponent(jurisdictionParam)}`}
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

export function MemberGrid({
  members,
  jurisdictionParam: jParam,
}: {
  members: MemberSearchResult[];
  jurisdictionParam: string;
}) {
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
        <MemberCard key={m.id} member={m} jurisdictionParam={jParam} />
      ))}
    </div>
  );
}

const jurisdictionParam = (j: "FEDERAL" | "PROVINCIAL" | "ALL"): string =>
  j === "FEDERAL" ? "federal" : j === "PROVINCIAL" ? "provincial" : "all";

interface MembersClientProps {
  initialMembers: MemberSearchResult[];
}

export function MembersClient({ initialMembers }: MembersClientProps) {
  const { jurisdiction } = useJurisdiction();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberSearchResult[]>(initialMembers);
  const [loading, setLoading] = useState(false);
  
  // Defer the members list to prevent re-render lag while user types
  const deferredMembers = useDeferredValue(members);

  const fetchMembers = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        const jParam = jurisdictionParam(jurisdiction);
        if (jParam && jParam !== "all") params.set("jurisdiction", jParam);
        if (q.trim()) params.set("q", q.trim());
        const res = await fetch(`/api/members?${params.toString()}`);
        const data = await res.json();
        setMembers((data.members ?? []) as MemberSearchResult[]);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    },
    [jurisdiction]
  );

  // Refetch when jurisdiction changes; initial load uses current query (e.g. "")
  useEffect(() => {
    fetchMembers(query);
  }, [jurisdiction]); // eslint-disable-line react-hooks/exhaustive-deps -- only refetch on jurisdiction change; query handled by handleSearch

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      await fetchMembers(q);
    },
    [fetchMembers]
  );

  const isPending = loading;
  const showDeferred = deferredMembers.length > 0 || (!isPending && query === "");

  return (
    <div className="space-y-6">
      <SearchInput
        id="members-directory-search"
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        debounceMs={300}
      />
      {isPending ? (
        <p className="py-8 text-center text-[#64748B] text-sm">Loading…</p>
      ) : showDeferred ? (
        <MemberGrid
          members={deferredMembers}
          jurisdictionParam={jurisdictionParam(jurisdiction)}
        />
      ) : (
        <p className="py-12 text-center text-[#64748B] text-sm">
          No members match. Try a different search or run seed to populate.
        </p>
      )}
    </div>
  );
}
