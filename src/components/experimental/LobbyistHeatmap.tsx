"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { LOBBYIST_HEATMAP_DATA } from "@/lib/fallback-data";

export function LobbyistHeatmap() {
  const [viewAsTable, setViewAsTable] = useState(false);

  return (
    <section
      className="border border-[#E2E8F0] rounded-[4px] p-6"
      role="region"
      aria-labelledby="heatmap-heading"
    >
      <h2
        id="heatmap-heading"
        className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
      >
        Lobbyist Heatmap
      </h2>
      <p className="text-sm text-[#64748B] mb-2">
        Top 10 Industries Meeting with Government this Week
      </p>
      <p className="text-xs text-[#94A3B8] mb-6" role="doc-tip">
        <strong className="text-[#64748B]">High Sector Correlation:</strong> Member holds stock in the lobbying company&apos;s industry.
      </p>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setViewAsTable(!viewAsTable)}
          className="text-sm font-sans font-medium text-[#0F172A] hover:text-[var(--primary-accent)] underline underline-offset-2"
          aria-pressed={viewAsTable}
          aria-label={viewAsTable ? "View as chart" : "View as table for screen readers"}
        >
          {viewAsTable ? "View as Chart" : "View as Table"}
        </button>
      </div>

      {viewAsTable ? (
        <div role="table" aria-label="Industries meeting with government">
          <div role="rowgroup">
            <div role="row" className="flex border-b border-[#E2E8F0] py-2 font-medium">
              <span role="columnheader" className="w-2/3 text-sm text-[#0F172A]">
                Industry
              </span>
              <span role="columnheader" className="w-1/3 text-sm text-[#0F172A] text-right">
                Meetings
              </span>
            </div>
          </div>
          {LOBBYIST_HEATMAP_DATA.map((row) => (
            <div
              key={row.industry}
              role="row"
              className="flex border-b border-[#E2E8F0] py-2 text-sm"
            >
              <span role="cell" className="w-2/3 text-[#0F172A]">
                {row.industry}
              </span>
              <span role="cell" className="w-1/3 text-right text-[#0F172A]">
                {row.meetingCount}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="h-[320px]"
          role="img"
          aria-label="Vertical bar chart showing top 10 industries by meeting count"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={LOBBYIST_HEATMAP_DATA}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748B" }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={{ stroke: "#E2E8F0" }}
              />
              <YAxis
                type="category"
                dataKey="industry"
                width={75}
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
              />
              <Bar dataKey="meetingCount" fill="var(--primary-accent)" radius={0} name="Meetings">
                {LOBBYIST_HEATMAP_DATA.map((_, i) => (
                  <Cell key={i} fill="var(--primary-accent)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
