"use client";

import dynamic from "next/dynamic";
import { memo } from "react";
import { MapSkeleton } from "./MapSkeleton";
import type { OversightMode } from "@/lib/riding-data";

const GovernanceMap = dynamic(
  () => import("./GovernanceMap").then((mod) => mod.GovernanceMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[280px] flex items-center justify-center">
        <MapSkeleton />
      </div>
    ),
  }
);

interface Props {
  mode: OversightMode;
}

function GovernanceMapDynamicInner({ mode }: Props) {
  return (
    <div className="w-full aspect-video md:aspect-[16/10] h-[400px] md:h-auto md:min-h-[600px] bg-[#F1F5F9] rounded-[4px] overflow-hidden">
      <div className="w-full h-full min-h-[300px] md:min-h-[600px]">
        <GovernanceMap mode={mode} />
      </div>
    </div>
  );
}

export const GovernanceMapDynamic = memo(GovernanceMapDynamicInner);
