import { AppShell } from "@/components/AppShell";

export default function BillsPage() {
  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-[#0F172A] mb-2">
          Legislation Tracking Feed
        </h1>
        <p className="text-sm text-[#64748B] font-sans mb-8">
          Live feed of parliamentary bills and legislative actions
        </p>
        <div className="border border-[#E2E8F0] rounded-[4px] p-8 text-center">
          <p className="text-[#64748B]">
            Bill tracking and correlation analysis will be available when the 44th
            Parliament Audit is complete.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
