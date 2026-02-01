"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { FinancialLedger } from "./FinancialLedger";
import { LegislativeHistory } from "./LegislativeHistory";
import { InfluenceMap } from "./InfluenceMap";
import type { MemberProfile } from "@/lib/mock-data";

interface Props {
  profile: MemberProfile;
}

const TAB_LABELS = [
  { value: "summary", label: "Audit Summary" },
  { value: "ledger", label: "Financial Ledger" },
  { value: "history", label: "Voting Record" },
  { value: "influence", label: "Correlation Chart" },
] as const;

export function MemberProfileTabs({ profile }: Props) {
  return (
    <Tabs.Root defaultValue="summary" className="w-full">
      <Tabs.List
        className="flex gap-0 border-b border-[#E2E8F0] mb-6"
        aria-label="Member profile sections"
      >
        {TAB_LABELS.map(({ value, label }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="px-6 py-3 text-sm font-sans font-medium text-[#64748B] data-[state=active]:text-[#0F172A] data-[state=active]:border-b-2 data-[state=active]:border-[var(--primary-accent)] -mb-px hover:text-[#0F172A]"
          >
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="summary" className="focus:outline-none">
        <ExecutiveSummary profile={profile} />
      </Tabs.Content>

      <Tabs.Content value="ledger" className="focus:outline-none">
        <FinancialLedger assets={profile.assets} />
      </Tabs.Content>

      <Tabs.Content value="history" className="focus:outline-none">
        <LegislativeHistory votes={profile.legislativeHistory} />
      </Tabs.Content>

      <Tabs.Content value="influence" className="focus:outline-none">
        <InfluenceMap data={profile.industryDistribution} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
