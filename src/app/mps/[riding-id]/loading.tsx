import { AppShell } from "@/components/AppShell";
import { MemberProfileSkeleton } from "@/components/member-profile/MemberProfileSkeleton";

export default function MemberProfileLoading() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <MemberProfileSkeleton />
      </div>
    </AppShell>
  );
}
