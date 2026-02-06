"use client";

import type { MemberProfile } from "@/types";

interface Props {
  profile: MemberProfile;
}

export function ExecutiveSummary({ profile }: Props) {
  const { attendancePercent, integrityScore } = profile.executiveSummary;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        className="rounded-[4px] p-8 bg-[#FFFFFF]"
        style={{ border: "2px solid var(--primary-accent)" }}
        aria-labelledby="attendance-heading"
      >
        <h2
          id="attendance-heading"
          className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
        >
          Attendance
        </h2>
        <p className="text-4xl font-serif font-semibold tabular-nums" style={{ color: "var(--primary-accent)" }}>
          {attendancePercent}
          <span className="text-lg text-[#64748B] font-sans font-normal ml-1">%</span>
        </p>
      </div>
      <div
        className="rounded-[4px] p-8 bg-[#FFFFFF]"
        style={{ border: "2px solid var(--primary-accent)" }}
        aria-labelledby="integrity-heading"
      >
        <h2
          id="integrity-heading"
          className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
        >
          Integrity Score
        </h2>
        <p className="text-4xl font-serif font-semibold tabular-nums" style={{ color: "var(--primary-accent)" }}>
          {integrityScore}
          <span className="text-lg text-[#64748B] font-sans font-normal ml-1">/100</span>
        </p>
      </div>
    </div>
  );
}
