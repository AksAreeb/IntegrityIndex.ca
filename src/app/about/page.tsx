import Link from "next/link";
import type { Metadata } from "next";
import katex from "katex";
import "katex/dist/katex.min.css";
import { AppShell } from "@/components/AppShell";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About | Integrity Index",
  description:
    "The Integrity Index is a non-partisan initiative providing transparency for the Canadian public.",
  alternates: { canonical: `${SITE_URL}/about` },
};

const PENALTIES = [
  { code: "P_T", name: "Trade volume", pointValue: "−5 pts", math: "−5 × trades (cap 30)", deduction: "−5 points per trade (buy or sell) in the last 12 months. Cap: −30 points.", why: "Frequent trading while in office can create conflicts with the public interest." },
  { code: "P_C", name: "Sector conflict", pointValue: "−15 pts", math: "−15 if conflict", deduction: "−15 points when a member sits on a committee that regulates an industry and also holds stocks in that industry.", why: "Regulating a sector while owning shares in it can bias decisions." },
  { code: "P_D", name: "Late filings", pointValue: "−1 pt", math: "−1 per 10 days late", deduction: "−1 point per 10 days a disclosure is filed after the 30-day legal grace period.", why: "Late filing undermines transparency. We deduct points so repeated delays are visible." },
  { code: "P_L", name: "Legislative proximity", pointValue: "−20 pts", math: "−20 if sponsor + stake", deduction: "−20 points when a member sponsors (or leads) a bill that directly affects a sector where they hold more than $10,000 in assets.", why: "Sponsoring legislation that impacts your own investments is a clear conflict." },
] as const;

