import { REALTIME_WINDOW_SECONDS, LABEL_META } from "./constants";
import type {
  ChartPoint,
  GasStateChartPoint,
  LabelChartPoint,
  SensorReading,
} from "./types";
import { formatTimeKey } from "./date";

export function toMetricChartData(
  readings: SensorReading[],
  metric: "temperature" | "humidity" | "gas",
): ChartPoint[] {
  const window = readings.slice(0, REALTIME_WINDOW_SECONDS).reverse();
  return window.map((reading, index) => ({
    second: index + 1,
    value: reading[metric],
    timeLabel: formatTimeKey(reading.timeKey),
  }));
}

export function toGasStateChartData(
  readings: SensorReading[],
): GasStateChartPoint[] {
  const window = readings.slice(0, REALTIME_WINDOW_SECONDS).reverse();
  return window.map((reading, index) => ({
    second: index + 1,
    gas: reading.gas,
    label: reading.label,
    timeLabel: formatTimeKey(reading.timeKey),
    fill: LABEL_META[reading.label]?.color ?? "#ffffff",
  }));
}

export function toLabelChartData(readings: SensorReading[]): LabelChartPoint[] {
  const window = readings.slice(0, REALTIME_WINDOW_SECONDS).reverse();
  return window.map((reading, index) => ({
    second: index + 1,
    label: reading.label,
    barValue: reading.label === 0 ? 0.35 : reading.label,
    timeLabel: formatTimeKey(reading.timeKey),
    fill: LABEL_META[reading.label]?.color ?? "#ffffff",
  }));
}
