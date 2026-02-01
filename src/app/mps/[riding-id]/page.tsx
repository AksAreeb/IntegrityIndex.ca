import Link from "next/link";
import { getMemberProfile } from "@/lib/mock-data";
import { AppShell } from "@/components/AppShell";
import { MemberProfileTabs } from "@/components/member-profile/MemberProfileTabs";

interface PageProps {
  params: Promise<{ "riding-id": string }>;
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { "riding-id": ridingId } = await params;
  const profile = getMemberProfile(ridingId);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-block text-sm font-sans text-[#64748B] hover:text-[#0F172A] mb-6"
        >
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="font-serif text-2xl font-semibold text-[#0F172A]">
            {profile.name}
          </h1>
          <p className="text-[#64748B] font-sans mt-1">
            {profile.riding} | {profile.party} | {profile.jurisdiction}
          </p>
        </div>

        <MemberProfileTabs profile={profile} />
      </div>
    </AppShell>
  );
}
