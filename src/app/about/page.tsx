import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const PENALTIES = [
  { code: "P_T", name: "Trade volume", math: "−5 × trades (cap 30)", deduction: "−5 points per trade (buy or sell) in the last 12 months. Cap: −30 points.", why: "Frequent trading while in office can create conflicts with the public interest." },
  { code: "P_C", name: "Sector conflict", math: "−15 if conflict", deduction: "−15 points when a member sits on a committee that regulates an industry and also holds stocks in that industry.", why: "Regulating a sector while owning shares in it can bias decisions." },
  { code: "P_D", name: "Late filings", math: "−1 per 10 days late", deduction: "−1 point per 10 days a disclosure is filed after the 30-day legal grace period.", why: "Late filing undermines transparency. We deduct points so repeated delays are visible." },
  { code: "P_L", name: "Legislative proximity", math: "−20 if sponsor + stake", deduction: "−20 points when a member sponsors (or leads) a bill that directly affects a sector where they hold more than $10,000 in assets.", why: "Sponsoring legislation that impacts your own investments is a clear conflict." },
] as const;

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        <div className="mb-12 text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#0F172A] mb-4">
            About the Integrity Score
          </h1>
          <p className="text-lg text-[#64748B] font-sans max-w-3xl mx-auto">
            A simple, transparent way to see how we assess parliamentary accountability.
          </p>
        </div>

        {/* Mission Statement - Multi-column layout */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#0F172A] mb-4">
                Our Mission
              </h2>
              <p className="text-base text-[#0F172A] leading-relaxed mb-4">
                IntegrityIndex.ca provides Canadians with transparent, accessible information about their elected representatives' financial interests and potential conflicts of interest.
              </p>
              <p className="text-base text-[#64748B] leading-relaxed">
                We believe that democracy works best when citizens have the tools to hold their representatives accountable. Our Integrity Score is one way to help voters understand how their MP or MPP's financial activities might intersect with their legislative work.
              </p>
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold text-[#0F172A] mb-4">
                How It Works
              </h2>
              <p className="text-base text-[#0F172A] leading-relaxed mb-4">
                Every member starts with a score of 100. We subtract points for four types of risk factors: trade volume, sector conflicts, late filings, and legislative proximity to personal investments.
              </p>
              <p className="text-base text-[#64748B] leading-relaxed">
                The result is a 0–100 Integrity Score with a letter grade (A–F). This score is for transparency only and is not a legal or official finding.
              </p>
            </div>
          </div>
        </section>

        {/* Formula: LaTeX-style metric block */}
        <div className="border-2 border-[#0F172A] rounded-[4px] overflow-hidden mb-12 bg-white">
          <h2 className="font-serif text-xl font-semibold text-[#0F172A] px-6 pt-6 pb-2">
            The Formula
          </h2>
          <div
            className="mx-6 mb-4 p-8 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[4px] font-serif text-[#0F172A]"
            role="math"
            aria-label="Integrity score formula"
          >
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-normal tracking-tight mb-1" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                <span className="italic">I</span> = 100 − (<span className="italic">P</span><sub className="text-lg align-baseline">T</sub> + <span className="italic">P</span><sub className="text-lg align-baseline">C</sub> + <span className="italic">P</span><sub className="text-lg align-baseline">D</sub> + <span className="italic">P</span><sub className="text-lg align-baseline">L</sub>)
              </p>
              <p className="text-sm text-[#64748B] font-sans mt-3 mb-0">
                Integrity Score <span className="italic text-[#0F172A]">I</span>; deductions: <span className="italic text-[#0F172A]">P</span><sub>T</sub> Trades, <span className="italic text-[#0F172A]">P</span><sub>C</sub> Conflicts, <span className="italic text-[#0F172A]">P</span><sub>D</sub> Delays, <span className="italic text-[#0F172A]">P</span><sub>L</sub> Legislation
              </p>
            </div>
          </div>
          <p className="font-sans text-base text-[#64748B] px-6 pb-6">
            Every member starts at 100. We subtract points for four types of risk. The result is a 0–100 Integrity Score and a letter grade (A–F).
          </p>

          {/* Health Gauge: 100 is the goal */}
          <div className="px-6 pb-6 border-t border-[#E2E8F0]">
            <h3 className="font-serif text-lg font-semibold text-[#0F172A] mb-3">Health Gauge</h3>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="font-mono text-sm font-bold text-[#0F172A] bg-[#F1F5F9] px-3 py-1.5 rounded">100</span>
              <span className="text-base text-[#64748B]">= goal (no deductions).</span>
            </div>
            <p className="text-sm text-[#64748B] mb-3">Each penalty reduces the score:</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono text-[#0F172A]">
              {PENALTIES.map((p) => (
                <span key={p.code} className="bg-[#F8FAFC] px-3 py-1 rounded">{p.code}: {p.math}</span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-[#E2E8F0]" aria-label="Penalty list">
            {PENALTIES.map((p) => (
              <div key={p.code} className="p-6 border-b border-[#E2E8F0] md:odd:border-r md:border-b last:border-b-0 md:last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0">
                <h3 className="font-serif text-lg font-semibold text-[#0F172A] mb-2">
                  {p.code} — {p.name}
                </h3>
                <p className="font-sans text-base text-[#0F172A] mb-2">
                  <strong>{p.deduction}</strong>
                </p>
                <p className="font-sans text-sm text-[#64748B] leading-relaxed">
                  Why it matters: {p.why}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources and Methodology */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0F172A] mb-4">
              Data Sources
            </h2>
            <p className="text-base text-[#64748B] leading-relaxed mb-4">
              All data comes directly from official government sources:
            </p>
            <ul className="text-sm text-[#64748B] font-sans space-y-2 list-disc list-inside">
              <li>Conflict of Interest and Ethics Commissioner (CIEC)</li>
              <li>LEGISinfo (Parliament of Canada)</li>
              <li>House of Commons Member Directory</li>
              <li>Ontario Legislative Assembly</li>
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0F172A] mb-4">
              Legal Notice
            </h2>
            <p className="text-base text-[#64748B] leading-relaxed">
              This is version 1 of our methodology. We built it to be easy to understand for Canadian voters. Grades are for transparency only and are not a legal or official finding.
            </p>
          </div>
        </div>

        {/* Sources footer */}
        <footer className="border-t border-[#E2E8F0] pt-8 mb-8">
          <h3 className="font-serif text-lg font-semibold text-[#0F172A] mb-4">References</h3>
          <ul className="text-sm text-[#64748B] font-sans space-y-2 list-disc list-inside">
            <li>Conflict of Interest Act (S.C. 2006, c. 9, s. 2)</li>
            <li>OECD Public Integrity Handbook (2020)</li>
          </ul>
        </footer>

        <Link
          href="/"
          className="inline-block font-sans text-base font-medium text-[#0F172A] hover:underline"
        >
          ← Back to home
        </Link>
      </div>
    </AppShell>
  );
}
