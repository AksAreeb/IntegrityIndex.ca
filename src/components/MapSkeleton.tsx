export function MapSkeleton() {
  return (
    <div
      className="w-full h-full min-h-[280px] bg-[#F1F5F9] animate-pulse rounded-[4px] flex items-center justify-center"
      role="status"
      aria-label="Map loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-2 border-[#0f172a]/20 border-t-[#0f172a] rounded-full animate-spin" />
        <span className="text-sm text-[#64748B] font-sans font-medium">
          Loading map data...
        </span>
      </div>
    </div>
  );
}
