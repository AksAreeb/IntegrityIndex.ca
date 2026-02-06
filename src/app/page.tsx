import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CommandKSearchBar } from "@/components/CommandKSearchBar";
import { prisma } from "@/lib/db";

const MISSION_ITEMS = [
  {
    title: "Institutional Data",
    subtitle: "Sourced from CIEC",
    body: "Scrubbed primary data sourced directly from the CIEC and LEGISinfo. No third-party commentary.",
  },
  {
    title: "Open-Source Audit",
    subtitle: "Logic via GitHub",
    body: "Non-partisan, open-source algorithms for interest correlation. Every calculation is peer-reviewable.",
  },
  {
    title: "Universal Access",
    subtitle: "WCAG 2.1",
    body: "Optimized for WCAG 2.1 accessibility. Democracy is only transparent if everyone can see it.",
  },
] as const;

export default async function Home() {
  let liveStats: { label: string; value: string }[] = [
    { label: "Profiles Active", value: "—" },
    { label: "Trade Volume", value: "—" },
    { label: "Data Sourcing", value: "100% CIEC & LEGISinfo Verified." },
  ];
  let recentProfiles: { id: string; name: string; riding: string }[] = [];

  try {
    const [memberCounts, tradeCount, recentTrades] = await Promise.all([
      prisma.member.groupBy({ by: ["jurisdiction"], _count: true }),
      prisma.tradeTicker.count(),
      prisma.tradeTicker.findMany({
        take: 24,
        orderBy: { date: "desc" },
        select: { memberId: true },
      }),
    ]);
    const federal = memberCounts.find((c) => c.jurisdiction === "FEDERAL")?._count ?? 0;
    const provincial = memberCounts.find((c) => c.jurisdiction === "PROVINCIAL")?._count ?? 0;
    liveStats = [
      { label: "Profiles Active", value: `${federal} MPs | ${provincial} MPPs` },
      { label: "Trade Volume", value: `${tradeCount} Recent Disclosures.` },
      { label: "Data Sourcing", value: "100% CIEC & LEGISinfo Verified." },
    ];
    const orderedIds = [...new Set(recentTrades.map((t) => t.memberId))].slice(0, 6);
    if (orderedIds.length > 0) {
      const members = await prisma.member.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, name: true, riding: true },
      });
      recentProfiles = orderedIds.map((id) => members.find((m) => m.id === id)).filter(Boolean) as { id: string; name: string; riding: string }[];
    }
  } catch (e) {
    console.error("[page]: live stats fetch failed", e);
    // leave defaults
  }
  return (
    <AppShell>
      <div className="min-h-screen flex flex-col bg-[#FFFFFF]">
        <main className="flex flex-col flex-1">
          {/* Hero Section */}
          <section
            className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32 border-b border-slate-200"
            aria-labelledby="hero-heading"
          >
            <div className="max-w-4xl flex flex-col items-center w-full">
              <h1
                id="hero-heading"
                className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-[#0F172A] tracking-tight mb-6"
              >
                The National Standard for Parliamentary Accountability.
              </h1>
              <p className="text-lg md:text-xl text-[#0F172A] max-w-2xl mx-auto mb-10">
                Tracking the intersection of private interests and public policy.
                Search for any Member of Parliament or Provincial Representative.
              </p>
              <CommandKSearchBar />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                <Link
                  href="/explore"
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] underline underline-offset-4 transition-colors"
                >
                  Explore the Map →
                </Link>
                <a
                  href="#live-ledger-ticker"
                  className="text-sm font-medium text-[#475569] hover:text-[#0F172A] underline underline-offset-4 transition-colors"
                >
                  Live Ledger
                </a>
              </div>
            </div>
          </section>

          {/* Live Stats / Sourced Metrics */}
          <section
            className="px-6 py-12 md:py-16 border-b border-slate-200"
            aria-labelledby="live-stats-heading"
          >
            <h2 id="live-stats-heading" className="sr-only">
              Live Stats
            </h2>
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveStats.map((card) => (
                <article
                  key={card.label}
                  className="p-6 border border-slate-200 bg-[#FFFFFF] rounded-none shadow-none"
                  aria-labelledby={`stat-${card.label.replace(/\s/g, "-")}`}
                >
                  <p
                    id={`stat-${card.label.replace(/\s/g, "-")}`}
                    className="font-serif text-sm font-semibold text-[#0F172A] uppercase tracking-wide mb-1"
                  >
                    {card.label}
                  </p>
                  <p className="font-sans text-xl font-bold text-[#0F172A]">
                    {card.value}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Our Mission - A Framework Built on Integrity */}
          <section
            className="px-6 py-20 md:py-24 border-b border-slate-200"
            aria-labelledby="mission-heading"
          >
            <h2
              id="mission-heading"
              className="font-serif text-2xl md:text-3xl font-bold text-[#0F172A] text-center mb-12"
            >
              A Framework Built on Integrity.
            </h2>
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              {MISSION_ITEMS.map((item) => (
                <article
                  key={item.title}
                  className="p-8 border border-slate-200 bg-[#FFFFFF] rounded-none shadow-none"
                  aria-labelledby={`mission-${item.title.replace(/\s/g, "-")}`}
                >
                  <h3
                    id={`mission-${item.title.replace(/\s/g, "-")}`}
                    className="font-serif text-xl font-semibold text-[#0F172A] mb-1"
                  >
                    {item.title}
                  </h3>
                  <p className="font-sans text-sm font-medium text-[#64748B] mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-[#0F172A] text-base leading-relaxed">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Recently Updated Profiles (live: by most recent trade activity) */}
          <section
            className="px-6 py-20 md:py-24 border-b border-slate-200"
            aria-labelledby="recent-profiles-heading"
          >
            <h2
              id="recent-profiles-heading"
              className="font-serif text-2xl font-bold text-[#0F172A] text-center mb-10"
            >
              Recently Updated Profiles
            </h2>
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentProfiles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-[#64748B] font-sans">
                  <p>No recent trade activity yet. Run seed or sync to populate.</p>
                  <Link href="/mps" className="mt-2 inline-block text-sm font-medium text-[#0F172A] hover:underline">
                    Browse all representatives
                  </Link>
                </div>
              ) : (
                recentProfiles.slice(0, 3).map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/mps/${encodeURIComponent(profile.id)}`}
                    className="block p-6 border border-slate-200 bg-[#FFFFFF] rounded-none shadow-none hover:border-[#0F172A]/30 transition-colors text-left"
                    aria-label={`View profile for ${profile.name}, ${profile.riding}`}
                  >
                    <p className="font-serif text-lg font-semibold text-[#0F172A] mb-1">
                      {profile.name}
                    </p>
                    <p className="text-sm text-[#0F172A]/80 font-sans mb-3">
                      {profile.riding}
                    </p>
                    <span
                      className="inline-block px-3 py-1 text-xs font-sans font-semibold bg-[#0F172A] text-[#FFFFFF] rounded-none"
                      aria-label="View profile"
                    >
                      View profile
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Footer */}
          <footer
            className="px-6 py-8 text-center border-t border-slate-200"
            role="contentinfo"
          >
            <p className="text-xs text-[#0F172A]/50">
              A Civic-Tech Initiative | IntegrityIndex.ca &copy; 2026
            </p>
          </footer>
        </main>
      </div>
    </AppShell>
  );
}
