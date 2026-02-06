"use client";

/**
 * Loading skeletons for Member Profile when data is being fetched (e.g. from Supabase).
 * Uses Tailwind animate-pulse for accessibility-friendly loading state.
 */
export function MemberProfileSkeleton() {
  return (
    <div className="w-full animate-pulse" role="status" aria-label="Loading member profile">
      <div className="h-4 w-24 bg-[#E2E8F0] rounded mb-6" />
      <div className="mb-8">
        <div className="h-8 w-64 bg-[#E2E8F0] rounded mb-2" />
        <div className="h-4 w-48 bg-[#E2E8F0] rounded" />
      </div>

      {/* Tabs strip */}
      <div className="flex gap-0 border-b border-[#E2E8F0] mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-28 bg-[#F1F5F9] rounded-t mr-1" />
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-[4px] p-8 bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="h-5 w-24 bg-[#E2E8F0] rounded mb-2" />
          <div className="h-10 w-20 bg-[#E2E8F0] rounded" />
        </div>
        <div className="rounded-[4px] p-8 bg-[#F8FAFC] border border-[#E2E8F0]">
          <div className="h-5 w-28 bg-[#E2E8F0] rounded mb-2" />
          <div className="h-10 w-16 bg-[#E2E8F0] rounded" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <div className="flex border-b border-[#E2E8F0] bg-[#F8FAFC] px-6 py-4 gap-4">
          <div className="h-4 w-16 bg-[#E2E8F0] rounded" />
          <div className="h-4 flex-1 bg-[#E2E8F0] rounded" />
          <div className="h-4 w-24 bg-[#E2E8F0] rounded" />
          <div className="h-4 w-28 bg-[#E2E8F0] rounded" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex border-b border-[#E2E8F0] px-6 py-4 gap-4 last:border-b-0">
            <div className="h-4 w-20 bg-[#F1F5F9] rounded" />
            <div className="h-4 flex-1 bg-[#F1F5F9] rounded" />
            <div className="h-4 w-32 bg-[#F1F5F9] rounded" />
            <div className="h-4 w-24 bg-[#F1F5F9] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
