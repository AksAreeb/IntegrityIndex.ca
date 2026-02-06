"use client";

import { useState, useMemo } from "react";
import * as Slider from "@radix-ui/react-slider";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Asset } from "@/types";

const MARKET_BENCHMARK_DATA = [
  { period: "Pre-office", value: 100, benchmark: 100 },
  { period: "Y1", value: 105, benchmark: 102 },
  { period: "Y2", value: 112, benchmark: 108 },
  { period: "Y3", value: 118, benchmark: 115 },
  { period: "Current", value: 125, benchmark: 122 },
];

export interface DisclosurePoint {
  date: string;
  value: number;
  label?: string;
}

export interface BenchmarkPoint {
  period: string;
  value: number;
  benchmark?: number;
}

interface Props {
  preOfficeAssets: Asset[];
  currentAssets: Asset[];
  /** When set, chart shows disclosure-based timeline: one point = Baseline; multiple = slope (net worth growth). */
  disclosureSeries?: DisclosurePoint[];
  /** When set, overlay or show market snapshot from StockPriceCache (e.g. S&P/TSX 60 proxy). */
  benchmarkSeries?: BenchmarkPoint[] | null;
}

export function WealthTimeline({ preOfficeAssets, currentAssets, disclosureSeries, benchmarkSeries }: Props) {
  const [value, setValue] = useState([50]);
  const isPreOffice = value[0] < 50;
  const displayAssets = isPreOffice ? preOfficeAssets : currentAssets;

  const timelineChartData = useMemo(() => {
    if (!disclosureSeries || disclosureSeries.length === 0) return null;
    if (disclosureSeries.length === 1) {
      return [{ period: "Baseline", value: disclosureSeries[0].value, label: disclosureSeries[0].label }];
    }
    const sorted = [...disclosureSeries].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((p, i) => ({
      period: p.label || p.date || `D${i + 1}`,
      value: p.value,
    }));
  }, [disclosureSeries]);

  const chartDataWithBenchmark = useMemo(() => {
    const base = timelineChartData;
    if (!base || base.length === 0) return base;
    if (!benchmarkSeries || benchmarkSeries.length < 2) return base;
    const startVal = benchmarkSeries[0]?.value ?? 100;
    const endVal = benchmarkSeries[benchmarkSeries.length - 1]?.value ?? 100;
    return base.map((row, i) => ({
      ...row,
      benchmark:
        base.length === 1
          ? startVal
          : i === 0
            ? startVal
            : i === base.length - 1
              ? endVal
              : startVal + (endVal - startVal) * (i / (base.length - 1)),
    }));
  }, [timelineChartData, benchmarkSeries]);

  return (
    <section
      className="border border-[#E2E8F0] rounded-[4px] p-6"
      role="region"
      aria-labelledby="timeline-heading"
    >
      <h2
        id="timeline-heading"
        className="font-serif text-lg font-semibold text-[#0F172A] mb-2"
      >
        Wealth Timeline
      </h2>
      <p className="text-sm text-[#64748B] mb-4">
        Net-worth trajectory: Pre-office vs Current Assets
      </p>

      <div className="mb-6 h-[180px] w-full border border-[#E2E8F0] rounded-[4px] p-3 bg-[#FAFAFA]">
        <p className="text-xs font-sans font-medium text-[#64748B] mb-2">
          {timelineChartData
            ? timelineChartData.length === 1
              ? "Disclosure: single filing (Baseline)."
              : "Disclosure timeline: net worth growth between filing dates."
            : "Market Benchmark overlay (S&P/TSX 60 proxy, indexed)"}
        </p>
        <ResponsiveContainer width="100%" height="90%">
          <LineChart
            data={chartDataWithBenchmark ?? timelineChartData ?? MARKET_BENCHMARK_DATA}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis dataKey="period" tick={{ fontSize: 10 }} stroke="#94A3B8" />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ fontSize: 11 }}
              formatter={(val: number) => [`${val}${timelineChartData ? "" : " (indexed)"}`, ""]}
            />
            {!timelineChartData && (
              <ReferenceLine y={100} stroke="#E2E8F0" strokeDasharray="2 2" />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--primary-accent)"
              strokeWidth={2}
              dot={{ r: 3 }}
              name={timelineChartData?.length === 1 ? "Baseline" : "Portfolio"}
            />
            {(!timelineChartData || (chartDataWithBenchmark && chartDataWithBenchmark.some((d) => "benchmark" in d && d.benchmark != null))) && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#64748B"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
                name="S&P/TSX 60 (normalized)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {benchmarkSeries && benchmarkSeries.length > 0 && (
        <div className="mt-4 p-3 border border-[#E2E8F0] rounded-[4px] bg-[#F8FAFC]">
          <p className="text-xs font-sans font-medium text-[#64748B] mb-2">Market snapshot (StockPriceCache)</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-sans text-[#0F172A]">
            {benchmarkSeries.map((b) => (
              <span key={b.period}>{b.period}: ${typeof b.value === "number" ? b.value.toFixed(2) : b.value}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6" role="group" aria-label="Asset period selector">
        <div className="flex justify-between text-xs text-[#64748B] mb-2">
          <span>Pre-office Assets</span>
          <span>Current Assets</span>
        </div>
        <Slider.Root
          value={value}
          onValueChange={setValue}
          max={100}
          step={1}
          className="relative flex h-6 w-full touch-none select-none items-center"
          aria-label="Toggle between pre-office and current assets"
        >
          <Slider.Track className="relative h-2 flex-1 bg-[#E2E8F0] rounded-[2px]">
            <Slider.Range className="absolute h-full bg-[var(--primary-accent)] rounded-[2px]" />
          </Slider.Track>
          <Slider.Thumb className="block h-5 w-5 bg-[var(--primary-accent)] rounded-[2px] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] focus:ring-offset-2" />
        </Slider.Root>
        <p className="mt-2 text-sm font-sans font-medium text-[#0F172A]" aria-live="polite">
          Viewing: {isPreOffice ? "Pre-office Assets" : "Current Assets"}
        </p>
      </div>

      <div className="border border-[#E2E8F0] rounded-[4px] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">
                Type
              </th>
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">
                Description
              </th>
              <th className="px-6 py-3 font-serif text-sm font-semibold text-[#0F172A]">
                Industry Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {displayAssets.map((asset) => (
              <tr
                key={asset.id}
                className="border-b border-[#E2E8F0] last:border-b-0"
              >
                <td className="px-6 py-3 text-sm text-[#0F172A]">{asset.type}</td>
                <td className="px-6 py-3 text-sm text-[#0F172A]">
                  {asset.description}
                </td>
                <td className="px-6 py-3">
                  <span className="flex flex-wrap gap-1">
                    {asset.industryTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block px-2 py-0.5 text-xs font-medium bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]"
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
