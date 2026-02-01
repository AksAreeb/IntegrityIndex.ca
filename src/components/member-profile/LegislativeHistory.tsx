"use client";

import type { VoteRecord } from "@/lib/mock-data";

interface Props {
  votes: VoteRecord[];
}

export function LegislativeHistory({ votes }: Props) {
  return (
    <div
      className="border border-[#E2E8F0] rounded-[4px] p-6"
      role="region"
      aria-labelledby="history-heading"
    >
      <h2 id="history-heading" className="font-serif text-lg font-semibold text-[#0F172A] mb-6">
        Legislative History
      </h2>
      <div className="relative">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#E2E8F0]" aria-hidden="true" />
        <ul className="space-y-0">
          {votes.map((vote) => (
            <li key={vote.id} className="relative pl-8 pb-8 last:pb-0">
              <span
                className="absolute left-0 w-[15px] h-[15px] rounded-[2px] border-2 border-[#0F172A] bg-[#FFFFFF]"
                aria-hidden="true"
              />
              <div className="border border-[#E2E8F0] rounded-[4px] p-4 bg-[#FFFFFF]">
                <p className="font-serif text-sm font-semibold text-[#0F172A]">
                  Bill {vote.billId}: {vote.billTitle}
                </p>
                <p className="text-sm text-[#64748B] mt-1">
                  Vote: {vote.vote} | {vote.date} | {vote.outcome}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
