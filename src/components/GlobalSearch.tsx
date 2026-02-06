"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useJurisdiction } from "@/contexts/JurisdictionContext";

type SearchMember = {
  id: string;
  name: string;
  riding: string;
  party: string;
  jurisdiction: string;
};

type PostalResult = {
  id: string;
  ridingId: string;
  ridingName: string;
  memberName: string;
};

type RecentTradeItem = {
  memberId: string;
  memberName: string;
  riding: string;
  type: string;
  symbol: string;
  date: string;
};

const DEBOUNCE_MS = 300;
const POSTAL_REG = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

function normalizePostal(q: string): string {
  return q.replace(/\s+/g, "").toUpperCase().slice(0, 6);
}

const jurisdictionParam = (j: "FEDERAL" | "PROVINCIAL") =>
  j === "FEDERAL" ? "federal" : "provincial";

export function GlobalSearch() {
  const router = useRouter();
  const { jurisdiction } = useJurisdiction();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<SearchMember[]>([]);
  const [postal, setPostal] = useState<PostalResult | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [postalSuggestions, setPostalSuggestions] = useState<string[]>([]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setMembers([]);
      setPostal(null);
      setPostalSuggestions([]);
      return;
    }
    setLoading(true);
    setActiveIndex(-1);

    const normalized = normalizePostal(trimmed);
    const isPostal = POSTAL_REG.test(normalized);
    const isPartialPostal = /^[A-Za-z]\d[A-Za-z]/.test(normalized) && normalized.length >= 3 && normalized.length < 6;
    
    let memberList: SearchMember[] = [];
    let postalResult: PostalResult | null = null;
    const jParam = jurisdictionParam(jurisdiction);

    try {
      // If partial postal code, show suggestion hint
      if (isPartialPostal) {
        setPostalSuggestions([`Complete postal code (e.g., ${normalized}0B1) to find your representative`]);
      } else {
        setPostalSuggestions([]);
      }

      const [membersRes, postalRes] = await Promise.all([
        fetch(
          `/api/members?q=${encodeURIComponent(trimmed)}&jurisdiction=${encodeURIComponent(jParam)}`
        ).then((r) => (r.ok ? r.json() : { members: [] })),
        isPostal && normalized.length === 6
          ? fetch(
              `/api/geo/postal?code=${encodeURIComponent(normalized)}&resolve=1`
            ).then((r) => (r.ok ? r.json() : null))
          : Promise.resolve(null),
      ]);
      memberList = membersRes.members ?? [];
      if (postalRes && postalRes.memberName) {
        postalResult = {
          id: postalRes.id ?? postalRes.ridingId,
          ridingId: postalRes.ridingId ?? postalRes.id,
          ridingName: postalRes.ridingName,
          memberName: postalRes.memberName,
        };
        setPostalSuggestions([]);
      }
    } catch (e) {
      console.error("[GlobalSearch]: runSearch failed", e);
      memberList = [];
      postalResult = null;
      setPostalSuggestions([]);
    }

    setMembers(memberList);
    setPostal(postalResult);
    setLoading(false);
  }, [jurisdiction]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setMembers([]);
      setPostal(null);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch, jurisdiction]);

  useEffect(() => {
    if (!open) return;
    if (query.trim()) return;
    fetch("/api/trades")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const items = (data.items ?? []).slice(0, 8).map((t: { memberId: string; memberName: string; riding: string; type: string; symbol: string; date: string }) => ({
          memberId: t.memberId,
          memberName: t.memberName,
          riding: t.riding,
          type: t.type,
          symbol: t.symbol,
          date: t.date,
        }));
        setRecentTrades(items);
      })
      .catch(() => setRecentTrades([]));
  }, [open, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ridings = [...new Set(members.map((m) => m.riding))].slice(0, 6);
  const hasQuery = query.trim().length > 0;

  const options: { type: "postal" | "member" | "riding" | "trade" | "suggestion"; id: string; label: string; path?: string }[] = [];
  if (postal) options.push({ type: "postal", id: "postal", label: `${postal.memberName} — ${postal.ridingName}`, path: `/mps/${encodeURIComponent(postal.ridingId)}` });
  // Postal code suggestions (hints)
  postalSuggestions.forEach((s, i) => options.push({ type: "suggestion", id: `postal-hint-${i}`, label: s }));
  members.slice(0, 6).forEach((m) => options.push({ type: "member", id: m.id, label: `${m.name} — ${m.riding}`, path: `/member/${encodeURIComponent(m.id)}?jurisdiction=${encodeURIComponent(jurisdictionParam(jurisdiction))}` }));
  if (hasQuery) ridings.forEach((r) => options.push({ type: "riding", id: `riding-${r}`, label: r, path: `/members?q=${encodeURIComponent(r)}` }));
  if (!hasQuery && recentTrades.length > 0) {
    recentTrades.forEach((t, i) =>
      options.push({
        type: "trade",
        id: `trade-${t.memberId}-${t.symbol}-${t.date}-${i}`,
        label: `${t.memberName} ${t.type} ${t.symbol}`,
        path: `/member/${encodeURIComponent(t.memberId)}?jurisdiction=${encodeURIComponent(jurisdictionParam(jurisdiction))}`,
      })
    );
  }

  const repOptions = options.filter((o) => o.type === "postal" || o.type === "member");
  const suggestionOptions = options.filter((o) => o.type === "suggestion");
  const rideOptions = options.filter((o) => o.type === "riding");
  const tradeOptions = options.filter((o) => o.type === "trade");
  const totalOptions = options.length;

  const goTo = (path: string) => {
    setOpen(false);
    setQuery("");
    router.push(path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < totalOptions - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex] && options[activeIndex].path) {
      e.preventDefault();
      goTo(options[activeIndex].path!);
    }
  };

  const showDropdown = open && (hasQuery ? (loading || totalOptions > 0) : true);

  return (
    <div ref={containerRef} className="relative w-full max-w-[320px]">
      <label htmlFor="global-search" className="sr-only">
        Search representatives, ridings, or postal code
      </label>
      <input
        id="global-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search MP, riding, postal…"
        autoComplete="off"
        aria-expanded={showDropdown}
        aria-controls="global-search-list"
        aria-activedescendant={activeIndex >= 0 ? `global-search-option-${activeIndex}` : undefined}
        className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0F172A]"
      />
      {showDropdown && (
        <div
          id="global-search-list"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 max-h-[400px] overflow-auto bg-white border border-[#E2E8F0] rounded-[6px] shadow-xl z-[100] min-w-[300px]"
        >
          {hasQuery && (
            <>
              {suggestionOptions.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Postal Code
                    </span>
                  </div>
                  {suggestionOptions.map((opt, i) => (
                    <div
                      key={opt.id}
                      className="px-4 py-2.5 text-sm text-[#64748B] italic"
                    >
                      {opt.label}
                    </div>
                  ))}
                </>
              )}
              {repOptions.length > 0 && (
                <div className={`px-3 py-2 ${suggestionOptions.length > 0 ? "border-t border-b" : "border-b"} border-[#E2E8F0] bg-[#F8FAFC]`}>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Members
                  </span>
                </div>
              )}
              {loading && repOptions.length === 0 && suggestionOptions.length === 0 && (
                <div className="px-4 py-3 text-sm text-[#64748B]">Searching…</div>
              )}
              {!loading &&
                repOptions.map((opt, i) => {
                  const idx = suggestionOptions.length + i;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      id={`global-search-option-${idx}`}
                      role="option"
                      aria-selected={activeIndex === idx}
                      className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer ${
                        activeIndex === idx ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => opt.path && goTo(opt.path)}
                    >
                      <span className="font-medium text-[#0F172A]">{opt.label}</span>
                      {opt.type === "postal" && (
                        <span className="block text-xs text-[#94A3B8]">Postal code result</span>
                      )}
                    </button>
                  );
                })}
              {!loading && rideOptions.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Ridings
                    </span>
                  </div>
                  {rideOptions.map((opt, i) => {
                    const idx = suggestionOptions.length + repOptions.length + i;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        id={`global-search-option-${idx}`}
                        role="option"
                        aria-selected={activeIndex === idx}
                        className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer ${
                          activeIndex === idx ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
                        }`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={() => opt.path && goTo(opt.path)}
                      >
                        <span className="font-medium text-[#0F172A]">{opt.label}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
          {!hasQuery && (
            <>
              <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                  Recent Trades
                </span>
              </div>
              {tradeOptions.length === 0 && (
                <div className="px-4 py-3 text-sm text-[#64748B]">Loading…</div>
              )}
              {tradeOptions.map((opt, i) => (
                <button
                  key={opt.id}
                  type="button"
                  id={`global-search-option-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  className={`w-full text-left px-4 py-2.5 text-sm cursor-pointer ${
                    activeIndex === i ? "bg-[#F1F5F9]" : "hover:bg-[#F8FAFC]"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => opt.path && goTo(opt.path)}
                >
                  <span className="font-medium text-[#0F172A]">{opt.label}</span>
                  <span className="block text-xs text-[#94A3B8]">View profile</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
