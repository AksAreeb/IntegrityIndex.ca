"use client";

type TradeRow = {
  id: number;
  symbol: string;
  type: string;
  date: Date;
};

export function MemberTradeTable({ trades }: { trades: TradeRow[] }) {
  if (trades.length === 0) {
    return (
      <p className="py-8 text-center text-[#64748B] text-sm border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC]">
        No trade history on record.
      </p>
    );
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Date
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Symbol
            </th>
            <th className="px-6 py-4 font-serif text-sm font-semibold text-[#0F172A]">
              Type
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const isSell =
              String(t.type).toUpperCase() === "SELL";
            const typeColor = isSell
              ? "text-red-700"
              : "text-emerald-700";
            return (
              <tr
                key={t.id}
                className="border-b border-[#E2E8F0] last:border-b-0 hover:bg-[#F8FAFC]"
              >
                <td className="px-6 py-4 text-sm text-[#0F172A]">
                  {new Date(t.date).toLocaleDateString("en-CA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-6 py-4 font-medium text-sm text-[#0F172A]">
                  {t.symbol}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${typeColor}`}>
                  {t.type}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
