import { getMemberByRidingId } from "@/lib/member-service";
import { getMemberProfile } from "@/lib/fallback-data";
import { getKeyVoteBillNumbers } from "@/lib/api/legisinfo";
import { AppShell } from "@/components/AppShell";
import { MemberProfileView } from "@/components/member-profile/MemberProfileView";

interface PageProps {
  params: Promise<{ "riding-id": string }>;
}

export default async function MemberProfilePage({ params }: PageProps) {
  const { "riding-id": ridingId } = await params;
  const profile =
    (await getMemberByRidingId(ridingId)) ?? getMemberProfile(ridingId);

  return (
    <AppShell>
      <MemberProfileView
        data={profile}
        keyBillIds={getKeyVoteBillNumbers()}
      />
    </AppShell>
  );
}
