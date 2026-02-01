"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { IndustryShare } from "@/lib/mock-data";

interface Props {
  data: IndustryShare[];
}

export function InfluenceMap({ data }: Props) {
  const [viewAsTable, setViewAsTable] = useState(false);

  return (
    <div
      className="border border-[#E2E8F0] rounded-[4px] p-6"
      role="region"
      aria-labelledby="influence-heading"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id="influence-heading" className="font-serif text-lg font-semibold text-[#0F172A]">
          Influence Map
        </h2>
        <button
          type="button"
          onClick={() => setViewAsTable(!viewAsTable)}
          className="text-sm font-sans font-medium text-[#0F172A] hover:text-[#334155] underline underline-offset-2"
          aria-pressed={viewAsTable}
          aria-label={viewAsTable ? "View as chart" : "View as table for screen readers"}
        >
          {viewAsTable ? "View as Chart" : "View as Table"}
        </button>
      </div>

      {viewAsTable ? (
        <div role="table" aria-label="Asset distribution by industry sector">
          <div role="rowgroup">
            <div role="row" className="flex border-b border-[#E2E8F0] py-2 font-medium">
              <span role="columnheader" className="w-1/2 text-sm text-[#0F172A]">
                Sector
              </span>
              <span role="columnheader" className="w-1/4 text-sm text-[#0F172A] text-right">
                %
              </span>
              <span role="columnheader" className="w-1/4 text-sm text-[#0F172A] text-right">
                Value
              </span>
            </div>
          </div>
          {data.map((row) => (
            <div
              key={row.sector}
              role="row"
              className="flex border-b border-[#E2E8F0] py-2 text-sm"
            >
              <span role="cell" className="w-1/2 text-[#0F172A]">
                {row.sector}
              </span>
              <span role="cell" className="w-1/4 text-right text-[#0F172A]">
                {row.percentage}%
              </span>
              <span role="cell" className="w-1/4 text-right text-[#64748B]">
                ${row.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="h-[300px]"
          role="img"
          aria-label="Bar chart showing asset distribution by industry sector"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis
                dataKey="sector"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={{ stroke: "#E2E8F0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={{ stroke: "#E2E8F0" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "4px",
                }}
                formatter={(value: number) => [`${value}%`, "Share"]}
              />
              <Bar
                dataKey="percentage"
                fill="var(--primary-accent)"
                radius={0}
                name="Percentage"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
