"use client";

import { useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import type { Asset } from "@/lib/mock-data";

interface Props {
  preOfficeAssets: Asset[];
  currentAssets: Asset[];
}

export function WealthTimeline({ preOfficeAssets, currentAssets }: Props) {
  const [value, setValue] = useState([50]);
  const isPreOffice = value[0] < 50;
  const displayAssets = isPreOffice ? preOfficeAssets : currentAssets;

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
      <p className="text-sm text-[#64748B] mb-6">
        Net-worth trajectory: Pre-office vs Current Assets
      </p>

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
