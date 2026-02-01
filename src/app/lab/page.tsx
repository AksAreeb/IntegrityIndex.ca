import { AppShell } from "@/components/AppShell";
import { LobbyistHeatmap } from "@/components/experimental/LobbyistHeatmap";
import { WealthTimeline } from "@/components/experimental/WealthTimeline";
import { BillSimplifier } from "@/components/experimental/BillSimplifier";
import { getMemberProfile } from "@/lib/mock-data";

export default function LabPage() {
  const sampleProfile = getMemberProfile("ontario");

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          The Transparency Lab
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Experimental features for civic transparency and accountability
        </p>

        <div className="space-y-8">
          <LobbyistHeatmap />
          <WealthTimeline
            preOfficeAssets={sampleProfile.preOfficeAssets}
            currentAssets={sampleProfile.assets}
          />
          <BillSimplifier />
        </div>
      </div>
    </AppShell>
  );
}
