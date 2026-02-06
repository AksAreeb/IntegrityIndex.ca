"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PLACEHOLDER = "Search by MP name, Riding, or Postal Code...";
const POSTAL_REG = /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/;
const DEBOUNCE_MS = 300;

export function CommandKSearchBar() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);
  // debouncedQuery (300ms) is for future type-ahead / search-as-you-type API to avoid spamming.

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        router.push("/mps");
        return;
      }
      const code = trimmed.replace(/\s+/g, "");
      if (code.length === 6 && POSTAL_REG.test(code)) {
        setSubmitting(true);
        try {
          const res = await fetch(
            `/api/geo/postal?code=${encodeURIComponent(code)}&resolve=1`
          );
          const data = res.ok ? await res.json() : null;
          const memberId = data?.id ?? data?.ridingId;
          if (memberId) {
            router.push(`/mps/${memberId}`);
            return;
          }
        } catch (e) {
          console.error("[CommandKSearchBar]: postal resolve failed", e);
          // fall through to text search
        } finally {
          setSubmitting(false);
        }
      }
      router.push(`/mps?q=${encodeURIComponent(trimmed)}`);
    },
    [query, router]
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[600px] mx-auto rounded-none"
      role="search"
      aria-label="Search representatives"
    >
      <div className="relative flex h-[52px] w-full items-center border border-[#E2E8F0] bg-[#FFFFFF] rounded-none">
        <label htmlFor="hero-search" className="sr-only">
          Search by MP name, riding, or postal code
        </label>
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={PLACEHOLDER}
          className="flex-1 h-full pl-5 pr-[100px] bg-transparent text-[#0F172A] placeholder:text-[#64748B] font-sans text-base focus:outline-none focus:ring-0 rounded-none"
          aria-describedby="hero-search-desc"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={submitting}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-[40px] px-5 bg-[#0F172A] text-[#FFFFFF] font-sans font-semibold text-sm rounded-none hover:bg-[#0F172A]/95 active:bg-[#0F172A]/90 disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 focus:ring-offset-white"
        >
          {submitting ? "..." : "Search"}
        </button>
      </div>
      <p id="hero-search-desc" className="sr-only">
        Submit to search Members of Parliament and provincial representatives.
      </p>
    </form>
  );
}
