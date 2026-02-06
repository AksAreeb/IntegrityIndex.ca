"use client";

import { useTransition, useOptimistic, useCallback, useEffect, useRef, useId } from "react";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<void>;
  placeholder?: string;
  "aria-label"?: string;
  /** Debounce ms for live search on change; 0 = only on Search/Enter */
  debounceMs?: number;
  /** Optional stable ID for the input (prevents focus loss on re-render) */
  id?: string;
}

/** Search input using useTransition + useOptimistic (2026 patterns) to prevent UI lag.
 * Keeps input responsive during server action calls. Supports debounced live search. */
export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search by name or riding...",
  "aria-label": ariaLabel = "Search members",
  debounceMs = 300,
  id: providedId,
}: SearchInputProps) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;
  const [isPending, startTransition] = useTransition();
  const [optimisticPending, addOptimistic] = useOptimistic(
    isPending,
    (_, val: boolean) => val,
  );
  const pending = optimisticPending || isPending;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const runSearch = useCallback(
    (query: string) => {
      addOptimistic(true);
      startTransition(async () => {
        await onSearch(query);
      });
    },
    [onSearch, addOptimistic],
  );

  useEffect(() => {
    if (debounceMs <= 0) return;
    const q = value.trim();
    if (isInitialMount.current && !q) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;
    const delay = q ? debounceMs : 150;
    debounceRef.current = setTimeout(() => runSearch(q), delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, debounceMs, runSearch]);

  const handleSearch = useCallback(() => runSearch(value), [value, runSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch],
  );

  return (
    <div className="relative flex gap-2">
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-busy={pending}
        disabled={pending}
        className="flex-1 min-w-0 px-4 py-2.5 text-sm border border-[#E2E8F0] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:border-transparent disabled:opacity-70 disabled:cursor-wait"
      />
      <button
        type="button"
        onClick={handleSearch}
        disabled={pending || !value.trim()}
        className="px-4 py-2.5 text-sm font-medium text-white bg-[#0F172A] rounded-[4px] hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#0F172A] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {pending ? "Searching…" : "Search"}
      </button>
    </div>
  );
}
