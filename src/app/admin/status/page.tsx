import Link from "next/link";
import { getHealthStatus } from "@/lib/admin-health";

export const dynamic = "force-dynamic";

export default async function AdminStatusPage() {
  const health = await getHealthStatus();

  const sources = [
    { name: "OpenNorth", ok: health.openNorth },
    { name: "Finnhub", ok: health.finnhub },
    { name: "LEGISinfo", ok: health.legisinfo },
  ] as const;

  const lastSync = health.lastSuccessfulSync
    ? new Date(health.lastSuccessfulSync).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Never";

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0F172A]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-block text-sm font-sans text-[#64748B] hover:text-[#0F172A] mb-8"
        >
          ← Back to Home
        </Link>
        <h1 className="font-serif text-2xl font-bold text-[#0F172A] mb-2">
          System Health Dashboard
        </h1>
        <p className="text-[#64748B] font-sans text-sm mb-10">
          Status of external API sources and last sync time.
        </p>

        <section
          className="border border-[#E2E8F0] rounded-none p-6 bg-[#FFFFFF] mb-8"
          aria-labelledby="sources-heading"
        >
          <h2
            id="sources-heading"
            className="font-serif text-lg font-semibold text-[#0F172A] mb-4"
          >
            API Sources
          </h2>
          <ul className="space-y-4" role="list">
            {sources.map(({ name, ok }) => (
              <li
                key={name}
                className="flex items-center gap-3 font-sans text-[#0F172A]"
              >
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: ok ? "#22c55e" : "#ef4444",
                  }}
                  aria-hidden="true"
                />
                <span className="sr-only">{name}: </span>
                <span>{name}</span>
                <span className="text-[#64748B] text-sm">
                  {ok ? "Responding" : "Down"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="border border-[#E2E8F0] rounded-none p-6 bg-[#FFFFFF]"
          aria-labelledby="sync-heading"
        >
          <h2
            id="sync-heading"
            className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
          >
            Last Successful Sync
          </h2>
          <p className="font-sans text-[#0F172A]">
            {lastSync}
          </p>
          <p className="text-[#64748B] font-sans text-sm mt-2">
            Updated when the sync route or <code className="bg-[#F1F5F9] px-1">npm run sync</code> completes successfully.
          </p>
        </section>
      </div>
    </div>
  );
}
