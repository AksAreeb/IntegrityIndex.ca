"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Something went wrong
        </h1>
        <p className="text-[#64748B] font-sans text-sm mb-6">
          An error occurred while loading this page. This can happen when an
          external service (e.g. LEGISinfo) is temporarily unavailable. The rest
          of the site is unaffected.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="px-5 py-2.5 bg-[#0F172A] text-white font-sans text-sm font-medium rounded-[4px] hover:bg-[#0F172A]/95 focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2.5 border border-[#E2E8F0] text-[#0F172A] font-sans text-sm font-medium rounded-[4px] hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
