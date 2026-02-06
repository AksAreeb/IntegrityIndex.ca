"use client";

import Link from "next/link";
import { MemberProfileTabs } from "./MemberProfileTabs";
import { MemberProfileSkeleton } from "./MemberProfileSkeleton";
import type { MemberProfile } from "@/types";

export interface MemberProfileViewProps {
  /** Profile data from API/Supabase. When null/undefined or when loading, skeletons are shown. */
  data: MemberProfile | null | undefined;
  /** When true, shows loading skeletons even if data is present (e.g. revalidating). */
  loading?: boolean;
  /** Bill IDs to highlight as Key Votes on the Voting Record tab. */
  keyBillIds?: string[];
}

export function MemberProfileView({
  data,
  loading = false,
  keyBillIds,
}: MemberProfileViewProps) {
  if (loading || !data) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <MemberProfileSkeleton />
      </div>
    );
  }

  const profile = data;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link
        href="/"
        className="inline-block text-sm font-sans text-[#64748B] hover:text-[#0F172A] mb-6"
      >
        Back to home
      </Link>

      <div className="mb-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A]">
          {profile.name}
        </h1>
        <p className="text-[#64748B] font-sans mt-1">
          {profile.riding} | {profile.party} | {profile.jurisdiction}
        </p>
      </div>

      <MemberProfileTabs profile={profile} keyBillIds={keyBillIds} />
    </div>
  );
}
