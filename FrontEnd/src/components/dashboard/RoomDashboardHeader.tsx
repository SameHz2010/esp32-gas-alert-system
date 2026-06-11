"use client";

import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { RoomId } from "@/lib/constants";
import { METRIC_CONFIG } from "@/lib/constants";
import { getGlowLevel } from "@/lib/statusGlow";
import { useRoomStore } from "@/store/roomStore";
import { Card } from "@/components/ui/Card";
import { LiveValue } from "@/components/ui/LiveValue";
import { StatusPill } from "@/components/ui/StatusPill";
import { LiveWindowBadge } from "@/components/dashboard/LiveWindowBadge";

interface RoomDashboardHeaderProps {
  roomId: RoomId;
  roomLabel: string;
  compact: boolean;
}

function TimeBadge({ timeKey }: { timeKey: string }) {
  return (
    <span className="metric-value inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-stone-200">
      {timeKey.replace(/-/g, ":")}
    </span>
  );
}

export const RoomDashboardHeader = memo(function RoomDashboardHeader({
  roomId,
  roomLabel,
  compact,
}: RoomDashboardHeaderProps) {
  const { latest, sampleCount } = useRoomStore(
    useShallow((s) => ({
      latest: s.readings[roomId][0],
      sampleCount: s.readings[roomId].length,
    })),
  );
  const label = latest?.label ?? 0;
  const glowLevel = getGlowLevel(label);
  const gasUnit = METRIC_CONFIG.gas.unit;

  if (compact) {
    return (
      <Card
        glowLevel={glowLevel}
        hoverable={false}
        className="mission-control-bar shrink-0 px-3 py-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            <h2 className="truncate text-sm font-bold text-white">{roomLabel}</h2>
            <span className="shrink-0 text-stone-600" aria-hidden>
              ·
            </span>
            <StatusPill label={label} compact />
            {latest && (
              <>
                <span className="shrink-0 text-stone-600" aria-hidden>
                  ·
                </span>
                <LiveValue
                  value={latest.gas}
                  unit={gasUnit}
                  accent="gas"
                  className="shrink-0 text-sm"
                />
              </>
            )}
            {latest && (
              <>
                <span className="hidden shrink-0 text-stone-600 sm:inline" aria-hidden>
                  ·
                </span>
                <TimeBadge timeKey={latest.timeKey} />
              </>
            )}
          </div>
          <LiveWindowBadge count={sampleCount} compact />
        </div>
      </Card>
    );
  }

  return (
    <Card glowLevel={glowLevel} hoverable={false} className="shrink-0 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="hidden text-xs uppercase tracking-[0.25em] text-amber-400/80 sm:block">
            Live
          </p>
          <h2 className="truncate text-2xl font-bold text-white">{roomLabel}</h2>
          <p className="hidden text-sm text-stone-400 lg:block">· last 60s</p>
          <StatusPill label={label} />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {latest && (
            <LiveValue
              value={latest.gas}
              unit={gasUnit}
              accent="gas"
              className="text-lg"
            />
          )}
          <LiveWindowBadge count={sampleCount} />
          {latest && <TimeBadge timeKey={latest.timeKey} />}
        </div>
      </div>
    </Card>
  );
});
