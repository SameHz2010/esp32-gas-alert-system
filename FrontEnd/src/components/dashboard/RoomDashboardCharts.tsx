"use client";

import { memo, useDeferredValue, useMemo } from "react";
import { useChartEntranceAnimation } from "@/hooks/useChartEntranceAnimation";
import type { RoomId } from "@/lib/constants";
import { METRIC_CONFIG } from "@/lib/constants";
import { toGasStateChartData, toMetricChartData } from "@/lib/chart";
import { useRoomStore } from "@/store/roomStore";
import { GasStateChart } from "./GasStateChart";
import { MetricChart } from "./MetricChart";
import { cn } from "@/lib/utils";

interface RoomDashboardChartsProps {
  roomId: RoomId;
  compact: boolean;
}

export const RoomDashboardCharts = memo(function RoomDashboardCharts({
  roomId,
  compact,
}: RoomDashboardChartsProps) {
  const readings = useRoomStore((s) => s.readings[roomId]);
  const deferredReadings = useDeferredValue(readings);
  const latest = readings[0];
  const chartAnimation = useChartEntranceAnimation(
    roomId,
    deferredReadings.length,
  );

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

  return (
    <div
      key={roomId}
      className={cn(
        "animate-room-enter grid min-h-0 grid-cols-2 gap-3",
        compact
          ? "min-h-0 flex-1 grid-rows-[minmax(0,2.4fr)_minmax(0,1fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(220px,28%)] lg:grid-rows-2"
          : "grid-rows-[minmax(300px,1.75fr)_minmax(150px,1fr)] lg:min-h-[calc(100vh-11rem)] lg:grid-cols-[minmax(0,1fr)_minmax(240px,30%)] lg:grid-rows-2",
      )}
    >
      <GasStateChart
        size="hero"
        compact={compact}
        className="col-span-2 min-h-0 lg:col-span-1 lg:row-span-2"
        data={gasStateData}
        latestGas={latest?.gas}
        latestLabel={latest?.label ?? 0}
        animation={chartAnimation}
      />
      <MetricChart
        title={METRIC_CONFIG.humidity.label}
        unit={METRIC_CONFIG.humidity.unit}
        color={METRIC_CONFIG.humidity.color}
        data={humidityData}
        size="compact"
        compact={compact}
        valueAccent="humidity"
        className="min-h-0 lg:col-start-2 lg:row-start-1"
        animation={chartAnimation}
      />
      <MetricChart
        title={METRIC_CONFIG.temperature.label}
        unit={METRIC_CONFIG.temperature.unit}
        color={METRIC_CONFIG.temperature.color}
        data={temperatureData}
        size="compact"
        compact={compact}
        valueAccent="temperature"
        className="min-h-0 lg:col-start-2 lg:row-start-2"
        animation={chartAnimation}
      />
    </div>
  );
});
