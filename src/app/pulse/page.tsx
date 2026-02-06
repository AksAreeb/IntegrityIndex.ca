import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PulseFeed } from "@/components/PulseFeed";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Pulse — Automated Conflict Auditor | Integrity Index",
  description:
    "Real-time activity feed of MP and MPP disclosures with High-Risk conflict-of-interest flags. The Pulse tracks legislative overlap and asset holdings.",
  alternates: { canonical: `${SITE_URL}/pulse` },
};

export default function PulsePage() {
  return (
    <AppShell>
      <div className="min-h-[60vh]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="font-serif text-3xl font-bold text-[#0F172A] mb-2">
            The Pulse
          </h1>
          <p className="text-[#64748B] font-sans mb-10">
            Automated Conflict Auditor — real-time disclosures and High-Risk conflict flags.
          </p>
        </div>
        <PulseFeed />
      </div>
    </AppShell>
  );
}
