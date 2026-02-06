"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

const DEBOUNCE_MS = 200;
const POSTAL_REG = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;

function normalizePostal(q: string): string {
  return q.replace(/\s+/g, "").toUpperCase().slice(0, 6);
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<SearchMember[]>([]);
  const [postal, setPostal] = useState<PostalResult | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTradeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setMembers([]);
      setPostal(null);
      return;
    }
    setLoading(true);
    setActiveIndex(-1);

    const isPostal = POSTAL_REG.test(normalizePostal(trimmed));
    let memberList: SearchMember[] = [];
    let postalResult: PostalResult | null = null;

    try {
      const [membersRes, postalRes] = await Promise.all([
        fetch(`/api/members?q=${encodeURIComponent(trimmed)}`).then((r) =>
          r.ok ? r.json() : { members: [] }
        ),
        isPostal
          ? fetch(
              `/api/geo/postal?code=${encodeURIComponent(normalizePostal(trimmed))}&resolve=1`
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
      }
    } catch {
      memberList = [];
      postalResult = null;
    }

    setMembers(memberList);
    setPostal(postalResult);
    setLoading(false);
  }, []);

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
  }, [query, runSearch]);

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

  const options: { type: "postal" | "member" | "riding" | "trade"; id: string; label: string; path: string }[] = [];
  if (postal) options.push({ type: "postal", id: "postal", label: `${postal.memberName} — ${postal.ridingName}`, path: `/mps/${encodeURIComponent(postal.ridingId)}` });
  members.slice(0, 6).forEach((m) => options.push({ type: "member", id: m.id, label: `${m.name} — ${m.riding}`, path: `/mps/${encodeURIComponent(m.id)}` }));
  if (hasQuery) ridings.forEach((r) => options.push({ type: "riding", id: `riding-${r}`, label: r, path: `/mps?q=${encodeURIComponent(r)}` }));
  if (!hasQuery && recentTrades.length > 0) {
    recentTrades.forEach((t, i) =>
      options.push({
        type: "trade",
        id: `trade-${t.memberId}-${t.symbol}-${t.date}-${i}`,
        label: `${t.memberName} ${t.type} ${t.symbol}`,
        path: `/mps/${encodeURIComponent(t.memberId)}`,
      })
    );
  }

  const repOptions = options.filter((o) => o.type === "postal" || o.type === "member");
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
    } else if (e.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
      e.preventDefault();
      goTo(options[activeIndex].path);
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
              {repOptions.length > 0 && (
                <div className="px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                    Representatives
                  </span>
                </div>
              )}
              {loading && repOptions.length === 0 && (
                <div className="px-4 py-3 text-sm text-[#64748B]">Searching…</div>
              )}
              {!loading &&
                repOptions.map((opt, i) => (
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
                    onClick={() => goTo(opt.path)}
                  >
                    <span className="font-medium text-[#0F172A]">{opt.label}</span>
                    {opt.type === "postal" && (
                      <span className="block text-xs text-[#94A3B8]">Postal code result</span>
                    )}
                  </button>
                ))}
              {!loading && rideOptions.length > 0 && (
                <>
                  <div className="px-3 py-2 border-b border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                      Ridings
                    </span>
                  </div>
                  {rideOptions.map((opt, i) => {
                    const idx = repOptions.length + i;
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
                        onClick={() => goTo(opt.path)}
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
                  onClick={() => goTo(opt.path)}
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