export default function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
        {/* Vision Statement */}
        <div className="mb-16 text-center">
          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#0F172A] mb-6">
            Giving the People the Keys to Transparency
          </h1>
          <p className="text-lg md:text-xl text-[#64748B] font-sans max-w-3xl mx-auto leading-relaxed">
            Integrity Index is a non-partisan initiative dedicated to providing every Canadian citizen with real-time transparency into the financial interests of their elected officials.
          </p>
        </div>

        {/* Three Pillars */}
        <section className="mb-20" aria-labelledby="three-pillars-heading">
          <h2 id="three-pillars-heading" className="sr-only">
            Three Pillars of Integrity Index
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="border-2 border-[#0F172A] rounded-[4px] p-6 bg-white">
              <h3 className="font-serif text-xl font-semibold text-[#0F172A] mb-3">
                Accessibility
              </h3>
              <p className="text-base text-[#64748B] font-sans leading-relaxed">
                Information is our right. We've made sure our website is WCAG complaint, mobile friendly, accessibible on slow connections and reachable to all Canadians. 
              </p>
            </div>
            <div className="border-2 border-[#0F172A] rounded-[4px] p-6 bg-white">
              <h3 className="font-serif text-xl font-semibold text-[#0F172A] mb-3">
                Compliance
              </h3>
              <p className="text-base text-[#64748B] font-sans leading-relaxed">
                Rules only work if they are followed. Our system monitors fiiling deadlines and reporting accuracy, audting whether officials are meeting legal transparency obligations.
              </p>
            </div>
            <div className="border-2 border-[#0F172A] rounded-[4px] p-6 bg-white">
              <h3 className="font-serif text-xl font-semibold text-[#0F172A] mb-3">
                Transparency
              </h3>
              <p className="text-base text-[#64748B] font-sans leading-relaxed">
              We use multiple APIs, Data Scrapers and Open Source Data all verified through Public Records of Federal and Provincial disclosures. Now citizens can see if their elected officials really represent their constituents.
              </p>
            </div>
          </div>
        </section>

        {/* How the Score Works */}
        <section className="mb-12">
          <h2 className="font-serif text-2xl font-semibold text-[#0F172A] mb-4">
            The Integrity Score
          </h2>
          <p className="text-base text-[#0F172A] leading-relaxed mb-4">
            We've created a score, calculated using a formula that takes into account all the data we have, to help you understand how your elected officials are doing.
          </p>
          <p className="text-base text-[#64748B] leading-relaxed">
            All Officials are given a 0–100 Score with a letter grade (A–F). This score is for transparency only and is not a legal or official finding.
          </p>
        </section>

        {/* Formula: LaTeX-rendered with card and legend */}
        <section className="mb-12" aria-labelledby="formula-heading">
          <h2 id="formula-heading" className="font-serif text-2xl font-semibold text-[#0F172A] mb-4">
            The Formula
          </h2>
          <div
            className="p-8 md:p-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-sm"
            role="math"
            aria-label="Integrity score formula"
          >
            <div
              className="text-center [&_.katex]:text-2xl [&_.katex]:md:text-3xl"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString("I = 100 - (P_T + P_C + P_D + P_L)", {
                  displayMode: true,
                  throwOnError: false,
                }),
              }}
            />
            <dl className="mt-6 text-center font-sans text-sm text-[#64748B] space-y-1.5 max-w-xl mx-auto">
              <dt className="sr-only">Variable definitions</dt>
              <dd><span className="font-medium text-[#0F172A]" aria-label="P sub T">P<sub>T</sub></span> — Trade volume (frequent trading)</dd>
              <dd><span className="font-medium text-[#0F172A]" aria-label="P sub C">P<sub>C</sub></span> — Sector conflict (committee + holdings)</dd>
              <dd><span className="font-medium text-[#0F172A]" aria-label="P sub D">P<sub>D</sub></span> — Late filings (disclosure delays)</dd>
              <dd><span className="font-medium text-[#0F172A]" aria-label="P sub L">P<sub>L</sub></span> — Legislative proximity (sponsor + stake)</dd>
            </dl>
          </div>
          <p className="font-sans text-base text-[#64748B] mt-4 leading-relaxed">
            This is version 1 of our formula, we may implement changes and/or additional factors in the future.
          </p>
        </section>

        {/* Health Gauge: grid of four penalty cards with Goal: 100 badge */}
        <section className="mb-12" aria-labelledby="health-gauge-heading">
          <h2 id="health-gauge-heading" className="font-serif text-2xl font-semibold text-[#0F172A] mb-4">
            Health Gauge
          </h2>
          <div className="flex items-center justify-center mb-6">
            <span className="inline-flex items-center font-sans text-sm font-semibold text-[#0F172A] bg-[#E2E8F0] border border-[#CBD5E1] px-4 py-2 rounded-lg">
              Goal: 100
            </span>
          </div>
          <p className="text-center text-sm text-[#64748B] font-sans mb-6">Each penalty reduces the score. Aim for no deductions.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Penalty list">
            {PENALTIES.map((p) => (
              <div
                key={p.code}
                className="p-5 rounded-xl border border-[#E2E8F0] bg-white shadow-sm flex flex-col"
              >
                <p className="font-mono text-lg font-bold text-[#0F172A] mb-2">
                  {p.pointValue}
                </p>
                <h3 className="font-serif text-base font-semibold text-[#0F172A] mb-2">
                  {p.code} — {p.name}
                </h3>
                <p className="font-sans text-base text-[#0F172A] mb-3">
                  {p.deduction}
                </p>
                <p className="font-sans text-sm text-[#64748B] leading-relaxed mt-auto">
                  Why it matters: {p.why}
                </p>
              </div>
            ))}
          </div>
        </section>

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
              <li>Federal Ethics Commissioner</li>
              <li>LEGISinfo (Parliament of Canada)</li>
              <li>House of Commons Member Directory</li>
              <li>Ontario Legislative Assembly</li>
              <li>Open Source Verification</li>
            </ul>
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0F172A] mb-4">
              Disclaimer
            </h2>
            <p className="text-base text-[#64748B] leading-relaxed">
            The Integrity Index is an independent, non-partisan transparency tool. All data is sourced from public federal and provincial disclosure records. While we strive for accuracy, this data is provided "as-is" for informational purposes only. The Integrity Score and associated letter grades are metrics designed to measure administrative transparency and filing behavior; they do not constitute legal findings, official government ratings or accusations of misconduct. Users should verify critical information through official legislative channels.
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
