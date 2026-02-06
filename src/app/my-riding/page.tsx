"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { MemberPhoto } from "@/components/MemberPhoto";
import { MapSkeleton } from "@/components/MapSkeleton";

const DEBOUNCE_MS = 400;

interface RidingWalletData {
  postalCode: string;
  province: string;
  city?: string;
  federal: {
    memberId: string;
    name: string;
    riding: string;
    party: string;
    jurisdiction: string;
    photoUrl: string | null;
    integrityRank: number;
    primarySectors: string[];
    pulseConflictFlags: Array<{ committee: string; asset: string; conflictReason: string }>;
  };
  provincial: {
    memberId: string;
    name: string;
    riding: string;
    party: string;
    jurisdiction: string;
    photoUrl: string | null;
    integrityRank: number;
    primarySectors: string[];
    pulseConflictFlags: Array<{ committee: string; asset: string; conflictReason: string }>;
  } | null;
  aggregator: {
    combinedNetWorthEstimated: string;
    overlappingSectors: string[];
    ridingSectorConcentration: boolean;
    topIndustries: string[];
  };
  constituentAlerts: Array<{ memberId: string; message: string }>;
}

/** Shadcn-style Progress bar for Power Balance comparison */
function PowerBalanceBar({
  mpRank,
  mppRank,
  mpLabel,
  mppLabel,
}: {
  mpRank: number;
  mppRank: number;
  mpLabel: string;
  mppLabel: string;
}) {
  const total = mpRank + mppRank;
  const mpPercent = total > 0 ? (mpRank / total) * 100 : 50;
  const mppPercent = total > 0 ? (mppRank / total) * 100 : 50;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-[#64748B]">
        <span>{mpLabel} · {mpRank}/100</span>
        <span>{mppLabel} · {mppRank}/100</span>
      </div>
      <div className="h-3 w-full rounded-full bg-[#E2E8F0] overflow-hidden flex">
        <div
          className="h-full bg-[#1E3A8A] transition-all duration-500 ease-out"
          style={{ width: `${mpPercent}%` }}
          role="progressbar"
          aria-valuenow={mpRank}
          aria-valuemin={0}
          aria-valuemax={100}
        />
        <div
          className="h-full bg-[#334155] transition-all duration-500 ease-out"
          style={{ width: `${mppPercent}%` }}
          role="progressbar"
          aria-valuenow={mppRank}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function MyRidingContent() {
  const searchParams = useSearchParams();
  const [postalInput, setPostalInput] = useState("");
  const [postalSearched, setPostalSearched] = useState<string | null>(null);
  const [data, setData] = useState<RidingWalletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRiding = useCallback(async (code: string) => {
    const normalized = code.replace(/\s+/g, "").toUpperCase().slice(0, 6);
    if (normalized.length < 3) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/geo/riding-wallet?postalCode=${encodeURIComponent(normalized)}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not find riding");
        setData(null);
        return;
      }
      setData(json);
      setPostalSearched(normalized);
    } catch (e) {
      setError("Network error. Please try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = searchParams.get("postalCode") ?? searchParams.get("postal") ?? searchParams.get("code");
    if (q && q.trim().length >= 3) {
      setPostalInput(q.trim());
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchRiding(q.trim()), DEBOUNCE_MS);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
  }, [searchParams, fetchRiding]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchRiding(postalInput);
  };

  return (
    <AppShell>
      <div className="min-h-[70vh] bg-[#FAFBFC]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          {/* Search Entry */}
          <section className="text-center mb-16" aria-labelledby="search-heading">
            <h1
              id="search-heading"
              className="font-serif text-3xl md:text-4xl font-bold text-[#0F172A] mb-4"
            >
              Audit Your Representatives
            </h1>
            <p className="text-[#64748B] font-sans text-lg mb-8">
              Enter your Postal Code to see the financial landscape of your riding.
            </p>
            <form onSubmit={handleSearch} className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={postalInput}
                  onChange={(e) => setPostalInput(e.target.value.toUpperCase().slice(0, 7))}
                  placeholder="A1A 1A1"
                  aria-label="Postal code"
                  className="w-full px-6 py-4 text-lg font-mono tracking-[0.3em] border-2 border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent placeholder:tracking-normal placeholder:text-[#94A3B8] shadow-sm"
                  maxLength={7}
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || postalInput.replace(/\s/g, "").length < 5}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-[#0F172A] text-white font-sans font-medium text-sm rounded-lg hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Searching…" : "Audit"}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-sm text-amber-600 font-sans" role="alert">
                  {error}
                </p>
              )}
            </form>
          </section>

          {/* Results */}
          {data && (
            <div className="space-y-8 animate-fade-in">
              {/* Power Duo Card */}
              <section
                className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm"
                aria-labelledby="power-duo-heading"
              >
                <h2
                  id="power-duo-heading"
                  className="font-serif text-xl font-bold text-[#0F172A] mb-6"
                >
                  Your Power Duo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Link
                    href={`/member/${encodeURIComponent(data.federal.memberId)}`}
                    className="flex flex-col items-center text-center group relative"
                  >
                    {data.federal.pulseConflictFlags.length > 0 && (
                      <span className="absolute -top-1 right-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 rounded">
                        Pulse Alert
                      </span>
                    )}
                    <span className="block w-24 h-24 rounded-full overflow-hidden bg-[#F1F5F9] mb-4 ring-2 ring-[#E2E8F0] group-hover:ring-[#0F172A] transition-all">
                      <MemberPhoto
                        member={{
                          id: data.federal.memberId,
                          jurisdiction: "FEDERAL",
                          photoUrl: data.federal.photoUrl,
                        }}
                        width={96}
                        height={96}
                        alt={data.federal.name}
                        className="object-cover w-full h-full"
                      />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Federal MP</span>
                    <span className="font-serif text-lg font-semibold text-[#0F172A] group-hover:underline">
                      {data.federal.name}
                    </span>
                    <span className="text-sm text-[#64748B]">{data.federal.riding}</span>
                    <span className="text-xs text-[#0F172A] font-medium mt-1">
                      Integrity: {data.federal.integrityRank}/100
                    </span>
                    {data.federal.pulseConflictFlags.length > 0 && (
                      <div className="mt-2 w-full text-left">
                        {data.federal.pulseConflictFlags.slice(0, 2).map((f, i) => (
                          <p key={i} className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded">
                            {f.conflictReason}
                          </p>
                        ))}
                      </div>
                    )}
                  </Link>

                  {data.provincial ? (
                    <Link
                      href={`/member/${encodeURIComponent(data.provincial.memberId)}`}
                      className="flex flex-col items-center text-center group relative"
                    >
                      {(data.provincial.pulseConflictFlags.length > 0 || data.constituentAlerts.some((a) => a.memberId === data.provincial?.memberId)) && (
                        <span className="absolute -top-1 right-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 rounded">
                          {data.constituentAlerts.some((a) => a.memberId === data.provincial?.memberId)
                            ? "Constituent Alert"
                            : "Pulse Alert"}
                        </span>
                      )}
                      <span className="block w-24 h-24 rounded-full overflow-hidden bg-[#F1F5F9] mb-4 ring-2 ring-[#E2E8F0] group-hover:ring-[#0F172A] transition-all">
                        <MemberPhoto
                          member={{
                            id: data.provincial.memberId,
                            jurisdiction: "PROVINCIAL",
                            photoUrl: data.provincial.photoUrl,
                          }}
                          width={96}
                          height={96}
                          alt={data.provincial.name}
                          className="object-cover w-full h-full"
                        />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#94A3B8]">Provincial MPP</span>
                      <span className="font-serif text-lg font-semibold text-[#0F172A] group-hover:underline">
                        {data.provincial.name}
                      </span>
                      <span className="text-sm text-[#64748B]">{data.provincial.riding}</span>
                      <span className="text-xs text-[#0F172A] font-medium mt-1">
                        Integrity: {data.provincial.integrityRank}/100
                      </span>
                      {data.constituentAlerts
                        .filter((a) => a.memberId === data.provincial?.memberId)
                        .map((a, i) => (
                          <p key={i} className="mt-2 text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded">
                            {a.message}
                          </p>
                        ))}
                      {data.provincial.pulseConflictFlags.length > 0 && data.constituentAlerts.filter((a) => a.memberId === data.provincial?.memberId).length === 0 && (
                        <div className="mt-2 w-full text-left">
                          {data.provincial.pulseConflictFlags.slice(0, 2).map((f, i) => (
                            <p key={i} className="text-[10px] text-amber-800 bg-amber-50 px-2 py-1 rounded">
                              {f.conflictReason}
                            </p>
                          ))}
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-[#94A3B8] py-8">
                      <span className="text-sm">No provincial representative found for this postal code.</span>
                      <span className="text-xs mt-1">Provincial data available for Ontario only.</span>
                    </div>
                  )}
                </div>

                {data.provincial && (
                  <div className="mt-8 pt-8 border-t border-[#E2E8F0]">
                    <h3 className="font-sans text-sm font-semibold text-[#64748B] mb-3">Power Balance</h3>
                    <PowerBalanceBar
                      mpRank={data.federal.integrityRank}
                      mppRank={data.provincial.integrityRank}
                      mpLabel="MP"
                      mppLabel="MPP"
                    />
                  </div>
                )}
              </section>

              {/* Wallet Summary */}
              <section
                className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm"
                aria-labelledby="wallet-heading"
              >
                <h2
                  id="wallet-heading"
                  className="font-serif text-xl font-bold text-[#0F172A] mb-6"
                >
                  Your Riding&apos;s Financial Landscape
                </h2>
                {data.aggregator.topIndustries.length > 0 ? (
                  <>
                    <p className="text-[#64748B] font-sans text-sm mb-4">
                      Top industries your local representatives are invested in:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 mb-6">
                      {data.aggregator.topIndustries.map((ind, i) => (
                        <li key={ind} className="font-sans text-[#0F172A] font-medium">
                          {ind}
                        </li>
                      ))}
                    </ol>
                    {data.aggregator.ridingSectorConcentration && (
                      <p className="text-amber-700 text-sm font-medium mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                        Riding Sector Concentration: Both representatives hold assets in overlapping sectors.
                      </p>
                    )}
                    <div className="border-t border-[#E2E8F0] pt-6">
                      <p className="font-sans text-[#0F172A] text-sm leading-relaxed">
                        As a constituent, you have a right to know how these investments align with local issues.
                      </p>
                      <Link
                        href={`/member/${encodeURIComponent(data.federal.memberId)}`}
                        className="inline-block mt-4 px-4 py-2 bg-[#0F172A] text-white font-sans text-sm font-medium rounded-lg hover:bg-[#1E293B] transition-colors"
                      >
                        View full disclosure profiles →
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[#64748B] font-sans text-sm mb-4">
                      No sector data available from disclosed assets.
                    </p>
                    <p className="font-sans text-[#0F172A] text-sm leading-relaxed">
                      As a constituent, you have a right to know how these investments align with local issues.
                    </p>
                    <Link
                      href={`/member/${encodeURIComponent(data.federal.memberId)}`}
                      className="inline-block mt-4 px-4 py-2 bg-[#0F172A] text-white font-sans text-sm font-medium rounded-lg hover:bg-[#1E293B] transition-colors"
                    >
                      View full disclosure profiles →
                    </Link>
                  </>
                )}
              </section>

              {postalSearched && (
                <p className="text-center text-xs text-[#94A3B8] font-sans">
                  Showing results for postal code {postalSearched.slice(0, 3)} {postalSearched.slice(3)}
                  {data.city && ` · ${data.city}`}
                </p>
              )}

              {/* Data Sourcing Footer */}
              <footer className="mt-8 pt-6 border-t border-[#E2E8F0]">
                <p className="text-xs text-[#64748B] font-sans italic">
                  Order of Canada Portfolio Note: This data is aggregated from the CIEC and Provincial Integrity Commissioners to provide a holistic view of representative accountability.
                </p>
              </footer>
            </div>
          )}

          {loading && (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <MapSkeleton message="Loading riding data..." />
              </div>
            </div>
          )}

          {!data && !loading && !error && (
            <p className="text-center text-[#94A3B8] font-sans text-sm">
              Enter a Canadian postal code above to audit your federal and provincial representatives.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function MyRidingPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="min-h-[70vh] bg-[#FAFBFC] flex items-center justify-center">
            <span className="text-[#94A3B8] font-sans">Loading…</span>
          </div>
        </AppShell>
      }
    >
      <MyRidingContent />
    </Suspense>
  );
}
