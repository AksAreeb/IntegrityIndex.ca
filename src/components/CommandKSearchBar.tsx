"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const PLACEHOLDER = "Search by MP name, Riding, or Postal Code...";
const POSTAL_REG = /^[A-Za-z]\d[A-Za-z]\d[A-Za-z]\d$/;
const DEBOUNCE_MS = 300;

/** Section shortcuts: type ">slug" then Enter to jump. */
const SECTION_SHORTCUTS: { slug: string; path: string; label: string }[] = [
  { slug: "mps", path: "/mps", label: "Representatives" },
  { slug: "members", path: "/members", label: "Members" },
  { slug: "bills", path: "/legislation", label: "Legislation" },
  { slug: "legislation", path: "/legislation", label: "Legislation" },
  { slug: "pulse", path: "/pulse", label: "The Pulse" },
];

function parseSectionShortcut(trimmed: string): string | null {
  if (!trimmed.startsWith(">")) return null;
  const slug = trimmed.slice(1).toLowerCase().trim();
  const match = SECTION_SHORTCUTS.find((s) => s.slug === slug);
  return match ? match.path : null;
}

export function CommandKSearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Cmd+K / Ctrl+K to open modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus modal input when opened; close on Escape
  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => modalInputRef.current?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, closeModal = false) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        router.push("/mps");
        if (closeModal) setOpen(false);
        return;
      }
      const shortcutPath = parseSectionShortcut(trimmed);
      if (shortcutPath) {
        router.push(shortcutPath);
        setQuery("");
        if (closeModal) setOpen(false);
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
            if (closeModal) setOpen(false);
            return;
          }
        } catch (e) {
          console.error("[CommandKSearchBar]: postal resolve failed", e);
        } finally {
          setSubmitting(false);
        }
      }
      router.push(`/mps?q=${encodeURIComponent(trimmed)}`);
      if (closeModal) setOpen(false);
    },
    [query, router]
  );

  const searchForm = (
    inputId: string,
    ref: React.RefObject<HTMLInputElement | null>,
    onSubmit: (e: React.FormEvent) => void,
    variant: "hero" | "modal" = "hero"
  ) => {
    const rounded = variant === "modal" ? "rounded-lg" : "rounded-none";
    return (
      <form onSubmit={onSubmit} className="w-full" role="search" aria-label="Search representatives">
        <div className={`relative flex h-[52px] w-full items-center border border-[#E2E8F0] bg-[#FFFFFF] ${rounded}`}>
          <label htmlFor={inputId} className="sr-only">
            Search by MP name, riding, or postal code
          </label>
          <input
            ref={ref}
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDER}
            className={`flex-1 h-full pl-5 pr-[100px] bg-transparent text-[#0F172A] placeholder:text-[#64748B] font-sans text-base focus:outline-none focus:ring-0 ${rounded}`}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={submitting}
            className={`absolute right-1 top-1/2 -translate-y-1/2 h-[40px] px-5 bg-[#0F172A] text-[#FFFFFF] font-sans font-semibold text-sm hover:bg-[#0F172A]/95 active:bg-[#0F172A]/90 disabled:opacity-70 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2 ${variant === "modal" ? "rounded-md" : "rounded-none"}`}
          >
            {submitting ? "..." : "Search"}
          </button>
        </div>
      </form>
    );
  };

  return (
    <>
      <div className="w-full max-w-[600px] mx-auto rounded-none">
        {searchForm("hero-search", inputRef, (e) => handleSubmit(e, false), "hero")}
      </div>
      <p id="hero-search-desc" className="sr-only">
        Submit to search Members of Parliament and provincial representatives. Press ⌘K for quick section shortcuts.
      </p>

      {/* Command palette modal — Cmd+K / Ctrl+K */}
      {open && (
        <>
          <button
            type="button"
            aria-label="Close search"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search and section shortcuts"
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-[560px] -translate-x-1/2 rounded-xl border border-white/30 bg-white/85 p-4 shadow-2xl backdrop-blur-md"
          >
            {searchForm("command-search", modalInputRef, (e) => handleSubmit(e, true), "modal")}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#E2E8F0]/50 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                Section shortcuts
              </span>
              <span className="flex flex-wrap gap-x-3 text-[11px] text-[#64748B]">
                {SECTION_SHORTCUTS.filter(
                  (s, i, arr) => arr.findIndex((x) => x.path === s.path) === i
                ).map((s) => (
                  <span key={s.slug}>
                    <kbd className="rounded bg-[#E2E8F0]/80 px-1.5 py-0.5 font-mono text-[10px] text-[#0F172A]">
                      &gt;{s.slug}
                    </kbd>{" "}
                    {s.label}
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-[#94A3B8]">
              Press <kbd className="rounded bg-[#E2E8F0]/60 px-1 font-mono">⌘K</kbd> to toggle · <kbd className="rounded bg-[#E2E8F0]/60 px-1 font-mono">Esc</kbd> to close
            </p>
          </div>
        </>
      )}
    </>
  );
}
