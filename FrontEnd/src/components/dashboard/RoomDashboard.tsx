"use client";

import { memo, useDeferredValue, useMemo } from "react";
import { useChartEntranceAnimation } from "@/hooks/useChartEntranceAnimation";
import type { RoomId } from "@/lib/constants";
import { METRIC_CONFIG } from "@/lib/constants";
import { toGasStateChartData, toMetricChartData } from "@/lib/chart";
import { useRoomStore } from "@/store/roomStore";
import { useUiStore } from "@/store/uiStore";
import { GasStateChart } from "./GasStateChart";
import { MetricChart } from "./MetricChart";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LiveWindowBadge } from "@/components/dashboard/LiveWindowBadge";
import { cn } from "@/lib/utils";

interface RoomDashboardProps {
  roomId: RoomId;
  roomLabel: string;
}

export const RoomDashboard = memo(function RoomDashboard({
  roomId,
  roomLabel,
}: RoomDashboardProps) {
  const readings = useRoomStore((s) => s.readings[roomId]);
  const sampleCount = useRoomStore((s) => s.readings[roomId].length);
  const latest = useRoomStore((s) => s.readings[roomId][0]);
  const headerCompact = useUiStore((s) => s.headerCompact);

  const deferredReadings = useDeferredValue(readings);
  const latestLabel = latest?.label ?? 0;
  const isAlert = latestLabel >= 3;

  const humidityData = useMemo(
    () => toMetricChartData(deferredReadings, "humidity"),
    [deferredReadings],
  );
  const temperatureData = useMemo(
    () => toMetricChartData(deferredReadings, "temperature"),
    [deferredReadings],
  );
  const gasStateData = useMemo(
    () => toGasStateChartData(deferredReadings),
    [deferredReadings],
  );
  const latestGas = latest?.gas;
  const chartAnimation = useChartEntranceAnimation(roomId, deferredReadings.length);

  return (
    <div
      className={cn(
        headerCompact
          ? "flex min-h-[calc(100vh-5rem)] flex-col gap-2"
          : "space-y-6",
      )}
    >
      <Card
        alert={isAlert}
        hoverable={false}
        className={cn(
          "shrink-0",
          headerCompact ? "px-3 py-2" : "p-5",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {!headerCompact && (
              <p className="hidden text-xs uppercase tracking-[0.25em] text-amber-400/80 sm:block">
                Live
              </p>
            )}
            <h2
              className={cn(
                "truncate font-bold text-white",
                headerCompact ? "text-base" : "text-2xl",
              )}
            >
              {roomLabel}
            </h2>
            {!headerCompact && (
              <p className="hidden text-sm text-stone-400 lg:block">
                · last 60s
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LiveWindowBadge count={sampleCount} compact={headerCompact} />
            {latest && (
              <Badge className="border-white/10 bg-white/5 text-xs text-stone-200">
                {latest.timeKey.replace(/-/g, ":")}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      <div
        className={cn(
          "grid min-h-0 grid-cols-2 gap-3",
          headerCompact
            ? "min-h-0 flex-1 grid-rows-[minmax(0,2.4fr)_minmax(0,1fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,28%)] lg:grid-rows-2"
            : "grid-rows-[minmax(300px,1.75fr)_minmax(150px,1fr)] lg:min-h-[calc(100vh-11rem)] lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)] lg:grid-rows-2",
        )}
      >
        <GasStateChart
          size="hero"
          alert={isAlert}
          className="col-span-2 min-h-0 lg:col-span-1 lg:row-span-2"
          data={gasStateData}
          latestGas={latestGas}
          latestLabel={latestLabel}
          animation={chartAnimation}
        />
        <MetricChart
          title={METRIC_CONFIG.humidity.label}
          unit={METRIC_CONFIG.humidity.unit}
          color={METRIC_CONFIG.humidity.color}
          data={humidityData}
          size="compact"
          className="min-h-0 lg:col-start-2 lg:row-start-1"
          animation={chartAnimation}
        />
        <MetricChart
          title={METRIC_CONFIG.temperature.label}
          unit={METRIC_CONFIG.temperature.unit}
          color={METRIC_CONFIG.temperature.color}
          data={temperatureData}
          size="compact"
          className="min-h-0 lg:col-start-2 lg:row-start-2"
          animation={chartAnimation}
        />
      </div>
    </div>
  );
});
