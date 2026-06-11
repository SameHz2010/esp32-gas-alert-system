"use client";

import { memo } from "react";
import type { RoomId } from "@/lib/constants";
import { RoomDashboardCharts } from "./RoomDashboardCharts";
import { RoomDashboardHeader } from "./RoomDashboardHeader";
import { cn } from "@/lib/utils";

interface RoomDashboardProps {
  roomId: RoomId;
  roomLabel: string;
  layoutCompact: boolean;
}

export const RoomDashboard = memo(function RoomDashboard({
  roomId,
  roomLabel,
  layoutCompact,
}: RoomDashboardProps) {
  return (
    <div
      className={cn(
        layoutCompact
          ? "flex min-h-[calc(100vh-4.5rem)] flex-col gap-1.5"
          : "space-y-6",
      )}
    >
      <RoomDashboardHeader
        roomId={roomId}
        roomLabel={roomLabel}
        compact={layoutCompact}
      />
      <RoomDashboardCharts roomId={roomId} compact={layoutCompact} />
    </div>
  );
});
