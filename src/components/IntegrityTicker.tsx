"use client";

import { useEffect, useState } from "react";

const MOCK_ALERTS = [
  "New Disclosure: MP for Oakville updated assets",
  "Integrity Alert: 3 Members voted against declared interests",
  "Legislative Update: Bill C-27 passes third reading",
  "Transparency Notice: Annual audit complete for 44th Parliament",
  "Disclosure Filed: Senator from Alberta reports new holdings",
  "Vote Analysis: 12 Members abstained on environmental bill",
] as const;

export function IntegrityTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MOCK_ALERTS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="bg-[#F8FAFC] border-b border-[#E2E8F0] h-8 flex items-center px-6 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center gap-3">
        <span className="flex items-center gap-2 text-xs font-sans font-semibold text-[#0F172A] uppercase tracking-wide flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 text-[var(--primary-accent)]"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clipRule="evenodd"
            />
          </svg>
          Live
        </span>
        <span className="font-sans text-sm text-[#0F172A] animate-fade-in">
          {MOCK_ALERTS[currentIndex]}
        </span>
      </div>
    </div>
  );
}
