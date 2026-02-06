"use client";

import type { VoteRecord } from "@/types";

interface Props {
  votes: VoteRecord[];
  /** Bill IDs to highlight as "Key Votes" (high corporate interest). */
  keyBillIds?: string[];
}

export function LegislativeHistory({ votes, keyBillIds = [] }: Props) {
  const keySet = new Set(
    keyBillIds.map((id) => id.trim().toLowerCase())
  );

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
          {votes.map((vote) => {
            const isKeyVote = keySet.has(vote.billId.trim().toLowerCase());
            return (
              <li key={vote.id} className="relative pl-8 pb-8 last:pb-0">
                <span
                  className="absolute left-0 w-[15px] h-[15px] rounded-[2px] border-2 border-[#0F172A] bg-[#FFFFFF]"
                  aria-hidden="true"
                />
                <div
                  className={`border rounded-[4px] p-4 bg-[#FFFFFF] ${
                    isKeyVote
                      ? "border-[#0F172A] ring-1 ring-[#0F172A]/20"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-sm font-semibold text-[#0F172A]">
                      Bill {vote.billId}: {vote.billTitle}
                    </p>
                    {isKeyVote && (
                      <span
                        className="inline-block px-2 py-0.5 text-[10px] font-sans font-semibold uppercase tracking-wide bg-[#0F172A] text-[#FFFFFF] rounded-[2px]"
                        title="High corporate interest / key vote"
                      >
                        Key Vote
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#64748B] mt-1">
                    Vote: {vote.vote} | {vote.date} | {vote.outcome}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
